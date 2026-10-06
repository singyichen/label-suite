---
對應 Spec: specs/account/020-auth-session-security/spec.md
---

## Why

Issue #1160 的首批 ER 規劃仍讓 `refresh_tokens` 重複儲存使用者與 session 起點、把 family 當無 FK 的識別值；ADR-021 的無限 30 秒寬限重發與 foundation 立即失效要求也未形成一致契約。若直接增加圖上的表，無法推斷已簽發 access JWT 在登出、改密碼或改 email 後的結果。

## What Changes

- 建立 auth/session owning spec，固定 `sid`／`sub`／`credential_version`、token-family 3NF、一次額外重發與有界 `409` 協調，以及高風險事件的失效結果。
- 修訂 Accepted ADR-021、foundation F-04 與受影響 account/admin 規格，使權威來源一致。
- 將第九張 `account_token_family` **候選表**投影到 account/admin 欄位字典和 NoteCraft Wiki／Diagram，保留其他模組待決項目。
- 驗證 OpenSpec、Project SDD lint、來源一致性、NoteCraft schema 與畫面。

本變更只處理**規劃契約與衍生視圖**；不建立 migration、ORM、API、frontend runtime 或宣稱資料表已部署。SQLite／PostgreSQL 的約束與並發實測是後續實作變更的驗收條件。

## Capabilities

`account/020-auth-session-security` — 真實認證、跨裝置 session、refresh 輪替、撤銷、憑證版本及一致 Email 識別的規劃契約。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| III. Data Fairness | 後端認證依目前 DB 身分與權限，不從 JWT 或圖面推導隱藏答案存取。 |
| VII. Security-by-Default | 撤銷與 `sid` 所屬人每次核對，已輪替 token 重用受限；token 原值不進錯誤或圖面。 |
| XX. Source of Truth | 正典與 Accepted ADR 先對齊，再生成資料字典及 NoteCraft 衍生視圖。 |
