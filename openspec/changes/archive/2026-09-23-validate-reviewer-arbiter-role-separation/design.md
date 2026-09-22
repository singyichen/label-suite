# 設計：validate-reviewer-arbiter-role-separation（issue #868）

## Context

`validateReviewData(data)` 目前只檢查 `reviewerIds.length > 0`。仲裁者候選雖是 reviewer 子集合，但沒有任何規則阻止「全部 reviewer 都被勾為 arbiter」。在 annotation companion change 排除保留仲裁者後，此形狀的有效分派池為空。

## Decisions

### D1：以集合差而非人數比較驗證

有效審核員定義為 `reviewerIds.filter(id => !arbiterIds.includes(id))`。至少一個元素才可儲存。不得只檢查兩陣列長度不同，因重複值或非法非子集合資料會使單純計數誤判；集合差直接表達業務規則。

### D2：錯誤掛在整個審核設定區

本錯誤涉及兩份名冊的組合，不歸咎單一 checkbox。沿用現有 `validateReviewData()` 的區塊錯誤列與 toast；訊息需可修正：「請至少保留一位未被指定為仲裁者的審核員」。

### D3：空仲裁名冊仍合法

`arbiterIds = []` 時完整 reviewer 名冊都是有效分派對象，儲存成功；發布時沿用 FR-010t 的警示，不新增阻擋。這保留現行「可先設定審核、之後補仲裁」流程。

## Risks / Trade-offs

- 單一 reviewer 的任務不能把該人同時設為 arbiter；這是刻意阻擋，因同一人一旦提交審核便不可能再通過 FR-060 非當事人規則。
- 本 change 只保證 draft 設定可運作；既有 prototype localStorage 若已存非法組合，重新編輯儲存時才會被攔下。annotation 資料層對非法舊資料維持空分派池，不偷偷改寫角色。
