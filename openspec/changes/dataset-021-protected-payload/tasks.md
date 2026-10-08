# 任務清單：dataset-021-protected-payload

> 對應 issue #1228（Part of #1216）。主 session 驗證 Red／Green 並更新勾選。

## 1. Red 測試

**故事目標**：dataset-021 SC-003 — 受保護非答案值落在與 `hidden_answer` 分離的 `protected_payload`，標記者不可讀。

- [ ] 1.1 先提交檢查器測試的獨立 Red：`scripts/tests/check-database-dataset.test.mjs` 斷言正典 FR-005／FR-006／AC-2.6、版本 1.3.0 與 Changelog、字典 §3.5／P-04／B-04／S-01，並同步各檢查器測試的欄位總數（350 改為 351），觀察預期失敗。Exception: governance-propagation; Files: `scripts/tests/check-database-dataset.test.mjs`; Reason: Node test 檔由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 僅識別 shell tests。 [@senior-qa]

## 2. Green 回寫

**故事目標**：dataset-021 SC-006 — 正典、字典、ER JSON 與總帳對 `protected_payload` 與欄位總數的描述一致。

- [ ] 2.1 回寫 `specs/dataset/021-dataset-ingestion-and-lineage/spec.md` 的 FR-005、FR-006、AC-2.6、版本 1.3.0 與 Changelog。 [@senior-sa]
- [ ] 2.2 同步 `docs/diagrams/architecture/dataset-db-schema.md`、`docs/diagrams/architecture/database-schema.er.json`、`docs/diagrams/architecture/database-table-inventory.md` 與欄位總數（351 欄），Red 測試轉綠。Exception: governance-propagation; Files: `docs/diagrams/architecture/dataset-db-schema.md`, `docs/diagrams/architecture/database-schema.er.json`, `docs/diagrams/architecture/database-table-inventory.md`; Reason: 字典、ER JSON 與總帳由檢查器互相比對，必須在同一任務同步，否則投影差異閘門紅。 [@senior-dba]

## 3. 驗證與歸檔

**故事目標**：dataset-021 SC-003 — 閘門與 archive 後的衍生檢視保留 `protected_payload` 契約。

- [ ] 3.1 執行 OpenSpec schema 驗證、Project SDD lint、檢查器測試與 `check-database-schema.mjs`。 [@main]
- [ ] 3.2 Source-Verify 預掃後 archive 並核對衍生檢視 FR／AC 引用、版本與 Changelog，更新 `specs/STATUS.md`。 [@main]
