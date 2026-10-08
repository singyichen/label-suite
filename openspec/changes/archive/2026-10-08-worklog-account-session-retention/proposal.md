# 登入工作階段歷史保留

對應 Spec: specs/account/020-auth-session-security/spec.md

## Why

工時與責任歷程要參照一次登入的 session。普通硬刪若 cascade 刪除 session，會使合法歷史失去來源；安全撤銷也不能被誤認為明確登出。

## What Changes

- FR-001／FR-008 補 session 歷史保留、普通硬刪 RESTRICT 候選及憑證有效性分離。
- `logged_out_at` 仍只記可驗證明確登出；無法驗證時上線時長未知。
- 與 `worklog-observable-interval-contract` 的 014 工時來源同步，但本 change 只擁有 account-020 正典。

## Impact

account-020 v1.3.0 與 ADR-021 規劃契約；沒有 ORM、migration、API 或已部署資料表。個資最長保存與匿名化順序須在 migration 前另裁決。
