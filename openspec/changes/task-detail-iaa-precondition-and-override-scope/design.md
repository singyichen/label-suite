# 設計決策：task-detail-iaa-precondition-and-override-scope（issue #783 第 1、2 點）

> 本文件存在的理由：兩點都直接決定資料庫 schema 與狀態機檢查位置（issue #783「這三點會阻擋 dataset 模組的 schema 定案」）。依專案規則，觸及 DB schema 的 change 需要 design.md。本文件記錄 schema 形狀與 ADR 修訂內容，並列出裁定本身沒有回答、實作前必須先定案的問題。

## 背景

1. ADR-022 Transition Table（`docs/adr/022-task-state-machine-location.md:87`）：`dry_run_in_progress → waiting_iaa_confirmation` 的前置條件為 "All dry-run annotations submitted; IAA calculated"。`:88`：`waiting_iaa_confirmation → official_run_in_progress` 的前置條件為 "Project leader confirms IAA; `confirmed_by` recorded"。
2. 正典 014 FR-010o-3 規定 IAA 不得阻擋 `dry_run_in_progress → waiting_iaa_confirmation`、不得停用「開始正式標記」按鈕；`dataset/017-dataset-analysis-detail` FR-039 第 1 點與第 4 點規定 IAA「不得阻擋使用者進入正式標記」、「無法計算」狀態「亦不得阻擋流程」。
3. 正典 014 `:59` 允許對任一 `outputs[].type` 覆寫門檻；`dataset/017-dataset-analysis-detail` FR-043 第 2 點禁止為 `IAA_UNCALIBRATED_TYPES` 定義任何門檻。
4. prototype 已符合第 2 點裁定：`renderSamplingIaaEditRows()`（`design/prototype/pages/task-management/task-detail.html:5926`）只為 `defaultThreshold` 為有限數的型別渲染輸入框；`getEffectiveTargetAgreement()`（`:5694`）對無門檻型別一律回傳 null。
5. 本 repo 目前沒有任務狀態機或 `target_agreement_overrides` 的後端實作（`backend/app` 無相關程式），因此 schema 形狀只能寫在本文件，供後端實作時落地。

## 決策

### D1 ADR-022 Transition Table 修訂內容（第 1 點）

| From | To | 修訂後前置條件 |
|------|----|----------------|
| `dry_run_in_progress` | `waiting_iaa_confirmation` | All dry-run annotations submitted（刪除 "IAA calculated"；與正典 014 FR-008a `DRY_RUN_COMPLETION_RULE` 一致） |
| `waiting_iaa_confirmation` | `official_run_in_progress` | IAA computation for the latest trial round has finished; project leader confirms IAA; `confirmed_by` recorded |

另於標頭新增 `**Amended**: 2026-09-18 — ... (issue #783)` 一列，並新增一段 Amendment 說明：為何搬移（非同步計算失敗不得讓任務卡在試標進行中）、「計算已結束」的定義（見 D2）、以及計算失敗的恢復路徑為重試計算而非回退狀態。

issue #791 的 change 會在同一張表新增 `waiting_iaa_confirmation → dry_run_in_progress` 一列；兩者互不覆寫，但本 change 須於其合併後 rebase。

### D2 「IAA 計算已結束」的定義

「計算已結束」指最新試標回合每一個需計算 IAA 的輸出類型都已得到**確定的結果**：一個數值，或 `dataset/017-dataset-analysis-detail` FR-039 第 4 點定義的「無法計算」（`De = 0`，數學上未定義）。只有「計算中」與「計算失敗（執行錯誤）」視為未結束。

**理由**：若把「無法計算」也當成未結束，小樣本任務將永遠無法進入正式標記，直接違反 FR-039 第 4 點「亦不得阻擋流程」與 SC-029。`IAA_GATE_EXCLUDED_TYPES`（`free_text`）不需計算，不列入判斷。

**本決策需維護者確認**（Q2）：裁定原文只說「IAA 已計算完成」，未區分「無法計算」與「計算失敗」。

### D3 `target_agreement_overrides` 的 schema 約束（第 2 點）

- 形狀不變：`{ [output_type]: number }`，值域 `0..1`（FR-010q）。
- **應用層驗證**：儲存請求中出現屬 `IAA_UNCALIBRATED_TYPES` 的 key，或出現不屬於該任務 `outputs[]` 的 key，回 422 並逐項指出不允許的 key；不得靜默丟棄。
- **資料庫 CHECK**：`target_agreement_overrides` 不得含有 `IAA_UNCALIBRATED_TYPES` 現值（目前為 `sequence_tagging`）的 key。CHECK 是縱深防禦，不取代應用層驗證。
- **校準後自動開放**：UI 與應用層驗證都讀取 `IAA_UNCALIBRATED_TYPES` 常數與 registry，型別移出集合後不需改動 014 頁面程式。**但資料庫 CHECK 內的型別清單是 migration 裡的字面值**，型別移出集合時必須同一個 change 附上移除該 key 限制的 migration（Q3）。
- `SampleSnapshot.target_agreement_overrides`（正典 014 `:700`）沿用同一約束：快照於鎖定時複製任務設定，任務端已擋下，快照不會出現這類 key。

### D4 不改 prototype

背景第 4 點已滿足「不顯示覆寫欄位」；「拒絕儲存」與 CHECK 無 prototype 對應物。既有 `design/prototype/tests/task-management/task-detail-sampling-edit.spec.ts:154`、`:172` 已鎖定未校準型別不顯示門檻、不渲染輸入框，本 change 不新增重複測試。

## 範圍界線

- **不修改** `dataset/017-dataset-analysis-detail`（裁定第 1、2 點皆明言 017 不動）。
- **不修改** 正典 014 FR-008a、FR-010o-3、FR-013 與 `:376`／`:377` 按鈕列（第 1 點裁定正典 014 不動）。
- **不新增** waiting 頁「計算中／失敗＋重試」的需求條文（見 Q1）。

## 未決事項（apply 前由維護者確認）

- **Q1（須先回答，否則第 1 點無法落地到畫面）**：裁定要求 waiting 頁顯示「計算中／失敗」並提供重試，但正典 014 與 017 都沒有任何 FR／AC 描述這三種狀態、重試入口，或計算未結束時「開始正式標記」要停用還是點擊後阻擋並說明。更麻煩的是現行條文反向：014 FR-010o-3 規定「不得停用開始正式標記按鈕」（針對 IAA 未達標），017 FR-039 第 1 點規定 IAA「不得阻擋使用者進入正式標記」。若不補條文，前端既無可測的驗收標準，還可能被審查為違反 FR-010o-3。**本 change 依指示未自行補寫**。建議選項：(a) 本 change 追加一條 014 FR（計算狀態顯示、重試、計算未結束時阻擋並說明，比照 FR-010t），並在 014 FR-010o-3／017 FR-039 第 1 點註明「計算未結束」不屬於「IAA 未達標」；(b) 另開 issue 由 014 與 017 各一個 change 處理；(c) 維持裁定原文，只在 ADR 層記錄，畫面待後端實作時再補。
- **Q2**：D2 對「計算已結束」的定義（「無法計算」視為已結束）。
- **Q3**：資料庫 CHECK 以字面值寫入 `sequence_tagging`，型別校準時需同步 migration；或改為只做應用層驗證、不設 CHECK（裁定明言用 CHECK，此處僅提醒其代價）。
- **Q4**：版本判定 MINOR v3.5.0；若視為措辭釐清則 PATCH v3.4.1。
- **Q5**：計算狀態（計算中／成功／失敗、失敗原因、重試次數）目前沒有任何實體承載（正典 014 與 017 的關鍵實體皆無），ADR-022 的前置條件檢查需要讀它。是否由 017 新增實體，於 Q1 定案時一併決定。
