---
對應 Spec: specs/dataset/021-dataset-ingestion-and-lineage/spec.md
---

# dataset-021：dataset_item_private 新增 protected_payload

## Why

dataset-021 v1.2.0（#1217）允許 draft 將欄位由公開改為受保護，並把該欄位已存於 `public_payload` 的公開值搬入私有列；但 FR-005 只定義 `dataset_item_private` 的 `declared_split` 與 `hidden_answer` 兩個可空欄位，沒有欄位可存放「受保護但非答案」的值，FR-006／AC-2.6 的搬移落點因此未定義（#1217 審查 MED-001）。維護者已於 #1217 裁決（2026-10-08）：在 `dataset_item_private` 新增 `protected_payload` JSON 欄，與 `hidden_answer` 分開、依 `classification_manifest` 驅動、不寫死欄名；版號維持 MINOR。

## Goal

受保護但非答案的來源欄位值有明確、與 `hidden_answer` 分離的落點 `protected_payload`，其欄位名完全由該批 `classification_manifest` 的受保護集合決定；FR-006／AC-2.6 的「搬入私有列」具體落在此欄。

## What Changes

- 修改 FR-005：`dataset_item_private` 增列可空 JSON 欄 `protected_payload`，只存該 item 所屬批次 `classification_manifest` 受保護集合中的非答案欄位值；欄位名一律取自 manifest，不得以欄名猜測或寫死；不得存放 `hidden_answer` 的答案 envelope；讀取權與 `hidden_answer` 分開授權，標記者、一般建立者與一般 API 皆不可讀，且不新增任何可讀角色。
- 修改 FR-006：draft 由公開改受保護時，搬入私有列的落點明定為 `protected_payload`。
- 正典回寫同步 AC-2.6 的搬移落點、版本 1.2.0 → 1.3.0 與 Changelog。
- 同步 `docs/diagrams/architecture/dataset-db-schema.md`（Mermaid、§3.5 欄位、新增 P-04、B-04、S-01、資料公平性與權限矩陣）、`database-schema.er.json`、`database-table-inventory.md` 與相關 README／字典的欄位總數（350 → 351；dataset 31 → 32），並以 `scripts/tests/check-database-dataset.test.mjs` 等檢查器測試的獨立 Red 鎖定。
- 封存不可變：#1221 的 V-08 trigger 掛在整張 `dataset_item_private`，新欄位自動納入 sealed 後不可改，本變更不新增 trigger、不訂任何保存或刪除期限（由 #1224 負責）。
- 正典版本 1.2.0 → 1.3.0（MINOR）：dataset-021 仍是未部署候選契約，僅新增一個可空欄位並補齊 #1217 遺留的落點，依據為維護者 2026-10-08 裁決；未移除或推翻任何 FR／AC。

## Capabilities

主規格：`specs/dataset/021-dataset-ingestion-and-lineage/spec.md`（FR-005、FR-006、AC-2.6）。FR-007、AC-2.4 逐字不動。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| II. Generalization-First | `protected_payload` 的鍵由 `classification_manifest` 驅動，不依 task type 或固定欄名分支。 |
| III. Data Fairness | 受保護值與 `hidden_answer` 分欄、分權限；標記者、一般建立者與一般 API 皆不可讀，不新增可讀角色；sealed 後由 V-08 凍結。 |
