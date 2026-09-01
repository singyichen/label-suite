---
對應 Spec: specs/foundation/001-project-sdd-lint/spec.md
---

## Why

Issue #375 已有治理規則，但尚未有可執行的 Project SDD Lint，因而無法在 PR 合併前以一致且離線的方式檢查 project headings、STATUS、OpenSpec task ownership、retired guidance、Source-Verify 與 generated `design/system/screen-inventory.md` 漂移。本變更落實正典 v1.1.2 的 FR-001–FR-009、AC-1.5、AC-4.1–AC-4.4 與 SC-001–SC-008。

## What Changes

- 新增 `scripts/check-sdd.sh`、`scripts/sdd-lint-baseline.txt` 與 fixture 測試，提供 deterministic 的 Project SDD Lint command、ratchet baseline 與 Red/Green 驗證契約。
- 新增獨立的 CI job，並在 `CLAUDE.md` 加入相同的本地 command；此 job 保持與 `openspec validate` 分離，不取代 OpenSpec schema validation、code/test gates 或 Source-Verify + write-back/archive。
- Project SDD Lint 從 script path 解析 checker root，另解析 optional target root；只有 canonical resolved target root 與 checker root 相同時，才組合既有 `node "$repo_root/scripts/gen-screen-inventory.mjs" --check` contract。default、explicit same-root 與同根 symlink 保持原有 freshness mapping；foreign explicit root 一律在 child execution 前輸出 `ERROR [INVENTORY_CHECK_CONFIG] scripts/gen-screen-inventory.mjs: ...`、exit `2`，不執行 hostile generator、不產生 marker side effect，且不輸出 raw child output。same-trust child exit `0` 不輸出 inventory diagnostic，只有 exit `1` 且 command substitution 移除 trailing newlines 後的 combined whole output 恰好等於 exact stale sentinel `design/system/screen-inventory.md is stale — run: node scripts/gen-screen-inventory.mjs`，才輸出 `ERROR [INVENTORY_FRESHNESS] design/system/screen-inventory.md: ...` 並以 exit `1` 阻擋；缺少 generator 或 Node、generator 無法讀取、load 或執行、exit `2`、sentinel-less exit `1`、sentinel prefix／suffix／額外 nonblank line 與其他 unexpected result 一律輸出 `ERROR [INVENTORY_CHECK_CONFIG] scripts/gen-screen-inventory.mjs: ...` 並以 exit `2` 結束；`--strict` 不改變此 severity。
- 在每個動態 scanned subtree 的任何 newline/text/TSV pathname flow 前，以 `find ... -print0` 與 Bash 3.2-compatible NUL read preflight；任何 repository-relative pathname 含 ASCII／locale-independent control character（包括 newline、tab、carriage return）時，固定輸出 `ERROR [SCANNER_CONFIG] .: repository paths containing control characters are unsupported` 並 exit `2`，不回顯 hostile pathname。ordinary-space path 維持合法；不修改 baseline 或 `check-spec-artifacts.sh`。
- 不變更 API、DB、產品 UI、dependency、ADR-034 decision、inventory generator／manifest implementation 或其他 inventory-view generation contract；不新增 sandbox、timeout、byte-provenance mechanism、generator `--root` flag 或 dependency。合併 upstream source additions 後，本 integration branch 以既有 generator 刷新 generated `design/system/screen-inventory.md`，使 real-repository `--check` 維持 current；freshness claim 只涵蓋該 generated view，不宣稱 hand-maintained `design/system/inventory.md` 或 `design-inventory.dc.html` 已生成、byte-current 或完全驗證。
- 在 Red 前以 governance-propagation 明確對齊 shell test-harness ownership：`scripts/*-tests.sh` 由 `senior-qa` 擁有，production `scripts/` 仍由 `senior-devops` 擁有。
- 合併後依 SC-007 只更新 Issue #375 已實際交付的六個 D 項目（正典標題、STATUS/stage、Source-Verify、task 單檔／例外、assignee／file ownership、design inventory freshness）。複合 D checkbox `阻擋 retired path/command，例如 npm、舊 frontend/tests/ E2E 路徑與不存在的 panels directory。` 與 combined acceptance `CI 或本地單一命令可偵測 STATUS drift、retired path、規格必要段落與 inventory stale。` 維持未勾選並延期，直到另案取得 ADR-034/path authority，並完成所列 filesystem paths 的 QA Red 與 production Green；本變更不接受 ADR-034，亦不修改執行期程式碼。inventory workstream C、baseline-zero cleanup 與所有其他 checkbox 保持原狀。
- PR 依單一目的拆分為 Design/Specify、Propose、Red/Green、CI integration 與 final archive groups。CI integration 是遵守一般 file-count 與 diff-size guardrails 的 intermediate PR，只包含 committed CI Red/Green 與 `CLAUDE.md` local parity，且不執行 archive。
- 所有 `/opsx:apply` checkboxes 完成後，archive/write-back 才在 `/opsx:apply` 外進入獨立 final archive PR；該 PR 只包含 command-only final verification，以及 canonical write-back、derived spec、proposal／design／tasks／delta 四個 OpenSpec artifact renames 所構成的六個 logical artifacts。依憲法 v1.33.0 Principle X，`specs/**` 與 `openspec/**` artifacts 同時排除於 file-count 與 line-count threshold arithmetic，因此這六個 archive artifacts 按一般規則即在門檻內，但仍受 single-purpose 與 scope-drift rules 約束。若 archive 產生、刪除或修改的 paths 超出或不同於這六個 logical artifacts，main session 必須停在 maintainer scope-drift checkpoint，未獲明確核准不得繼續；final archive PR 不包含 CI files、`CLAUDE.md`、`specs/STATUS.md` 或其他修改。

## Capabilities

### New Capabilities

- `foundation/001-project-sdd-lint`：提供可離線執行、以正典規格與治理規則為依據的 Project SDD Lint capability。

### Modified Capabilities

無。

## Impact

- 影響 `scripts/check-sdd.sh`、`scripts/sdd-lint-baseline.txt` 與 `scripts/speckit-tests.sh` fixture harness，新增可重複執行的 lint、baseline 與驗證表面。
- 影響 `.github/workflows/ci.yml` 的獨立 CI workflow job，以及 `CLAUDE.md` 的對等本地 command。
- 影響 `.claude/agents/senior-qa.md` 與 `.claude/agents/senior-devops.md` 的 file-ownership governance guidance。
- 既有 `scripts/gen-screen-inventory.mjs` 與 manifest/source inputs 只作為 Project SDD Lint 消費的既有 authority，本變更不修改其 implementation，也不修改 prototype 或 inventory tests。合併 upstream source additions 後，本 branch 以該既有 generator 刷新 generated `design/system/screen-inventory.md`，使 `--check` 對目前 source set 保持 current；此 integration refresh 不建立其他 view 的生成契約。
- 不影響 API、DB、產品 UI 或 dependency。

## Constitution Check

- **IV. Test-First**：fixture 測試先以 Red commit 確認缺少 `scripts/check-sdd.sh` 的預期失敗，再由 Green work 實作 command 與 baseline；Stage 3 按 SC-008 新增 committed adversarial Red/Green，覆蓋 foreign generator marker denial、newline/tab/CR path rejection、default／same-root inventory 與 ordinary-space acceptance；不弱化 Red contract。
- **X. Change Scope Discipline**：本變更只處理 Project SDD Lint 與其 local/CI parity；generator／manifest implementation、prototype、inventory tests、canonical spec cleanup 與 ADR-034 E2E path migration 均不在範圍。合併 upstream source additions 後，本 branch 僅以既有 generator 刷新 generated `design/system/screen-inventory.md`，使已組合的 `--check` contract 保持 current；不宣稱其他 inventory views。Intermediate CI integration PR 遵守一般 guardrails；依憲法 v1.33.0，final archive PR 的六個 `specs/**`／`openspec/**` logical artifacts 均排除於 file-count 與 line-count threshold arithmetic，按一般門檻計算即在範圍內，且仍維持 single-purpose scope 與 scope-drift checkpoint。
- **XVII. CI/CD Quality Gates**：新增獨立 Project SDD Lint CI job 與對等本地 command，並保留 OpenSpec schema validation 為不同 gate。
- **XX. Source of Truth & Contract Governance**：正典來源維持 `specs/foundation/001-project-sdd-lint/spec.md` v1.1.2；本 proposal 的 FR-001–FR-009、AC-1.5、AC-4.1–AC-4.4 與 SC-001–SC-008 引用均可在該 canonical spec 定位。既有 generator 的 exit/sentinel contract 由 Project SDD Lint 在 same-trust root 組合，derived artifacts 與 baseline 不會改寫 canonical authority。
- **II. Generalization-First（NON-NEGOTIABLE）**：不觸及 task-type 邏輯、registry 或產品 runtime，故不受影響。
- **III. Data Fairness（NON-NEGOTIABLE）**：不讀取、傳回或新增 annotator-facing dataset、gold answer 或 scoring 資料，故不受影響。
