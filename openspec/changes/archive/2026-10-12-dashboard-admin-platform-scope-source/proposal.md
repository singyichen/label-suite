# 超管全平台任務範圍改由當前身分決定

對應 Spec: specs/dashboard/012-dashboard/spec.md

## Why

Issue #1269（權限矩陣唯讀稽核的條文補齊單）。

FR-008F 規定 Super Admin Dashboard 的「等待 IAA 確認」入口要導向 `/task-list?task_role=super_admin&status=waiting_iaa_confirmation`。FR-008E 寫的是「以 `super_admin` 權限顯示全平台任務」，但沒有寫明這個權限從哪裡來。照字面讀，全平台範圍是由網址上的 `task_role=super_admin` 決定的。這違反兩條 ADR-037 規則：

- `super_admin` 是 system role，不是 task role（「System roles never imply task membership」）。
- 「Route query parameters never establish the user's role, identity, assignment or reviewer roster」。

後端若照這條實作，任何 `user` 只要在網址加上 `task_role=super_admin`，就能拿到全平台任務清單。

Prototype 已在 issue #1266 修正：`task-list.html` 的 `normalizeTaskRole()` 只有在 stored system role 也是 `super_admin` 時，才採用 `task_role=super_admin`。正典仍停留在舊寫法。

維護者裁定（2026-10-12，issue #1269 預期調整清單）：012 的全平台範圍改由「當前 `super_admin` system role ＋平台層規則」決定，不經 `task_role` query。

不走 Lightweight Path：FR-008E/F 新增一條 MUST NOT（`task_role` query 不得授予範圍），並新增一則可測驗收情境。

分級：MINOR。兩條 FR 的原文逐字保留，導向目的地與「待 IAA 確認」篩選都不變，只把範圍來源從網址改成伺服器端的當前身分。沒有移除或推翻任何 FR／AC。

## What Changes

- **修訂 FR-008E**：補一段修訂。「以 `super_admin` 權限顯示全平台任務」的範圍 MUST 由伺服器依當前 DB system role 為 `super_admin`，加上平台層 `task.list.view` 格決定。
- **修訂 FR-008F**：補一段修訂。
  - 網址中的 `task_role=super_admin` 只是 prototype 的檢視上下文，MUST NOT 作為正式後端授予全平台範圍的依據。
  - 非 `super_admin` 帶這個參數時，MUST 依其自身的 `task_membership` 範圍回應，不得取得全平台清單。
  - `status=waiting_iaa_confirmation` 篩選不變。
- **新增一則驗收情境**：非 `super_admin` 帶 `task_role=super_admin` 進 `/task-list`，不得看到全平台任務；`super_admin` 不帶該參數，仍得到全平台範圍。012 的驗收情境依檔內慣例不編號，所以不指派 `AC-N.M`。
- **正典回寫**：
  - FR-008E／FR-008F 各補一段 v2.14.0 修訂（原文逐字保留）。
  - 在使用者故事 2 的驗收情境新增一項。
  - 版號 2.13.0 → 2.14.0，Changelog 加一列。

**非目標**：

- 不改 prototype：`dashboard.js` 仍可組出帶 `task_role` 的網址，`task-list.html` 在 #1266 後已經 fail closed。
- 不改 FR-009D 與 PL Dashboard 的「查看全部」規則。
- 不改 `task-management/010-task-list` 的可見範圍條文。

## Capabilities

`dashboard` — Super Admin 全平台任務範圍的授權來源。
