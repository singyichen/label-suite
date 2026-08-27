# Tasks: implement-project-sdd-lint

## 1. PR-SDD-LINT-RED-GREEN — Ownership, fixture contract, baseline, and lint engine

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；前置任務：無；本群組順序：1.1 → 1.2 → 1.3 → 1.4；後續任務：2.1。1.1 必須先建立 ownership contract，1.2 的 committed Red evidence 必須先於 1.3 與 1.4，且本 PR 必須以 1.4 Green 結束。

**故事目標**：落實 SC-001–SC-004 與 SC-006，以明確 ownership、committed Red contract、ratchet baseline、零 dependency command 與 blocking inventory freshness 完成可合併的 Red/Green PR。

- [x] 1.1 對齊 shell test-harness ownership，明定 `scripts/*-tests.sh` 由 `senior-qa` 擁有，production `scripts/` 由 `senior-devops` 擁有且不得修改這些 test harnesses。Exception: governance-propagation; Files: `.claude/agents/senior-qa.md`, `.claude/agents/senior-devops.md`; Reason: Red 前必須原子同步兩個 authoritative ownership definitions，避免同一路徑同時屬於 QA 與 DevOps。執行 `rg -n 'Owns.*scripts/\*-tests\.sh' .claude/agents/senior-qa.md` 與 `rg -n 'Must Not Touch.*scripts/\*-tests\.sh' .claude/agents/senior-devops.md`，驗證兩個 commands 均 exit `0`。 [@main]
- [x] 1.2 修改 `scripts/speckit-tests.sh`，保留 passing、strict mutation、task ownership、retired command、baseline 與 warning fixtures，並加入 committed Red inventory boundary fixtures：fresh exit `0`、exit `1` + whole-output exact stale sentinel、configuration/unrunnable boundary、exit `1` + sentinel prefix、suffix、額外 nonblank line、sentinel-less exit `1`、explicit target root，以及 retired `INVENTORY_FRESHNESS_UNVERIFIED` 不得出現；assert child raw output 被 suppress，且 default／`--strict` 的 diagnostic path、rule ID 與 exit mapping 符合 AC-4.1–AC-4.3。以獨立 Red commit 提交後執行 `bash scripts/speckit-tests.sh`，預期只因 `scripts/check-sdd.sh` 不存在而失敗並記錄該 expected failure；此 committed Red evidence 必須先於 paired Green。 [@senior-qa]
- [x] 1.3 建立 `scripts/sdd-lint-baseline.txt`，只收錄目前 12 個缺 `## 功能目標`、shared-018 缺 `## 規格相依性` 與 `## Prototype Traceability` 的 14 筆排序 legacy entries；執行 `LC_ALL=C sort -c scripts/sdd-lint-baseline.txt`、`test "$(wc -l < scripts/sdd-lint-baseline.txt)" -eq 14`、`test -z "$(LC_ALL=C sort scripts/sdd-lint-baseline.txt | uniq -d)"` 與 `cut -f2 scripts/sdd-lint-baseline.txt | while IFS= read -r path; do test -e "$path" || exit 1; done`，驗證四個 commands 均 exit `0`。 [@senior-devops]
- [x] 1.4 建立 Bash 3.2-compatible `scripts/check-sdd.sh`，實作 FR-001–FR-007 與 FR-009，使 committed Red contract 轉綠且不得修改 `scripts/speckit-tests.sh`；以獨立 Green commit 提交後執行 `bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh`、`scripts/check-sdd.sh` 與 `node scripts/gen-screen-inventory.mjs --check`，驗證四個 commands 均 exit `0`，且 Red harness 證明 lint output 不含 retired `INVENTORY_FRESHNESS_UNVERIFIED`。 [@senior-devops]

## 2. PR-SDD-LINT-CI — CI gate and local parity

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；前置任務：1.4；本群組順序：2.1 → 2.2 → 2.3 → 2.4；後續任務：3.1。2.1 的 committed CI Red evidence 必須先於 2.2，且本 intermediate PR 必須以 2.4 command-only parity verification 結束；本群組只觸及 `scripts/speckit-tests.sh`、`.github/workflows/ci.yml`、`CLAUDE.md` 三個實體檔案（其中兩個為 non-test），遵守一般五檔限制且不包含 write-back scope。

**故事目標**：落實 SC-005–SC-006，以 committed CI Red/Green、獨立 `Project SDD Lint` job、相同本地 command 與 lint 所組合的 inventory generator contract 完成可合併的 CI integration PR。

- [x] 2.1 修改 `scripts/speckit-tests.sh`，加入獨立 CI job 的 contract test；以獨立 CI Red commit 提交後執行 `bash scripts/speckit-tests.sh`，預期只因 `.github/workflows/ci.yml` 尚無 `sdd-lint` job 而失敗，並記錄 expected failure。 [@senior-qa]
- [x] 2.2 修改 `.github/workflows/ci.yml`，新增不依賴 app installs 的 top-level `sdd-lint` job，display name 為 `Project SDD Lint` 且只 checkout + 執行 `scripts/check-sdd.sh`；lint 會組合 repository 既有 generator，因此不得新增 app install、Node setup 或其他 setup step。不得修改 `scripts/speckit-tests.sh`，以獨立 CI Green commit 提交後執行 `bash scripts/speckit-tests.sh` 並驗證 exit `0`。 [@senior-devops]
- [x] 2.3 修改 `CLAUDE.md` 的 Verification Commands，加入 project-root `scripts/check-sdd.sh`，保持 `openspec validate --changes --no-interactive` 為獨立 gate；使用者已於 2026-08-26 明確授權，執行 `rg -n 'scripts/check-sdd\.sh|openspec validate --changes --no-interactive' CLAUDE.md` 並驗證兩個 commands 均可定位。 [@main]
- [x] 2.4 執行 command-only CI/local parity verification：`bash scripts/speckit-tests.sh`、`rg -n 'sdd-lint:|name: Project SDD Lint|scripts/check-sdd\.sh' .github/workflows/ci.yml`、`rg -n 'scripts/check-sdd\.sh|openspec validate --changes --no-interactive' CLAUDE.md`、`git diff --check`；逐一記錄四個 commands 均 exit `0`，並確認 CI 與本地使用相同的 `scripts/check-sdd.sh` 且 OpenSpec schema command 仍為獨立 gate。 [@main]

## 3. PR-SDD-LINT-FINAL-ARCHIVE — Final verification and write-back readiness

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；前置任務：2.4 且 `PR-SDD-LINT-CI` 已合併；本群組順序：3.1；後續 apply 任務：4.1。3.1 是 command-only complete verification，觸及零檔案；它完成後進入 Stage 3 security remediation 的 Red/Green sequence，不得進入 pre-merge finalization。

**故事目標**：以 SC-001–SC-007 的 fresh evidence、inventory freshness 與 Source-Verify preconditions 完成 Stage 3 前的 command-only verification，為後續 security remediation、獨立 final PR 的 pre-merge write-back 及 truthful Issue handoff 建立可驗證前提。

- [x] 3.1 執行 fresh command-only complete verification：`bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh`、`lint_output="$(scripts/check-sdd.sh)"; lint_status=$?; printf '%s\n' "$lint_output"; test "$lint_status" -eq 0; ! printf '%s\n' "$lint_output" | grep -F 'INVENTORY_FRESHNESS_UNVERIFIED'`、`node scripts/gen-screen-inventory.mjs --check`、`scripts/check-spec-artifacts.sh`、`openspec validate --changes --no-interactive`、`rg -o --no-filename 'FR-[0-9]{3}|SC-[0-9]{3}|AC-[0-9]+\.[0-9]+' openspec/changes/implement-project-sdd-lint/proposal.md openspec/changes/implement-project-sdd-lint/design.md openspec/changes/implement-project-sdd-lint/tasks.md openspec/changes/implement-project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md | sort -u | while IFS= read -r citation; do grep -F "$citation" specs/foundation/001-project-sdd-lint/spec.md >/dev/null || exit 1; done`、`git diff --check`；逐一記錄八個 commands 均 exit `0`，證明 Project SDD lint 與 real-repository generator freshness 均通過、lint output 不含 retired `INVENTORY_FRESHNESS_UNVERIFIED`，且每個 FR/SC/AC citation 可在 canonical spec 定位。 [@main]

## 4. PR-SDD-LINT-SECURITY — Same-trust inventory and pathname preflight

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；前置任務：3.1；本群組順序：4.1 → 4.2 → 4.3 → 4.4；後續 apply 任務：無。4.1 與 4.3 的 committed Red evidence 必須分別先於 paired Green；4.4 完成且全部十三個 apply tasks 均完成前，不得進入 pre-merge finalization。

**故事目標**：落實 SC-008，以 committed adversarial Red/Green evidence 證明 foreign generator marker 被拒絕、control-character scanned paths fail closed，且 default／same-root inventory 與 ordinary-space pathname 維持 green。

- [x] 4.1 修改僅 `scripts/speckit-tests.sh`。將 ordinary SDD fixtures 改為執行 checker-local staged copy，保留所有既有 assertions，並新增 foreign-root hostile generator 企圖寫入 marker；新測試必須期待 `INVENTORY_CHECK_CONFIG`／exit `2`、無 marker 與無 raw output。以獨立 QA Red commit 提交並執行 harness；expected Red 只可為 current production 執行 hostile generator／建立 marker，而非拒絕。 [@senior-qa]
- [x] 4.2 修改僅 `scripts/check-sdd.sh`。在不改動 Red test、generator、CI 或 dependencies 下，實作最小 canonical same-trust-root refusal；驗證 full harness、default real lint 與 explicit same-root real lint。 [@senior-devops]
- [x] 4.3 修改僅 `scripts/speckit-tests.sh`。加入隔離的 newline、tab、CR scanned filename fixtures 與 normal-space control；期待穩定 `SCANNER_CONFIG`／`.`／exit `2`、不含 raw unsafe path 或 control character，並驗證 normal-space acceptance。涵蓋至少 consumer、canonical-spec 與 active-change discovery routes。以獨立 QA Red commit 提交並執行 harness；expected Red 只可為 absent pathname preflight／bypass 或 unsafe rendering。 [@senior-qa]
- [ ] 4.4 修改僅 `scripts/check-sdd.sh`。在既有 newline／TSV flows 前加入最小 NUL-safe preflight；不得修改 Red test、baseline、generator 或 `check-spec-artifacts.sh`。驗證 shell syntax、full harness、real lint、inventory check/tests、deterministic/no-write behavior，且不出現 retired `INVENTORY_FRESHNESS_UNVERIFIED`。 [@senior-devops]

## Pre-merge finalization (outside /opsx:apply) — NON-CHECKBOX

本段不屬於 `/opsx:apply`，不得轉成 apply task。Main session 先執行 `openspec instructions apply --change implement-project-sdd-lint --json | jq -e '.progress.total == 13 and .progress.complete == 13 and .progress.remaining == 0'` 並確認 exit `0`，再執行 `/opsx:archive implement-project-sdd-lint`：回寫 `specs/foundation/001-project-sdd-lint/spec.md` 的 version/Changelog、產生 `openspec/specs/foundation/001-project-sdd-lint/spec.md`，並將 proposal、design、tasks、delta 四個 active artifacts 移到 `openspec/changes/archive/2026-08-26-implement-project-sdd-lint/`。此 procedure 明確排除 `specs/STATUS.md`。

依 Principle X v1.33.0，以下恰好六個 logical non-test artifacts 全部位於 `specs/**` 或 `openspec/**`，因此都不納入 PR file-count 或 line-count threshold arithmetic。這是一般 threshold arithmetic；每個 source→destination pair 視為一個 logical rename，single-purpose rule 與下方 exact scope-drift checkpoint 仍完整適用：

1. canonical write-back：`specs/foundation/001-project-sdd-lint/spec.md`
2. derived spec：`openspec/specs/foundation/001-project-sdd-lint/spec.md`
3. proposal rename：`openspec/changes/implement-project-sdd-lint/proposal.md` → `openspec/changes/archive/2026-08-26-implement-project-sdd-lint/proposal.md`
4. design rename：`openspec/changes/implement-project-sdd-lint/design.md` → `openspec/changes/archive/2026-08-26-implement-project-sdd-lint/design.md`
5. tasks rename：`openspec/changes/implement-project-sdd-lint/tasks.md` → `openspec/changes/archive/2026-08-26-implement-project-sdd-lint/tasks.md`
6. delta rename：`openspec/changes/implement-project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md` → `openspec/changes/archive/2026-08-26-implement-project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md`

Final archive scope 明確排除 `.github/workflows/ci.yml`、`CLAUDE.md`、`specs/STATUS.md`、agent guidance、scripts 或任何其他檔案。Archive 後先執行 `git status --short --untracked-files=all`，逐項比對上述六個 logical artifacts；若 generated paths、logical artifact count 或 scope 有任何增加或差異，main session 必須在 commit 前停止並回到新的 maintainer checkpoint；threshold exclusion 不得擴張 exact scope 或 single-purpose rule。

Scope 完全一致時，執行 `test "$(rg -c '^版本: [0-9]+\.[0-9]+\.[0-9]+$|^## Changelog$' specs/foundation/001-project-sdd-lint/spec.md)" -eq 2`、`rg -o 'FR-[0-9]{3}|SC-[0-9]{3}|AC-[0-9]+\.[0-9]+' openspec/specs/foundation/001-project-sdd-lint/spec.md | sort -u | while IFS= read -r citation; do grep -F "$citation" specs/foundation/001-project-sdd-lint/spec.md >/dev/null || exit 1; done`、`grep -F 'specs/foundation/001-project-sdd-lint/spec.md' openspec/specs/foundation/001-project-sdd-lint/spec.md` 與 `! rg -n '^## (ADDED|MODIFIED|REMOVED) Requirements$' openspec/specs/foundation/001-project-sdd-lint/spec.md`；四個 commands 均須 exit `0`，以證明 canonical version/Changelog、derived canonical path、逐 ID citation 與無 delta headings 的 write-back contract。

## Post-merge continuation (outside /opsx:apply) — NON-CHECKBOX

本段不屬於 `/opsx:apply`，不得轉成 apply checkbox。Final PR merge 後，main session 更新 `specs/STATUS.md`：將 `foundation-001` 設為 `done`，依核准的 Issue #375 umbrella exception 保留 active canonical path，並在備註記錄 exception；執行 `rg -n '^\| foundation-001 \|.*\| \x60done\x60 \|.*Issue #375.*umbrella' specs/STATUS.md` 驗證 resulting row。

STATUS 更新後，主要工作階段先執行 `gh issue view 375 --json body --jq .body` 重新讀取並保存最新 Issue #375 內容，再只將下列六個已交付的 D 項目更新為 checked：`驗證 canonical spec 必要章節與精確標題。`、`驗證 STATUS、active change、branch、stage 一致性。`、`驗證 FR/SC/AC Source-Verify。`、`驗證 task one-file rule 與例外。`、`驗證 assignee 與 file ownership。`、`驗證 design inventory freshness。`。複合 D checkbox `阻擋 retired path/command，例如 npm、舊 frontend/tests/ E2E 路徑與不存在的 panels directory。` 與 combined acceptance `CI 或本地單一命令可偵測 STATUS drift、retired path、規格必要段落與 inventory stale。` 必須維持未勾選並延期；兩者須先以獨立工作取得 ADR-034/path authority，並完成所列 filesystem paths 的 QA Red 與 production Green。本工作流不接受 ADR-034，亦不修改執行期程式碼。

Inventory generator workstream C、baseline-zero cleanup 與其他 acceptance／cleanup／inventory items 必須保持原狀，任何其他 Issue checkbox 都不得改動。更新後再次執行 `gh issue view 375 --json body --jq .body`，以更新前保存的 body 逐項比對，驗證上述六個 D 項目為 checked、複合 D 項目與 combined acceptance 仍維持未勾選並延期，且其餘 Issue checkbox 完全未變。

## Stage 2 review-fix 註記（在 /opsx:apply 外）— NON-CHECKBOX

Exception: governance-propagation

Files:

1. `specs/foundation/001-project-sdd-lint/spec.md`
2. `docs/superpowers/specs/2026-08-26-issue-375-sdd-lint-design.md`
3. `docs/superpowers/plans/2026-08-26-issue-375-sdd-lint.md`
4. `openspec/changes/implement-project-sdd-lint/proposal.md`
5. `openspec/changes/implement-project-sdd-lint/design.md`
6. `openspec/changes/implement-project-sdd-lint/tasks.md`
7. `openspec/changes/implement-project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md`
8. `specs/STATUS.md`

Reason: SC-007、已核准的設計、執行計畫、OpenSpec 來源與 STATUS 必須以原子方式描述相同的合併後 Issue 交接。局部修改會指示未來 agent 聲稱 Stage 2 已證明未交付的項目。

## Stage 3 security remediation 註記（在 /opsx:apply 外）— NON-CHECKBOX

2026-08-27 maintainer 已核准 Stage 3 High findings 的最小修正：foreign explicit root 不得執行 hostile inventory generator，且動態 scanned pathname 在進入 text／TSV flow 前必須拒絕 control character。此處只傳播 FR-001、FR-002、FR-009、AC-1.5、AC-4.1–AC-4.4 與 SC-008 的治理 contract；不修改 generator／manifest、sandbox、timeout、byte provenance、generator `--root` flag、CI 或 Stage 2 truthful six-item Issue handoff。
