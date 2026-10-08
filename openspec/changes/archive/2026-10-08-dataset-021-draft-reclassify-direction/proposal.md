---
對應 Spec: specs/dataset/021-dataset-ingestion-and-lineage/spec.md
---

# dataset-021：draft manifest 修正限定「公開改受保護」方向

## Why

dataset-021 FR-006 要求「draft 修正 manifest 須原子重建受影響的公開／私有項目投影」，FR-005／AC-2.4 卻規定「儲存後答案僅由授權 scoring worker 讀取」。當欄位由受保護改為公開時，重建公開投影必須讀取已儲存的含答案私有資料，實作者可能因此讓匯入服務取得讀答案的權限，觸及主憲章 III（Data Fairness）。維護者已於 #1216／#1217 裁決（2026-10-08）：限定方向，兩條條文以縮小 FR-006 的方式消除矛盾，FR-005 不動。

## Goal

draft 修正分類 manifest 時，只有「公開改受保護」這個方向可原地修正（僅刪除公開投影並搬移該欄位已存於 `public_payload` 的公開值（非答案），不讀取已儲存的含答案資料）；其餘方向一律重新上傳該批來源，走串流匯入器。不新增任何可讀答案的角色。

## What Changes

- 修改 FR-006：把「draft 修正 manifest 須原子重建受影響的公開／私有項目投影」限縮為僅允許公開改受保護；受保護改公開與新增欄位分類須重新上傳該批來源並走串流匯入器；明定不得為此新增可讀答案的角色。
- 正典回寫新增 AC-2.6 驗收上述方向限制（新 AC 編號依專案慣例於 archive 回寫時加入，delta 以 FR-006 Scenario 描述）。
- 同步 `docs/diagrams/architecture/dataset-db-schema.md` 的 B-04（及 S-01、`classification_manifest` 欄位說明），並以 `scripts/tests/check-database-dataset.test.mjs` 的獨立 Red 測試鎖定字典與正典的方向限制。
- 正典版本 1.1.0 → 1.2.0（MINOR）：dataset-021 仍是未部署的候選契約，無 API 或使用者故事被破壞，只縮小一條未實作需求的允許範圍；依據為維護者 2026-10-08 裁決，未移除任何其他 FR／AC。

## Capabilities

主規格：`specs/dataset/021-dataset-ingestion-and-lineage/spec.md`（FR-006、AC-2.6）。FR-005、FR-007、AC-2.4 逐字不動。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| III. Data Fairness | 修正路徑不再需要讀取已儲存答案，匯入服務不取得新的答案讀取權；FR-005 仍只允許 scoring worker 讀取。 |
| II. Generalization-First | 方向限制以欄位分類（公開／受保護）表達，不依 NLP task type 分支。 |
