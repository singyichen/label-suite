## ADDED Requirements

### Requirement: FR-008E Super Admin 查看全部之全平台範圍來源

- **FR-008E**：Super Admin Dashboard 點擊「查看全部」時，系統必須導向 `/task-list`，並以 `super_admin` 權限顯示全平台任務。

**v2.14.0 修訂（issue #1269，範圍來源）**：「以 `super_admin` 權限」MUST 解讀為伺服器端依 ADR-037 判定的當前身分：當前 DB system role 為 `super_admin`，且平台層 `task.list.view` 格為 `allowed=true`（admin-007 鍵註冊表）。全平台範圍 MUST NOT 來自網址參數、`localStorage` 或其他前端狀態。上文原文逐字保留。

#### Scenario: 全平台範圍由當前超管身分決定
- **GIVEN** 當前 DB system role 為 `super_admin` 的使用者，且平台層 `task.list.view` 格允許
- **WHEN** 從 Super Admin Dashboard 點擊「查看全部」進入 `/task-list`，網址不帶任何 `task_role`
- **THEN** 伺服器 MUST 回傳全平台任務範圍

### Requirement: FR-008F 等待 IAA 確認入口之範圍來源

- **FR-008F**：Super Admin Dashboard 的「等待 IAA 確認」指標卡數值必須為可執行待辦入口：以 `role="button"`、`tabindex="0"` 呈現，支援滑鼠點擊與鍵盤（Enter／Space）操作；觸發時導向 `/task-list?task_role=super_admin&status=waiting_iaa_confirmation`，並套用「待 IAA 確認」狀態篩選。

**v2.14.0 修訂（issue #1269，範圍來源）**：網址中的 `task_role=super_admin` 只是 prototype 的檢視上下文。`super_admin` 是 system role，不是 task role，因此這個參數 MUST NOT 作為正式後端授予全平台範圍的依據；全平台範圍 MUST 依 FR-008E 修訂段，由當前 `super_admin` system role 加平台層 `task.list.view` 格決定。當前 system role 不是 `super_admin` 的使用者帶這個參數時，MUST 只依其自身 active `task_membership` 的範圍回應。`status=waiting_iaa_confirmation` 篩選、指標卡互動與導向目的地不變。上文原文逐字保留。

#### Scenario: 一般使用者偽造 task_role 參數不得取得全平台範圍
- **GIVEN** 當前 DB system role 為 `user` 的使用者，只在部分任務具 active `task_membership`
- **WHEN** 直接開啟 `/task-list?task_role=super_admin&status=waiting_iaa_confirmation`
- **THEN** 回應 MUST 只含其自身具 membership 且狀態為 `waiting_iaa_confirmation` 的任務，MUST NOT 含任何其他任務
- **AND** 當前 system role 為 `super_admin` 的使用者開啟同一網址時，回應為全平台中狀態為 `waiting_iaa_confirmation` 的任務
