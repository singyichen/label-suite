## MODIFIED Requirements

### Requirement: FR-002 授權契約

- **FR-002**：只有當前 active `super_admin` 且 `admin.user_management.view` 已啟用並允許時可以存取 `/user-management`；新增、編輯、停用、啟用與 system role 變更另需 `admin.user_management.manage`，每個命令仍須通過本規格的 seeder／最後超管等資源限制。矩陣格不可授權 `user` 越過 system role 硬邊界（ADR-037）。

**v1.4.0 修訂（issue #1269，降級即撤權）**：「當前」指每個請求當下的 DB `users.role`。`super_admin` 被降級為 `user` 後，該帳號的下一個 `/user-management` 讀取或管理命令 MUST 依 `account/020-auth-session-security` FR-002（權限依當前 DB `role` 判定，JWT `role` 僅供顯示）被拒絕（403）。仍在效期內、帶有舊 `role` claim 的 access JWT MUST NOT 延續管理權；被拒絕的請求 MUST NOT 回傳任何帳號列表、帳號詳情或異動紀錄。上文原文逐字保留。

#### Scenario: FR-002 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 當前超管與相應格允許才可讀寫帳號，原有資源限制仍生效（FR-002）

#### Scenario: 超管降級後的下一個管理請求即被拒絕
- **GIVEN** 超管 A 持有仍在效期內、`role` claim 為 `super_admin` 的 access JWT，且另一位超管已把 A 的 system role 降為 `user`
- **WHEN** A 以同一個 token 送出下一個 `/user-management` 讀取請求或任一管理命令（新增、編輯、停用、啟用、system role 變更）
- **THEN** 服務端 MUST 依當前 DB `role` 回 403，且回應 MUST NOT 含任何帳號資料
- **AND** 這次拒絕不需要等 token 到期，也不受 A 降級前已通過的矩陣格影響
