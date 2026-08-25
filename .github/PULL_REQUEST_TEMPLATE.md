## Purpose

<!-- 這個 PR 想達成什麼？一句話就夠。 -->

## Reason

<!-- 為什麼需要這個變更？是什麼觸發的？ -->

<!-- 範例 —— 情境表：
| 情境 | Given | When | Then |
|------|-------|------|------|
| ... | ... | ... | ... |
-->

## Result

<!-- 這個 PR 交付了什麼？摘要結果。 -->

<!-- 範例 —— 決策表：
| # | 條件 | 動作 | 預期 |
|---|------|------|------|
| 1 | ... | ... | ... |
-->

## Changed Files

| File | Change |
|------|--------|
| `path/to/file` | <!-- 簡述變更內容 --> |

## Test Plan

<!-- 每一項都必須逐項驗證；通過標 [x]，失敗標 [ ] 並附原因 -->

- [ ] 驗證項目

## Notes

<!-- 不適用時請刪除本段 -->

- [ ] 含資料庫 migration —— 部署前須先執行
- [ ] 含設定變更（`.env`、settings）
- [ ] 需要清除快取
- [ ] API 欄位／schema 有變更
- [ ] 第三方服務串接有變更

## Rollback Plan (Migration PR only)

<!-- 僅在本 PR 含資料庫 migration 時填寫；否則刪除本段 -->

**Before state**：<!-- migration 前的 schema／資料狀態 -->

**After state**：<!-- migration 後的 schema／資料狀態 -->

**Rollback procedure**：
1. <!-- 執行 `uv run alembic downgrade -1` 或特定指令 -->
2. <!-- 其他資料復原步驟 -->

## Impact Scope

<!-- 勾選本 PR 影響到的範圍 -->

- [ ] 前端頁面（列出： ）
- [ ] 後台頁面（列出： ）
- [ ] API（列出： ）
- [ ] 排程／佇列
- [ ] 其他（說明： ）

## Related

- Issue: #<!-- issue 編號，或填 "None" -->

## Checklist

- [ ] 已在本機測試並確認功能與穩定性
- [ ] 已補上必要註解，特別是不易理解的部分
- [ ] PR 標題符合格式：`<type>: <中文描述>`

## Type Reference

| Type | Description |
|------|-------------|
| feat | 新功能 |
| fix | 錯誤修正 |
| docs | 僅文件變更 |
| refactor | 重構，不改變行為 |
| test | 僅新增或更新測試 |
| style | 格式、空白、lint 修正 |
| chore | 工具、設定、相依套件更新 |
| perf | 效能優化 |
| ci | CI/CD pipeline 變更 |
