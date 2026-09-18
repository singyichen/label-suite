# 設計決策：task-detail-iaa-precondition-and-override-scope（issue #783 第 1、2 點）

> 本文件存在的理由：兩點都直接決定資料庫 schema 與狀態機檢查位置（issue #783「這三點會阻擋 dataset 模組的 schema 定案」）。依專案規則，觸及 DB schema 的 change 需要 design.md。本文件記錄 schema 形狀、ADR 修訂內容與計算狀態的呈現，並列出裁定本身沒有回答、實作前必須先定案的問題。
>
> **2026-09-18 追加裁定**：維護者已就 propose 階段的 Q1、Q2、Q4、Q5 選定建議方案——014 新增 FR-010o-4 描述 waiting 頁的計算中／計算失敗＋重試；`TrialRound` 新增 `iaa_computation_status`（`pending | done | failed`）；「無法計算」視為 `done`；版本為 v4.1.0（issue #791 改判 MAJOR v4.0.0）。以下 D2、D5、D6 據此定案。
>
> **2026-09-18 最終裁定**：其後提出的 Q3、Q6–Q9 同日全數採建議方案——資料庫 CHECK 是未來後端 schema 契約、本 change 不含 migration（Q3，D3）；`waiting_iaa_confirmation → dry_run_in_progress` 同樣要求最新回合 `done`（Q6，D1）；兩顆按鈕皆採停用＋可見原因（Q7，D6）；prototype 以回合欄位＋新示範 profile 產生計算狀態（Q8，D7）；017 FR-039 交叉引用由姊妹 change 承接（Q9）。本文件已無未決事項。

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
| `waiting_iaa_confirmation` | `dry_run_in_progress` | issue #791 change 寫入的既有條件不變，另加 Latest `TrialRound.iaa_computation_status = done`（Q6 裁定） |

另於標頭新增 `**Amended**: 2026-09-18 — ... (issue #783)` 一列，並新增一段 Amendment 說明：為何搬移（非同步計算失敗不得讓任務卡在試標進行中）、`done` 的定義（見 D2）、以及計算失敗的恢復路徑為重試計算（D6）而非回退狀態。

第三列由 issue #791 的 change 新增；本 change 依 Q6 裁定只為它補上計算狀態前置條件，不改動 #791 寫入的其餘條件。兩條自 `waiting_iaa_confirmation` 出發的轉換因此共用同一項檢查：最新回合計算未結束時兩者皆不可執行（FR-010o-4 第 (5)、(6) 點）。

**`ALLOWED_TRANSITIONS` 註記**：白名單只描述「From 可到哪些 To」，本 change 不改其成員（`WAITING_IAA_CONFIRMATION` 集合中的 `DRY_RUN_IN_PROGRESS` 由 issue #791 加入）。計算狀態條件屬 ADR-022 服務層流程中的 `check_preconditions`，兩條轉換皆須檢查；未滿足時須回報具體未滿足的條件（計算中或計算失敗），而非一般性錯誤。

### D2 `done` 的定義（已裁定，原 Q2）

`done` 指最新試標回合每一個需計算 IAA 的輸出類型都已得到**確定的結果**：一個數值，或 `dataset/017-dataset-analysis-detail` FR-039 第 4 點定義的「無法計算」（`De = 0`，數學上未定義）。只有「計算中」（`pending`）與「計算失敗（執行錯誤）」（`failed`）視為未結束。`IAA_GATE_EXCLUDED_TYPES`（`free_text`）不需計算，不列入判斷。

**理由**：若把「無法計算」也當成未結束，小樣本任務將永遠無法進入正式標記，直接違反 `dataset/017-dataset-analysis-detail` FR-039 第 4 點「亦不得阻擋流程」與 `dataset/017-dataset-analysis-detail` AC-3.16。

### D3 `target_agreement_overrides` 的 schema 約束（第 2 點）

- 形狀不變：`{ [output_type]: number }`，值域 `0..1`（FR-010q）。
- **應用層驗證**：儲存請求中出現屬 `IAA_UNCALIBRATED_TYPES` 的 key，或出現不屬於該任務 `outputs[]` 的 key，回 422 並逐項指出不允許的 key；不得靜默丟棄。
- **資料庫 CHECK（未來後端 schema 契約）**：`target_agreement_overrides` 不得含有 `IAA_UNCALIBRATED_TYPES` 現值（目前為 `sequence_tagging`）的 key。CHECK 是縱深防禦，不取代應用層驗證。本 repo 目前沒有後端 schema（`backend/alembic/versions/` 為 0 個檔案），本條記錄的是後端建置時須落地的 schema 契約；**本 change 不含任何 migration，也不新增後端任務**（Q3）。
- **校準後自動開放**：UI 與應用層驗證都讀取 `IAA_UNCALIBRATED_TYPES` 常數與 registry，型別移出集合後不需改動 014 頁面程式。CHECK 內的型別清單將是字面值；只有在 `sequence_tagging` 完成校準時後端已經存在，才需要一支移除該 key 限制的 migration，由該校準 change 承擔，與本 change 無關（Q3）。
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
- 最新回合不為 `done` 時，`開始正式標記` 停用並以可見文字說明原因。這個「停用＋可見原因」的形式比照 issue #791 design.md D4 已裁定的試標進行中新增回合按鈕；本 change 的原因文字草案為「IAA 計算中，完成後才能開始正式標記」與「IAA 計算失敗，請重試計算」（Q7 已裁定採停用＋可見原因；文案由維護者於 PR 審閱時確認）。
- 最新回合不為 `done` 時，待確認頁的 `新增試標回合 R{n+1}` 同樣停用並以可見文字說明原因（Q6），草案為「IAA 計算中，完成後才能新增下一回合」與「IAA 計算失敗，請重試計算」，同樣於 PR 審閱時確認。
- 呈現「計算未結束」時一律使用中性或資訊樣式，不使用 FR-010o-3 的未達標警示樣式。

### D7 prototype 的計算狀態示範資料（Q8 裁定）

- 回合紀錄新增 `iaaComputationStatus`（`pending | done | failed`），對應 D5 的 `iaa_computation_status`；**缺值視為 `done`**，既有種子與 `publishDryRun()` 產生的回合不需回填。
- 於 `design/prototype/pages/task-management/task-detail.data.js` 新增一組示範 profile（T018，`waiting_iaa_confirmation`），其最新試標回合 `iaaComputationStatus = failed`；計算中狀態由該任務上的「重試計算」操作產生（D6 的 `failed → pending`），不另設第二組 profile。既有 T001–T017 profile 不變，也不新增網址參數（issue #791 design.md D3）。
- `resetTaskData()`（`design/prototype/pages/task-management/task-detail.html:4708`）同時要求任務列與 profile，缺一即判為找不到任務，因此 T018 必須同步在 `design/prototype/pages/task-management/task-list.data.js` 新增任務列，產品檔案多一個。
- 目前所有 profile 都不帶試標回合紀錄，`resetTaskData()` 末尾一律清空（`:4782`）；實作時讓 profile 可選擇性帶入回合紀錄（比照同函式內 `reviewerIds` 的 opt-in 寫法），其餘 profile 行為不變。
- 連帶影響：任務清單由 17 筆變為 18 筆。下列既有測試寫死 17 筆或逐範例檔一對一對應，須由 Red 任務（tasks.md 2.2–2.4）更新：`design/prototype/tests/task-management/task-list-output-types.spec.ts:89`、`design/prototype/tests/dashboard/dashboard-output-types.spec.ts:152-155`、`design/prototype/tests/dashboard/dashboard-task-list-sort.spec.ts:49-78`。另有 dashboard、annotation-list、dataset-analysis-detail 等頁面讀取同一份任務清單，以全量回歸確認（tasks.md 2.9）。
- **apply 時更正（2026-09-18）**：上一點把兩支 dashboard 測試列入更新對象，前提是 dashboard 讀取同一份任務清單；實查 `design/prototype/pages/dashboard/dashboard.data.js` 與 `dashboard.assignments.js` 為 dashboard 自有的手寫種子，不讀 `task-list.data.js`。讓 dashboard 也出現 T018 須再動這兩個產品檔案，合計 6 檔超出憲法原則 X 上限；T018 只為 task-detail 的 FR-010o-4 示範而存在，故不加入 dashboard，兩支 dashboard 測試維持 17 筆不修改（tasks.md 2.3、2.4 改為確認任務）。實際受影響的只有 `task-list-output-types.spec.ts`。
- 「無法計算」視為 `done` 的驗證沿用既有 T015（`De = 0`，`design/prototype/tests/task-management/issue-489-task-detail-iaa-derived.spec.ts:65-72`）搭配既有的 `&status=waiting_iaa_confirmation` 覆寫，不需新種子。

## 範圍界線

- **不修改** `dataset/017-dataset-analysis-detail`（裁定第 1、2 點皆明言本 change 不動 017）。FR-039 第 1 點與 FR-010o-4 的界線，由姊妹 change `dataset-quality-entity-value-alignment` 於 FR-039 第 1 點補一句交叉引用（Q9）。
- **不修改** 正典 014 FR-008a、FR-010o-3、FR-013 與 `:376`／`:377` 按鈕列。FR-010o-4 第 5 點以「計算未結束不屬於 IAA 未達標」界定與 FR-010o-3 的邊界，不改寫 FR-010o-3 原文。FR-010o-4 第 (6) 點停用新增回合的依據同樣是計算未結束，不改寫 FR-013 第 (2) 點。
- **不新增** 任何後端程式、migration 或後端任務（Q3）。

## 未決事項（維護者 2026-09-18 已全數裁定）

- ~~**Q1**~~（**已裁定** 2026-09-18）：採選項 (a)，於本 change 新增 014 FR-010o-4，見 D6 與 delta。
- ~~**Q2**~~（**已裁定** 2026-09-18）：「無法計算」視為 `done`，見 D2。
- ~~**Q3**~~（**已裁定** 2026-09-18）：CHECK 保留為未來後端 schema 契約；本 repo 目前沒有後端 schema，本 change 不含 migration，也沒有 migration 成本。只有型別校準時後端已存在，才由該校準 change 附 migration，見 D3。
- ~~**Q4**~~（**已裁定** 2026-09-18）：MINOR，目標 v4.1.0（基準為 issue #791 的 v4.0.0）。
- ~~**Q5**~~（**已裁定** 2026-09-18）：`TrialRound.iaa_computation_status`，見 D5。
- ~~**Q6**~~（**已裁定** 2026-09-18）：`waiting_iaa_confirmation → dry_run_in_progress` 同樣要求最新回合 `iaa_computation_status = done`；計算中或失敗時待確認頁的新增試標回合按鈕停用並附可見原因，見 FR-010o-4 第 (6) 點、D1、D6。
- ~~**Q7**~~（**已裁定** 2026-09-18）：停用＋可見原因，比照 issue #791 design.md D4；D6 的原因文字草案成立，由維護者於 PR 審閱時確認文案。
- ~~**Q8**~~（**已裁定** 2026-09-18）：採選項 (a)，回合紀錄欄位 `iaaComputationStatus`（缺值視為 `done`）＋新示範 profile，不新增網址參數，見 D7。
- ~~**Q9**~~（**已裁定** 2026-09-18）：於姊妹 change `dataset-quality-entity-value-alignment` 內為 017 FR-039 第 1 點補一句交叉引用，仍為 017 PATCH v3.0.1。
