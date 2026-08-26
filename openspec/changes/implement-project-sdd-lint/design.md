# Design: implement-project-sdd-lint

## Context（脈絡）

本設計實作 [proposal.md](proposal.md) 的 Project SDD lint，服務
`specs/foundation/001-project-sdd-lint/spec.md` 定義的 FR-001–FR-008、
AC-1.1–AC-4.1 與 SC-001–SC-006。目標是把可離線、可機械判斷的文件治理
規則變成單一 command，而不是重述或取代既有治理內容。

正典 authority、四個 gate 與 archive 時的 Source-Verify 責任維持由
[`specs/_governance/constitution.md`](../../../specs/_governance/constitution.md)
與 [`docs/sdd-workflow.md`](../../../docs/sdd-workflow.md) 定義。Project SDD
lint 只負責 project headings、goal/status/ownership/retired-path 規則；
`openspec validate`、受影響的 code/test gates、以及 Source-Verify +
write-back/archive 仍各自報告。

## Goals / Non-Goals

**Goals：**

- 提供 `scripts/check-sdd.sh [--strict] [repo-root]`，從 script path 或明確
  root 取得唯一掃描根目錄，且不依賴 caller current directory。
- 將 strict、ratchet baseline 與明確 deferred warning 分成可重複的資料流，
  以穩定排序診斷與 exit `0`、`1`、`2` 供本地與 CI 使用。
- 對 active change 與其 canonical spec 採 strict 驗證，並以版本化 baseline
  隔離未被 active change 引用的既有 legacy debt。

**Non-Goals：**

- 不新增 API、DB、產品 runtime、dependency、inventory generator 或
  ADR-034 E2E path 的正式裁決。
- 不以字串相似度判定 goal 語意、查詢 GitHub PR 外部狀態，或將 warning-only
  項目暗中升級為 blocking rule。
- 不把 `openspec validate`、`/opsx:verify` 或 `check-spec-artifacts.sh`
  宣稱為本 command 的等價替代。

## Decisions

1. **採用 Bash 3.2-compatible、零 dependency 的 entry point。** 維護者的
   macOS 與 Ubuntu CI 都可直接執行，且治理 gate 不需先安裝 language runtime 或
   test framework。相較之下，現代 Bash 功能、Bats、Python 或 Node 可使程式較短，
   但會新增環境與安裝契約，違反本變更的離線、local/CI parity 邊界。
2. **採用 strict／baseline-eligible／warning-only 三條 diagnostics stream 與
   normalized TSV ratchet。** strict stream 立即阻擋 active artifacts；eligible
   stream 以同一格式交給 `comm` 比對，讓 legacy debt 可見但不得增加；deferred
   stream 保留不可靠的機械判斷為 warning。立即全 repository strict 會被既有
   debt 阻塞，全部 audit-only 則不能形成 gate；以 human-readable message 當
   baseline key 也會因文案變動產生不穩定結果。
3. **採用獨立的 `Project SDD Lint` CI job。** job 只執行與本地相同的 command，
   讓 governance failure 可被直接辨識，並維持四個 gate 的責任分界。把它包入
   `openspec validate`、generic validation 或 application test job 雖可減少 YAML，
   卻會重新混淆 schema、文件治理與 code/test 的結果。
4. **在 generator contract 出現前將 inventory freshness 維持 warning-only。**
   `INVENTORY_FRESHNESS_UNVERIFIED` 每次都可見，誠實表示尚無 manifest、source
   set、normalization 與 `--check`。以 mtime、日期或猜測的檔案集合宣稱 freshness
   已驗證，會產生不可重複且不可信的 blocking 結果。
5. **在 Red 前先對齊 shell test-harness ownership。** 以
   `governance-propagation` 同步 `.claude/agents/senior-qa.md` 與
   `.claude/agents/senior-devops.md`，明定 `scripts/*-tests.sh` 由
   `senior-qa` 擁有，而 production `scripts/` 仍由 `senior-devops` 擁有。
   不把 Red 改派給 `senior-devops`，因 testing constitution 要求 Red 必須由
   `senior-qa` 擁有；也不搬移既有 Bash harness，因為另建 QA test path 會拆散
   repository 已採用的 hermetic shell-test 慣例。
6. **將 CI integration 與 final archive 拆成兩個 PR group。** Intermediate
   CI integration PR 只承載 committed CI Red/Green 與 `CLAUDE.md` local parity，
   並遵守一般 file-count／diff-size guardrails；所有 `/opsx:apply` checkboxes
   完成後，獨立 final archive PR 才執行 command-only verification 與 apply 外的
   non-checkbox pre-merge archive。將兩者合併會超過一般五檔限制；維護者於
   2026-08-26 核准的例外只涵蓋 archive 的恰好六個 logical non-test files，不能用來
   承接 CI、`CLAUDE.md`、STATUS 或其他 scope。

## Command contract

`scripts/check-sdd.sh` 使用 macOS Bash 3.2 與 Ubuntu Bash 都可執行的語法。
實作只使用 Bash 3.2、POSIX `awk`、`grep`、`sed`、`sort`、`comm` 與標準
檔案工具；不得使用 associative arrays、`mapfile`、`readarray`、`grep -P`、
`sed -r`、GNU-only flags、Python、Node、Bats 或新 dependency。

預設模式將 baseline-eligible 的既有 debt 視為 warning；`--strict` 將該類
debt 升級為 error。兩種模式都不升級明確 deferred warning。command 不修改
repository 檔案，並輸出下列格式：

```text
ERROR [RULE_ID] relative/path: message
WARNING [RULE_ID] relative/path: message
Project SDD lint: <errors> error(s), <warnings> warning(s)
```

診斷以 severity、rule ID、path、message 的順序穩定排序。exit `0` 表示沒有
blocking error；exit `1` 表示 strict violation、new/stale baseline entry 或
strict mode 升級的 eligible debt；exit `2` 表示 usage、必要 scanner input
或 baseline 格式不正確而無法可靠掃描。

## Diagnostic pipeline

資料流固定如下，收集階段先寫入暫存的 normalized diagnostic records，最後才
統一排序與渲染：

```text
resolve root/config
→ collect strict diagnostics
→ collect baseline-eligible diagnostics
→ validate/sort baseline
→ comm actual vs baseline for new/stale entries
→ collect warning-only diagnostics
→ stable sort/render
→ exit 0/1/2
```

`resolve root/config` 驗證 CLI 旗標、解析 script-relative default root 或傳入
root，並確認 `specs/STATUS.md`、active change 目錄、baseline 與必要治理
inputs 存在。strict 與 eligible collector 均輸出相同 key 形狀，避免以 human
message 反向比對。baseline 比較在 `LC_ALL=C` 排序後透過 `comm` 產生新增與
stale 集合；warning-only collector 在比較後執行，確保其結果不會進入
baseline 或影響 ratchet 結果。

## Ratchet baseline algorithm

`scripts/sdd-lint-baseline.txt` 是可 review 的 normalized TSV，一行一筆：

```text
RULE_ID<TAB>relative/path<TAB>stable-detail
```

baseline parser 拒絕空欄、非三欄、glob、不存在 path、不允許 rule、重複項目與
未排序項目，並以 `BASELINE_FORMAT` 及 exit `2` 回報無法可靠解讀的檔案。只允許
`LEGACY_SPEC_HEADING` 與 `LEGACY_STATUS_DRIFT` 進入 baseline；active change、
assignee、exception、retired command 與 Source-Verify 皆為 strict，不能藉由
baseline 豁免。

collector 產生的 actual eligible TSV 與 baseline 比較：actual 有而 baseline
沒有者是 new debt，baseline 有而 actual 沒有者是 stale debt，兩者均為 error
並 exit `1`。交集在 default mode 產生 warning，在 `--strict` 產生 error；因此
cleanup 同時修正 artifact 與移除相同 baseline entry，才會恢復通過。

## Rule matrix

下表的 strict rule ID 直接對應已核准的設計；實作以可定位的 path 與事實輸出
診斷，而完整治理語意仍以正典規格與 workflow 為準。

| 類別 | Rule ID | 機械檢查邊界 |
|---|---|---|
| Strict | `STATUS_ARTIFACT_SYNC` | 每個 active canonical spec 有且只有一個 STATUS row，且每個 STATUS feature row 均可解析到唯一對應 spec；ID/module/number 與允許狀態同步。 |
| Strict | `ACTIVE_CHANGE_SPEC` | 每個非 archive change 的 `proposal.md` 恰好引用一個存在的 `對應 Spec:` path，且該 path 可解析到 STATUS row。 |
| Strict | `ACTIVE_CHANGE_STAGE` | active change 對應 STATUS 不可為 `spec-ready`、`done`、`archived` 或 `deferred`；branch/stage 的純 repository-local contradiction 亦為 error。 |
| Strict | `SPEC_REQUIRED_HEADING` | active/new canonical spec 恰有一個非空 `## 功能目標` 與 `## 規格相依性`。 |
| Strict | `SPEC_REQUIRED_IDS` | active/new canonical spec 有 FR、SC、適用 AC 與 page-scoped traceability 或明確 exception。 |
| Strict | `SOURCE_VERIFY_ID` | active proposal/design/tasks/delta 的既有 FR/SC/AC token 在其 canonical spec 逐字可定位。 |
| Strict | `TASK_ASSIGNEE` | 每個 checkbox task line 結尾恰一個存在的 `[@agent-name]` 或 `[@main]`。 |
| Strict | `TASK_STORY_GOAL` | 每個 User Story phase 有 `**故事目標**` 且引用至少一個 canonical SC ID。 |
| Strict | `TASK_EXCEPTION` | 僅接受 `package-manager`、`scaffold`、`governance-propagation`；使用 exception 時必須恰有一組完整且非空的 `Exception:`、`Files:`、`Reason:`。 |
| Strict | `TASK_RED_OWNER` | 明確 Red task 由 `[@senior-qa]` 擁有，且位於 paired Green task 前。 |
| Strict | `TASK_FILE_OWNER` | file path 唯一且 ownership map 明確時，owner 必須符合已對齊的責任：`scripts/*-tests.sh` 屬 `senior-qa`，production `scripts/` 屬 `senior-devops`；對齊 guidance 的 `governance-propagation` task 必須排在相關 Red task 前。 |
| Strict | `RETIRED_COMMAND` | active guidance 不得含 repository-local `npm test`、`npm run ...`、pipeline stage `/ui-ux-pro-max` 或非歷史 `/speckit.analyze`；`pnpm` 是 negative control。 |
| Strict | `BASELINE_FORMAT` | baseline 的排序、唯一、path、rule eligibility 與 new/stale 比較皆有效。 |

| 類別 | Rule ID | 處理方式 |
|---|---|---|
| Baseline-eligible | `LEGACY_SPEC_HEADING` | 僅掃描未被 active change 引用的 canonical spec 之 required/適用 traceability headings。 |
| Baseline-eligible | `LEGACY_STATUS_DRIFT` | 僅收錄可靜態證明且由後續 spec/status cleanup 處理的 repository-local drift。 |
| Warning-only | `GOAL_SEMANTIC_REVIEW` | 語意一致性留給人工 review。 |
| Warning-only | `TASK_FILE_COUNT_REVIEW` | ordinary task file-count ambiguity 留給人工 review。 |
| Warning-only | `TASK_RED_EVIDENCE_REVIEW` | commit 順序與預期 failure 屬 runtime evidence。 |
| Warning-only | `STATUS_EXTERNAL_STATE` | GitHub PR/merge 狀態不可離線可靠證明。 |
| Warning-only | `E2E_PATH_DECISION` | ADR-034 未接受，不裁決 `frontend/tests/` 與 root `e2e/`。 |
| Warning-only | `INVENTORY_FRESHNESS_UNVERIFIED` | 無 generator manifest/source set/normalization/`--check` contract 時固定可見，且永不單獨導致非零。 |

## Scan boundaries

active inputs 為 `specs/*/[0-9][0-9][0-9]-*/spec.md`、`specs/STATUS.md`、
`openspec/changes/<active-change>/`、`openspec/config.yaml`、
`docs/sdd-workflow.md`、`.claude/skills/sdd-workflow/`、`.claude/commands/`、
`.claude/agents/` 的 active governance consumers、`AGENTS.md`、`CLAUDE.md` 與
active task templates。

scanner 明確排除 `openspec/changes/archive/`、`docs/adr/` 的歷史內容/changelog、
`docs/superpowers/` 的方案比較或 retired wording、`.worktrees/`、`.superpowers/`、
其他 ignored scratch space 與 generated inventory views。`RETIRED_COMMAND` 只掃描
active inputs，避免把「已退役」的歷史敘述誤報為現行指引。inventory 不以 mtime 或
日期推論 freshness；在 generator branch 提供 manifest 與 `--check` 前，
`INVENTORY_FRESHNESS_UNVERIFIED` 每次執行都輸出。

## CI integration

`.github/workflows/ci.yml` 建立 top-level `sdd-lint` job，display name 為
`Project SDD Lint`，只 checkout repository 並執行 `scripts/check-sdd.sh`；它不
依賴 backend、frontend 或 prototype install。`CLAUDE.md` 同一 PR 列出 project
root 的相同 local command，維持 local/CI parity。該 PR 是 intermediate CI
integration group，只包含 committed CI Red/Green 與 local parity，遵守一般
file-count／diff-size guardrails，且不執行 archive。

此 job 與 `openspec validate --changes --no-interactive` 分開，既不包裝也不取代
OpenSpec schema validation。branch protection 是否將 job 設為 required 是 GitHub
外部狀態，PR handoff 必須明確提出，但不由離線 scanner 判定。

## SDD and PR sequencing

本變更依序使用 Design/Specify、Propose、Red/Green、CI integration 與 final
archive groups。Red 與 Green 維持 serial、separate commits，但 Red/Green PR
結束時測試必須為綠；CI integration 則在另一個 intermediate PR 依序完成 CI Red、
CI Green 與 `CLAUDE.md` local parity，並在一般 guardrails 內合併，不攜帶任何
archive/write-back 檔案。

Final archive PR 先執行 command-only final verification，並將它作為最後一個
`/opsx:apply` checkbox。所有 apply tasks 完成後，才在 `/opsx:apply` 外執行
non-checkbox pre-merge archive/write-back。維護者已於 2026-08-26 明確核准一次性
atomic six-file exception，且只涵蓋下列恰好六個 logical non-test archive files：

1. canonical `specs/foundation/001-project-sdd-lint/spec.md` write-back；
2. derived `openspec/specs/foundation/001-project-sdd-lint/spec.md`；
3. `proposal.md` 的 active-to-archive rename；
4. `design.md` 的 active-to-archive rename；
5. `tasks.md` 的 active-to-archive rename；
6. delta spec 的 active-to-archive rename。

每一組 source/destination 視為一個 logical rename。此例外不涵蓋
`.github/workflows/ci.yml`、`CLAUDE.md`、`specs/STATUS.md`、agent guidance 或
其他檔案；若 archive 實際產生任何額外或不同 path，流程在 commit 前停止並回到
maintainer checkpoint。`specs/STATUS.md` 的 umbrella `done` transition 與
active-path retention 留在 final merge 後的 non-apply continuation，不進入本例外。

## Risks / Trade-offs

- [regex 可能將相似但非現行的文字誤判為 retired command] → 僅掃描列出的 active
  inputs、保留歷史／scratch exclusions，並以 `pnpm` negative control fixture 防止
  將非 `npm` command 誤報。
- [baseline 可能遮蔽長期 legacy debt] → baseline 只允許兩個 eligible rule、必須
  排序唯一且無 glob；new/stale entry 均失敗，`--strict` 與後續 cleanup 可逐步將
  debt 歸零。
- [獨立 CI gate rollout 可能暫時影響合併流程] → 先以本地與 CI evidence 驗證
  command，再由 maintainer 設定外部 required check；rollback 先移除或停用外部
  required-check expectation，再回復 intermediate CI integration 的 workflow 與
  local parity，且不把移除 gate 描述為 scanner 成功。
- [archive 可能產生超出核准六檔的 generated scope] → 在 commit 前比對 canonical
  write-back、derived spec 與四個 artifact renames；任何額外或不同 path 都停止並
  回到 maintainer checkpoint，不以一次性例外推定批准。

## Migration Plan

1. 在 Red 前先完成 `governance-propagation`：同步
   `.claude/agents/senior-qa.md` 與 `.claude/agents/senior-devops.md`，使
   `scripts/*-tests.sh` 的 `senior-qa` ownership 與 production `scripts/` 的
   `senior-devops` ownership 成為 authoritative guidance。
2. `[@senior-qa]` 再提交 fixture Red contract，記錄 `scripts/check-sdd.sh` 缺失
   的預期 failure；`[@senior-devops]` 之後新增排序 baseline 與 Bash command，使
   同一 contract 轉綠。
3. 在 repository 與 synthetic fixtures 執行 command、baseline、OpenSpec schema
   與其他適用 evidence，確認 `INVENTORY_FRESHNESS_UNVERIFIED` 可見但不單獨造成
   nonzero。
4. 在 intermediate CI integration PR 先提交 CI Red，再新增獨立 `sdd-lint`
   workflow job使其轉綠，最後加入相同 local command；本 PR 遵守一般 guardrails，
   且不執行 archive。CI 成功觀察後，handoff 才請 maintainer 將
   `Project SDD Lint` 設為外部 required check。
5. 在獨立 final archive PR 執行 command-only final verification，完成最後一個
   `/opsx:apply` checkbox；確認所有 apply tasks 已完成後，才在 apply 外執行
   non-checkbox pre-merge archive。archive 只可產生核准的 canonical write-back、
   derived spec 與四個 OpenSpec artifact renames；scope 不一致就停止於 checkpoint。
6. 若 CI rollout 必須回復，先由 maintainer 移除或停用外部 required-check
   expectation，避免 PR 因不存在的 check 卡住；再回復 intermediate CI integration
   的 workflow 與 `CLAUDE.md` local parity。此 rollback 不宣稱 scanner 成功或
   inventory freshness 已驗證。
7. 若 final archive 在 merge 前需要回復，撤回只含核准六個 logical files 的
   final archive PR 並保持 OpenSpec change 為 active；已合併的 CI integration PR
   不因 archive rollback 被納入一次性例外或一併回復。

## TDD and evidence

Red 前先由 `governance-propagation` task 對齊兩份 authoritative agent guidance：
`.claude/agents/senior-qa.md` 將 `scripts/*-tests.sh` 納入 QA ownership，
`.claude/agents/senior-devops.md` 則保留 production `scripts/` ownership 並排除
該 test-harness glob。完成此順序後，`senior-qa` 才在既有
`scripts/speckit-tests.sh` 建立 synthetic throwaway repository fixtures，覆蓋
passing、strict mutations、task ownership、retired command（含 `pnpm` negative
control）、baseline exact/new/stale/duplicate/unsorted、explicit root、`--strict`
與 inventory warning。Red task 僅修改測試，必須先 commit 並確認因
`scripts/check-sdd.sh` 不存在而以預期原因失敗；Green task 不得修改 Red contract。

Green evidence 至少包括：

```bash
bash -n scripts/check-sdd.sh scripts/speckit-tests.sh
bash scripts/speckit-tests.sh
scripts/check-sdd.sh
scripts/check-spec-artifacts.sh
openspec validate --changes --no-interactive
git diff --check
```

上述命令分別記錄。lint、OpenSpec schema、受影響 code/test 與 archive-time
Source-Verify/write-back 仍是四個獨立 gate；archive 後另逐一 grep derived view
的 canonical citations。CI Red/Green 與 local parity 在 intermediate PR 完成；
command-only final verification 是最後一個 apply task，pre-merge archive 則在所有
apply checkboxes 完成後以 non-checkbox continuation 執行。

## Error handling

- CLI 旗標、root、必要檔案/目錄或 baseline 無法解析時，輸出可定位的 usage 或
  configuration 訊息並 exit `2`；不得輸出假成功或自動修復 baseline。
- 單一 active artifact 違反 strict contract 時，保留其 path 與 rule ID，繼續
  收集其他 deterministic diagnostics，最後 exit `1`。
- baseline 格式錯誤優先表示 scanner 無法可信比較，維持 exit `2`；有效 baseline
  的 new/stale 及 strict-mode eligible debt 則是 exit `1`。
- 可重用 `scripts/check-spec-artifacts.sh` 的 STATUS contract；若其失敗，保留
  stderr 並輸出 `STATUS_ARTIFACT_SYNC`，不可被其他成功規則掩蓋。
- 需要重新定義治理才能判斷的項目維持 warning 並連結 canonical authority，
  不在 script 發明新 rule。

## Constitution Check（憲法檢查）

- **I. Spec-First**：本設計重述的功能目標與正典 `## 功能目標` 一致，並以既有
  FR/AC/SC ID 作為可追溯 contract。
- **IV. Test-First**：fixture Red commit 與預期失敗先於 Green command，細節遵循
  [`testing constitution`](../../../specs/_governance/testing-constitution.md)。
- **X. Change Scope Discipline**：僅定義 lint、baseline、fixture 與獨立 CI 的
  實作邊界，不混入 cleanup、inventory regeneration、API、DB 或產品行為。
  Intermediate CI integration PR 遵守一般 guardrails；final archive 的六個
  logical non-test files 依 2026-08-26 maintainer 明確核准的一次性例外處理，且
  不擴張至 CI、`CLAUDE.md`、STATUS 或 unexpected archive scope。
- **XVII. CI/CD Quality Gates**：同一 local command 由獨立 CI job 執行，且不混淆
  四個 gate。
- **XX. Source of Truth & Contract Governance**：canonical spec 與治理文件維持
  authority；baseline 與 OpenSpec artifact 僅消費、不覆寫正典。
- **II. Generalization-First** 與 **III. Data Fairness**：本 command 不變更
  task runtime、dataset、annotator response、gold answer 或 scoring metadata，
  因此不引入這兩項 NON-NEGOTIABLE 的風險。
