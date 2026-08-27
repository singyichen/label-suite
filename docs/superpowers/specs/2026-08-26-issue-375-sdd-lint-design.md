# Issue #375 Project SDD Lint Design

## 背景

Issue [#375](https://github.com/singyichen/label-suite/issues/375) 的第一個後續工具工作流，是將已於 PR #387 固定的 SDD 治理語意轉成可重複執行的 Project SDD lint。治理分支已明確區分四個 gate：OpenSpec schema validation、Project SDD lint、code/test gates、Source-Verify + write-back/archive。這個設計只實作第二個 gate，不宣稱取代其他三個 gate。

本工作從 `origin/main` 的 `ff33db17fb97b51f4543a25ace0bf5eeeb2a7d74` 建立，主 worktree 為 `.worktrees/issue-375-sdd-lint`，分支為 `feat/issue-375-sdd-lint`。使用者於 2026-08-26 核准本設計採 ratchet baseline，並明確授權此工作流修改受保護的 `CLAUDE.md`，以補上 CI job 對應的本地命令。

## 問題

Project SDD lint 必須同時滿足兩個看似衝突的需求：

1. 新的治理違規必須成為 blocking failure。
2. 目前 repository 仍有已知 legacy debt，例如 12/17 canonical specs 缺少精確 `## 功能目標`；同時，既有 inventory generator 已提供 versioned `--check` contract，lint 必須在不重作 source/manifest/render authority 的前提下 fail closed。

若第一版直接對全 repository strict，任何 PR 都會被既有 debt 阻擋，並迫使本工作流混入 spec cleanup 與 inventory regeneration，違反 single-purpose PR。若所有規則只警告，則 Project SDD lint 無法形成真正的 gate。

## 目標

建立一個 deterministic、可在本地與 CI 執行的 `scripts/check-sdd.sh`，使它能：

1. 阻擋新增加的、可機械判斷的 SDD 違規。
2. 對 active OpenSpec change 與其 canonical spec 採 strict validation。
3. 以版本化 baseline 暫時承接已知 legacy debt，並阻擋 baseline 擴張。
4. 以明確 warning 揭露仍不具可靠機械判斷基礎的 goal semantics、ordinary task file-count、runtime Red evidence、GitHub 外部狀態與 ADR-034 E2E path；inventory freshness 不屬此類。
5. 產生穩定、可測試且能直接指出 canonical authority 的診斷。
6. 以獨立 CI job 呈現，不與 OpenSpec schema validation 或 code/test gate 混為同一結果。

## 非目標

- 不在此工作流批次修正 17 份 canonical specs。
- 不建立或修改 inventory manifest、generator、source set 或其他 inventory view 的生成契約。合併 upstream source additions 後，本 integration branch 只以既有 generator 刷新 generated `design/system/screen-inventory.md`，使 `--check` 維持 current；不宣稱 hand-maintained `design/system/inventory.md` 或 `design-inventory.dc.html` 已生成或驗證 freshness／coverage。
- 不接受 ADR-034，也不裁決 `frontend/tests/` 與 root `e2e/[module]/` 的正式遷移。
- 不以字串相似度判斷需求語意是否一致。
- 不查詢 GitHub API 來判定 PR 是否 open/merged；本地 lint 必須離線可執行。
- 不修改產品 runtime、API、DB schema、frontend 或 backend behavior。
- 不將 `/opsx:verify`、`openspec validate` 或 `check-spec-artifacts.sh` 宣稱為 Project SDD lint 的等價替代品。

## 方案比較

### 方案 A：立即全 repository strict

優點是規則最直接。缺點是第一個 CI run 就會因既有 heading、traceability 與 inventory debt 失敗，迫使 lint PR 同時修改大量規格與 generated artifacts，因此不採用。

### 方案 B：版本化 ratchet baseline（採用）

完整掃描 repository，將既有、已知且可定位的 legacy violations 收錄為 baseline；新 violation、baseline 內容變更或 strict scope violation 都失敗。已修復但仍留在 baseline 的 entry 也失敗，要求在同一變更移除 stale baseline entry。這能阻擋 debt 增加，同時允許後續 cleanup 逐步把 baseline 降到零。

### 方案 C：audit-only warnings

優點是不會阻擋現有開發。缺點是無法成為 Project SDD gate，也不能滿足 Issue #375 的 CI acceptance，因此不採用。

## Canonical requirement placement

Project SDD lint 是 foundation/tooling capability，不是產品頁面，也不是 constitution 本身。它應先經 `/speckit.specify` 建立專用 canonical spec：

```text
specs/foundation/001-project-sdd-lint/spec.md
```

對應 STATUS ID 為 `foundation-001`，OpenSpec change 名稱為：

```text
implement-project-sdd-lint
```

這可讓 FR/SC IDs 在 `/opsx:propose` 前已存在於 canonical source，避免把新增 requirement 硬塞進長期 Foundation Core baseline，也讓 Source-Verify 能逐 ID 定位。此 tooling feature 沒有產品 route、prototype 或 React component，因此 prototype、page design 與 Frontend Ready Gate 均標示 `N/A` 並附理由。

`foundation-001` 也是後續 inventory generator 與 spec cleanup 的 active tooling contract。為避免第一個子工作流完成後立刻移走後續 change 必須引用的 canonical path，本 umbrella issue 採一個明示的 archive exception：lint final PR 仍執行 OpenSpec archive/write-back，但 canonical `foundation-001` 在 Issue #375 所有子工作流完成前保留於 active path，STATUS 設為 `done` 並在備註記錄 exception。最後一個 Issue #375 子工作流合併後，再依當時 workflow 將它移到 `specs/_archive/` 並設為 `archived`。本 exception 隨本設計交由 maintainer 明確核准，不由 script 暗中推導。

## Command contract

### Entry point

```bash
scripts/check-sdd.sh [--strict] [repo-root]
```

- 沒有 `repo-root` 時，從 script 所在位置解析 repository root。
- 指定 `repo-root` 時，只掃描該 root，不依賴 caller 的 current directory。
- 預設模式使用 ratchet baseline。
- `--strict` 將 baseline-eligible warning 視為 error，供 cleanup 工作流與最終 baseline 歸零驗證使用。
- command 不修改任何 repository file。

### Exit codes

| Exit | 意義 |
|---:|---|
| `0` | 沒有 blocking violation；warning 已清楚輸出 |
| `1` | 至少一個 blocking violation、new baseline violation 或 stale baseline entry |
| `2` | CLI usage、必要檔案或 baseline 格式錯誤，無法可靠完成掃描 |

Inventory freshness 在 default／`--strict` 使用相同 severity。Lint 從 resolved target
root 執行 `node "$repo_root/scripts/gen-screen-inventory.mjs" --check`，capture 且
suppress combined child output，並依 canonical v1.1.1 固定映射：

| Generator result | Project SDD lint result |
|---|---|
| exit `0` | 不輸出 inventory diagnostic；lint outcome 依其他 rules 決定。 |
| exit `1`，且 command substitution 移除 trailing newlines 後的 whole output 恰等於 `design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs` | 輸出 `ERROR [INVENTORY_FRESHNESS] design/system/screen-inventory.md: ...`，lint exit 至少為 `1`。 |
| generator／Node 缺少、generator 無法讀取／load／執行、exit `2`、sentinel-less exit `1`、exit `1` + prefix／suffix／額外 nonblank line，或任何其他 unexpected result | 輸出 `ERROR [INVENTORY_CHECK_CONFIG] scripts/gen-screen-inventory.mjs: ...`，lint exit `2`。 |

只有 child exit `1` 加上 normalized whole-output equality 可表示 stale；不得使用
substring 或逐行 match。Configuration exit `2` 優先於其他 governance exit `1`，
但 scanner 仍輸出已安全收集的 stable diagnostics，且永不洩漏 child raw output。

### Diagnostic format

每筆診斷使用穩定格式：

```text
ERROR [RULE_ID] relative/path: message
WARNING [RULE_ID] relative/path: message
```

最後固定輸出 summary：

```text
Project SDD lint: <errors> error(s), <warnings> warning(s)
```

診斷排序固定為 severity → rule ID → path → message，避免 filesystem traversal order 造成 CI drift。

## Ratchet baseline

Baseline 使用獨立、可 review 的文字檔：

```text
scripts/sdd-lint-baseline.txt
```

每行是一筆 normalized diagnostic key：

```text
RULE_ID<TAB>relative/path<TAB>stable-detail
```

規則如下：

- 只允許設計中標示為 baseline-eligible 的 legacy rule。
- 檔案必須排序、不得重複、不得使用 glob。
- 掃描結果出現 baseline 未列出的 eligible violation 時，視為 new violation 並 exit `1`。
- baseline entry 已不再對應實際 violation 時，視為 stale entry 並 exit `1`；修復者必須同時刪除該 entry。
- active change、assignee、exception record、retired command 與 Source-Verify 等 strict rules 不得加入 baseline。
- Inventory freshness 不進 baseline：它依 canonical v1.1.1 組合既有 generator 的 exact-sentinel blocking contract，stale 為 exit `1`，無法可信執行或判讀則 fail closed 為 exit `2`。

## Rule matrix

### Blocking rules

| Rule ID | 檢查內容 |
|---|---|
| `STATUS_ARTIFACT_SYNC` | 每個 active canonical spec 有且只有一個 STATUS row；STATUS feature row 能解析到對應 spec；ID/module/number 與允許狀態一致。可重用 `scripts/check-spec-artifacts.sh` 的既有 contract，但 Project SDD lint 必須保留自己的 gate identity。 |
| `ACTIVE_CHANGE_SPEC` | 每個非 archive OpenSpec change 的 `proposal.md` 恰好引用一個存在的 `對應 Spec:` path，且能解析到 STATUS row。 |
| `ACTIVE_CHANGE_STAGE` | active change 對應 STATUS 不得仍為 `spec-ready`、`done`、`archived` 或 `deferred`；branch/stage 的純 repository contradiction 為 error。 |
| `SPEC_REQUIRED_HEADING` | active change 引用的 canonical spec 必須恰好有一個非空 `## 功能目標` 與 `## 規格相依性`。新建立或本次變更的 canonical spec 同樣 strict。 |
| `SPEC_REQUIRED_IDS` | active change 引用的 canonical spec 必須具有 FR、SC，以及適用的 AC；page-scoped spec 另需 `## Prototype Traceability`，不適用者以 spec 內明確 exception 說明。 |
| `SOURCE_VERIFY_ID` | 從 active proposal/design/tasks/delta 擷取既有 FR/SC/AC token；被引用的既有 ID 必須逐字存在於 proposal 指定的 canonical spec。新 requirement ID 必須已由 specify 階段加入 canonical spec。 |
| `TASK_ASSIGNEE` | 每個 checkbox task line 結尾恰好一個 `[@agent-name]`；agent 必須存在於 `.claude/agents/`，或為 `[@main]`。 |
| `TASK_STORY_GOAL` | 每個 User Story phase 必須有 `**故事目標**`，且至少引用一個 canonical SC ID。 |
| `TASK_EXCEPTION` | 僅允許 `package-manager`、`scaffold`、`governance-propagation`；使用 exception 時必須恰好提供 `Exception:`、完整 `Files:`、`Reason:`。 |
| `TASK_RED_OWNER` | 明確標示為 Red test 的 task 必須由 `[@senior-qa]` 擁有，且出現在 paired Green task 之前。 |
| `TASK_FILE_OWNER` | 當 task 宣告的 file path 唯一且 ownership map 明確時，必須符合 backend/frontend/i18n/DB/devops/QA ownership。 |
| `RETIRED_COMMAND` | active governance consumers、OpenSpec change artifacts 與 task templates 禁止 repository-local `npm test`、`npm run ...`、將 `/ui-ux-pro-max` 當 pipeline stage，以及非歷史內容的 `/speckit.analyze`。Pattern 不得把 `pnpm` 誤判為 `npm`。 |
| `BASELINE_FORMAT` | baseline 必須排序、唯一、path 存在且 rule baseline-eligible；new/stale entry 均失敗。 |
| `INVENTORY_FRESHNESS` | resolved target root generator exit `1`，且 normalized combined output 整體恰等於 versioned exact stale sentinel；path 固定為 generated `design/system/screen-inventory.md`，blocking exit 為 `1`，除非 configuration error 要求 exit `2`。 |

### Scanner configuration rule

| Rule ID | 檢查內容 |
|---|---|
| `INVENTORY_CHECK_CONFIG` | generator／Node 缺少、generator 不可讀／load／執行、exit `2`、sentinel-less exit `1`、prefix／suffix／額外 nonblank line 或其他 unexpected result；path 固定為 `scripts/gen-screen-inventory.mjs`，suppress child raw output 並 exit `2`。 |

### Baseline-eligible rules

| Rule ID | 第一版處理 |
|---|---|
| `LEGACY_SPEC_HEADING` | 對所有未被 active change 引用的 canonical specs 掃描 `## 功能目標`、`## 規格相依性` 與適用的 traceability heading；既有缺漏可列 baseline，新增缺漏失敗。 |
| `LEGACY_STATUS_DRIFT` | 僅容納 repository 內已能靜態證明、但需由後續 spec/status cleanup 修正的既有 drift；外部 PR 狀態不寫入 baseline。 |

### Warning-only rules

| Rule ID | 原因 |
|---|---|
| `GOAL_SEMANTIC_REVIEW` | goal 是否語意一致無法用可靠字串比對證明，保留人工 review。 |
| `TASK_FILE_COUNT_REVIEW` | ordinary task 沒有強制 `Files:` grammar；僅當明確多檔或 exception record 存在時機械判斷，其餘提示人工驗證。 |
| `TASK_RED_EVIDENCE_REVIEW` | commit 先後與預期失敗原因屬執行期 evidence，static lint 只能檢查 task 結構。 |
| `STATUS_EXTERNAL_STATE` | `review`/`done` 的 GitHub PR 與 merge 狀態不能離線可靠證明。 |
| `E2E_PATH_DECISION` | ADR-034 仍為 Proposed，第一版不得把 `frontend/tests/` 或 root `e2e/` 任一方硬判為正式 authority。 |

## Scan boundaries

### Active inputs

- `specs/*/[0-9][0-9][0-9]-*/spec.md`
- `specs/STATUS.md`
- `openspec/changes/<active-change>/`，排除 `openspec/changes/archive/`
- `openspec/config.yaml`
- `docs/sdd-workflow.md`
- `.claude/skills/sdd-workflow/`
- `.claude/commands/` 與 `.claude/agents/` 中由治理矩陣列出的 active consumers
- `AGENTS.md`、`CLAUDE.md`
- active task templates

### Historical/excluded inputs

- `openspec/changes/archive/`
- `docs/adr/` 的歷史內容與 changelog
- `docs/superpowers/` 中記錄方案比較或 retired wording 的設計/計畫
- `.worktrees/`、`.superpowers/` 與其他 ignored scratch space
- generated inventory views 的直接文字掃描；inventory rule 唯一透過 resolved target root 的既有 generator `--check` 判定 generated `design/system/screen-inventory.md` byte freshness

Retired scanner 只在 active inputs 執行，避免把「此命令已退役」的歷史說明誤判為 active guidance。

## Implementation structure

### `scripts/check-sdd.sh`

單一 Bash entry point，負責：

1. 解析 CLI/root/baseline。
2. 收集 normalized diagnostics。
3. 執行 strict、baseline-eligible 與 warning-only rules。
4. 比對 baseline 的 new/stale entries。
5. 排序輸出並回傳穩定 exit code。

第一版不增加外部 dependency，不引入 Bats、Python package 或 Node package。

### `scripts/speckit-tests.sh`

沿用現有 `mktemp` throwaway repository 慣例，新增 Project SDD lint fixtures：

- passing canonical fixture。
- 缺 required heading。
- active change/STATUS mismatch。
- missing canonical FR/SC/AC ID。
- unknown/multiple/missing assignee。
- invalid or incomplete exception record。
- retired command，並含 `pnpm` negative control。
- baseline new/stale/duplicate/unsorted cases。
- 從 fixture root 外執行仍只掃描指定 root。
- inventory fresh exit `0` 無 diagnostic、whole-output exact-sentinel stale 為 `INVENTORY_FRESHNESS`／exit `1`，unavailable／unreadable／unloadable／unrunnable／sentinel-less／unexpected result 為 `INVENTORY_CHECK_CONFIG`／exit `2`，且 child raw output 必須被 suppress。

Red task 只修改 test file，先提交並確認因 `scripts/check-sdd.sh` 尚不存在而以預期原因失敗。Green task 才新增 production script/baseline，不得修改 Red contract 來取得通過。

## CI integration

`.github/workflows/ci.yml` 新增獨立 top-level job：

```text
job id: sdd-lint
display name: Project SDD Lint
command: scripts/check-sdd.sh
```

此 job 只 checkout repository 並執行本地 command；不依賴 backend/frontend/prototype install，也不包裝 `openspec validate`。它應被 branch protection 設為 required check，但 repository 內只能建立 job，實際 branch protection 設定屬 GitHub 外部狀態，PR handoff 必須明確列出。

依 `CLAUDE.md` 的 local/CI parity 規則，在 Verification Commands 同一 PR 加入：

```bash
# Project SDD lint (run from project root)
scripts/check-sdd.sh
```

使用者已明確授權此修改。

## SDD 與 PR sequencing

為遵守 single-purpose 與 ≤5 files/≤300 non-test lines，採 stacked PR groups：

1. **Design group**：本設計與後續 implementation plan；不含 production behavior。
2. **Specify group**：建立 `foundation-001` canonical spec 與 STATUS row。
3. **Propose group**：建立 `implement-project-sdd-lint` 的 proposal/delta/design/tasks，更新 STATUS → `change-open`，分別通過 OpenSpec schema gate 與當時仍為 manual 的 Project SDD lint evidence。
4. **Red/Green group**：先提交 `scripts/speckit-tests.sh` Red，再由 Green task新增 `scripts/check-sdd.sh` 與 baseline；本組完成 lint engine。
5. **CI integration group**：以 committed CI Red/Green 新增獨立 CI job 與 `CLAUDE.md` local command；不攜帶 archive/write-back scope。
6. **Final archive group**：所有 `/opsx:apply` tasks 完成且 ordered reviews 無 blocking finding，經 user checkpoint 後才執行 command-only verification、Source-Verify 與 apply 外的 OpenSpec archive/write-back，再走 final PR flow。

Lint final PR merge 後，`foundation-001` 依本設計的 umbrella archive exception 更新為 `done` 並留在 active path；直到 Issue #375 最後一個子工作流合併後才搬移與標記 `archived`。

若 archive 產生的 mechanical move/derived files 使 final PR 超過 file-count guardrail，tasks 必須逐檔列出 archive-generated scope 與理由，並在開 PR 前由 maintainer checkpoint 裁決；不得暗中把 archive 與產品修改混在一起。

## Error handling

- 缺少 `specs/STATUS.md`、baseline、必要目錄、Node 或 inventory generator：exit `2`，不輸出假成功。
- 單一 artifact 無法解析：輸出指向 artifact 與 canonical format 的 error；繼續收集其他 deterministic errors 後 exit `1`。
- baseline malformed：不嘗試自動修復，exit `2`。
- `check-spec-artifacts.sh` 失敗：保留其 stderr，另輸出 `STATUS_ARTIFACT_SYNC` summary，不以其他成功規則掩蓋。
- warning-only rule：永不單獨造成 default mode 非零；`--strict` 只提升 baseline-eligible violations，不提升明確 deferred 的 E2E／semantic／external-state warnings。Inventory severity 不受 `--strict` 改變，stale 或 configuration boundary 仍 blocking。
- inventory child output/status 必須在不受 `set -e` 中斷的 context capture；只有 exit `1` 且 normalized whole output 恰等於 versioned sentinel 可映射 `INVENTORY_FRESHNESS`。其餘不可用或 unexpected result 一律映射 `INVENTORY_CHECK_CONFIG`，suppress raw output，且 configuration exit `2` 優先。
- 任何 scope 需要重新定義 governance 才能判斷：warning 並指向 canonical authority，不在 script 內發明新規則。

## Verification

Red evidence：

```bash
bash scripts/speckit-tests.sh
# Expected: FAIL because scripts/check-sdd.sh does not exist.
```

Green 與完整 gate：

```bash
bash -n scripts/check-sdd.sh scripts/speckit-tests.sh
bash scripts/speckit-tests.sh
scripts/check-sdd.sh
node scripts/gen-screen-inventory.mjs --check
scripts/check-spec-artifacts.sh
openspec validate --changes --no-interactive
git diff --check
```

OpenSpec validation 與 `scripts/check-sdd.sh` 必須以兩個獨立結果報告；direct generator `--check` exit `0` 是 real-repository generated `design/system/screen-inventory.md` freshness evidence，lint output 不得含 retired `INVENTORY_FRESHNESS_UNVERIFIED`。

## Issue #375 checkbox impact

依 SC-007，final merge 後只更新 Issue #375 中已實際交付的六個 D items：

1. `驗證 canonical spec 必要章節與精確標題。`
2. `驗證 STATUS、active change、branch、stage 一致性。`
3. `驗證 FR/SC/AC Source-Verify。`
4. `驗證 task one-file rule 與例外。`
5. `驗證 assignee 與 file ownership。`
6. `驗證 design inventory freshness。`

compound D checkbox `阻擋 retired path/command，例如 npm、舊 frontend/tests/ E2E 路徑與不存在的 panels directory。` 與 combined acceptance
`CI 或本地單一命令可偵測 STATUS drift、retired path、規格必要段落與 inventory stale。` 保持 unchecked/deferred。兩者需要獨立的 ADR-034/path authority，以及所列 filesystem paths 的 QA Red 與 production Green；本 workflow 不接受 ADR-034，亦不修改 runtime code。

上述六個 checkbox 以外，inventory generator workstream C、baseline-zero cleanup 與其他
acceptance／inventory items 全部保持原狀。Generated freshness 的完成證據限於既有
generator `--check` 對 `design/system/screen-inventory.md` 的 exact-sentinel contract；
不擴張為 hand-maintained views 或其他 coverage 的完成宣稱。
