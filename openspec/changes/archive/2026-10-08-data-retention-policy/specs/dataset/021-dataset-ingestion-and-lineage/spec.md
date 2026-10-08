## MODIFIED Requirements

### Requirement: FR-011 dataset lineage 契約

- **FR-011**：dataset 各類資料依 ADR-038（維護者 2026-10-08 於 #1224 的裁決）分級保存：(1) 受限來源 artifact、`dataset_item_private` 的私有答案與 `protected_payload`，只要仍有 sealed 版本或 run 引用，即以 RESTRICT 保留，不得刪除、匿名化或以無限制 cascade 移除；(2) 只有未封存的 draft 版本被丟棄時，才可在同一交易依服務順序實體刪除其 item、私有伴隨列、批次與受限 artifact；sealed 版本及被 run 引用的項目一律拒絕刪除；(3) 以該版本為來源的派生資源（含答案的歷程 JSON、匯出 metadata）隨其版本與 run 保存，版本整體下架的程序與期限待定（#1224），未定案前不得刪除；(4) cache 與匯出不能回傳已刪除／逾期資料。除既有正典下限外，本規格不訂任何保存期限。

#### Scenario: FR-011 主要驗收

- **GIVEN** 使用合成資料檢查 FR-011 的規劃或後續實體約束
- **WHEN** 嘗試刪除被 sealed 版本或 run 引用的受限 artifact、私有答案或 `protected_payload`
- **THEN** 刪除被 RESTRICT 拒絕，被引用資料不變（FR-011）

#### Scenario: FR-011 丟棄未封存 draft 可實體刪除

- **GIVEN** 一個未封存且未被任何 run 引用的 draft 版本
- **WHEN** 授權流程丟棄該 draft
- **THEN** 其 item、私有伴隨列、批次與受限 artifact 在同一交易被實體刪除，且不影響任何 sealed 版本（FR-011）
