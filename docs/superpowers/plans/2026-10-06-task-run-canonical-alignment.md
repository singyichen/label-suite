# Task/run Identity Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 issue #1160 的 task／run 身分、封存時點與權限邊界回寫既有正典，使後續實體欄位字典可只畫有來源的 FK。

**Architecture:** 以 task-management-014 為 run 行為 owner，013 擁有建立時設定、015 擁有標記／審核身分，Accepted ADR-022 擁有狀態機。選定 task_run_cycle、每次發布一份不可變 snapshot、run-item 真實 membership、每個 run 釘住 guideline 版本。Project SDD lint 要求一個 active OpenSpec change 恰對應一份正典，因此用三個相依 change 分別承載 013、014、015 的 delta；本計畫不建立 ORM、migration、API 或 ER 投影。

**Tech Stack:** Markdown canonical specs、Accepted ADR、OpenSpec delta、Project SDD lint、Source-Verify。

**Spec:** `docs/superpowers/specs/2026-10-06-task-run-identity-design.md`

## Global Constraints

- 正典優先於衍生欄位字典與 NoteCraft；資料表仍為候選、未部署。
- 不讀取或暴露 dataset-021 的 `dataset_item_private`、`declared_split`、hidden answer；run 只由公開 item ID、seed 與演算法決定抽樣。
- SQLite Lite 與 PostgreSQL production 的 FK、UNIQUE、CHECK、交易語意都需在後續 migration 切片實測；本計畫不宣稱已通過。
- `task-management-014`、`task-management-013`、`annotation-015` 和 ADR-022 的既有行為必須以局部條文修訂，不複製第二套產品規格。
- 每張未來資料表有 PK；單欄與複合 FK 只在定義完欄位、型別、目標後才投影到 ER JSON。
- 修改正典版本與 Changelog；013、014、015 各有獨立 OpenSpec proposal／design／tasks／delta，proposal 只有一個 `對應 Spec:`。三者 archive 後逐條檢查 derived view 引用定位；PR issue/body 使用繁體中文。

## Review Focus

1. IAA 拒絕後再次 R1：歷史 R1 的 item、assignment、計數與審核單位不能與新 cycle 混合；Task 1／2／4 的情境須覆蓋。
2. R2 後 Official 發布：Official item 集合只在當次發布封存，不能沿用 R1 時的暫時剩餘集合；Task 2 的情境須覆蓋。
3. 等待階段改指引：Official run 必須鎖定發布當下同任務 guideline 版本，Dry run 必須等於 round 的版本；Task 2／4 的情境須覆蓋。
4. 已停用 membership 或不再位於 reviewer 名冊：歷史候選池保留，但不得因此獲得即時審核／答案權限；Task 2／4 的情境須覆蓋。
5. 重複發布與跨資料集 item：同一 idempotency key 回原 run，不同請求衝突；run item 必須來自 cycle 所釘的 sealed dataset version；Task 2 的情境須覆蓋。

---

### Task 1: 狀態機與 cycle 決策

**Files:** Modify `docs/adr/022-task-state-machine-location.md`.

**Interfaces:** ADR-022 提供 014 可引用的權威狀態轉換與副作用；保留歷史 run/snapshot，只清除目前 cycle 指標。

- [x] 讀 ADR-022 的 transition table、sample_snapshot invariant、illustrative table 命名，對照設計 §6 T1/T3/T10。
- [x] 修正 `waiting_iaa_confirmation → draft`：關閉並保留舊 cycle 與所有已發布 round／snapshot／assignment；下一次 Dry 開新 cycle 並從 R1 起算。任務的目前指標可清除，歷史不可刪。
- [x] 將每次發布擁有獨立不可變 snapshot 寫成狀態機副作用；ADR 範例若用複數舊表名，明示只是舊例或改為符合 foundation FR-105 的候選單數名稱。
- [x] 以 `rg` 確認 ADR 不再宣稱「清空唯一 task snapshot 即清除歷史」，記錄修訂依據與本地 commit。

### Task 2: 014 run、抽樣及版本身分

**Files:** Modify `specs/task-management/014-task-detail/spec.md`.

**Interfaces:** 014 FR-010f 系列與 FR-010u 為 task/run 行為正典；供後續物理字典導出 cycle、round、snapshot、run、item 與 assignment 的鍵。

- [x] 先列出 FR-010b/c/d/e/f/f-2/f-3/f-4、FR-010u、FR-010s-1、FR-010t、FR-005h、FR-014、FR-017a、FR-010i-1/i-2、FR-022、SC-005 及關鍵實體的現有原文；將設計 §6 T1～T12 對應到每條修訂。
- [x] 明定 `task_id × cycle_id × run_type × round_no` 或穩定 `run_id` 作計數作用域；R1 重啟不碰舊歷史，Dry round 在 cycle 內唯一，Official 每 task 生命週期最多一筆。
- [x] 明定 cycle 釘住 sealed dataset／不可變 config/schema 版本；`dataset_total` 為該 sealed version 的已接受 item 數。R1 只釘資格池、seed、演算法，每次 Dry 或 Official 發布才封存自己的 item 清單；Official 取當 cycle 扣除已發布 Dry 清單後的剩餘項目；每個 Rn 的要求筆數不得用盡 Official 最後一項。
- [x] 明定 `isolation_enabled=false` 仍不允許同 cycle 的 Dry／Official item ID 重疊；關閉只改變跨階段結果隔離保證並要求警告／稽核，不自動產生混合結果動作。以 cycle-scoped run-item 唯一鍵作後續物理約束。
- [x] 明定每個 run 的 guideline version 必填且不可變：Dry 等於 round 版本，Official 於發布交易選取目前版本；等待階段只開放四個指引內容欄編輯並產生新版本，其餘 config/dataset 仍 draft-only。
- [x] 明定 current reviewer/arbiter 名冊是正規化 task membership 投影，發布時凍結候選池但即時授權仍查 active membership；終局排除保留事件且不計入分母。
- [x] 明定發布的 idempotency、跨版本 item 拒絕、同交易 run/snapshot/items/assignment/transition，以及 schema/config 版本參照；新增／修訂 AC 與 SC 覆蓋 Review Focus 1～5，更新本檔版本及 Changelog。014 的 `ReviewAssignment` 實體須退役或重新定義為非持久化推導，與 015 FR-093(5) 一致。
- [x] 執行 Project SDD lint；用 `rg` 定位每個被修改的 FR／AC／SC 與 ADR 引用，提交此正典切片。

### Task 3: 013 建立時 config/schema 起點

**Files:** Modify `specs/task-management/013-task-new/spec.md`.

**Interfaces:** 013 建立成功時提交的 TaskConfig 形成不可變 version 1，後續 014 draft 儲存建立新版本；設定輸出依 registry 驗證。

- [x] 讀 013 FR-006／FR-006a／FR-006d 與 TaskConfig、TaskGuidelineConfig 關鍵實體，確認與 014 建立交易及現有 UI 語意。
- [x] 局部補述第一次 config/schema 版本號皆為 1；每次成功修改完整 config 建立新 immutable row，schema digest 對 canonical outputs/field roles 與保留的 registry version 計算；version marker 可隨非 schema 變更遞增但 digest 相同。
- [x] 補述 creator 的 project_leader membership 與 task/config/guideline 建立同交易；保持原 Idempotency-Key 時窗及前端行為。
- [x] 新增驗收情境，更新本檔版本及 Changelog，跑 SDD lint 與來源定位，提交。

### Task 4: 015 標記／審核下游身分對齊

**Files:** Modify `specs/annotation/015-annotation-workspace/spec.md`.

**Interfaces:** 015 仍擁有 AnnotationRecord、ReviewUnit 與 submission-derived reviewer stickiness；它們以穩定 run/assignment 身分消費 014，不在此 change 創建物理 FK。

- [x] 讀 FR-051、FR-066、FR-093 與 AnnotationListItem／AnnotationRecord／ReviewUnit／TaskProfile 定義及退役段落，保留目前兩種 run type 的 UI 行為。
- [x] 把 run_id 與 assignment_id（或明確同等的 cycle-qualified key）加入新持久化標記／審核身份契約；歷史兩次 R1 與相同 sample ID 不共用提交或 review unit。
- [x] FR-066 的指引確認根據 run 釘住的 guideline version；submission-derived reviewer stickiness 保留，014 的 ReviewAssignment 實體說明同步退役或改為非持久化推導。
- [x] 增加重啟 R1、停用 reviewer、Official 指引差異情境，更新本檔版本及 Changelog，跑 SDD lint 與引用定位，提交。

### Task 5: OpenSpec proposal

**Files:** Create `openspec/changes/task-run-identity-contract/proposal.md`.

**Interfaces:** 提案敘述 013／014／015 正典衝突與 ADR-022 修訂原因，明示只做規劃文件。

- [x] 參照相鄰已封存 change 的繁體中文格式，保留 OpenSpec 必須完全相同的 `## Why`／`## What Changes` heading，frontmatter 列出三份對應正典 Spec；寫出 problem、scope、non-goals、source ownership、風險與回滾方式；此檔獨立提交。

### Task 6: OpenSpec design

**Files:** Create `openspec/changes/task-run-identity-contract/design.md`.

**Interfaces:** 對齊設計規格的 14 張候選表之身份契約，但不重複未核准的物理欄位字典。

- [ ] 記錄 cycle、run、snapshot、version、reviewer candidate、assignment 的決策與 SQLite／PG 留待實測限制；此檔獨立提交。

### Task 6A: 將 OpenSpec owner 拆成三個 change

**Files:** 分成三個單檔任務：(1) 修訂 `openspec/changes/task-run-identity-contract/proposal.md`，只宣告 014；(2) 建立 `openspec/changes/task-config-version-contract/proposal.md`，只宣告 013；(3) 建立 `openspec/changes/annotation-run-identity-contract/proposal.md`，只宣告 015。

**Interfaces:** 013 建立版本起點、014 定義 run、015 消費穩定 run/assignment；三份 proposal 各自指明相依 change 與共同 issue #1160，不複製第二套規格。

- [ ] 三個 proposal 各恰有一條 `對應 Spec:`；每次只改一檔並提交，`scripts/check-sdd.sh` 不再報 `ACTIVE_CHANGE_SPEC`。

### Task 6B: 補齊 013 與 015 的 OpenSpec design

**Files:** 分成兩個單檔任務：`openspec/changes/task-config-version-contract/design.md` 與 `openspec/changes/annotation-run-identity-contract/design.md`。

**Interfaces:** 兩份設計各描述自己的 owning contract、上游 014／dataset 相依與未部署限制；不重複 014 的完整 14 表表形。

- [ ] 各檔獨立提交並審查來源定位。

### Task 7: 013 OpenSpec delta

**Files:** Create `openspec/changes/task-config-version-contract/specs/task-management/013-task-new/spec.md`.

**Interfaces:** 只鏡射 Task 3 已變更的正典條文與驗收情境，保留相同 FR／SC／AC ID。

- [ ] 寫 ADDED/MODIFIED/REMOVED delta，以 `openspec validate task-run-identity-contract --type change` 驗證結構，提交。

### Task 8: 014 OpenSpec delta

**Files:** Create `openspec/changes/task-run-identity-contract/specs/task-management/014-task-detail/spec.md`.

**Interfaces:** 只鏡射 Task 2 已變更的正典條文與驗收情境，保留相同 FR／SC／AC ID。

- [ ] 寫 cycle、發布、指引、排除、名冊和版本來源 delta，以 `openspec validate task-run-identity-contract --type change` 驗證結構，提交。

### Task 9: 015 OpenSpec delta

**Files:** Create `openspec/changes/annotation-run-identity-contract/specs/annotation/015-annotation-workspace/spec.md`.

**Interfaces:** 只鏡射 Task 4 已變更的正典條文與驗收情境，保留相同 FR／SC／AC ID。

- [ ] 寫 run／assignment 身分、submission-derived review 與 run-pinned 指引來源 delta，以 `openspec validate task-run-identity-contract --type change` 驗證結構，提交。

### Task 10: OpenSpec execution record

**Files:** 分成三個單檔任務：`openspec/changes/task-config-version-contract/tasks.md`、`openspec/changes/task-run-identity-contract/tasks.md`、`openspec/changes/annotation-run-identity-contract/tasks.md`。

**Interfaces:** 逐項記錄 Task 1～9 的真實驗證證據，不把未建 migration／API 當完成。

- [ ] 每個 change 的 task 只記其 owning spec 與相依 change；每個 artifact-producing task 對應一個檔案且尾綴唯一 `[@agent-name]` 派工標籤；明列依賴／平行標記。命令驗證 task 標明 exact command/result；每個 User Story phase 有正典 SC-ID `**故事目標**`；各檔獨立提交。

### Task 11: Status registry

**Files:** Modify `specs/STATUS.md`.

**Interfaces:** 013／014／015 版本與 Task 2／3／4 正典檔頭一致，維持其實際成熟度。

- [ ] 只更新這三列及適用的註記；跑 Project SDD lint，提交。

### Task 12: 同步 screen inventory 衍生檢視

**Files:** Modify `design/system/screen-inventory.md` only through `node scripts/gen-screen-inventory.mjs`.

**Interfaces:** Task 2 的 014 正典新增四條 SC，generator 預期將 `screen-inventory.md` 的 014 列 SC 計數由 48 更新為 52；Task 3／4 若新增 SC，亦須同步更新 013／015 列。這是正典變更後的必要衍生檢視同步，完成後 Project SDD lint 的 `INVENTORY_FRESHNESS` 應消失。

- [ ] 記錄 Red：執行 `node scripts/gen-screen-inventory.mjs --check`，預期顯示 `design/system/screen-inventory.md is stale`。
- [ ] 只由 generator 重生該檔；執行 `node scripts/gen-screen-inventory.mjs --check`、`bash scripts/inventory-tests.sh`、`git diff --check`，檢視生成差異，單檔提交。

### Task 13: Archive, verification, and delivery

**Files:** Verification-only until `openspec archive` sequentially writes the three `openspec/specs/` derived views and moves `task-config-version-contract`、`task-run-identity-contract`、`annotation-run-identity-contract` into `openspec/changes/archive/`; archive is the required generated multi-file output.

**Interfaces:** archive 不得取代正典 Source-Verify；delta 只鏡射既有正典 FR／SC／AC，衍生 view 的每條正典引用都要定位。

- [ ] 三個 change 各自完成 OpenSpec schema validation、Project SDD lint、senior-dba／architect／QA scenario／security／code-review 審查；記錄命令與結果。
- [ ] 所有 tasks 已驗證後依 013→014→015 順序 archive/write-back；逐條以 `rg` 驗證三份 archived delta／derived view 的 FR／AC／SC、ADR、檔案與原文子句可定位。各 archive 是 `governance-propagation` 例外：生成工具必須同時移動 change 並更新 derived view；完整檔案清單以 archive 執行輸出與 `git status` 確認。
- [ ] 建立繁體中文 PR，等待所有 CI job（包括非 required 的 Prototype Playwright）完成且成功後合併；只勾選 issue #1160 真正完成的 task/run 正典決策，物理字典／ER 仍待下一計畫。
