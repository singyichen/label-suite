# 標記歷程登入工作階段來源

對應 Spec: specs/annotation/015-annotation-workspace/spec.md

## Why

工時報表需要從真實認證來源定位完成事件；既有歷程缺少 session FK，不能把單次 `lead_time` 當工時或猜測舊事件歸屬。

## What Changes

- FR-088 補 `annotation_history_event.account_session_id` 可空真 FK；新認證動作由服務端從已驗證 JWT `sid` 寫入並驗 actor 身分。
- 舊與系統事件保持可空；可見投影不洩漏他人 session、私有答案或 test/gold 答案。
- 與 `worklog-observable-interval-contract` 的 014 工時來源同步，但本 change 只擁有 015 正典。

## Impact

015 v12.1.0 規劃契約；沒有 ORM、migration、API 或已部署資料表。
