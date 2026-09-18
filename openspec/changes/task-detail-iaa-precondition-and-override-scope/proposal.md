---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #783
基準版本: 014 v4.0.0（issue #791 change `task-detail-trial-round-from-waiting` 回寫後）
目標版本: 014 v4.1.0
---

## Why

issue #783 盤點 dataset 016／017 的資料庫需求時，發現三組規格衝突會直接決定 schema。本 change 承接其中與正典 014 及 ADR-022 相關的兩點；第 3 點（017 內部欄位集與值域）只動正典 017，依「一 change 一正典」由姊妹 change `dataset-quality-entity-value-alignment` 承接。

**第 1 點：IAA 計算完成是哪一個轉換的前置條件**。`docs/adr/022-task-state-machine-location.md:87` 把 "IAA calculated" 列為 `dry_run_in_progress → waiting_iaa_confirmation` 的前置條件；但 IAA 是非同步計算，計算失敗或卡住時任務會停在試標進行中，效果等同 IAA 阻擋了這個轉換，與正典 014 FR-010o-3「此狀態轉換本身之條件仍以 `DRY_RUN_COMPLETION_RULE`（FR-008a）為準」相悖。

**第 2 點：未校準輸出類型能不能覆寫門檻**。正典 014 `:59` 規定 `target_agreement_overrides`「使用者可對任一 `outputs[].type` 覆寫其 IAA 目標門檻」；`dataset/017-dataset-analysis-detail` FR-043 第 2 點卻規定規格 MUST NOT 為 `IAA_UNCALIBRATED_TYPES` 的型別定義任何門檻常數、預設值或建議值。照 014 字面，專案負責人可以為 `sequence_tagging` 填入一個 017 禁止存在的門檻。

維護者已於 2026-09-18 裁定：

1. ADR-022 的 `dry_run_in_progress → waiting_iaa_confirmation` 拿掉 "IAA calculated"，改把「IAA 已計算完成」列為 `waiting_iaa_confirmation → official_run_in_progress` 的前置條件；waiting 頁顯示「計算中／失敗」並提供重試。**正典 014／017 不動，只修訂 ADR-022（標註 Amended 日期）**。
2. 014 `:59` 的門檻覆寫排除 `IAA_UNCALIBRATED_TYPES`：這些型別不顯示覆寫欄位，schema 以 CHECK 擋下；型別完成校準後自動開放。017 不動。

同日維護者就本 change propose 階段提出的待決事項追加裁定（原 design.md Q1、Q2、Q4、Q5）：

3. waiting 頁的 IAA 計算狀態需要一條 014 需求：計算中、計算失敗＋重試；「計算未結束」MUST NOT 被呈現或處理成「IAA 未達標」。`TrialRound` 新增計算狀態欄位（`pending | done | failed`），供 ADR-022 `waiting_iaa_confirmation → official_run_in_progress` 的前置條件讀取。新 AC 置於 `## ADDED`。
4. 「無法計算」（`De = 0`）視為計算已結束（`done`），與 `dataset/017-dataset-analysis-detail` AC-3.16「不阻擋使用者進入正式標記」一致。
5. 版本：issue #791 的 change 判 MAJOR v4.0.0，本 change 相應為 v4.1.0。

第 1 點原裁定「正典 014 不動」因第 3 點追加裁定而改為「014 新增 FR-010o-4 與一個實體欄位」；轉換前置條件本身仍只寫在 ADR-022。

同日維護者就其餘待決事項再裁定（原 design.md Q3、Q6–Q9，皆採建議方案），本 change 已無未決事項：

6. issue #791 新增的 `waiting_iaa_confirmation → dry_run_in_progress` 同樣以最新回合 `iaa_computation_status = done` 為前置條件；計算中或失敗時，待確認頁的新增試標回合按鈕停用並顯示可見原因（FR-010o-4 第 (6) 點）。
7. 兩顆按鈕皆採「停用＋可見原因」，比照 issue #791 design.md D4；原因文字草案於 PR 審閱時確認。
8. prototype 以回合紀錄欄位 `iaaComputationStatus`（缺值視為 `done`）與一組新示範 profile 產生計算狀態，不新增網址參數。
9. 「IAA 計算尚未結束不是 IAA 結果」的交叉引用寫進正典 017 FR-039 第 1 點，由姊妹 change `dataset-quality-entity-value-alignment` 承接。
10. 資料庫 CHECK 是未來後端 schema 契約；本 repo 目前沒有後端 schema，本 change 不含 migration，也不新增後端任務。

**是否需要存在（YAGNI 檢查）**：需要。兩點都會決定 schema（轉換前置條件的檢查位置與其讀取的 `TrialRound.iaa_computation_status`、`target_agreement_overrides` 的 CHECK），後端開工前不定案，schema 會默默違反其中一邊。

## What Changes

- **FR-010o-1 改寫**（第 2 點）：`target_agreement_overrides` 的可覆寫範圍收斂為「`outputs[]` 中不屬於 `IAA_UNCALIBRATED_TYPES` 且 `OUTPUT_TYPE_IAA_REGISTRY` 登錄了門檻的輸出類型」。屬未校準型別者不渲染覆寫輸入框；含有這類 key 的儲存請求 MUST 被拒絕、既有資料列 MUST NOT 含有這類 key；型別自 `IAA_UNCALIBRATED_TYPES` 移出並於 registry 取得門檻後，覆寫欄位依設定自動出現、不需改動 014。
- **新增三條驗收情境**（AC 編號於 gate 4 回寫時配發）：未校準型別不顯示覆寫欄位、儲存含未校準型別 key 被拒、型別完成校準後自動開放。
- **新增 FR-010o-4**（第 1 點，追加裁定）：待 IAA 確認頁顯示最新試標回合的 IAA 計算狀態——計算中、計算失敗（`project_leader` 可重試）；兩者 MUST NOT 呈現為或被當作「IAA 未達標」；最新回合計算未結束時 `開始正式標記` 與 `新增試標回合` 皆停用並以可見文字說明原因。「無法計算」視為已結束。
- **新增 `TrialRound.iaa_computation_status`**（`pending | done | failed`）：正典 014 關鍵實體 `TrialRound`（`:702`）新增此欄位，是 ADR-022 前置條件的資料來源。
- **新增四條驗收情境**（FR-010o-4，AC 編號於 gate 4 回寫時配發）：計算中不呈現為未達標且暫不能開始正式標記、計算失敗可重試、無法計算不阻擋開始正式標記、計算未結束時新增試標回合同樣停用。
- **ADR-022 修訂**（第 1 點，apply 任務，不在本 propose 內改動）：`:87` 刪除 "IAA calculated"；`:88` 補上「最新試標回合 `TrialRound.iaa_computation_status = done`」，issue #791 新增的 `waiting_iaa_confirmation → dry_run_in_progress` 一列同樣補上此條件；新增 Amended 日期列與修訂段落。
- **正典 014 同步改寫的非 FR 錨點**（gate 4）：`:59` 常數說明、`:205` 編輯狀態描述、`:386`／`:387` 使用者故事 1 驗證與唯讀規則、FR-010q（`:592`）驗證規則、`TaskDetail` 實體（`:692`）欄位說明。
- **prototype（第 1 點）**：`design/prototype/pages/task-management/task-detail.html` 的 Overview「任務狀態與執行控制」需呈現計算中、計算失敗＋重試，以及計算未結束時停用的 `開始正式標記`（tasks.md 群組 2，Red／Green 配對）。示範資料以回合紀錄欄位 `iaaComputationStatus`（缺值視為 `done`）與新示範任務 T018 產生，需同步新增 `task-list.data.js` 任務列（design.md D7）。
- **prototype（第 2 點）**：不需要改動。`renderSamplingIaaEditRows()`（`design/prototype/pages/task-management/task-detail.html:5926`）已以 registry `defaultThreshold` 是否為有限數決定是否渲染輸入框，`sequence_tagging` 已無輸入框（`design/prototype/tests/task-management/task-detail-sampling-edit.spec.ts:172` 已鎖定）；讀取端 `getEffectiveTargetAgreement()`（`:5694`）對無門檻型別一律回傳 null，即使資料中殘留 key 也不會顯示。「儲存時拒絕」與 schema CHECK 屬後端行為，本 repo 目前沒有對應後端模組，於後端實作時依 design.md 落地並撰寫測試；本 change 不含 migration。

**BREAKING 判定**：非 BREAKING。沒有任何 FR／AC／SC 被移除；被收回的「對未校準型別覆寫」本身就違反 `dataset/017-dataset-analysis-detail` FR-043；FR-010o-4 與 `TrialRound.iaa_computation_status` 為新增。

**delta 形式說明**：FR-010o-1 不在 `openspec/specs/` 衍生檢視內，無法使用 `## MODIFIED`，因此以既有 ID 置於 `## ADDED Requirements`；gate 4 回寫正典時必須**原地改寫** FR-010o-1（見 tasks.md 群組 3）。FR-010o-4 為新 ID，同樣置於 `## ADDED Requirements`，其三條情境不預先編號。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `task-management/014-task-detail`：改寫 FR-010o-1，新增 FR-010o-4 與七條驗收情境，同步改寫 `:59`、`:205`、`:386`、`:387`、FR-010q 與 `TaskDetail` 實體之覆寫範圍敘述，`TrialRound` 實體新增 `iaa_computation_status`。FR-010o、FR-010o-3、FR-013、SC-018、SC-019 維持原文。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v4.0.0 → v4.1.0，**MINOR**，維護者 2026-09-18 裁定）。理由：新增 FR-010o-4、一個實體欄位、「儲存時拒絕未校準型別 key」的驗證行為與七條驗收情境；沒有既有行為被移除。
- 基準版本為 issue #791 的 change 回寫後的 v4.0.0；回寫前須確認 `origin/main` 上的實際版本，不得倒退。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併）。
- 正典待改寫錨點（gate 4）另含：FR-010o-3（`:589`）之後新增 FR-010o-4、`TrialRound` 實體（`:702`）新增欄位、使用者故事 3 驗收情境末尾新增四條情境（接續 issue #791 回寫後的最後一個 AC 編號）。
- ADR：`docs/adr/022-task-state-machine-location.md`（`:5` Amended、`:87`、`:88` Transition Table 兩列、新增 Amendment 段落）。issue #791 的 change 也會修改同一張表，本 change 須於其合併後 rebase。
- 上游 `dataset/017-dataset-analysis-detail`：不修改。`IAA_UNCALIBRATED_TYPES` 的定義與成員仍以該規格 FR-043 為唯一來源，「無法計算」的定義仍以 FR-039 第 4 點為準，本 change 只引用。FR-039 第 1 點與 FR-010o-4 的界線，由姊妹 change `dataset-quality-entity-value-alignment` 於該點補一句交叉引用（Q9）；該 change 的 Source-Verify 須在本 change 回寫正典 014 之後執行。
- 下游：無。

**原型程式（Principle X 之產品檔案盤點）**

| 檔案 | 用途 | 群組 |
|------|------|------|
| `docs/adr/022-task-state-machine-location.md` | 第 1 點轉換前置條件搬移 | 1 |
| `design/prototype/pages/task-management/task-detail.html` | FR-010o-4 計算狀態呈現、重試、停用的兩顆按鈕、profile 選擇性帶入回合紀錄與雙語 i18n 鍵 | 2 |
| `design/prototype/pages/task-management/task-detail.data.js` | 新示範 profile T018（最新回合計算失敗） | 2 |
| `design/prototype/pages/task-management/task-list.data.js` | T018 任務列（`resetTaskData()` 同時要求任務列與 profile） | 2 |

合計 3 個 prototype 產品檔案＋1 份 ADR，低於 5 檔／300 行門檻，單一 PR 交付。新增示範任務使任務清單由 17 筆變為 18 筆，連帶更新的既有測試見 design.md D7（測試檔不計入門檻）。

**套用順序**：本 change 須在 issue #791 的 change 合併後 apply；兩者都改 ADR-022 Transition Table、`specs/STATUS.md` 014 列與正典 014 Changelog。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：可否覆寫只依 `IAA_UNCALIBRATED_TYPES` 集合與 registry 是否登錄門檻判斷，不寫死 `sequence_tagging`；型別完成校準只需改該常數與 registry，本頁不需改碼。
- **Data Fairness（NON-NEGOTIABLE）**：本變更只影響專案負責人可編輯的門檻設定、狀態機前置條件與計算狀態顯示；`iaa_computation_status` 只描述計算是否結束，不含任何標記內容或答案，重試操作只提供給 `project_leader`。不改變任何標記員可見的資料或 API 回應。
- **Simplicity First / YAGNI**：第 2 點 prototype 已符合裁定且既有測試已鎖定，不改產品碼、不新增重複測試；第 1 點只新增一個三值欄位，不另建計算工作實體。
- **PR 規模（Principle X）**：3 個 prototype 產品檔案＋1 份 ADR。
