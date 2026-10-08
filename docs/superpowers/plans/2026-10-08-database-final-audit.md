# MVP 資料落點終驗實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 關閉 issue #1160 能在規劃階段裁決的試標結果、任務稽核落點與雙向追溯缺口，並清楚列出仍需產品隱私政策或實際資料庫驗證的部分。

**Architecture:** 014 與 Accepted ADR-022／032 持有業務及稽核契約；六份實體字典持有 SQL 候選欄位；NoteCraft 是衍生投影；盤點總帳持有跨模組需求追溯及保存政策待決矩陣。只改規劃文件及一致性檢查，不建立 ORM、migration 或 API。

**Tech Stack:** Markdown 正典、OpenSpec delta、NoteCraft ER JSON、Node.js `node:test`、Project SDD lint。

**Spec:** [終驗設計](../specs/2026-10-08-database-final-audit-design.md)

## Global Constraints

- 全部表仍是未部署候選；資料集分析 016／017 的專用分析表延後。
- `task_trial_iaa_result` 僅承接 014 試標閘門的每回合確定結果，不重定義 017 FR-039 的計算方式。
- `audit_events` 是任務狀態與隔離設定的唯一稽核持久化落點；先修訂衝突的 Accepted ADR，再改候選圖。
- 普通硬刪維持 RESTRICT 候選；未有產品／隱私裁決的期限不得自行填值。
- 資料表說明用繁體中文；識別碼、程式、測試與 commit 用英文。
- 預期候選圖由 38 表／327 欄／44 個單欄 FK 變成 39 表／333 欄／46 個單欄 FK；複合 FK 另依字典列示。

## Review Focus

- 最新回合只有 `done` 狀態、沒有完整結果證據時，正式發布仍須失敗；Task 2 Red 鎖定正典及欄位來源。
- `De = 0` 是已計算的「無法計算」，不是 `failed`；Task 2 Red 鎖定結果語意。
- 任務稽核事件與狀態改變分屬不同交易或重複落表會失去唯一事實來源；Task 2 Red 鎖定同交易和單一事件。
- `audit_events.task_id` 只有 UUID、沒有 FK 時不可宣稱參照完整；Task 2 Red 鎖定候選 FK 與 NoteCraft 線。
- 保存下限不應誤變成無限保存或全類別上限；Task 4 的追溯矩陣明列未決政策。

---

### Task 1: 正典變更骨架

**Files:**
- Create: `openspec/changes/database-final-audit/proposal.md`
- Create: `openspec/changes/database-final-audit/design.md`
- Create: `openspec/changes/database-final-audit/tasks.md`
- Create: `openspec/changes/database-final-audit/specs/task-management/014-task-detail/spec.md`

**Interfaces:** 014 FR-010o-4／FR-010c、ADR-022、ADR-032；不新定 IAA 演算法。

- [ ] 逐項記錄目的、範圍、正典所有者與可觀察驗收；每個檔案獨立提交或單檔任務。
- [ ] 修改 014 FR-010o-4 的 `done` 證據與兩種稽核查詢投影，寫對應 MODIFIED Scenario。
- [ ] 執行 `openspec validate database-final-audit --type change`，結果為 valid。

### Task 2: senior-qa Red

**Files:**
- Modify: `scripts/tests/check-database-task-run.test.mjs`

**Interfaces:** 消費 Task 1 正典契約、兩份字典、NoteCraft 與總帳；不修改來源。

- [ ] senior-qa 加入聚焦斷言：IAA 六欄一對一結果、`done` 共交易、稽核雙投影、task 稽核 FK、39／333／46 摘要。
- [ ] 執行單檔測試，保存只因新契約尚未落地的預期失敗並提交 Red；主 session 核對原有測試仍綠。

### Task 3: 正典與候選字典 Green

**Files:**
- Modify: `docs/adr/022-task-state-machine-location.md`
- Modify: `docs/adr/032-user-action-audit-trail.md`
- Modify: `specs/task-management/014-task-detail/spec.md`
- Modify: `docs/diagrams/architecture/task-run-db-schema.md`
- Modify: `docs/diagrams/architecture/account-admin-db-schema.md`

**Interfaces:** Task 1 delta 與 Task 2 Red；每檔分開檢查／提交。

- [ ] ADR-022／032 將兩個邏輯稽核實體對應到單一 `audit_events` 事件，定義 action、allowlist、同交易、投影、無重複領域表。
- [ ] 014 版本與 Changelog、FR／關鍵實體對齊；`done` 必有完整來源證據，無法計算仍為 done。
- [ ] task/run 字典增加一對一 IAA 六欄及約束；account/admin 字典給可空 `audit_events.task_id` 候選真 FK 與索引。
- [ ] 聚焦 Red 測試轉 Green，並核對未引入隱藏答案讀取或雙重結果狀態。

### Task 4: NoteCraft 與跨模組追溯

**Files:**
- Modify: `docs/diagrams/architecture/database-schema.er.json`
- Modify: `docs/diagrams/architecture/database-table-inventory.md`

**Interfaces:** Task 3 兩份字典。新表六欄、兩條新單欄 FK；計數 39／333／46。

- [ ] 逐欄加入中文用途、來源與未部署狀態；僅從真單欄 FK 畫線。
- [ ] 總帳加入 MVP 保存事實的需求→落點與候選表→正典雙向矩陣，以及資料類別的期限／刪除／匿名化待決矩陣。
- [ ] 移除已解決的舊待決文字，明示 016／017 延後及 ORM／雙庫測試另案。

### Task 5: 四層驗證、封存與交付

**Files:**
- Modify: `openspec/changes/database-final-audit/tasks.md`（主 session 勾選）
- Generated: `openspec/changes/archive/<date>-database-final-audit/**` 與 `openspec/specs/task-management/014-task-detail/spec.md`
- Modify: `specs/STATUS.md`、`design/system/screen-inventory.md`（僅衍生檢查需要時）

**Interfaces:** Task 1–4 全部驗證後才 archive。

- [ ] `openspec validate`、`bash scripts/check-sdd.sh`、Node 來源及 NoteCraft 測試、JSON Schema/build、實際 Wiki／Diagram。
- [ ] Archive 前後核對正典版本、FR／AC／SC、Changelog 與 derived view 每個引用可定位。
- [ ] DBA、code、security review；解決 Critical／High。
- [ ] 繁體中文 PR，CI 全通過後合併；issue #1160 僅勾規劃驗證已完成的項，保存政策與 runtime 保持未完成。
