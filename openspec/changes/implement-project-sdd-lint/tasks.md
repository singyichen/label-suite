# Tasks: implement-project-sdd-lint

## 1. PR-SDD-LINT-RED-GREEN — Ownership, fixture contract, baseline, and lint engine

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；前置任務：無；本群組順序：1.1 → 1.2 → 1.3 → 1.4；後續任務：2.1。1.1 必須先建立 ownership contract，1.2 的 committed Red evidence 必須先於 1.3 與 1.4，且本 PR 必須以 1.4 Green 結束。

**故事目標**：落實 SC-001–SC-004，以明確 ownership、committed Red contract、ratchet baseline 與零 dependency command 完成可合併的 Red/Green PR。

- [x] 1.1 對齊 shell test-harness ownership，明定 `scripts/*-tests.sh` 由 `senior-qa` 擁有，production `scripts/` 由 `senior-devops` 擁有且不得修改這些 test harnesses。Exception: governance-propagation; Files: `.claude/agents/senior-qa.md`, `.claude/agents/senior-devops.md`; Reason: Red 前必須原子同步兩個 authoritative ownership definitions，避免同一路徑同時屬於 QA 與 DevOps。執行 `rg -n 'Owns.*scripts/\*-tests\.sh' .claude/agents/senior-qa.md` 與 `rg -n 'Must Not Touch.*scripts/\*-tests\.sh' .claude/agents/senior-devops.md`，驗證兩個 commands 均 exit `0`。 [@main]
- [x] 1.2 修改 `scripts/speckit-tests.sh`，加入 passing、strict mutation、task ownership、retired command、baseline 與 warning fixtures；以獨立 Red commit 提交後執行 `bash scripts/speckit-tests.sh`，預期只因 `scripts/check-sdd.sh` 不存在而失敗，並記錄該 expected failure。 [@senior-qa]
- [ ] 1.3 建立 `scripts/sdd-lint-baseline.txt`，只收錄目前 12 個缺 `## 功能目標`、shared-018 缺 `## 規格相依性` 與 `## Prototype Traceability` 的 14 筆排序 legacy entries；執行 `LC_ALL=C sort -c scripts/sdd-lint-baseline.txt`、`test "$(wc -l < scripts/sdd-lint-baseline.txt)" -eq 14`、`test -z "$(LC_ALL=C sort scripts/sdd-lint-baseline.txt | uniq -d)"` 與 `cut -f2 scripts/sdd-lint-baseline.txt | while IFS= read -r path; do test -e "$path" || exit 1; done`，驗證四個 commands 均 exit `0`。 [@senior-devops]
- [ ] 1.4 建立 Bash 3.2-compatible `scripts/check-sdd.sh`，實作 FR-001–FR-007，使 committed Red contract 轉綠且不得修改 `scripts/speckit-tests.sh`；以獨立 Green commit 提交後執行 `bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh` 與 `scripts/check-sdd.sh`，驗證三個 commands 均 exit `0`。 [@senior-devops]

## 2. PR-SDD-LINT-CI — CI gate and local parity

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；前置任務：1.4；本群組順序：2.1 → 2.2 → 2.3 → 2.4；後續任務：3.1。2.1 的 committed CI Red evidence 必須先於 2.2，且本 intermediate PR 必須以 2.4 command-only parity verification 結束；本群組只觸及 `scripts/speckit-tests.sh`、`.github/workflows/ci.yml`、`CLAUDE.md` 三個實體檔案（其中兩個為 non-test），遵守一般五檔限制且不包含 write-back scope。

**故事目標**：落實 SC-005，以 committed CI Red/Green、獨立 `Project SDD Lint` job 與相同本地 command 完成可合併的 CI integration PR。

- [ ] 2.1 修改 `scripts/speckit-tests.sh`，加入獨立 CI job 的 contract test；以獨立 CI Red commit 提交後執行 `bash scripts/speckit-tests.sh`，預期只因 `.github/workflows/ci.yml` 尚無 `sdd-lint` job 而失敗，並記錄 expected failure。 [@senior-qa]
- [ ] 2.2 修改 `.github/workflows/ci.yml`，新增不依賴 app installs 的 top-level `sdd-lint` job，display name 為 `Project SDD Lint` 且只 checkout + 執行 `scripts/check-sdd.sh`；不得修改 `scripts/speckit-tests.sh`，以獨立 CI Green commit 提交後執行 `bash scripts/speckit-tests.sh` 並驗證 exit `0`。 [@senior-devops]
- [ ] 2.3 修改 `CLAUDE.md` 的 Verification Commands，加入 project-root `scripts/check-sdd.sh`，保持 `openspec validate --changes --no-interactive` 為獨立 gate；使用者已於 2026-08-26 明確授權，執行 `rg -n 'scripts/check-sdd\.sh|openspec validate --changes --no-interactive' CLAUDE.md` 並驗證兩個 commands 均可定位。 [@main]
- [ ] 2.4 執行 command-only CI/local parity verification：`bash scripts/speckit-tests.sh`、`rg -n 'sdd-lint:|name: Project SDD Lint|scripts/check-sdd\.sh' .github/workflows/ci.yml`、`rg -n 'scripts/check-sdd\.sh|openspec validate --changes --no-interactive' CLAUDE.md`、`git diff --check`；逐一記錄四個 commands 均 exit `0`，並確認 CI 與本地使用相同的 `scripts/check-sdd.sh` 且 OpenSpec schema command 仍為獨立 gate。 [@main]

## 3. PR-SDD-LINT-FINAL-ARCHIVE — Final verification and write-back readiness

> **相依與平行性**：本群組嚴格序列執行，不使用 parallel markers；前置任務：2.4 且 `PR-SDD-LINT-CI` 已合併；本群組順序：3.1；後續 apply 任務：無。3.1 是最後一個 command-only apply task，觸及零檔案；完成後所有 apply checkboxes 必須已完成，才可進入下方 apply 外的 pre-merge finalization，使本 final PR 以已驗證的 write-back 結束。

**故事目標**：以 SC-001–SC-006 的 fresh evidence 與 Source-Verify preconditions 完成所有 apply tasks，為獨立 final PR 的 pre-merge write-back 建立可驗證前提。

- [ ] 3.1 執行 fresh command-only complete verification：`bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh`、`scripts/check-sdd.sh`、`scripts/check-spec-artifacts.sh`、`openspec validate --changes --no-interactive`、`rg -o --no-filename 'FR-[0-9]{3}|SC-[0-9]{3}|AC-[0-9]+\.[0-9]+' openspec/changes/implement-project-sdd-lint/proposal.md openspec/changes/implement-project-sdd-lint/design.md openspec/changes/implement-project-sdd-lint/tasks.md openspec/changes/implement-project-sdd-lint/specs/foundation/001-project-sdd-lint/spec.md | sort -u | while IFS= read -r citation; do grep -F "$citation" specs/foundation/001-project-sdd-lint/spec.md >/dev/null || exit 1; done`、`git diff --check`；逐一記錄七個 commands 均 exit `0`，並驗證 `INVENTORY_FRESHNESS_UNVERIFIED` warning 可見、每個 FR/SC/AC citation 可在 canonical spec 定位，且不得宣稱已驗證 freshness。 [@main]

## Pre-merge finalization (outside /opsx:apply) — NON-CHECKBOX

本段不屬於 `/opsx:apply`，不得轉成 apply task。Main session 先執行 `openspec instructions apply --change implement-project-sdd-lint --json | jq -e '.progress.remaining == 0'` 並確認 exit `0`，再執行 `/opsx:archive implement-project-sdd-lint`：回寫 `specs/foundation/001-project-sdd-lint/spec.md` 的 version/Changelog、產生 `openspec/specs/foundation/001-project-sdd-lint/spec.md`，並將 proposal、design、tasks、delta 四個 active artifacts 移到 `openspec/changes/archive/2026-08-26-implement-project-sdd-lint/`。此 procedure 明確排除 `specs/STATUS.md`。

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

STATUS 更新後，main session 先執行 `gh issue view 375 --json body --jq .body` 重新讀取最新 Issue #375，再只將下列六個已交付的 D items 更新為 checked，且不得改動其他 checkbox：`驗證 canonical spec 必要章節與精確標題。`、`驗證 STATUS、active change、branch、stage 一致性。`、`驗證 FR/SC/AC Source-Verify。`、`驗證 task one-file rule 與例外。`、`驗證 assignee 與 file ownership。`、`阻擋 retired path/command，例如 npm、舊 frontend/tests/ E2E 路徑與不存在的 panels directory。`

明確保持 D item `驗證 design inventory freshness。` 與 acceptance item `CI 或本地單一命令可偵測 STATUS drift、retired path、規格必要段落與 inventory stale。` 為 unchecked；任何未由本工作流交付的 cleanup、inventory 或其他 items 亦維持原狀。更新後再次執行 `gh issue view 375 --json body --jq .body`，驗證上述六項為 checked、兩個指定項為 unchecked，且其他 issue items 未被改動。
