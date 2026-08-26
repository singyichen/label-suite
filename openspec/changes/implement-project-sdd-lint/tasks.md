# Tasks: implement-project-sdd-lint

## 1. PR-SDD-LINT-RED — Fixture contract

> **相依與平行性**：本群組採序列執行，不使用 parallel markers；前置任務：無；後續任務：2.1。所有實作任務都消費同一個已提交的 Red/baseline contract，因此不得平行執行。

**故事目標**：以 SC-001、SC-002、SC-003 建立可證明 command、rule、baseline 與 warning contract 的預期失敗測試。

- [ ] 1.1 修改 `scripts/speckit-tests.sh`，加入 passing、strict mutation、task ownership、retired command、baseline 與 warning fixtures；提交後執行 `bash scripts/speckit-tests.sh`，預期因 `scripts/check-sdd.sh` 不存在而失敗，並記錄該 expected failure。 [@senior-qa]

## 2. PR-SDD-LINT-GREEN — Baseline and lint engine

> **相依與平行性**：本群組採序列執行，不使用 parallel markers；前置任務：1.1；本群組順序：2.1 → 2.2；後續任務：3.1。所有實作任務都消費同一個已提交的 Red/baseline contract，因此不得平行執行。

**故事目標**：落實 SC-001–SC-004，使 Red contract 轉綠並保持零 dependency。

- [ ] 2.1 建立 `scripts/sdd-lint-baseline.txt`，只收錄目前 12 個缺 `## 功能目標`、shared-018 缺 `## 規格相依性` 與 `## Prototype Traceability` 的 14 筆排序 legacy entries；驗證格式無重複且路徑存在。 [@senior-devops]
- [ ] 2.2 建立 Bash 3.2-compatible `scripts/check-sdd.sh`，實作 FR-001–FR-007，使 committed Red contract 全綠；驗證 `bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh` 與 `scripts/check-sdd.sh` 均 exit `0`。 [@senior-devops]

## 3. PR-SDD-LINT-CI — Independent CI gate

> **相依與平行性**：本群組採序列執行，不使用 parallel markers；前置任務：2.2；本群組順序：3.1 → 3.2 → 3.3；後續任務：4.1。所有實作任務都消費同一個已提交的 Red/baseline contract，因此不得平行執行。

**故事目標**：落實 SC-005，以獨立 CI job 與相同本地 command 曝露 Project SDD lint。

- [ ] 3.1 修改 `scripts/speckit-tests.sh`，加入獨立 CI job 的 contract test；提交後執行 `bash scripts/speckit-tests.sh`，預期因 `sdd-lint` job 尚不存在而失敗，並記錄 expected failure。 [@senior-qa]
- [ ] 3.2 修改 `.github/workflows/ci.yml`，新增不依賴 app installs 的 top-level `sdd-lint` job，display name 為 `Project SDD Lint` 且只 checkout + 執行 `scripts/check-sdd.sh`；驗證 committed CI Red contract 轉綠。 [@senior-devops]
- [ ] 3.3 修改 `CLAUDE.md` 的 Verification Commands，加入 project-root `scripts/check-sdd.sh`，保持 OpenSpec command 為獨立 gate；使用者已於 2026-08-26 明確授權，並以 `rg -n 'scripts/check-sdd\.sh|openspec validate --changes --no-interactive' CLAUDE.md` 驗證兩個 gate 均可定位。 [@main]

## 4. Final verification and archive

> **相依與平行性**：本群組採序列執行，不使用 parallel markers；前置任務：3.3；本群組順序：4.1 → 4.2；後續任務：無。所有實作任務都消費同一個已提交的 Red/baseline contract，因此不得平行執行。

**故事目標**：以 SC-001–SC-006 完成四個 gate 的獨立 evidence、write-back 與誠實的 Issue #375 checkbox 更新。

- [ ] 4.1 執行 `bash -n scripts/check-sdd.sh scripts/speckit-tests.sh`、`bash scripts/speckit-tests.sh`、`scripts/check-sdd.sh`、`scripts/check-spec-artifacts.sh`、`openspec validate --changes --no-interactive`、`git diff --check`，逐命令記錄 exit `0`；驗證 inventory warning 可見且不得宣稱已驗證 freshness。 [@main]
- [ ] 4.2 執行 Source-Verify 與 `/opsx:archive` write-back；更新 canonical spec version/Changelog 與 derived view。Exception: governance-propagation; Files: `specs/foundation/001-project-sdd-lint/spec.md`, `openspec/specs/foundation/001-project-sdd-lint/spec.md`, `specs/STATUS.md`; Reason: archive-time canonical write-back、derived view 同步與 delivery status 必須保持原子一致。`foundation-001` 依核准的 umbrella exception 保留 active path、STATUS 在 final merge 後設 `done`，直到 Issue #375 全部子工作流完成才移動；驗證每個 canonical citation 均以 `grep` 可定位，且 `openspec/specs/` 不含 delta headings。 [@main]
