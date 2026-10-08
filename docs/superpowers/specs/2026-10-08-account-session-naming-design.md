# 登入 Session 命名與明確登出時間設計

## 目的與範圍

承接 issue #1160 與使用者「資料表採常見名稱、說明使用中文」的決定。現有 `account_token_family` 實際一列代表一次登入，`refresh_tokens.family_id` 指向該次登入。將尚未部署的候選表改稱 `account_session`，將關聯欄改稱 `refresh_tokens.session_id`，並增加僅表示**明確登出成功**的 `logged_out_at`。這一輪只更新規劃契約、字典與 NoteCraft；不建立 ORM、migration、API 或正式資料。

## 方案比較與裁決

1. **採用：直接改名為 `account_session`。** 名稱與列粒度一致，JWT `sid` 繼續承載同一 UUID。沒有已部署業務表，無須資料搬遷。更新所有現行正典引用及衍生視圖，避免同一事實有兩個名稱。
2. 保留 `account_token_family` 再加 `account_session` 別名：會讓規格、FK 與圖對同一列產生雙名稱，拒絕。
3. 額外建立 `account_session_history`：複製登入者、起點與結束事實，帶來同步及保留期限問題，拒絕。

`family` 仍可在認證安全文字中描述 refresh token 的輪替群組，但不再是物理表或 FK 欄名。歷史已歸檔 OpenSpec change 與舊版設計文件保留為當時記錄；現行正典、Accepted ADR、字典、圖、測試必須一致。

## 資料與行為契約

- `account_session(id UUID PK, user_id UUID FK, started_at timestamptz NOT NULL, revoked_at timestamptz NULL, logged_out_at timestamptz NULL)`：一列為一次登入；`started_at` 是絕對期限基準；`revoked_at` 表示 session 因任何原因失效；`logged_out_at` 只在可驗證的明確登出成功交易中填入，且同交易填 `revoked_at`。只清除 cookie、改密碼、停用、token 重用及自然到期均不得偽造登出時間。`logged_out_at <= revoked_at` 的一致性由後續 migration/服務測試驗證；`revoked_at` 已存在但 `logged_out_at` 為空表示原因不是可證明的明確登出。
- `refresh_tokens.session_id UUID NOT NULL` 真 FK 指向 `account_session.id`；輪替時沿用 session。token 不重複存 `user_id` 或 `started_at`。既有撤銷、30 秒 grace、絕對期限與跨裝置安全規則不變。
- JWT `sid` claim 名稱和 UUID 值不變；任何受保護請求仍從 DB 讀取目前 session、帳號狀態與憑證版本。這輪不修改 HTTP API contract。
- `logged_out_at` 是後續工時報表可用的登入結束來源。`revoked_at` 不可當作登出；缺明確登出時報表顯示未知，不計虛假的在線時長。工時區間表及資料保留/FK 刪除策略在下一獨立切片裁決。

## 正典與投影順序

1. 修改 Accepted ADR-021、account-020、foundation FR-016/076/077/105 及受影響 account/admin 現行規格；以 OpenSpec delta 留下變更與 archive 後的來源定位。ADR-035 的現行引用同步。歷史 archive 不回寫。
2. 修改 `account-admin-db-schema.md`、`database-table-inventory.md`、`database-schema.er.json`。候選狀態、真 FK 標記、中文標題與說明一致；刷新 token 的 FK 名稱改為 `session_id`，增加 `logged_out_at`。全圖表數不變，欄數增加一。
3. 更新 account-001 的可編輯 `auth-token-lifecycle.json` 並由產圖工具重生配對 HTML；舊設計文與已歸檔 change 留歷史註解或原貌。
4. 先加入會失敗的來源／圖投影測試，確認其因舊名或缺新欄失敗，才修改上述正典和圖；最後執行 OpenSpec schema 驗證、Project SDD lint、來源驗證、NoteCraft build 與實際 Wiki／Diagram 檢視。

## 驗收與界線

- 現行正典、ADR、欄位字典、NoteCraft 與測試都使用 `account_session`、`refresh_tokens.session_id`，舊名僅存在於明確標示歷史的資料。
- `logged_out_at` 可空語意、與 `revoked_at` 的區別、JWT `sid` 不變及尚未部署狀態可從中文 Wiki/字典讀懂。
- 來源檢查能抓到表名、欄名、FK 或欄數回退；Spec Lint、OpenSpec validation 和 Source-Verify 通過。這些證據只證明規劃契約，不聲稱 DB 約束已實測。
