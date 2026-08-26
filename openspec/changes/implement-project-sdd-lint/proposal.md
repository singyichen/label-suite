---
對應 Spec: specs/foundation/001-project-sdd-lint/spec.md
---

## Why

Issue #375 已有治理規則，但尚未有可執行的 Project SDD Lint，因而無法在 PR 合併前以一致且離線的方式檢查 project headings、STATUS、OpenSpec task ownership、retired guidance 與 Source-Verify 漂移。本變更落實正典規格的 FR-001、FR-002、FR-003、FR-004、FR-005、FR-006、FR-007、FR-008，以及 SC-001、SC-002、SC-003、SC-004、SC-005、SC-006。

## What Changes

- 新增 `scripts/check-sdd.sh`、`scripts/sdd-lint-baseline.txt` 與 fixture 測試，提供 deterministic 的 Project SDD Lint command、ratchet baseline 與 Red/Green 驗證契約。
- 新增獨立的 CI job，並在 `CLAUDE.md` 加入相同的本地 command；此 job 保持與 `openspec validate` 分離，不取代 OpenSpec schema validation、code/test gates 或 Source-Verify + write-back/archive。
- Inventory freshness 在 generator branch 提供 manifest、source set 與 `--check` contract 前維持 warning-only，不宣稱 freshness 已驗證。
- 不變更 API、DB、產品 UI、dependency、ADR-034 decision，亦不進行 inventory regeneration。
- PR 依單一目的拆分為 Design/Specify、Propose、Red/Green 與 CI/final groups；每個 group 各自維持 single-purpose scope。

## Constitution Check

- **IV. Test-First**：fixture 測試先以 Red commit 確認缺少 `scripts/check-sdd.sh` 的預期失敗，再由 Green work 實作 command 與 baseline；不弱化 Red contract。
- **X. Change Scope Discipline**：本變更只處理 Project SDD Lint 與其 local/CI parity；不混入 canonical spec cleanup、inventory regeneration 或 ADR-034 E2E path migration，且 PR groups 皆維持 single-purpose。
- **XVII. CI/CD Quality Gates**：新增獨立 Project SDD Lint CI job 與對等本地 command，並保留 OpenSpec schema validation 為不同 gate。
- **XX. Source of Truth & Contract Governance**：正典來源維持 `specs/foundation/001-project-sdd-lint/spec.md`；本 proposal 的 FR/SC 引用均可在該 canonical spec 定位，derived artifacts 與 baseline 不會改寫 canonical authority。
- **II. Generalization-First（NON-NEGOTIABLE）**：不觸及 task-type 邏輯、registry 或產品 runtime，故不受影響。
- **III. Data Fairness（NON-NEGOTIABLE）**：不讀取、傳回或新增 annotator-facing dataset、gold answer 或 scoring 資料，故不受影響。
