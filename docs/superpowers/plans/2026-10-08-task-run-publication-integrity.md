# Task/run 發布完整性實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 issue #1160 的任務初建、發布回執及標記工作位狀態三項候選契約收斂到正典、實體字典與 NoteCraft，並保持未部署界線。

**Architecture:** 013 持有初建交易要求，014 持有發布與 assignment 行為；task/run 字典持有候選欄位及約束，NoteCraft 是其檢視投影。只規劃資料結構與服務契約，不新增 runtime/migration。

**Tech Stack:** Markdown 正典、OpenSpec delta、NoteCraft ER JSON、Node.js `node:test`、Project SDD lint。

**Spec:** [候選設計](../specs/2026-10-08-task-run-publication-integrity-design.md)

## Global Constraints

- 所有表仍為未部署候選；資料集分析 016／017 的專用表延後至後 MVP。
- 公開 manifest 僅含排序後的公開 UUID；不得含答案、split 或受限來源。
- 圖面說明用繁體中文，程式／測試／commit 用英文；不得修改受保護規則檔。
- 38 表、327 欄、44 個圖上單欄 FK 是移除 assignment `status` 後的預期總數。
- 不以 ADR-032 稽核事件最低一年推論所有 task/run 資料保存上限。

## Review Focus

- 初建 task 若缺初始 config 或 guideline，提交應由延後 FK 拒絕；Task 2 的 Red 測試檢查字典約束與正典。
- 同 key 異請求或提交結果不明時，不得重新抽樣；Task 2 檢查 014 契約。
- 回執驗證失敗或 DB 回滾時不得宣稱發布成功；Task 2 檢查交易與恢復條文。
- 被排除或已提交的工作位不得因受派者空值被誤判；Task 2 檢查狀態優先序與無第二份欄位。
- 清理無引用物件不得誤刪已引用回執；Task 2 檢查清理保護條件。

---

### Task 1: 準備候選契約與追溯

**Files:**
- Modify: `docs/superpowers/specs/2026-10-08-task-run-publication-integrity-design.md`
- Create: `openspec/changes/task-run-publication-integrity/{proposal.md,design.md,tasks.md,specs/task-management/014-task-detail/spec.md}`

**Interfaces:** 014 現行 FR-010f、FR-010f-6、FR-005l／FR-005h 與 013 FR-006a；新條文使用相同正典 ID，OpenSpec delta 鏡射原文。

- [ ] 讀 013／014 對應條文、現行版本及 Changelog，確認修改 ID 和 owner。
- [ ] 撰寫 014 修改及新增的 Scenario、proposal、design、單檔 tasks，保留原 Scenario。
- [ ] 執行 `openspec validate task-run-publication-integrity --type change`，確認 schema 通過。

### Task 2: QA Red 契約測試

**Files:**
- Modify: `scripts/tests/check-database-task-run.test.mjs`

**Interfaces:** 消費 Task 1 的契約、task/run 字典、NoteCraft JSON 與 inventory；不更動來源。

- [ ] senior-qa 增加聚焦斷言：兩個 current version 非空與延後複合 FK、規範 manifest／冪等／清理條件、無 assignment status、NoteCraft 與 inventory 327 欄。
- [ ] 執行 `node --test scripts/tests/check-database-task-run.test.mjs`，保存預期失敗原因並提交 Red。
- [ ] 主 session 核對 Red 僅因缺少預定契約失敗，既有測試仍綠。

### Task 3: 正典與候選字典 Green

**Files:**
- Modify: `specs/task-management/014-task-detail/spec.md`
- Modify: `specs/task-management/013-task-new/spec.md`（僅若 FR-006a 缺必要精度）
- Modify: `docs/diagrams/architecture/task-run-db-schema.md`

**Interfaces:** 依 Task 1 delta、Task 2 Red；不建 ORM／DDL。

- [ ] 更新正典版本、相關 FR／AC／SC 與 Changelog，記錄回執位元組、外部物件與 DB 交易邊界、assignment 投影。
- [ ] 更新 task/run 字典：current version 非空與延後複合 FK、manifest／冪等、移除 assignment `status`、RESTRICT 與未決保存政策。
- [ ] 執行聚焦測試至 Green，提交獨立單檔變更。

### Task 4: NoteCraft 與總帳 Green

**Files:**
- Modify: `docs/diagrams/architecture/database-schema.er.json`
- Modify: `docs/diagrams/architecture/database-table-inventory.md`
- Modify: `scripts/tests/check-database-schema.test.mjs`（僅舊 328 常數）

**Interfaces:** 投影 Task 3 字典；38 表／327 欄／44 個單欄 FK。

- [ ] 移除 NoteCraft assignment `status` 並更新中文說明、meta 計數。
- [ ] 更新總帳候選欄數、來源與待決項，調整明確舊計數測試。
- [ ] 執行來源一致性、全套 NoteCraft 測試與 `notecraftapp build docs`。

### Task 5: 四層驗證與交付

**Files:**
- Modify: `openspec/changes/task-run-publication-integrity/tasks.md`（主 session 勾選）
- Generated: `openspec/changes/archive/<date>-task-run-publication-integrity/**` 與 `openspec/specs/task-management/014-task-detail/spec.md`
- Modify: `specs/STATUS.md` 與 `design/system/screen-inventory.md`（若版本／SC 計數造成衍生檢視變動）

**Interfaces:** Task 1～4 完成後進行；GitHub issue #1160 只勾已驗證項目。

- [ ] 執行 OpenSpec schema、Project SDD lint、來源比對與 Red→Green 證據核查；必要時更新衍生 inventory。
- [ ] reviewer 檢查 DBA／安全／正典一致性；修正阻擋項。
- [ ] archive 並核對每個變更 ID／版本／Changelog 在正典和 derived view 都可定位。
- [ ] 開繁體中文 PR；全部 CI 成功且無阻擋 review 後合併，更新 issue #1160；保存政策未裁決則維持開放。
