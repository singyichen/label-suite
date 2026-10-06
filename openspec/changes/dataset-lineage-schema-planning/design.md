# Design: dataset-lineage-schema-planning

## Goal

以正典 `specs/dataset/021-dataset-ingestion-and-lineage/spec.md` 與設計裁決 `docs/superpowers/specs/2026-10-06-dataset-lineage-design.md` 為來源，建立可追溯、可檢查的 dataset 物理候選字典與 NoteCraft 投影。這是 DB schema 的規劃設計，沒有 ORM、migration、API 或資料庫部署。

## Relational boundary

`dataset` 擁有邏輯身分；`dataset_version` 擁有同資料集內的版本號、同 dataset 父版本及 `draft → sealed` manifest；`dataset_import_batch` 一列代表一個來源檔及其有序來源、checksum、record path、前處理版本與欄位分類；`dataset_item` 只保存可見 allowlist 投影；`dataset_item_private` 以 item PK/FK 一對一保存來源 split 與隱藏答案。item 的版本與來源只經 batch FK 取得，不在 item 重複儲存。

字典將列出實際需要的 UNIQUE、CHECK、FK 索引及複合父版本 FK (`parent_version_id`, `dataset_id`) → `dataset_version(id, dataset_id)`。NoteCraft renderer 的 `fk` 只能標父表，不能表示複合約束；該約束留在 Wiki 說明與未來 migration 測試。`users` 為 account 候選父表；task/run 的 `dataset_version_id`、snapshot item membership、annotation/export 的版本鍵仍需後續 owning spec 定義，圖上不畫推測線。

## Privacy and lifecycle

建立者只於匯入前以本機檔案預覽原始 JSON。匯入時必須明確保存來源欄位分類，受保護欄位不得同時為 Input、Evidence 或可見 Output；分類缺漏時維持 `draft`。來源 artifact 與私有答案受到獨立邊界保護，儲存後隱藏答案僅可由授權 scoring worker 讀取。`sealed` 的來源、公開 item、私有答案與 manifest 不得原地修改；後繼版本是完整快照。

## Projection and verification

來源檢查器讀 account/admin 及 dataset 的 Mermaid PK 與六欄字典，合併後逐欄比對 `.er.json` 的表名、欄名、型別、可空性、PK 與單欄 FK；dataset 表必須顯示候選及未部署。OpenSpec schema validation、Project SDD lint、Node Red／Green 測試、plugin build、NoteCraft Wiki／Diagram 實看和 archive 後 Source-Verify 是四個獨立層次的驗證。SQL PK/FK/UNIQUE/CHECK、SQLite／PostgreSQL roundtrip 與 answer leakage runtime 測試屬未來 migration/API PR。

## Constitution Check

| 原則 | 設計對應 |
|---|---|
| II. Generalization-First | 動態欄位保留受控 JSON 與分類 manifest，固定 lineage 與鍵仍用關聯欄位。 |
| III. Data Fairness | 私有答案不進公開 payload；讀取權限和 API 回應 allowlist 雙重隔離。 |
| XIV／XVI. Lineage and Reproducibility | 每個 item 有批次、來源行序及穩定版本；manifest 在封存交易固定。 |
| XVIII. Deployment Safety | 候選與未部署狀態明列，正式約束需雙資料庫 migration 測試。 |
