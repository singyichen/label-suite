# Design: implement-project-sdd-lint

## Context（脈絡）

本設計實作 [proposal.md](proposal.md) 的 Project SDD lint，服務
`specs/foundation/001-project-sdd-lint/spec.md` v1.1.2 定義的 FR-001–FR-009、
AC-1.1–AC-4.4 與 SC-001–SC-008。目標是把可離線、可機械判斷的文件治理
規則變成單一 command，並組合已交付的 generated screen inventory freshness
contract，而不是重述或取代既有治理內容。

正典 authority、四個 gate 與 archive 時的 Source-Verify 責任維持由
[`specs/_governance/constitution.md`](../../../specs/_governance/constitution.md)
與 [`docs/sdd-workflow.md`](../../../docs/sdd-workflow.md) 定義。Project SDD
lint 只負責 project headings、goal/status/ownership/retired-path 規則；
`openspec validate`、受影響的 code/test gates、以及 Source-Verify +
write-back/archive 仍各自報告。

## Goals / Non-Goals

**Goals：**

- 提供 `scripts/check-sdd.sh [--strict] [repo-root]`，從 script path 解析 checker
  root、從 optional argument 解析 target root；inventory generator 僅可在兩個
  canonical resolved roots 相同時執行，且不依賴 caller current directory。
- 將 strict、ratchet baseline 與明確 deferred warning 分成可重複的資料流，
  以穩定排序診斷與 exit `0`、`1`、`2` 供本地與 CI 使用。
- 對 active change 與其 canonical spec 採 strict 驗證，並以版本化 baseline
  隔離未被 active change 引用的既有 legacy debt。
- 以 same-trust resolved target root 組合既有 `scripts/gen-screen-inventory.mjs --check`，
  將 fresh、exact-sentinel stale、foreign-root refusal 與 scanner configuration
  result 映射為穩定的 Project SDD lint diagnostic 與 exit code。

**Non-Goals：**

- 不新增 API、DB、產品 runtime、package dependency、inventory generator、sandbox、
  timeout、byte-provenance mechanism 或 generator `--root` flag；
  ADR-034 E2E path 的正式裁決；不修改 generator、manifest、prototype、inventory
  tests 或 generated output，也不重新實作或觸發 inventory regeneration。
- freshness claim 僅涵蓋 generated `design/system/screen-inventory.md`。
- 不宣稱 hand-maintained `design/system/inventory.md` 或 `design-inventory.dc.html`
  freshness、generation、byte-current 或 coverage 已受驗證。
- 不以字串相似度判定 goal 語意、查詢 GitHub PR 外部狀態，或將 warning-only
  項目暗中升級為 blocking rule。
- 不把 `openspec validate`、`/opsx:verify` 或 `check-spec-artifacts.sh`
  宣稱為本 command 的等價替代。

## Decisions

1. **採用 Bash 3.2-compatible、無新增 package dependency 的 entry point。**
   scanner 主體維持 Bash 3.2 與既有 POSIX 工具，只對 inventory freshness 以
   `node "$repo_root/scripts/gen-screen-inventory.mjs" --check` 組合 repository
   已交付且已版本化的 generator；CI 與本地都不增加 install 或 setup step。
   相較之下，將 scanner 全面改寫為 Node、Python 或 Bats 會擴張 runtime 與測試
   邊界，而在 Bash 內重作 manifest/source/render 邏輯則會建立第二套 freshness
   authority，因此兩者皆不採用。
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
4. **組合同一 trust root 的既有 generator contract，將 inventory freshness 設為 blocking。**
   lint 先比較 canonical resolved checker／target roots；不同時以
   `INVENTORY_CHECK_CONFIG`／exit `2` 拒絕且不啟動 child。相同時才使用 target root 呼叫既有 `--check`，capture 並 suppress child
   combined stdout/stderr，再以 child exit 與 normalized whole-output equality 對照
   versioned sentinel，映射 `INVENTORY_FRESHNESS` 或 `INVENTORY_CHECK_CONFIG`。這讓
   generator 保持 manifest、
   source set、validation 與 rendering 的唯一 authority；相較之下，保留 retired
   inventory warning 會與 canonical v1.1.2 衝突，以 mtime、日期或 Bash 重作
   freshness 也無法提供相同的 byte-current 契約。
5. **在所有 text／TSV pathname flow 前採 NUL-safe control-character preflight。**
   每個動態掃描 subtree 先以 `find ... -print0` 與 Bash 3.2-compatible NUL read
   檢查 repository-relative path；newline、tab、carriage return 與其他 ASCII／
   locale-independent control character 一律以安全 path `.` 產生 `SCANNER_CONFIG`／
   exit `2`，不回顯 hostile pathname。這不是 baseline 規則，也不擴張至
   `check-spec-artifacts.sh`。
6. **在 Red 前先對齊 shell test-harness ownership。** 以
   `governance-propagation` 同步 `.claude/agents/senior-qa.md` 與
   `.claude/agents/senior-devops.md`，明定 `scripts/*-tests.sh` 由
   `senior-qa` 擁有，而 production `scripts/` 仍由 `senior-devops` 擁有。
   不把 Red 改派給 `senior-devops`，因 testing constitution 要求 Red 必須由
   `senior-qa` 擁有；也不搬移既有 Bash harness，因為另建 QA test path 會拆散
   repository 已採用的 hermetic shell-test 慣例。
7. **將 CI integration 與 final archive 拆成兩個 PR group。** Intermediate
   CI integration PR 只承載 committed CI Red/Green 與 `CLAUDE.md` local parity，
   並遵守一般 file-count／diff-size guardrails；所有 `/opsx:apply` checkboxes
   完成後，獨立 final archive PR 才執行 command-only verification 與 apply 外的
   non-checkbox pre-merge archive。分組依據是 single-purpose 與 apply/archive
   sequencing。依憲法 v1.33.0 Principle X，archive 的
   `specs/**` 與 `openspec/**` artifacts 同時排除於 file-count 與 line-count
   threshold arithmetic，因此恰好六個 logical archive artifacts 依一般門檻計算，
   仍不得承接 CI、`CLAUDE.md`、STATUS 或其他 scope。

## Command contract

`scripts/check-sdd.sh` 使用 macOS Bash 3.2 與 Ubuntu Bash 都可執行的語法。
實作只使用 Bash 3.2、POSIX `awk`、`grep`、`sed`、`sort`、`comm` 與標準
檔案工具；不得使用 associative arrays、`mapfile`、`readarray`、`grep -P`、
`sed -r`、GNU-only flags、Python、Bats 或新 dependency。唯一的 Node boundary
是 same-trust resolved target root 的既有 generator：
`node "$repo_root/scripts/gen-screen-inventory.mjs" --check`；command 不安裝 Node、
不新增 package，也不重作或執行 inventory write mode。

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
strict mode 升級的 eligible debt；exit `2` 表示 usage、unsafe pathname、必要 scanner input
或 baseline 格式不正確而無法可靠掃描。inventory mapping 固定如下，且 child
raw output 不得直接進入 lint output：

| Generator result | Project SDD lint result |
|---|---|
| same-trust generator exit `0` | 不輸出 inventory diagnostic；lint outcome 依其他 rules 決定。 |
| same-trust generator exit `1`，且 command substitution 移除 trailing newlines 後的 captured combined stdout/stderr 整體字串恰好等於 sentinel `design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs` | 輸出 `ERROR [INVENTORY_FRESHNESS] design/system/screen-inventory.md: ...`；lint exit 至少為 `1`。 |
| foreign target root，或 same-trust generator／Node 缺少、generator 無法讀取、load 或執行、exit `2`、exit `1` 但整體 captured combined output 不恰好等於 sentinel（包括 prefix、suffix 或額外 nonblank line），或任何其他 unexpected result | 輸出 `ERROR [INVENTORY_CHECK_CONFIG] scripts/gen-screen-inventory.mjs: ...`；lint exit `2`；foreign root 不執行 child。 |

Bash boundary 使用一個 immutable sentinel constant，並以 `if` command context
capture combined stdout/stderr 與保存 child status，避免 `set -e` 在 nonzero child
result 時提前終止 scanner：

```bash
readonly inventory_sentinel='design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs'
if inventory_output="$(node "$repo_root/scripts/gen-screen-inventory.mjs" --check 2>&1)"; then
    inventory_status=0
else
    inventory_status=$?
fi
```

Bash command substitution 會移除 captured output 的所有 trailing newline characters；
因此 mapping 必須在此 normalization 之後，以 `[ "$inventory_output" =
"$inventory_sentinel" ]` 比較整個字串。不得使用 substring search、逐行 match 或
任何 filter 來判斷 stale；只有 child status `1` 且 whole-string equality 成立才是
`INVENTORY_FRESHNESS`。

configuration exit `2` 優先於 stale 或其他 governance exit `1`，但 scanner 仍可
render 已安全收集的穩定 diagnostics 與 summary；不得洩漏 captured child raw
stdout/stderr。default 與 `--strict` 使用完全相同的 inventory severity 與 mapping。

## Diagnostic pipeline

資料流固定如下，收集階段先寫入暫存的 normalized diagnostic records，最後才
統一排序與渲染：

```text
resolve root/config
→ NUL-safe pathname preflight
→ collect strict diagnostics
→ collect baseline-eligible diagnostics
→ validate/sort baseline
→ comm actual vs baseline for new/stale entries
→ collect warning-only diagnostics
→ run target-root inventory check and capture child output/status
→ map inventory result to stable lint diagnostic
→ stable sort/render
→ select exit 2 > 1 > 0
```

`resolve root/config` 驗證 CLI 旗標、解析 script-relative default root 或傳入
root，並確認 `specs/STATUS.md`、active change 目錄、baseline 與必要治理
inputs 存在。strict 與 eligible collector 均輸出相同 key 形狀，避免以 human
message 反向比對。baseline 比較在 `LC_ALL=C` 排序後透過 `comm` 產生新增與
stale 集合；warning-only collector 在比較後執行，確保其結果不會進入
baseline 或影響 ratchet 結果。inventory collector 先拒絕不同的 canonical resolved checker／target roots；
只有 same-trust root 才執行既有 generator，以不受 `set -e` 中斷的 `if` context capture combined stdout/stderr
與 child status；command substitution 移除 trailing newlines 後，再以 entire-string
equality 對照單一 sentinel constant，最後只寫入 normalized Project SDD lint
record。即使 inventory 或其他 configuration check 需要 exit `2`，已安全收集的
穩定 diagnostics 仍可排序渲染，最後再套用 configuration precedence。

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
| Strict | `INVENTORY_FRESHNESS` | canonical resolved target root 與 checker root 相同時，generator exit `1`，且 command substitution 移除 trailing newlines 後的 captured combined output 整體恰好等於單一 stale sentinel；path 固定為 `design/system/screen-inventory.md`，blocking exit 為 `1`，除非 configuration error 要求 exit `2`。 |

| 類別 | Rule ID | 機械檢查邊界 |
|---|---|---|
| Configuration | `INVENTORY_CHECK_CONFIG` | canonical resolved target root 不同於 checker root，或 same-trust generator／Node 缺少、generator 無法讀取/load/執行、exit `2`、sentinel-less exit `1`、exit `1` + sentinel prefix/suffix/額外 nonblank line，或其他 unexpected result；path 固定為 `scripts/gen-screen-inventory.mjs`，foreign root 不啟動 child，並 suppress raw child output、要求 exit `2`。 |
| Configuration | `SCANNER_CONFIG` | 任一動態 scanned repository-relative pathname 含 ASCII／locale-independent control character；在進入任何 newline/text/TSV flow 前固定輸出安全 path `.` 與 `repository paths containing control characters are unsupported`，並 exit `2`。 |

| 類別 | Rule ID | 處理方式 |
|---|---|---|
| Baseline-eligible | `LEGACY_SPEC_HEADING` | 僅掃描未被 active change 引用的 canonical spec 之 required/適用 traceability headings。 |
| Baseline-eligible | `LEGACY_STATUS_DRIFT` | 僅收錄可靜態證明且由後續 spec/status cleanup 處理的 repository-local drift。 |
| Warning-only | `GOAL_SEMANTIC_REVIEW` | 語意一致性留給人工 review。 |
| Warning-only | `TASK_FILE_COUNT_REVIEW` | ordinary task file-count ambiguity 留給人工 review。 |
| Warning-only | `TASK_RED_EVIDENCE_REVIEW` | commit 順序與預期 failure 屬 runtime evidence。 |
| Warning-only | `STATUS_EXTERNAL_STATE` | GitHub PR/merge 狀態不可離線可靠證明。 |
| Warning-only | `E2E_PATH_DECISION` | ADR-034 未接受，不裁決 `frontend/tests/` 與 root `e2e/`。 |

## Scan boundaries

active inputs 為 `specs/*/[0-9][0-9][0-9]-*/spec.md`、`specs/STATUS.md`、
`openspec/changes/<active-change>/`、`openspec/config.yaml`、
`docs/sdd-workflow.md`、`.claude/skills/sdd-workflow/`、`.claude/commands/`、
`.claude/agents/` 的 active governance consumers、`AGENTS.md`、`CLAUDE.md` 與
active task templates。

scanner 明確排除 `openspec/changes/archive/`、`docs/adr/` 的歷史內容/changelog、
`docs/superpowers/` 的方案比較或 retired wording、`.worktrees/`、`.superpowers/`、
其他 ignored scratch space 與 generated inventory views 的直接文字掃描。
每個動態 scanned subtree 都在任何 pathname 進入 newline/text/TSV flow 前進行
`find ... -print0`／Bash 3.2-compatible NUL read control-character preflight；正常
space path 合法，unsafe pathname 不得進入 diagnostics。`RETIRED_COMMAND` 只掃描 active inputs，避免把「已退役」的歷史敘述誤報為現行
指引。inventory rule 是唯一例外 boundary：它不以 mtime、日期或 lint 自行猜測
input set，而只在 same-trust resolved target root 委派 generator `--check`；Project SDD lint
據此只宣稱 generated `design/system/screen-inventory.md` byte-current；不宣稱
hand-maintained `design/system/inventory.md` 或 `design-inventory.dc.html` 的
freshness 或 coverage 已受驗證。

## CI integration

`.github/workflows/ci.yml` 建立 top-level `sdd-lint` job，display name 為
`Project SDD Lint`，只 checkout repository 並執行 `scripts/check-sdd.sh`；它不
依賴 backend、frontend 或 prototype install，也不新增 Node setup step；runner
與本地若沒有 Node，或 resolved target root 的 generator 不可用，lint 以
`INVENTORY_CHECK_CONFIG` 與 exit `2` 明確失敗。`CLAUDE.md` 同一 PR 列出 project
root 的相同 local command，維持相同的 no-setup、target-root 與 exit mapping。
該 PR 是 intermediate CI integration group，只包含 committed CI Red/Green 與
local parity，遵守一般 file-count／diff-size guardrails，且不執行 archive。

此 job 與 `openspec validate --changes --no-interactive` 分開，既不包裝也不取代
OpenSpec schema validation。branch protection 是否將 job 設為 required 是 GitHub
外部狀態，PR handoff 必須明確提出，但不由離線 scanner 判定。

## SDD and PR sequencing

本變更依序使用 Design/Specify、Propose、Red/Green、CI integration、Stage 3 security
remediation 與 final archive groups。Red 與 Green 維持 serial、separate commits，但 Red/Green PR
結束時測試必須為綠；CI integration 則在另一個 intermediate PR 依序完成 CI Red、
CI Green 與 `CLAUDE.md` local parity，並在一般 guardrails 內合併，不攜帶任何
archive/write-back 檔案。

3.1 command-only verification 後，Stage 3 依序執行 4.1 → 4.2 → 4.3 → 4.4：QA Red、
DevOps same-trust Green、QA pathname Red、DevOps NUL-safe Green。4.4 是最後一個
`/opsx:apply` checkbox；全部十三個 apply tasks 完成後，才在 `/opsx:apply` 外執行
non-checkbox pre-merge archive/write-back。依憲法 v1.33.0 Principle X，
`specs/**` 與 `openspec/**` artifacts 同時排除於 file-count 與 line-count
threshold arithmetic；所以下列恰好六個 logical archive artifacts 採一般門檻
計算：

1. canonical `specs/foundation/001-project-sdd-lint/spec.md` write-back；
2. derived `openspec/specs/foundation/001-project-sdd-lint/spec.md`；
3. `proposal.md` 的 active-to-archive rename；
4. `design.md` 的 active-to-archive rename；
5. `tasks.md` 的 active-to-archive rename；
6. delta spec 的 active-to-archive rename。

每一組 source/destination 視為一個 logical rename。threshold exclusion 只改變
門檻算術，不解除 single-purpose 或 scope-drift rules；final archive PR 不涵蓋
`.github/workflows/ci.yml`、`CLAUDE.md`、`specs/STATUS.md`、agent guidance 或
其他檔案。若 archive 實際產生任何額外或不同 path，流程必須在 commit 前停止並
回到 maintainer scope-drift checkpoint。`specs/STATUS.md` 的 umbrella `done`
transition 與 active-path retention 是 final merge 後的獨立 non-apply umbrella
active-path exception，與 archive threshold arithmetic 是不同契約，且不得移入
final archive PR。

## Risks / Trade-offs

- [regex 可能將相似但非現行的文字誤判為 retired command] → 僅掃描列出的 active
  inputs、保留歷史／scratch exclusions，並以 `pnpm` negative control fixture 防止
  將非 `npm` command 誤報。
- [baseline 可能遮蔽長期 legacy debt] → baseline 只允許兩個 eligible rule、必須
  排序唯一且無 glob；new/stale entry 均失敗，`--strict` 與後續 cleanup 可逐步將
  debt 歸零。
- [Node 或 generator boundary 不可用時，inventory freshness 無法可信判斷] →
  不降級為 warning 或假 fresh；以 `INVENTORY_CHECK_CONFIG`、固定 generator path
  與 exit `2` fail closed，且 CI/local 都不加入會掩蓋環境差異的 setup step。
- [generator 的一般 exit `1` 或 load/runtime error 可能回顯 sentinel 而與 stale
  混淆] → 只接受 normalized combined output 整體恰好等於 versioned sentinel；
  prefix、suffix、額外 nonblank line 與其他 exit `1` 一律視為 configuration error，
  capture/suppress raw output，只渲染穩定 lint diagnostic。
- [獨立 CI gate rollout 可能暫時影響合併流程] → 先以本地與 CI evidence 驗證
  command，再由 maintainer 設定外部 required check；rollback 先移除或停用外部
  required-check expectation，再回復 intermediate CI integration 的 workflow 與
  local parity，且不把移除 gate 描述為 scanner 成功。
- [v1.33.0 threshold exclusion 可能被誤讀為 archive scope 可擴張] → 在 commit 前
  比對 canonical write-back、derived spec 與四個 artifact renames；即使六個
  `specs/**`／`openspec/**` artifacts 不計入兩項門檻，任何額外或不同 path 仍因
  single-purpose 與 scope-drift rules 停止並回到 maintainer checkpoint。

## Migration Plan

1. 在 Red 前先完成 `governance-propagation`：同步
   `.claude/agents/senior-qa.md` 與 `.claude/agents/senior-devops.md`，使
   `scripts/*-tests.sh` 的 `senior-qa` ownership 與 production `scripts/` 的
   `senior-devops` ownership 成為 authoritative guidance。
2. `[@senior-qa]` 再提交 fixture Red contract，記錄 `scripts/check-sdd.sh` 缺失
   的預期 failure；`[@senior-devops]` 之後新增排序 baseline 與 Bash command，使
   同一 contract 轉綠。
3. 在 synthetic target-root generator boundary fixtures 先證明 fresh、whole-output
   exact-sentinel stale 與各 configuration result，再在 real repository 直接執行
   `node scripts/gen-screen-inventory.mjs --check` 與 Project SDD lint；不得重新生成
   inventory，也不得出現 retired inventory warning。
4. 在 intermediate CI integration PR 先提交 CI Red，再新增獨立 `sdd-lint`
   workflow job使其轉綠，最後加入相同 local command；本 PR 遵守一般 guardrails，
   且不執行 archive。CI 成功觀察後，handoff 才請 maintainer 將
   `Project SDD Lint` 設為外部 required check。
5. 在獨立 final archive PR 執行 command-only final verification，完成最後一個
   `/opsx:apply` checkbox；確認所有 apply tasks 已完成後，才在 apply 外執行
   non-checkbox pre-merge archive。archive 只可產生 canonical write-back、derived
   spec 與四個 OpenSpec artifact renames；這六個 artifacts 依 v1.33.0 的一般門檻
   算術排除於 file-count 與 line-count，但 scope 不一致仍須在 commit 前停止於
   maintainer checkpoint。final merge 後才另行處理 umbrella `done` transition 與
   active-path retention，不得將該獨立 umbrella exception 提前納入 archive。依
   SC-007，合併後 Issue #375 交接只可勾選六個已交付 D 項目：正典標題、
   STATUS/stage、Source-Verify、task 單檔／例外、assignee／file ownership 與
   design inventory freshness。複合 retired-path/command D checkbox 與 combined
   acceptance 維持未勾選並延期，直到另案取得 ADR-034/path authority，並完成
   named filesystem paths 的 QA Red 與 production Green；本工作流不接受
   ADR-034，亦不修改執行期程式碼。
6. 若 CI rollout 必須回復，先由 maintainer 移除或停用外部 required-check
   expectation，避免 PR 因不存在的 check 卡住；再回復 intermediate CI integration
   的 workflow 與 `CLAUDE.md` local parity。此 rollback 不宣稱 scanner 成功或
   inventory freshness 已驗證，也不得以 retired warning 取代 canonical v1.1.2
   的 blocking contract；若需撤回該 contract，必須先走正典 spec 變更而非只改
   scanner。
7. 若 final archive 在 merge 前需要回復，撤回只含上述六個 logical artifacts 的
   final archive PR 並保持 OpenSpec change 為 active；其 threshold arithmetic
   仍依 v1.33.0 的一般排除規則。已合併的 CI integration PR 目的獨立，不因
   archive rollback 而一併回復；尚未執行的 post-merge umbrella active-path
   exception 也維持未執行。

## TDD and evidence

Red 前先由 `governance-propagation` task 對齊兩份 authoritative agent guidance：
`.claude/agents/senior-qa.md` 將 `scripts/*-tests.sh` 納入 QA ownership，
`.claude/agents/senior-devops.md` 則保留 production `scripts/` ownership 並排除
該 test-harness glob。完成此順序後，`senior-qa` 才在既有
`scripts/speckit-tests.sh` 建立 synthetic throwaway repository fixtures，覆蓋
passing、strict mutations、task ownership、retired command（含 `pnpm` negative
control）、baseline exact/new/stale/duplicate/unsorted、explicit root、`--strict`
與 inventory generator boundary。inventory fixtures 在 synthetic target root 放置
最小 generator doubles，分別涵蓋 fresh exit `0`、exit `1` + whole output 恰為
exact stale sentinel、exit `1` + sentinel prefix、exit `1` + sentinel suffix、
exit `1` + sentinel 及額外 nonblank line、missing generator、unreadable generator、
unloadable generator、unrunnable Node/
generator boundary、exit `2` 與 sentinel-less exit `1`；assert raw child output 被
suppress、diagnostic path/exit mapping 正確，且 default/`--strict` 結果不變。
explicit-root case 在 caller checkout 放置 decoy boundary，證明實際呼叫 target root；
另斷言 retired inventory warning 不再出現。Red task 僅修改測試，
必須先 commit 並確認因 `scripts/check-sdd.sh` 不存在而以預期原因失敗；Green task
不得修改 Red contract。

Green evidence 至少包括：

```bash
bash -n scripts/check-sdd.sh scripts/speckit-tests.sh
bash scripts/speckit-tests.sh
node scripts/gen-screen-inventory.mjs --check
scripts/check-sdd.sh
scripts/check-spec-artifacts.sh
openspec validate --changes --no-interactive
git diff --check
```

上述命令分別記錄。lint、OpenSpec schema、受影響 code/test 與 archive-time
Source-Verify/write-back 仍是四個獨立 gate；archive 後另逐一 grep derived view
的 canonical citations。CI Red/Green 與 local parity 在 intermediate PR 完成；
4.4 security Green 是最後一個 apply task，pre-merge archive 則在全部十三個
apply checkboxes 完成後以 non-checkbox continuation 執行。

## Error handling

- CLI 旗標、root、必要檔案/目錄或 baseline 無法解析時，輸出可定位的 usage 或
  configuration 訊息並 exit `2`；不得輸出假成功或自動修復 baseline。
- 單一 active artifact 違反 strict contract 時，保留其 path 與 rule ID，繼續
  收集其他 deterministic diagnostics，最後 exit `1`。
- baseline 格式錯誤優先表示 scanner 無法可信比較，維持 exit `2`；有效 baseline
  的 new/stale 及 strict-mode eligible debt 則是 exit `1`。
- inventory collector 必須先比較 canonical resolved checker／target roots；foreign
  root 固定映射 `INVENTORY_CHECK_CONFIG`／exit `2`，不啟動 child、不產生 marker，亦不
  輸出 raw child output。same-trust child combined stdout/stderr 與 status 必須透過不受 `set -e` 中斷的
  `if` context capture；command substitution 移除 trailing newlines 後，只有 exit
  `1` 且 whole output 以 `=` 恰好等於單一 sentinel constant，可映射到
  `INVENTORY_FRESHNESS` 與 `design/system/screen-inventory.md`。缺少或 unreadable
  generator、缺少 Node、load/execute failure、exit `2`、sentinel-less exit `1`、
  exit `1` + sentinel prefix/suffix/額外 nonblank line，或其他 unexpected result
  一律映射到 `INVENTORY_CHECK_CONFIG` 與
  `scripts/gen-screen-inventory.mjs`，suppress raw child output，並使最終 exit `2`。
- configuration error 對最終 exit code 有 precedence，但不得吞掉已安全收集的
  stable diagnostics；default 與 `--strict` 不改變 inventory severity。
- 每個動態 scanned subtree 在 pathname 進入任何 newline/text/TSV flow 前，必須以
  `find ... -print0` 與 Bash 3.2-compatible NUL read preflight；ASCII／locale-independent
  control character 一律以 `SCANNER_CONFIG`、path `.` 與 exit `2` 拒絕，且不得回顯
  hostile pathname。
- 可重用 `scripts/check-spec-artifacts.sh` 的 STATUS contract；若其失敗，保留
  stderr 並輸出 `STATUS_ARTIFACT_SYNC`，不可被其他成功規則掩蓋。
- 需要重新定義治理才能判斷的項目維持 warning 並連結 canonical authority，
  不在 script 發明新 rule。

## Constitution Check（憲法檢查）

- **I. Spec-First**：本設計重述的功能目標與正典 `## 功能目標` 一致，並以既有
  FR/AC/SC ID 作為可追溯 contract。
- **IV. Test-First**：fixture Red commit 與預期失敗先於 Green command，細節遵循
  [`testing constitution`](../../../specs/_governance/testing-constitution.md)；
  synthetic target-root doubles 覆蓋 fresh、whole-output exact-sentinel stale、
  prefix/suffix/額外 nonblank line、其他 configuration、explicit same-root 與
  foreign generator marker denial；另以 newline/tab/CR pathname 與 ordinary-space
  control 覆蓋 NUL-safe preflight，real repository 再以直接 generator `--check` 提供
  freshness evidence。
- **X. Change Scope Discipline**：僅定義 lint、baseline、fixture 與獨立 CI 的
  實作邊界，不混入 cleanup、inventory regeneration、API、DB 或產品行為。
  Intermediate CI integration PR 遵守一般 guardrails；依憲法 v1.33.0，final
  archive 的六個 `specs/**`／`openspec/**` logical artifacts 同時排除於
  file-count 與 line-count threshold arithmetic，因此依一般門檻計算。threshold
  exclusion 不解除 single-purpose 與 scope-drift rules，scope 仍不得擴張至 CI、
  `CLAUDE.md`、STATUS 或 unexpected archive paths；post-merge umbrella
  active-path exception 維持獨立，不與 archive 門檻混用。
- **XVII. CI/CD Quality Gates**：同一 local command 由獨立 CI job 執行，且不混淆
  四個 gate；inventory composition 不增加 install/setup step，缺少 Node 或 generator
  時以 configuration error fail closed。
- **XIX. Environment & Configuration Integrity**：CI 與本地使用相同 Node/generator
  boundary；unavailable、unreadable、unloadable、unrunnable 或 unexpected result
  均以 stable `INVENTORY_CHECK_CONFIG` 與 exit `2` 顯示，不靜默降級。
- **XX. Source of Truth & Contract Governance**：canonical spec 與治理文件維持
  authority；Project SDD lint 組合既有 generator 而不重作或 regenerate inventory，
  baseline 與 OpenSpec artifact 僅消費、不覆寫正典。
- **II. Generalization-First** 與 **III. Data Fairness**：本 command 不變更
  task runtime、dataset、annotator response、gold answer 或 scoring metadata，
  因此不引入這兩項 NON-NEGOTIABLE 的風險。
