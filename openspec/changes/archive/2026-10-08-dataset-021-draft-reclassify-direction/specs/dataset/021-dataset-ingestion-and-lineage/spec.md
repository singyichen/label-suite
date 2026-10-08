## MODIFIED Requirements

### Requirement: FR-006 dataset lineage 契約

- **FR-006**：匯入前須由授權建立流程明確分類來源欄位、檢查 PII／敏感內容，並獨立於 `field_role_map` 為每個來源批次保存版本化、經驗證且完整互斥的 `classification_manifest`。只有 manifest 的公開 allowlist 可進入 `public_payload`；受保護欄位不得同時為 Input、Evidence 或可見 Output。分類缺漏／矛盾時不可 seal；sealed 後 manifest 不可改。draft 修正 manifest 僅允許將欄位由公開改為受保護，系統只刪除該欄位的公開投影並把該欄位已存於 `public_payload` 的公開值（非答案）搬入私有列，不讀取已儲存的含答案資料；其他方向（受保護改公開、為尚未分類的欄位新增分類）一律須重新上傳該批來源並走串流匯入器重建，不得以修正 manifest 原地重建，也不得為此新增可讀答案的角色。匯入後不可透過一般預覽端點讀取受保護原始來源。

#### Scenario: FR-006 主要驗收

- **GIVEN** 使用合成資料檢查 FR-006 的規劃或後續實體約束
- **WHEN** 執行本需求描述的匯入、封存、存取或來源一致性驗證
- **THEN** 分類不完整或重疊時拒絕封存（FR-006）

#### Scenario: FR-006 draft 修正僅限公開改受保護

- **GIVEN** 一個 draft 批次的 manifest 已分類，且修正者為授權建立流程
- **WHEN** 修正把某欄位由公開改為受保護
- **THEN** 公開投影被刪除且值搬入私有列，過程不讀取已儲存的含答案資料（FR-006）

#### Scenario: FR-006 其他方向須重新上傳

- **GIVEN** 一個 draft 批次的 manifest 已分類
- **WHEN** 修正嘗試把欄位由受保護改公開，或為尚未分類的欄位新增分類
- **THEN** 修正被拒絕並要求重新上傳該批來源走串流匯入器（FR-006）
