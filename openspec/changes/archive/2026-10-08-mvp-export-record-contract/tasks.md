# 任務清單：mvp-export-record-contract

> issue #1160 的匯出規劃切片；只交付正典、候選字典、NoteCraft 與來源驗證，不建立 ORM、migration 或 API。主 session 依 Red／Green 與實際驗證證據更新 checkbox。

## 1. 正典契約

**故事目標**：014 AC-1.14～AC-1.16、SC-046 — 重新下載與原始檔案完全相同，且跨 run 可追溯。

- [x] 1.1 `senior-qa` 新增 `scripts/tests/check-mvp-export-canonical.test.mjs`，先驗證現行 014 欠缺不可變產物、逐 run manifest、格式 v2、失效與授權契約，執行取得預期 Red 並獨立提交。Exception: governance-propagation; Files: `scripts/tests/check-mvp-export-canonical.test.mjs`; Reason: 此 Node 規格測試由 senior-qa 獨立擁有，腳本路徑的工具擁有權規則須以 TDD Red 所有人為準。 [@senior-qa]
- [x] 1.2 修訂 `specs/task-management/014-task-detail/spec.md` 的生效 FR／AC／SC、版本與 Changelog，使 1.1 的預期失敗測試通過；不宣稱 prototype 或 backend 已實作。 [@senior-sa]
- [x] 1.3 新增 `openspec/changes/mvp-export-record-contract/specs/task-management/014-task-detail/spec.md`，將 1.2 的穩定 ID 條文寫成 MODIFIED delta 與具體 Scenario。 [@senior-sa]
- [x] 1.4 驗證 `openspec validate mvp-export-record-contract --type change`、`bash scripts/check-sdd.sh`、`node --test scripts/tests/check-mvp-export-canonical.test.mjs` 皆 exit 0。 [@main]

## 2. 候選資料表

**故事目標**：014 SC-046、FR-010i-1／2 — 一次匯出與每個納入的 run 有獨立可追溯實體。

- [x] 2.1 新增 `docs/diagrams/architecture/task-export-db-schema.md`，含兩張表的 §2 Mermaid、§3 六欄字典、§4～§7 PK／FK／UNIQUE／CHECK、索引、雙庫與待決。 [@senior-dba]
- [x] 2.2 `senior-qa` 新增 `scripts/tests/check-database-task-export.test.mjs`，驗證表、欄、PK/FK/型別、敏感資料排除、來源與 NoteCraft 一致，先執行 Red 並獨立提交。Exception: governance-propagation; Files: `scripts/tests/check-database-task-export.test.mjs`; Reason: 此 Node 資料字典測試由 senior-qa 獨立擁有，腳本路徑的工具擁有權規則須以 TDD Red 所有人為準。 [@senior-qa]
- [x] 2.3 擴充 `scripts/check-database-schema.mjs` 讀入匯出字典並嚴格驗 Mermaid／ER，使 2.2 的預期失敗測試通過。 [@senior-devops]
- [x] 2.4 更新 `docs/diagrams/architecture/database-schema.er.json`，投影兩張未部署候選表；只畫真實單欄 FK。 [@main]
- [x] 2.5 更新 `docs/diagrams/architecture/database-table-inventory.md` 的中文分群、來源、新總數及剩餘阻擋決策。 [@main]
- [x] 2.6 若 CI 尚未收錄新增測試，更新 `.github/workflows/ci.yml` 的 database-schema job。 [@main]

## 3. 驗收與交付

**故事目標**：014 SC-046 — 候選 Schema 能於 NoteCraft 查閱且不誤稱已部署。

- [x] 3.1 執行 `node --test scripts/tests/check-database-*.test.mjs scripts/tests/check-mvp-export-canonical.test.mjs`、`node scripts/check-database-schema.mjs`、NoteCraft plugin JSON Schema/build、`bash scripts/check-sdd.sh`、`git diff --check`；預期 exit 0，並實開 Wiki／Diagram 核對兩表。 [@main]
- [x] 3.2 由 `senior-code-reviewer` 與 `senior-security` 檢查版本追溯、授權、答案隔離和受限物件參照；阻擋問題修正後重驗。 [@main]
- [x] 3.3 在 archive 前執行 Source-Verify：delta 的 15 個 FR／AC／SC ID 逐條可於正典定位，014 版本 8.0.0 與 Changelog 均已回寫，ADR／來源檔案路徑存在。 [@main]
- [x] 3.4 已建立繁體中文 PR #1201；本地三層閘門、相關 NoteCraft／SDD CI 及程式碼／安全審查已通過，備妥 final PR 的 archive/write-back。全量 CI 對歸檔後的最終提交再驗，通過後才合併。 [@main]

全部任務打勾後，在同一 final PR 執行 archive/write-back 與 §6.2 的衍生視圖逐條引用核對；隨後依既有授權合併並更新 issue #1160，工時與 runtime 項仍維持未完成。
