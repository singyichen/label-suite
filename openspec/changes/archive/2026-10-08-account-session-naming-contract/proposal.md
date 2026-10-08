---
對應 Spec: specs/account/020-auth-session-security/spec.md
相依 Spec: specs/foundation/000-foundation/spec.md
---

## Why

Issue #1160 的候選表 `account_token_family` 實際一列代表一次登入；舊 FK `refresh_tokens.family_id` 也指向該次登入。若沿用這些物理名稱，登入生命週期、後續工時資料來源與 NoteCraft 關聯圖的語意將不一致。既有 `revoked_at` 可能來自安全事件，不能推斷使用者明確登出。

## What Changes

- 將未部署的一次登入候選表定名 `account_session`，將 refresh token 真實 FK 定名 `refresh_tokens.session_id`；JWT claim `sid` 保持原名及相同 UUID。
- 新增可空 `account_session.logged_out_at`。只有可驗證的明確登出成功時與 `revoked_at` 同交易寫入；安全撤銷、自然到期及無有效憑證僅清 cookies 均保持空值。
- 同步 account-020、foundation F-04、Accepted ADR 與相依規格，再投影至候選欄位字典、NoteCraft 與 auth lifecycle 圖。
- 保留現有 refresh 輪替、30 秒有界 grace、絕對期限、每請求失效與跨裝置結果。

本變更只更新規劃契約及衍生視圖；不建立 ORM、migration、API 或正式資料。後續 SQLite／PostgreSQL 測試須驗證 FK、可空欄位及 `logged_out_at <= revoked_at`。

## Capabilities

- `account/020-auth-session-security`：一次登入 session、明確登出時間與既有認證安全行為。
- `foundation/000-foundation`：F-04 session persistence、絕對期限、即時撤銷與命名基準。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| I. Spec-First | 先更新現行正典及 OpenSpec delta，再投影圖與字典。 |
| III. Data Fairness | 不變更任何 annotator 可見 API 或答案資料邊界。 |
| VII. Security-by-Default | `sid` 所屬人、版本、撤銷與絕對期限仍每請求核對；無可驗證憑證不偽造登出。 |
| X. Testing And TDD | 已先提交失敗來源測試；本切片以正典、SDD 與來源投影驗證收斂。 |
| XX. Source of Truth | 現行 canonical spec 與 Accepted ADR 為權威；已歸檔變更保留歷史原貌。 |
