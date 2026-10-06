# 任務清單：task-config-version-contract

> 本 change 只追蹤 issue #1160 的 013 任務建立設定版本契約。013 是建立時初始版本與交易的 owning spec；014 的 draft 編輯及 cycle 釘選由相依 change `task-run-identity-contract` 處理，015 的消費契約由 `annotation-run-identity-contract` 處理。這份清單不代表 ORM、migration、API、SQLite／PostgreSQL 實測或 NoteCraft 實體圖已完成。只有主 session 依證據更新勾選。

## 1. 正典與設計來源

**故事目標**：013 SC-001、SC-002、SC-006 — 建立任務時留下不可變設定起點、creator membership 與冪等重送契約；新增 AC-4.3～AC-4.6 具體定義交易、衝突及後續版本驗收。

> 依賴：先完成正典修訂，再建立 proposal 與 design；本群組序列執行，沒有平行任務。

- [x] 1.1 修訂 `specs/task-management/013-task-new/spec.md` 為 v8.3.0，定位 FR-006／FR-006a／FR-006d、TaskConfig／TaskGuidelineConfig、AC-4.3～AC-4.6 與 Changelog；只更新規劃契約。 [@senior-sa]
- [x] 1.2 建立 `openspec/changes/task-config-version-contract/proposal.md`，說明 013 初始版本、建立交易與相依 change 的責任界線。 [@main]
- [x] 1.3 建立 `openspec/changes/task-config-version-contract/design.md`，明列不可變版本、registry provenance、冪等重試、下游引用與未部署限制。 [@senior-dba]

## 2. Delta 與版本登錄

**故事目標**：013 SC-001、SC-002、SC-006 — OpenSpec 與狀態登錄可追溯任務建立、creator membership 和同 key 重送；AC-4.5 保留歷史 config 版本的驗收來源。

> 依賴：1.1～1.3 完成後才能鏡射 delta；狀態登錄須引用已確定的正典版本。本 change 的 013 delta 不代替 014／015 的相依 delta。

- [x] 2.1 建立 `openspec/changes/task-config-version-contract/specs/task-management/013-task-new/spec.md`，逐字鏡射 013 的 FR-006／FR-006a／FR-006d、TaskConfig／TaskGuidelineConfig，並以 AC-4.3～AC-4.6 標示驗收情境。 [@senior-sa]
- [x] 2.2 更新 `specs/STATUS.md` 的 013 版本與規劃狀態，保留尚未部署的界線；同一共享狀態檔的 014／015 更新由主 session 與各自 change 協調。 [@main]

## 3. 驗證與封存交付

**故事目標**：013 SC-001、SC-002、SC-006 — 經結構驗證、來源定位與封存回寫後，衍生檢視仍可追到 013 正典，且不誤稱建立交易已在資料庫實作。

> 依賴：2.1～2.2 與相依 change 的 014／015 正典對齊完成後，主 session 依序執行下列命令；封存前先完成 scoped code review、QA Scenario 與安全邊界審查。此群組沒有平行任務。純文件變更沒有 Red／Green runtime 證據，後續 ORM、migration、API 與雙資料庫測試另立任務。

- [x] 3.1 執行 `openspec validate task-config-version-contract --type change`，預期輸出 `Change 'task-config-version-contract' is valid`；執行 `git diff --check`，預期 exit 0。 [@main]
- [x] 3.2 執行 `bash scripts/check-sdd.sh`，預期本 change 無新 error；如有既有 baseline warning，須記錄規則與位置，不視為本 change 通過新錯誤。 [@main]
- [x] 3.3 執行 `for id in FR-006 FR-006a FR-006d AC-4.3 AC-4.4 AC-4.5 AC-4.6 TaskConfig TaskGuidelineConfig SC-006 8.3.0; do rg -n -F "$id" specs/task-management/013-task-new/spec.md >/dev/null || exit 1; done`，預期每個 delta 引用 ID 與版本／Changelog 均可定位；主 session 核對條文與正典一致。 [@main]
- [x] 3.4 執行 `openspec archive task-config-version-contract --yes`，預期 archive 成功並產生無 delta heading 的 derived view；再執行 `for id in FR-006 FR-006a FR-006d AC-4.3 AC-4.4 AC-4.5 AC-4.6 TaskConfig TaskGuidelineConfig SC-006; do rg -n -F "$id" openspec/specs/task-management/013-task-new/spec.md >/dev/null || exit 1; done`，預期所有本 change 引用均能回到 013 正典。Exception: governance-propagation; Files: `openspec/changes/task-config-version-contract/proposal.md`, `openspec/changes/task-config-version-contract/design.md`, `openspec/changes/task-config-version-contract/tasks.md`, `openspec/changes/task-config-version-contract/specs/task-management/013-task-new/spec.md`, `openspec/changes/archive/2026-10-06-task-config-version-contract/proposal.md`, `openspec/changes/archive/2026-10-06-task-config-version-contract/design.md`, `openspec/changes/archive/2026-10-06-task-config-version-contract/tasks.md`, `openspec/changes/archive/2026-10-06-task-config-version-contract/specs/task-management/013-task-new/spec.md`, `openspec/specs/task-management/013-task-new/spec.md`; Reason: OpenSpec archive 必須原子搬移 change 四件套並回寫 013 derived view，無法以單檔任務完成。 [@main]

本清單完成並通過各閘門後，主 session 才建立繁體中文 PR、等待所有 CI job 成功，再合併並更新 issue #1160 的對應勾選。物理資料表字典、NoteCraft Wiki／Diagram、SQLite／PostgreSQL 約束及交易測試仍屬後續獨立切片。
