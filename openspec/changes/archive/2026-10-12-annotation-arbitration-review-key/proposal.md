# 仲裁沿用審核權限鍵與任務角色常數對齊

對應 Spec: specs/annotation/015-annotation-workspace/spec.md

## Why

Issue #1269（權限矩陣唯讀稽核的條文補齊單）。

FR-104 規定正式後端的標記／審核寫入，要依 ADR-037 以明確選定的 active task role、對應的 `annotation.workspace.annotate`／`annotation.workspace.review` 格，以及實際 assignment／reviewer roster 逐次授權。但仲裁寫入（FR-061 的仲裁版面、FR-065 的仲裁票）用哪一個權限鍵，FR-104 沒有寫。admin-007 鍵註冊表也沒有仲裁專用鍵。後端實作者可能自創 `annotation.workspace.arbitrate`（未登錄的鍵依 ADR-037 一律拒絕，會讓仲裁全部失敗），也可能把 `arbiter_ids` 當成獨立的 task role。

`arbiter_ids` 與 `reviewer_ids` 的關係在 `task-management/014-task-detail` 的 `ARBITER_CANDIDATE_RULE`（`task_role = reviewer AND membership_status = active AND can_arbitrate = true`）可以推得，但 015 本身沒有寫明。

另外，015 規格常數 `TASK_ROLES = annotator | reviewer` 只有兩個角色，與 `specs/_shared/constants.md` 的 `TASK_ROLES` 及 admin-007 任務角色矩陣（`project_leader | reviewer | annotator`）不一致。共用常數檔的衝突註記早已標出這一點。可是 015 本身就有 `project_leader` 以 `role=project_leader` 進入 workspace 處置例外池（FR-095），兩個角色的寫法並不正確。

維護者裁定（2026-10-12，issue #1269 預期調整清單）：

- `arbiter_ids ⊆ reviewer_ids`；仲裁沿用 `annotation.workspace.review` 加名冊資源條件，不另立鍵。
- 015 的 `TASK_ROLES` 與矩陣三角色對齊。

不走 Lightweight Path：FR-104 新增 MUST（仲裁寫入的鍵與名冊條件），並新增一則可測 AC。

分級：MINOR。FR-104 原文逐字保留，只在後面補一段修訂。`TASK_ROLES` 從子集改為引用共用常數，再在情境中限縮 workspace 的 active role，屬對齊既有共用常數，沒有新增角色。沒有移除或推翻任何 FR／AC。

## What Changes

- **修訂 FR-104**：補一段修訂，寫明以下四點。
  - 仲裁寫入 MUST 沿用 `annotation.workspace.review`：active role 為 `reviewer`，需要 active reviewer membership，並另需通過資源條件。資源條件是：該審核員在該任務的 `arbiter_ids` 中，且符合 FR-060 第 2 點的非當事人限制。
  - `arbiter_ids` MUST 是 `reviewer_ids` 的子集合，不是新的 task role（引用 `task-management/014-task-detail` 的 `ARBITER_CANDIDATE_RULE`）。
  - MUST NOT 另立仲裁專用權限鍵。
  - 只有 `reviewer` 格允許而不在 `arbiter_ids` 中的人，MUST NOT 寫入仲裁票。
- **新增一則 AC**：在 gate 4 回寫正典時編號，接續「run／assignment 身分驗收情境」現行最大者 AC-7.8。內容涵蓋：仲裁沿用審核鍵、不在名冊者被拒、名冊成員失去 reviewer membership 後被拒。
- **規格常數對齊**（gate 4 一併回寫）：
  - `TASK_ROLES` 改為 `project_leader | reviewer | annotator`，引用 `specs/_shared/constants.md`。
  - 補一句：workspace 的 active role 限 `annotator`／`reviewer`；`project_leader` 只用於 FR-095 例外池處置與歷程。
  - 共用常數檔的衝突註記同步移除。
- **正典回寫**：FR-104 補 v12.3.0 修訂段（原文逐字保留）、規格常數一行、新增一則 AC、版號 12.2.0 → 12.3.0、Changelog 加一列。

**非目標**：

- 不改 `task-management/014-task-detail`（`arbiter_ids` 的定義來源；該檔屬另一條線）。
- 不改 FR-060、FR-061、FR-093 本文，仲裁資格與指派規則不變。
- 不改 admin-007 鍵註冊表，也不新增權限鍵。
- 不改 prototype。

## Capabilities

`annotation` — 仲裁寫入的授權鍵與名冊條件。
