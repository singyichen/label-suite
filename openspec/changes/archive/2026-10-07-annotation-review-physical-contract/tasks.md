# 任務清單：annotation-review-physical-contract

> issue #1160 的 annotation／review 規劃切片。主 session 唯一更新 checkbox，依已驗證證據逐項標記；八張表仍未部署，不含 ORM、migration、API、gold、品質報告或匯出表。

## 1. 正典修訂

**故事目標**：annotation-015 SC-006／SC-013、FR-052／FR-059／FR-061／FR-065／FR-103 — span 爭議鍵、來源凍結、單批仲裁與草稿重派都有可驗證的正典契約；014 FR-005f／FR-005l 的來源為 `specs/task-management/014-task-detail/spec.md`。

> 依賴：先核對 014／015 生效條文與 DBA 設計；Red 證據確認後才能改正典。本群組序列執行。

- [x] 1.1 由 senior-qa 提交 `scripts/tests/check-annotation-review-canonical.test.mjs` 的 Red 測試，覆蓋 live `OutputAnswer` token shape、FR-059／FR-061 token 位置、缺少 V1 凍結／單票／重派條款；執行並記錄預期失敗，既有測試須維持通過。Exception: governance-propagation; Files: `scripts/tests/check-annotation-review-canonical.test.mjs`; Reason: Node 測試由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 將 mjs 視為生產腳本。 [@senior-qa]
- [x] 1.2 修訂 `specs/annotation/015-annotation-workspace/spec.md` 的 FR／AC／SC、`OutputAnswer` 關鍵實體原文、版本及 Changelog；明示 reviewer 首次提交後 annotator 凍結、無票且 disputed 才可改判、FR-065 舊覆寫／idempotent PUT 規則完整取代為全量同 batch 一次裁定與 span 識別，保留沿革原文。 [@senior-sa]
- [x] 1.3 修訂 `specs/task-management/014-task-detail/spec.md` 的 FR-005f／FR-005l、AC、版本及 Changelog；明示舊未提交草稿轉 abandoned、原作者保留但繼任者不可見。 [@senior-sa]
- [x] 1.4 執行正典測試與 `bash scripts/check-sdd.sh`，確認修訂通過並核對 014／015 下游依賴；不將規劃結果稱為 runtime 實作。 [@main]

## 2. 物理字典與來源檢查

**故事目標**：annotation-015 SC-006／SC-013、FR-105 — 八張候選表各有單一責任、穩定鍵、權限界線與雙庫待驗證約束。

> 依賴：第 1 群組的正典與 OpenSpec delta 對齊後才凍結欄位；來源檢查 Red 先於 Green。字典與檢查可在不同檔案分工，但各任務序列執行。

- [x] 2.1 建立 `docs/diagrams/architecture/annotation-review-db-schema.md`，列八張候選表的 Mermaid、六欄字典、複合 FK／UNIQUE／CHECK、索引、SQLite／PostgreSQL 差異與未部署限制；不畫推導表與 private answer FK。 [@senior-dba]
- [x] 2.2 由 senior-qa 提交 `scripts/tests/check-database-annotation-review.test.mjs` Red 測試，涵蓋八表精確集合、欄位與鍵、假／漏 FK edge、舊摘要、私有答案不得進圖及 CI 包含；記錄預期失敗。Exception: governance-propagation; Files: `scripts/tests/check-database-annotation-review.test.mjs`; Reason: Node 測試由 senior-qa 獨立擁有，Project SDD lint 的 scripts ownership pattern 將 mjs 視為生產腳本。 [@senior-qa]
- [x] 2.3 擴充 `scripts/check-database-schema.mjs`，從 annotation／review 字典解析並嚴格核對 Mermaid 邊與 NoteCraft 欄位，通過 2.2 的 Red 契約且不弱化測試。 [@senior-devops]

## 3. NoteCraft 與驗證

**故事目標**：annotation-015 SC-006／SC-013、FR-105 — Wiki／Diagram 僅展示有正典與字典證據的未部署候選實體。

> 依賴：2.1～2.3 通過才投影圖；NoteCraft 與 CI、盤點總帳使用同一來源計數。此群組序列執行。

- [x] 3.1 更新 `docs/diagrams/architecture/database-schema.er.json`，加入八張候選表、逐欄型別／必填／PK／真實單欄 FK／來源；複合 FK 以 Wiki 文字說明，不能假畫成單欄實體約束。 [@main]
- [x] 3.2 更新 `docs/diagrams/architecture/database-table-inventory.md` 的群組、總數與 migration 待決事項。 [@main]
- [x] 3.3 更新 `.github/workflows/ci.yml` 的 database-schema job，加入 annotation／review 的來源檢查測試。 [@senior-devops]
- [x] 3.4 執行 `openspec validate annotation-review-physical-contract --type change`、`bash scripts/check-sdd.sh`、`node --test scripts/tests/check-database-*.test.mjs`、`node scripts/check-database-schema.mjs`、NoteCraft build 與 `git diff --check`，預期 exit 0；實開 Wiki／Diagram 驗八表、欄位、搜尋、FK 與候選標示。 [@main]

## 4. 審查與交付

**故事目標**：annotation-015 SC-006／SC-013、FR-105 — 規劃變更經來源、驗收、安全及 CI 證據確認後，issue #1160 只勾選真正完成的盤點範圍。

> 依賴：前三群組通過。主 session 依序處理 review、archive、PR 與 issue；未定的 retention、gold、quality/export 保持未完成。

- [x] 4.1 請 senior-code-reviewer、senior-qa 與 senior-security 依 delta 情境及答案隔離邊界審查，記錄阻擋項修正與殘餘 migration 風險。 [@main]
- [x] 4.2 在最終 PR 前執行 Source-Verify、正典版本／Changelog 回寫與 `openspec archive annotation-review-physical-contract --yes`；逐條定位 derived view 的 FR／AC／SC 引用，確認無 delta heading。 [@main]
- [x] 4.3 建立繁體中文 PR，待所有 CI 通過及 review thread 歸零後依既有授權合併，再更新 issue #1160 的已驗證勾選；保留後續 quality/export/worklog 與 migration 待決。 [@main]
