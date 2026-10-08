# 任務清單：dataset-021-draft-reclassify-direction

> 對應 issue #1217（Part of #1216）。主 session 驗證 Red／Green 並更新勾選。

## 1. Red 測試

**故事目標**：dataset-021 FR-006／AC-2.6 — draft 修正 manifest 只允許公開改受保護。

- [ ] 1.1 先提交 `scripts/tests/check-database-dataset.test.mjs` 的獨立 Red 測試，斷言正典 FR-006／AC-2.6 與字典 B-04／S-01 皆寫明方向限制與重新上傳要求，並觀察預期失敗。Exception: governance-propagation; Files: `scripts/tests/check-database-dataset.test.mjs`; Reason: Node test 檔由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 僅識別 shell tests。 [@senior-qa]

## 2. Green 回寫

**故事目標**：dataset-021 FR-006 — 正典與字典不再與 FR-005 矛盾。

- [ ] 2.1 回寫 `specs/dataset/021-dataset-ingestion-and-lineage/spec.md` 的 FR-006、AC-2.6、版本 1.2.0 與 Changelog。 [@senior-sa]
- [ ] 2.2 同步 `docs/diagrams/architecture/dataset-db-schema.md` 的 B-04、S-01 與 `classification_manifest` 欄位說明，Red 測試轉綠。 [@senior-dba]

## 3. 驗證與歸檔

- [ ] 3.1 執行 OpenSpec schema 驗證、Project SDD lint、檢查器測試與 `check-database-schema.mjs`。 [@main]
- [ ] 3.2 Source-Verify 預掃後 archive 並核對衍生檢視 FR／AC 引用、版本與 Changelog，更新 `specs/STATUS.md`。 [@main]
