# 任務清單：dataset-lineage-schema-planning

> 此 change 對應 issue #1160 的 dataset 規劃切片，正典、字典與 NoteCraft 都只描述候選資料表。主 session 驗證 Red／Green 並更新勾選；ORM、migration、API 與部署不在本 change。

## 1. 正典與來源

**故事目標**：dataset-021 SC-001～SC-003 — 多來源 lineage、完整版本及隱藏答案隔離有可追溯的 owning spec。

- [x] 1.1 由 senior-dba 比較分表、混合 JSON、僅檔案三案並保存設計裁決。 [@senior-dba]
- [x] 1.2 建立 `specs/dataset/021-dataset-ingestion-and-lineage/spec.md`，加入 FR／AC／SC、版本、Changelog 與下游界線。 [@senior-sa]
- [x] 1.3 將 dataset-021 登錄 `specs/STATUS.md`，標示仍未建立 ORM、migration、API 與 runtime。 [@main]
- [x] 1.4 完成 `docs/diagrams/architecture/dataset-db-schema.md` 五表、六條 FK 欄位字典，逐欄列出身分、敏感度、寫入／讀取、限制與來源。 [@senior-dba]

## 2. Red／Green 來源檢查

**故事目標**：dataset-021 SC-006 — 字典與 NoteCraft 圖面的欄位、型別、鍵及候選狀態同步。

- [x] 2.1 先提交 `scripts/tests/check-database-dataset.test.mjs` 的獨立 Red 測試；既有 13 項通過、新增 6 項因 parser、來源合併及狀態檢查缺失而預期失敗。Exception: governance-propagation; Files: `scripts/tests/check-database-dataset.test.mjs`; Reason: Node test 檔由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 僅識別 shell tests。 [@senior-qa]
- [x] 2.2 在已驗證 Red 後擴充 `scripts/check-database-schema.mjs`，支援 dataset 字典、來源合併與未部署標記；19 項測試全過。 [@senior-devops]
- [x] 2.3 調整 `scripts/tests/check-database-schema.test.mjs` 的 account/admin 計數作用域並加入合併實際來源測試；先驗證 JSON 尚缺五張 dataset 表的預期失敗。Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`; Reason: Node test 檔由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 僅識別 shell tests。 [@senior-qa]
- [x] 2.4 擴充 `docs/diagrams/architecture/database-schema.er.json`，加入 dataset 分群與五張候選表；同一組測試與 CLI 均已轉為通過。 [@main]
- [x] 2.5 senior-qa 先以獨立 Red commits `4142576a`／`7da4b05e` 覆蓋 Mermaid／字典漏列、重複定義及未加反引號欄名；主 session 確認 5 項預期失敗、1 項誤判防護通過。Exception: governance-propagation; Files: `scripts/tests/check-database-dataset.test.mjs`; Reason: Node test 檔由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 僅識別 shell tests。 [@senior-qa]
- [x] 2.6 senior-devops 在 Red 證據後提交實作修正 `5dde6959`，改為雙向核對 Mermaid／字典欄與表；26 項測試及合併來源 CLI 均通過。 [@senior-devops]
- [x] 2.7 senior-qa 以獨立 Red commit `e57eaee1` 增加 CI 契約測試，確認 dataset 回歸測試原先未納入 NoteCraft job；14 項舊測試通過、新測試依預期失敗。Exception: governance-propagation; Files: `scripts/tests/check-database-schema.test.mjs`; Reason: Node test 檔由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 僅識別 shell tests。 [@senior-qa]
- [x] 2.8 更新 `.github/workflows/ci.yml` 與先前明確授權的 `CLAUDE.md` 驗證指令，讓本機與 CI 同跑兩份測試；27 項測試與來源 CLI 通過。Exception: governance-propagation; Files: `.github/workflows/ci.yml`, `CLAUDE.md`; Reason: 同一 CI 命令及對應本機驗證指令須保持一致。 [@main]

## 3. 衍生檢視與交付

**故事目標**：dataset-021 SC-006 — 使用者可於 NoteCraft Wiki／Diagram 看見有來源的候選表，而待決的 task/run FK 不被畫成實體關聯。

- [x] 3.1 更新 `docs/diagrams/architecture/database-table-inventory.md`，把 dataset 缺口改為有字典候選並保留 task/run、annotation/export 待決。 [@main]
- [x] 3.2 更新 `docs/diagrams/architecture/account-admin-db-schema.md` 的 NoteCraft 摘要，使它仍明確區分本文件九表與全圖計數。 [@main]
- [ ] 3.3 建立 `openspec/changes/dataset-lineage-schema-planning/specs/dataset/021-dataset-ingestion-and-lineage/spec.md` 的 FR／SC delta，驗證 OpenSpec schema，完成 archive/write-back 與正典版本／Changelog。 [@main]
- [x] 3.4 執行 Project SDD lint、27 項 Node 測試、來源檢查、NoteCraft JSON Schema/build 與實際 Wiki／Diagram 驗收；記錄 14 表／94 欄／12 FK，全部明示候選未部署。 [@main]
- [ ] 3.5 完成 senior-code-reviewer、senior-qa Scenario 及 senior-security 審查，並在 archive 後逐條驗證正典引用可定位。 [@main]

完成 3.3～3.5 後再建立繁體中文 PR、等待 required CI 成功才合併，並只勾選 issue #1160 已驗證的規劃切片；PR 與 issue 更新不屬 OpenSpec change 內的實作任務。
