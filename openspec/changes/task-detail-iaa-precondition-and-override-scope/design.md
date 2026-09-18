# 設計決策：task-detail-iaa-precondition-and-override-scope（issue #783 第 1、2 點）

> 本文件存在的理由：兩點都直接決定資料庫 schema 與狀態機檢查位置（issue #783「這三點會阻擋 dataset 模組的 schema 定案」）。依專案規則，觸及 DB schema 的 change 需要 design.md。本文件記錄 schema 形狀、ADR 修訂內容與計算狀態的呈現，並列出裁定本身沒有回答、實作前必須先定案的問題。
>
> **2026-09-18 追加裁定**：維護者已就 propose 階段的 Q1、Q2、Q4、Q5 選定建議方案——014 新增 FR-010o-4 描述 waiting 頁的計算中／計算失敗＋重試；`TrialRound` 新增 `iaa_computation_status`（`pending | done | failed`）；「無法計算」視為 `done`；版本為 v4.1.0（issue #791 改判 MAJOR v4.0.0）。以下 D2、D5、D6 據此定案；Q3 仍待決，另新增 Q6–Q9。

## 背景

1. ADR-022 Transition Table（`docs/adr/022-task-state-machine-location.md:87`）：`dry_run_in_progress → waiting_iaa_confirmation` 的前置條件為 "All dry-run annotations submitted; IAA calculated"。`:88`：`waiting_iaa_confirmation → official_run_in_progress` 的前置條件為 "Project leader confirms IAA; `confirmed_by` recorded"。
2. 正典 014 FR-010o-3 規定 IAA 不得阻擋 `dry_run_in_progress → waiting_iaa_confirmation`、不得停用「開始正式標記」按鈕（兩者皆針對 IAA 未達標）；`dataset/017-dataset-analysis-detail` FR-039 第 1 點與第 4 點規定 IAA「不得阻擋使用者進入正式標記」、「無法計算」狀態「亦不得阻擋流程」。
3. 正典 014 `:59` 允許對任一 `outputs[].type` 覆寫門檻；`dataset/017-dataset-analysis-detail` FR-043 第 2 點禁止為 `IAA_UNCALIBRATED_TYPES` 定義任何門檻。
4. prototype 已符合第 2 點裁定：`renderSamplingIaaEditRows()`（`design/prototype/pages/task-management/task-detail.html:5926`）只為 `defaultThreshold` 為有限數的型別渲染輸入框；`getEffectiveTargetAgreement()`（`:5694`）對無門檻型別一律回傳 null。
5. 本 repo 目前沒有任務狀態機或 `target_agreement_overrides` 的後端實作（`backend/app` 無相關程式），因此 schema 形狀只能寫在本文件，供後端實作時落地。
6. prototype 的試標回合紀錄（`TASK_DATA.trialRounds`，種子見 `task-detail.html:3403`）目前沒有計算狀態欄位；回合結果在 `publishDryRun()` 發布當下就寫入（issue #791 design.md D2 改為回合完成時寫入）。

## 決策

### D1 ADR-022 Transition Table 修訂內容（第 1 點）

| From | To | 修訂後前置條件 |
|------|----|----------------|
| `dry_run_in_progress` | `waiting_iaa_confirmation` | All dry-run annotations submitted（刪除 "IAA calculated"；與正典 014 FR-008a `DRY_RUN_COMPLETION_RULE` 一致） |
| `waiting_iaa_confirmation` | `official_run_in_progress` | Latest `TrialRound.iaa_computation_status = done`; project leader confirms IAA; `confirmed_by` recorded |

另於標頭新增 `**Amended**: 2026-09-18 — ... (issue #783)` 一列，並新增一段 Amendment 說明：為何搬移（非同步計算失敗不得讓任務卡在試標進行中）、`done` 的定義（見 D2）、以及計算失敗的恢復路徑為重試計算（D6）而非回退狀態。

issue #791 的 change 會在同一張表新增 `waiting_iaa_confirmation → dry_run_in_progress` 一列；該列是否也要求 `done` 未經裁定（Q6），本 change 不動該列。

### D2 `done` 的定義（已裁定，原 Q2）

`done` 指最新試標回合每一個需計算 IAA 的輸出類型都已得到**確定的結果**：一個數值，或 `dataset/017-dataset-analysis-detail` FR-039 第 4 點定義的「無法計算」（`De = 0`，數學上未定義）。只有「計算中」（`pending`）與「計算失敗（執行錯誤）」（`failed`）視為未結束。`IAA_GATE_EXCLUDED_TYPES`（`free_text`）不需計算，不列入判斷。

**理由**：若把「無法計算」也當成未結束，小樣本任務將永遠無法進入正式標記，直接違反 `dataset/017-dataset-analysis-detail` FR-039 第 4 點「亦不得阻擋流程」與 `dataset/017-dataset-analysis-detail` AC-3.16。

### D3 `target_agreement_overrides` 的 schema 約束（第 2 點）

- 形狀不變：`{ [output_type]: number }`，值域 `0..1`（FR-010q）。
- **應用層驗證**：儲存請求中出現屬 `IAA_UNCALIBRATED_TYPES` 的 key，或出現不屬於該任務 `outputs[]` 的 key，回 422 並逐項指出不允許的 key；不得靜默丟棄。
- **資料庫 CHECK**：`target_agreement_overrides` 不得含有 `IAA_UNCALIBRATED_TYPES` 現值（目前為 `sequence_tagging`）的 key。CHECK 是縱深防禦，不取代應用層驗證。
- **校準後自動開放**：UI 與應用層驗證都讀取 `IAA_UNCALIBRATED_TYPES` 常數與 registry，型別移出集合後不需改動 014 頁面程式。**但資料庫 CHECK 內的型別清單是 migration 裡的字面值**，型別移出集合時必須同一個 change 附上移除該 key 限制的 migration（Q3）。
- `SampleSnapshot.target_agreement_overrides`（正典 014 `:700`）沿用同一約束：快照於鎖定時複製任務設定，任務端已擋下，快照不會出現這類 key。

### D4 第 2 點不改 prototype

背景第 4 點已滿足「不顯示覆寫欄位」；「拒絕儲存」與 CHECK 無 prototype 對應物。既有 `design/prototype/tests/task-management/task-detail-sampling-edit.spec.ts:154`、`:172` 已鎖定未校準型別不顯示門檻、不渲染輸入框，本 change 不新增重複測試。

### D5 `TrialRound.iaa_computation_status` 的 schema 形狀（已裁定，原 Q5）

- 型別：列舉 `pending | done | failed`，NOT NULL，預設 `pending`（回合建立時尚未計算）。
- 寫入者：IAA 計算工作（`pending → done` 或 `pending → failed`）與重試操作（`failed → pending`）。其他轉移（例如 `done → pending`）本 change 不定義。
- 讀取者：ADR-022 `waiting_iaa_confirmation → official_run_in_progress` 前置條件、FR-010o-4 的畫面呈現。
- 不承載達標與否：達標判定仍依 `dataset/017-dataset-analysis-detail` FR-039，本欄位只回答「算完了沒」。
- 失敗原因、重試次數等欄位**不新增**（YAGNI）；FR-010o-4 只要求顯示「計算失敗」與重試入口。若日後需要顯示失敗原因，另開 change。

### D6 畫面呈現與重試（FR-010o-4）

- 呈現位置：Overview「任務狀態與執行控制」，與既有達標條件 pills、判定 banner 同一區塊。
- `pending`：顯示「IAA 計算中」；IAA pill、判定 banner、試標回合歷程不顯示數值與判定。
- `failed`：顯示計算失敗狀態與「重試計算」操作（只給 `project_leader`）；點擊後回到 `pending`。
- 最新回合不為 `done` 時，`開始正式標記` 停用並以可見文字說明原因。這個「停用＋可見原因」的形式比照 issue #791 design.md D4 已裁定的試標進行中新增回合按鈕；本 change 的原因文字草案為「IAA 計算中，完成後才能開始正式標記」與「IAA 計算失敗，請重試計算」（Q7 待確認）。
- 呈現「計算未結束」時一律使用中性或資訊樣式，不使用 FR-010o-3 的未達標警示樣式。

## 範圍界線

- **不修改** `dataset/017-dataset-analysis-detail`（裁定第 1、2 點皆明言 017 不動）。FR-039 第 1 點與 FR-010o-4 第 5 點的字面關係見 Q9。
- **不修改** 正典 014 FR-008a、FR-010o-3、FR-013 與 `:376`／`:377` 按鈕列。FR-010o-4 第 5 點以「計算未結束不屬於 IAA 未達標」界定與 FR-010o-3 的邊界，不改寫 FR-010o-3 原文。
- **不修改** ADR-022 中 issue #791 新增的 `waiting_iaa_confirmation → dry_run_in_progress` 一列（Q6）。

## 未決事項（apply 前由維護者確認）

- ~~**Q1**~~（**已裁定** 2026-09-18）：採選項 (a)，於本 change 新增 014 FR-010o-4，見 D6 與 delta。
- ~~**Q2**~~（**已裁定** 2026-09-18）：「無法計算」視為 `done`，見 D2。
- **Q3**：資料庫 CHECK 以字面值寫入 `sequence_tagging`，型別校準時需同步 migration；或改為只做應用層驗證、不設 CHECK（裁定明言用 CHECK，此處僅提醒其代價）。
- ~~**Q4**~~（**已裁定** 2026-09-18）：MINOR，目標 v4.1.0（基準為 issue #791 的 v4.0.0）。
- ~~**Q5**~~（**已裁定** 2026-09-18）：`TrialRound.iaa_computation_status`，見 D5。
- **Q6（新）**：issue #791 已裁定試標進行中的新增回合按鈕原因文字為「本回合全部提交並完成 IAA 後才能新增下一回合」，字面上暗示新增下一回合也要等 IAA 算完。但 ADR-022 新增的 `waiting_iaa_confirmation → dry_run_in_progress` 是否也以 `iaa_computation_status = done` 為前置條件、待確認頁在計算中／失敗時新增回合按鈕要不要一併停用，兩份裁定都沒有寫。本 change 未自行決定。
- **Q7（新）**：`開始正式標記` 在計算未結束時採「停用＋可見原因」（比照 #791 D4），以及 D6 的兩句原因文字草案，請確認；另一種做法是保持可點擊、點擊後阻擋並說明（比照 FR-010t）。
- **Q8（新，Red 前必須定案）**：prototype 如何產生計算中／計算失敗兩種示範狀態。選項：(a) 回合紀錄新增 `iaaComputationStatus` 欄位，缺值視為 `done`（既有種子不受影響），另於 `task-detail.data.js` 新增一組示範 profile 或調整既有 `waiting_iaa_confirmation` 任務的最新回合；(b) 新增類似既有 `?status=` 的網址參數。(b) 最省檔案，但 issue #791 design.md D3 規定不得為測試新增開關；(a) 會多動一個產品檔，且調整既有 profile 可能影響其他頁面的回歸。
- **Q9（新）**：`dataset/017-dataset-analysis-detail` FR-039 自稱 IAA 閘門語意唯一來源，第 1 點寫「不得阻擋使用者進入正式標記」。FR-010o-4 第 5 點在計算未結束時停用開始正式標記，本 change 的立場是「計算未結束不是 IAA 結果，不在 FR-039 的範圍」，但 017 字面沒有這個區分。是否需要在 017 FR-039 補一句交叉引用（屬 017 的另一個 change）？
