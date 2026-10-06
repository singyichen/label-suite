> 正典：`specs/annotation/015-annotation-workspace/spec.md` v11.0.1。本 delta 只收 issue #1160 修訂的 FR／AC／SC 身分條款；既有衍生情境於 `MODIFIED` 中保留。候選資料模型尚未部署，這份文件不建立物理 FK。

## ADDED Requirements

### Requirement: AC-1.3 清單列導頁保留正式作業身分

3. **AC-1.3**：**Given** 使用者於清單點擊任一筆資料列（Annotator 視圖）或該列 `編輯` 按鈕（兩種視圖皆適用），**When** 觸發導頁，**Then** 導向 `annotation-workspace` 並帶入 `task_id/sample_id/run_type/role`，且工作區初始化後必須停留在該 `sample_id` 對應的樣本。**v4.2.0 修訂**：Reviewer 視圖下資料列已無可展開內容（一列即一個審核單位，見 FR-055），點擊資料列本身改為與 `編輯` 相同的導頁動作，並額外帶出該列的 `annotator_id`（見 AC-1.16）。 **v11.0.1 正式身分補述（issue #1160）**：上述顯示用 query 參數沿用 prototype；正式清單導頁須依 FR-049 攜帶或唯一解析該列的 `run_id × assignment_id`，服務端驗證所屬 task／item／annotator；同名 sample 無法唯一解析時不得載入其他 cycle 的作業。

#### Scenario: AC-1.3 清單列導頁保留正式作業身分

- **GIVEN** 兩個 cycle 的 R1 有相同顯示 sample 與 annotator
- **WHEN** annotator 或 reviewer 點擊 cycle 2 清單列進入工作區
- **THEN** 正式路徑以 cycle 2 的 `run_id × assignment_id` 定位並驗證 task／item／annotator；只帶 prototype 顯示參數且無法唯一解析時拒絕（AC-1.3；FR-049）

### Requirement: AC-1.16 reviewer 清單列導頁保留審核單位身分

16. **AC-1.16（v4.2.0 新增，對應 FR-055）**：**Given** `role = reviewer` 於清單點擊任一列的 `編輯` 按鈕或資料列本身，**When** 觸發導頁，**Then** 導向 `annotation-workspace` 並帶入 `task_id/sample_id/run_type/role` 與**該列的 `annotator_id`**（沿用 FR-049 身分參數傳遞規則），使工作區審核卡開在同一個審核單位上；**And** 清單不得提供任何逐列或批次的決策控件（**v5.0.0 修訂**，issue #596：原列舉為 `通過` / `退回`，決策語彙已改為 `REVIEW_DECISIONS`；本條「清單零決策」之結論不變），亦不得提供 `送出審核` 按鈕——兩種 `run_type` 皆然。 **v11.0.1 正式身分補述（issue #1160）**：上述 query 參數沿用 prototype；正式 reviewer 清單列須依 FR-049 指向該列的 `run_id × assignment_id` 並核對 task／item／annotator，不能僅憑同名 sample 與 annotator 開啟另一個 cycle 的審核單位。

#### Scenario: AC-1.16 reviewer 清單列導頁保留審核單位身分

- **GIVEN** 兩個 R1 的 reviewer 清單有相同 sample 與 annotator
- **WHEN** reviewer 點擊 cycle 2 審核單位列
- **THEN** 正式路徑開啟 cycle 2 的 `run_id × assignment_id`，不得回退到 cycle 1 的審核單位（AC-1.16；FR-049）

### Requirement: AC-1.23 快速審核只進入目前 run 的作業

23. **AC-1.23（v4.28.0 新增，對應 FR-073，issue #449；v6.1.1 補正 v5.0.0 回寫遺漏，issue #748）**：**Given** `role = reviewer`，**When** 自 dashboard 任務卡的 `快速審核` 進入，**Then** 導頁目標必須是 `findNextActionableReviewUnit(task_id, run_type, reviewer_id)` 依 `REVIEW_UNIT_ACTION_PRIORITY` 選出的審核單位，且網址同時攜帶 `task_id`、`sample_id`、`annotator_id`、`reviewer_id`、`run_type` 五項參數；**And** 任務存在待審單位時（如 T014 `dry_run`：第一筆樣本三個單位皆已定稿，第二筆樣本依序為 已定稿／爭議中／待審）必須開啟該待審單位（`dry-02-one-divergent` × `tony0950127`），即使排序在前的單位為爭議中；**And** 任務無待審單位但存在該審核員具仲裁資格之爭議單位時（如 T016 `official_run`：待審 0、爭議 3），必須依優先序開啟第一個該審核員可仲裁之爭議單位（`ofm-03-awaiting-arbitration`）〔**v6.6.0 修訂**，issue #815；原文：「待審 0、爭議 1」「必須開啟該爭議單位（`ofm-05-all-divergent`）」——v5.0.0 後 T016 未定稿單位皆推導為爭議中，該樣本亦於本版前更名〕；**And** 已參與該爭議審核的審核員（如 `reviewer_wang`）不得被導向該單位——其於 T016 無任何可處理單位；**And** 該審核員於此任務無任何可處理單位時，必須導向 `annotation-list`（不帶 `sample_id`）並顯示空狀態說明（`list-no-actionable-notice`，zh／en 同步），不得改為開啟任何已定稿唯讀單位。 **v11.0.1 正式身分補述（issue #1160）**：上述五項網址參數沿用 prototype；正式快速審核須依 FR-049 由目前 cycle 與選中的審核單位取得 `run_id × assignment_id`，服務端核對 task／item／annotator，歷史 run 須顯式選定，無目前 run 或無法唯一解析時不得以舊 R1 作為預設。

#### Scenario: AC-1.23 快速審核只進入目前 run 的作業

- **GIVEN** 舊 cycle 的 R1 留有歷史審核單位，新 cycle 有相同 sample 與 annotator
- **WHEN** reviewer 從 dashboard 啟動快速審核
- **THEN** 由目前 cycle 選中單位的 `run_id × assignment_id` 定位並驗證範圍；若無目前 run，不得預設進入舊 R1（AC-1.23；FR-049／FR-073）

### Requirement: FR-014S 審核決策草稿持久化身分

- **FR-014S**（v4.15.0 新增，issue #196、CONT-03，對應 AC-6.10）：工作區 reviewer 視圖的逐筆 `REVIEW_DECISIONS = approve | modify | bypass` 三向決策（FR-014B／FR-092；`A`／`B` 可依 FR-054 設定整單位的通過／無法裁決，`R` 不產生決策，修正不綁快捷鍵）在「送出審核」之前，每次變更皆必須即時寫入一個與提交紀錄分離的草稿儲存區——不得寫入 `SUBMISSION_BUCKET_DIMENSIONS`（FR-049）定址的提交 bucket，亦不得產生任何歷程事件——使審核員在完成送出前重新整理頁面時，尚未送出的逐列決策仍能還原，與標記員儲存草稿的既有行為（FR-013）維持角色對稱（issue #196 現況調查所建議的產品決策）。草稿儲存區的正式持久化鍵為 `run_id × assignment_id × reviewer_id`（v11.0.1，沿用 FR-051 審核單位與 FR-049 審核員隔離）；舊 `sample_id × annotator_id × run_type × reviewer_id` 僅為 prototype bucket，不得用於正式跨 cycle 的草稿還原，一位審核員的草稿不得外溢至另一位審核員或另一位受審標記員。送出審核成功後，該審核單位的草稿必須清除，不得殘留舊決策供下次進入時誤還原。草稿本身不得構成 FR-062 所稱的盲審污染——不得以任何形式（含「已有動作」的事實）對其他審核員可見；本條涵蓋逐列三向決策及其取消狀態，不涵蓋直接修正控件內尚未送出的文字/數值編輯（該部分沿用既有的記憶體內狀態，reload 遺失，不在本次範圍）。

#### Scenario: AC-7.1 跨 cycle 審核草稿隔離

- **GIVEN** cycle 1 與 cycle 2 各有顯示為 R1 的同源 sample 與 annotator
- **WHEN** reviewer 於 cycle 2 載入尚未送出的決策
- **THEN** 只還原當前 `run_id × assignment_id × reviewer_id` 的草稿；cycle 1 的草稿與歷程不混入（AC-7.1）

#### Scenario: 三向決策草稿與現行快捷鍵

- **GIVEN** reviewer 在一個審核單位分別選擇 `approve`、`modify` 或 `bypass`，尚未送出審核
- **WHEN** 重新整理並以相同 `run_id × assignment_id × reviewer_id` 載入草稿
- **THEN** 各已選決策及取消後的未決策狀態依原樣還原；`A`／`B` 分別設定通過／無法裁決，`R` 不產生退回決策，`modify` 無快捷鍵，未送出的修正控件內容不以此草稿還原（FR-014S／FR-054／FR-092）

### Requirement: FR-049 提交 bucket 與正式持久化身分

- **FR-049**（v3.8.0 新增，v4.53.0 修訂，對應 AC-4.5、AC-4.6、AC-4.43）：標記與審核的提交紀錄必須以 `SUBMISSION_BUCKET_DIMENSIONS`（`task_id × role × run_type × annotator_id × reviewer_id`）定址（此為 prototype bucket；正式持久化另須 FR-051 的 `run_id × assignment_id` 範圍），不得僅以 `task_id × role × run_type` 定址。`role = annotator` 之紀錄沒有審核員維度，該維度以固定佔位值填充以維持鍵值一致長度。身分來源為 `ANNOTATION_IDENTITY_SOURCE`：`annotation-list` 與 `annotation-workspace` 皆自路由參數解析 `annotator_id` / `reviewer_id`，缺值套用預設值；清單導向工作區時必須將自身收到的身分參數原樣帶出（未帶入者維持不帶，兩頁回退到同一組預設值）。〔**v4.53.0 修訂**，issue #545：本項自本版起為**雙向**——工作區返回清單時亦必須將自身收到的身分參數原樣帶回，缺值同樣維持不帶。原文只寫了清單→工作區一個方向，實作亦只做了該方向：工作區的 `buildListReturnUrl()` 自行重建 query 而未轉發身分參數，使非預設身分的訪客一返回清單即回退為預設身分，清單遂以他人的 bucket 計算各列狀態與進度分母（FR-055 第 2 點）。身分維度既為提交紀錄的定址依據，其在往返路徑上任一段落遺失，兩頁即不再定址到同一筆紀錄——本條之目的因此在單向實作下不成立。「未帶入者維持不帶」於回程同等適用，不得以寫入已解析之預設身分（`ANNOTATION_IDENTITY_SOURCE` 之回退值）代替轉發，否則兩頁對「缺值＝套用預設」的共識即被一方單方面消滅〕此定址是「一式 N 份」審核（多位審核員審同一筆標記）的前置條件——在此之前兩位審核員會寫入同一筆紀錄而互相覆寫。本條僅定義身分維度與儲存定址，不改變任何版面呈現，亦不引入權限判斷。
  **v11.0.1 正式導頁與查詢邊界（issue #1160）**：正式的清單列、dashboard 快速入口、審核快速入口與歷史入口在讀取或寫入既有作業前，必須攜帶或由明確選定的目前／歷史 run 解析穩定的 `run_id × assignment_id`；服務端須驗證 assignment 屬於該 run 與 task，並與顯示的 dataset item、標記員及登入者即時授權範圍一致，不符或無法唯一解析時拒絕，不得回退至同名 sample 的另一個 cycle。`task_id`、`sample_id`、`run_type`、`annotator_id`、`reviewer_id` 及其缺值回退規則僅是既有 prototype 導頁／bucket 契約，不能單獨選取正式持久化紀錄；任務尚無目前 run 時快速入口不得以舊 cycle 推定新作業。

#### Scenario: AC-7.1 正式提交不沿用 prototype bucket

- **GIVEN** 兩個 cycle 的 R1 具有相同顯示用 sample、annotator 與 run_type
- **WHEN** 載入 cycle 2 的提交
- **THEN** 以穩定 run／assignment 定址，cycle 1 的提交不成為 seed（AC-7.1）

### Requirement: FR-059 爭議項推導與單位鍵

- **FR-059**（v4.6.0 新增，對應 AC-4.19 ~ AC-4.21）：爭議池的爭議項（`DisputeItem`，見關鍵實體）必須於每次讀取時由 FR-052 之差異比對**推導**而得，不得實體化儲存（`DISPUTE_ITEM_SOURCE`）——與 `ReviewUnit.status`（FR-051）同一哲學：推導使爭議池在結構上不可能與審核單位狀態機漂移，仲裁投票與定案值才是僅有的寫入狀態（欄位已於實體定義，其寫入行為屬後續 PR 範圍）。推導規則：
  1. **輸入**：該審核單位（`run_id × assignment_id`，FR-051）之標記員已提交答案與**所有**審核員已提交決策（沿用 FR-049 身分維度定址）；標記員未提交或尚無任何審核員提交時，爭議項清單為空。
  2. **項目識別**：以 `outKey × 合併鍵`（FR-052 差異項之 `key`）為爭議項識別；同一識別跨審核員合併為單一爭議項，依 `TaskProfile.outputs[]` 順序、再依差異項出現順序穩定排序。
  3. **A/B 值**：`annotator_value` 取 FR-052 差異項之標記員側值（僅存在於審核員側者為空值）；`reviewer_values` 以 `reviewer_id` 為鍵逐審核員保存其差異側值——**與標記員一致的審核員不得出現於其中**（沒有差異即沒有立場），故完全一致的審核單位推導結果為空清單。
  4. **拆解粒度沿用 FR-052**：集合型（`multi_label` / `entity_recognition` / `relation_identification`）逐合併鍵各一項——實體改型即拆為兩項（原鍵 `annotator_value` 有值、審核員側空值；新鍵相反）；`sequence_tagging` 逐 token 位置、`multi_dim` 逐維度（僅有差異的維度成項）、`single_label` / `single_dim` / `free_text` 整個 outKey 至多一項。

  本條僅定義資料模型與推導契約，不改變任何版面呈現；仲裁介面、A/B 投票與多數決收斂見 FR-061（v4.8.0）。

#### Scenario: AC-7.1 爭議項與計數跨 run 隔離

- **GIVEN** 兩個 run 具有相同來源 sample ID 與 outKey
- **WHEN** 推導爭議項及仲裁計數
- **THEN** 各自使用 `run_id × assignment_id × outKey × 合併鍵`，不合併兩個 run（AC-7.1）

### Requirement: FR-066 run-pinned 指引確認

- **FR-066**（v4.16.0 新增）：**指引閘門 modal——工作區進入前的說明確認流程之資料模型**。task-management-013 FR-005c／SC-006a 已定義觸發行為（`force_guideline = true` 時，同一使用者首次進入該任務顯示說明彈窗，確認後不再重複顯示），但僅止於行為描述，未定義 workspace 端的資料模型；本條將既有原型實作（`setupGuidelineModal()`，`annotation-workspace.config.js`）正式化為 015 的資料契約：
  1. **觸發判定**：工作區開頁時讀取 `TaskProfile.forceShowGuideline`（沿用 013 FR-005c 之 `force_guideline` 旗標，經任務發布後之唯讀 `TaskProfile` 攜帶）；為假時 modal 於任何情況下皆不得渲染，不受第 2、3 點之確認狀態影響。
  2. **modal 內容來源**：與右欄「說明與檔案」面板同一資料來源（`TaskProfile.guidelineFiles`，由當前 `run_id` 釘住的不可變 `guideline_version_id` 解析，modal 與側欄必須同版本）；取其中 markdown 類型條目之 `content` 全文顯示，無 markdown 條目時退回顯示檔名清單——不得為 modal 另行維護第二份說明文字。
  3. **逐任務確認紀錄**：確認狀態必須以 `task_id` 為鍵獨立記錄——確認某任務不得抑制另一任務的 modal，切換 `task_id` 必須重新從頭判定。使用者點擊確認按鈕後，系統必須寫入確認紀錄並立即關閉 modal；同一裝置對同一任務（同一指引版本，見第 4 點）的後續進入（含重新整理）不得重複顯示。確認紀錄的儲存實體（使用者帳號綁定或裝置綁定）留待後端接上時定義，本條僅鎖定「逐任務可獨立追蹤確認狀態」之契約；原型以 `localStorage`（鍵 `labelsuite.guidelineModalSeen.<task_id>`）示範。
  4. **以 run 釘住的指引版本確認**（v11.0.0，issue #1160）：確認紀錄比對 `task_id` 與當前 run 的 `guideline_version_id`；已確認該版本者不重複顯示，首次遇到另一版本且 `forceShowGuideline = true` 時必須重新確認。依 task-management-014 FR-010f-2／FR-010f-3／FR-017a，Dry run 版本必與其 TrialRound 相等；Official 在發布交易中鎖定當時 current guideline，可能不同於最後一次 Dry。後續指引另存新版不得改寫舊 run 指引或使舊版本確認失效；不可從 task 當前版本、最後 Dry round 或相同 R1 顯示號猜測歷史 run 版本。`guidelineFiles` 與指南段落引用均讀取所選 run 的內容。

  本條第 1 ~ 3 點為既有原型行為之正式化，第 4 點為**新增契約**——原型尚未實作版本追蹤（現況僅逐 `task_id` 記錄、無版本連動，見 issue #287），其原型化屬本 FR 之後續 PR 範圍。

#### Scenario: AC-7.3 Official 使用發布時釘住的指引

- **GIVEN** Dry R1 已確認指引 v1，等待階段另存 v2 後直接發布 Official
- **WHEN** 首次進入 Official 且 `forceShowGuideline = true`
- **THEN** modal 與側欄均讀 v2 並要求確認；重訪舊 Dry 仍讀 v1 且原確認有效（AC-7.3）

### Requirement: SC-004V gold 追溯邊界

- **SC-004V**（v4.10.0 新增）: gold 產出邊界 100% 符合「僅 `official_run` 審核單位 `finalized` 時產生」——`dry_run` 定案產生之樣本層級 gold 為 0 筆；每筆 gold 皆可追溯至其來源審核單位（`run_id × assignment_id`）與定案者（AC-4.26、FR-063）。

#### Scenario: AC-4.26 僅 Official 定稿產生 gold

- **GIVEN** Dry 與 Official 各有一個已定稿審核單位
- **WHEN** 查詢樣本層級 gold
- **THEN** Dry 為零筆；Official 的 gold 可追溯 `run_id × assignment_id` 與定案者（AC-4.26）

### Requirement: SC-014 run／assignment 身分成功標準

- **SC-014**：AC-7.1～AC-7.3 全數通過；重複 R1 的提交／審核串用次數為 0，停用 reviewer 的後續授權成功次數為 0，modal 與側欄 run-pinned 指引版本一致率為 100%。

- **AC-7.1**：**Given** cycle 1 的 R1 與退回 draft 後 cycle 2 的 R1 含相同 sample 與 annotator，**When** 從清單或 dashboard 正式入口導向並載入、儲存或審核 cycle 2 的工作，**Then** 導頁或查詢以 cycle 2 的 `run_id × assignment_id` 定位，並驗證 task／item／annotator 一致；只有相同顯示參數或跨 run 的 assignment 時不得讀取或寫入，且使用不同 `run_id × assignment_id`，cycle 1 的提交、未送出審核草稿、歷程、定稿狀態、仲裁紀錄／爭議項計數、Dry per-sample 黏著與回饋分母均不混入，且原歷史仍可由其 run 定位；同一 run 內兩個 batch 即使使用相同來源 sample ID，其不同 `dataset_item_id` 仍形成各自獨立的 Dry 黏著群組，不得只因來源 id 相同而合併（FR-014S／FR-051／FR-061／FR-093）。

- **AC-7.2**：**Given** run 凍結的 reviewer 候選已提交審核而黏住單位，**When** 該 membership 停用，**Then** 舊提交、候選與責任鏈保留，但下一次讀取、提交、仲裁均拒絕；未黏住單位不得分配給該人；不得為繞過停用而改派已黏住單位或新增持久化 ReviewAssignment（FR-093／SC-013）。

- **AC-7.3**：**Given** 使用者已確認 Dry R1 釘住的指引 v1，PL 在等待階段另存 v2 後直接發布 Official，**When** `forceShowGuideline = true` 且首次進入 Official，**Then** modal 與側欄呈現 Official 釘住的 v2 並要求確認，重新載入不重複彈窗；重訪舊 Dry 仍呈現 v1 且原確認有效；後續 task current guideline 變化不能改寫兩個 run 的內容（FR-066）。

#### Scenario: AC-7.1 跨 cycle 與同源 sample ID 隔離

- **GIVEN** cycle 1 與 cycle 2 的 R1 有相同 sample 與 annotator，同一 run 另有兩個 batch 重複來源 sample ID
- **WHEN** 載入、儲存、審核及統計 cycle 2 工作
- **THEN** 各 cycle 及不同 `dataset_item_id` 的提交、草稿、爭議、黏著和分母皆不混用，歷史仍可追溯（AC-7.1）

#### Scenario: AC-7.1 同名 R1 正式導頁使用穩定作業身分

- **GIVEN** cycle 1 與 cycle 2 的 R1 有相同顯示 sample 與 annotator，但各有不同 run 與 assignment
- **WHEN** 從 cycle 2 清單或 dashboard 快速入口開啟作業，或以 cycle 1 的 `run_id` 配上 cycle 2 的 `assignment_id` 查詢
- **THEN** 合法入口只定位 cycle 2 的 `run_id × assignment_id`，跨 run 配對及無法唯一解析的顯示參數請求均拒絕，不得載入 cycle 1 的提交或審核資料（FR-049／FR-073；AC-7.1）

#### Scenario: AC-7.2 停用即時撤權

- **GIVEN** 已提交 reviewer 原為 run 候選並黏住審核單位
- **WHEN** 其 membership 停用
- **THEN** 歷史責任鏈保留，下一次讀取、提交、仲裁皆拒絕，未黏住工作不再分配給此人（AC-7.2）

#### Scenario: AC-7.3 歷史指引不隨 task current 改寫

- **GIVEN** Dry 釘住並確認 v1，Official 發布時釘住 v2
- **WHEN** 檢視兩個 run 的 modal 與側欄
- **THEN** Dry 仍為 v1 且已確認，Official 為 v2 且首次須確認，兩處版本一致（AC-7.3）

## MODIFIED Requirements

### Requirement: FR-051 審核單位定址與狀態機

- **FR-051**（v3.9.0 新增，對應 AC-4.9、AC-4.10）：審核單位（`ReviewUnit`，見關鍵實體）必須以 `REVIEW_UNIT_DIMENSIONS`（`run_id × assignment_id`）定址（v11.0.0，issue #1160）——同一樣本由 N 位標記員標記即為 N 個各自獨立、狀態互不影響的審核單位。此定址於 `dry_run` 與 `official_run` 完全一致，不得依 `run_type` 分流（`REVIEW_MODEL_BY_RUN_TYPE` 的兩種模型自 v3.9.0 起於審核單位層級失效，其**工作區呈現層已於 v4.0.0 移除**，見 FR-053；`annotation-list` 清單粒度屬後續 PR 範圍）。狀態依 `REVIEW_UNIT_STATUS` 單一狀態欄線性推進（**v5.0.0 修訂，BREAKING**，對應 AC-4.52，issue #596），判定式恰五句：標記員未提交 → 不成立審核單位（推導為 null）；該單位之指派審核員（FR-093）尚未提交 → `pending`；審核員逐項決策皆為 `approve` → `finalized`；任一項決策為 `modify` 或 `bypass` → `disputed`；`disputed` 單位之所有爭議項皆已解決（仲裁定案或最終例外池收尾，FR-061、FR-095）→ `finalized`，否則維持 `disputed`。`finalized` 為終態。**v5.0.0 移除**：`approved`／`modified` 兩個中繼態、`n`（已提交審核員人數）與 `min`（`min_reviewers`）之門檻比較、以及「純退回視同差異」之 v4.54.0 分支全部移除——單人接力下一個單位恰有一位指派審核員，沒有人數可計；退回決策已不存在（FR-092）。狀態解析必須讀取該標記員名下**所有**審核員的已提交決策，不得僅讀取目前登入審核員自己的紀錄（沿用 FR-049 的身分維度定址）；未送出的草稿不計入。本條僅定義資料模型，不改變任何版面呈現。**v11.0.0 持久化邊界**：`run_id` 與 `assignment_id` 分別消費 task-management-014 v6.0.0 的 AnnotationListMaterialization 與 AnnotationAssignment。assignment 必屬該 run，樣本與受派標記員必須符合該 assignment。提交、審核決策、歷程、仲裁／例外處置、回饋與其狀態推導皆限定於此身分，不得只用 `run_type`、顯示回合 R1 或路由 query 查找。另一 cycle 的 R1 即使 sample／annotator 相同，亦有不同 run／assignment；舊提交不得成為新單位 seed 或黏著來源。物理 annotation／review FK 留待其擁有者設計，本版不新增表或 FK。〔**v4.54.0 修訂**（**已於 v5.0.0 隨退回機制移除，本段僅存為沿革**），issue #551：**純退回**（`decision = reject` 且答案值與標記員相同，即無修正）此前於「答案是否相同」的比對下與同意票無法區分，被計為對標記員答案的隱含同意，使審核員表達「這不對」的動作反而促成以標記員原答案定案；本項修訂後純退回視同差異，直接阻擋 `approved`／`finalized` 兩態，逼入 `modified`／`disputed`，其收斂規則見 FR-061 第 4 點）〕

#### Scenario: AC-4.52 三態狀態機
- **GIVEN** 一個 `official_run` 審核單位，標記員已提交、審核員尚未送出
- **WHEN** 讀取該單位狀態
- **THEN** 狀態為 `待審`
- **AND** 審核員全部 outKey 送出 `通過` 後狀態直接為 `已定稿`，過程中 MUST NOT 出現 `已同意` 或 `已修改`
- **AND** 另一單位之審核員送出任一 `修正` 或 `無法裁決` 後狀態為 `爭議中`，直到仲裁或例外池收尾才轉為 `已定稿`

#### Scenario: AC-7.1 新舊 R1 審核單位互不污染

- **GIVEN** 同一 task 的兩個 cycle 各有 R1 和相同顯示 sample ID
- **WHEN** 推導審核狀態與歷程
- **THEN** 各依其 `run_id × assignment_id` 隔離，舊提交不成為新單位 seed（AC-7.1）

### Requirement: FR-055 annotation-list reviewer 清單粒度

- **FR-055**（v4.2.0 新增，BREAKING，對應 AC-1.14 ~ AC-1.17）：`annotation-list` reviewer 視圖的清單粒度必須為**審核單位**（`REVIEW_UNIT_DIMENSIONS`＝`run_id × assignment_id`，FR-051）——同一樣本由 N 位標記員標記即渲染為 N 個連續資料列，兩種 `run_type` 完全一致，不得存在任何依 `run_type` 分流的清單分支。每列必須呈現：樣本 ID、該列標記員帳號、該審核單位的 `REVIEW_UNIT_STATUS`、完成時間、文本摘要、**該標記員本人**的逐輸出類型答案摘要 tag，以及該樣本的跨標記員標記分布統計（統計單位仍為樣本，故同一樣本各列數值相同；演算法沿用與工作區同一實作來源）。分頁總筆數計審核單位數。狀態篩選選項依角色由對應常數推導：reviewer 為 `REVIEW_UNIT_STATUS` 三態（**v5.0.0 修訂，BREAKING**，對應 AC-1.26，issue #596：原五態，`approved`／`modified` 隨常數移除）、annotator 維持既有三態，不得於選單硬編狀態清單。導頁（列點擊與 `編輯` 按鈕）必須帶出該列的 `annotator_id`（沿用 FR-049 身分參數傳遞規則），使工作區審核卡開在同一審核單位。**廢止**：展開控制項與標記員明細列（`list-review-expand`、`list-review-annotator-row`）、逐列決策控件（`list-review-row-approve`、`list-review-row-reject`）、`送出審核` 按鈕與其 toast（`submitReviewLabel`、`toastSelectDecision`、`toastReviewSubmitted`），testid 與 i18n key 一律保留不重用。理由：v4.0.0 已將工作區審核卡收斂為「一張卡審一位標記員」（FR-053），清單卻仍是「一列一筆樣本」——`dry_run` 需展開才看得到標記員、`official_run` 更把三位標記員截斷成一位，導致清單根本無法列出、篩選或定位到實際的審核標的；清單層級的通過/退回則會與審核卡的決策面產生兩個互相矛盾的決策來源。本條取代 FR-047、FR-048，並使 FR-027 失去標的。**v6.10.0 修訂（issue #792，審核單位之列舉來源；對應 AC-1.30、AC-1.31）**：一筆樣本的審核單位必須為下列兩者之聯集：(1) 該樣本的示範標記員列（FR-044a 第二 seed 來源）；(2) 該樣本在本 `run_type` 下具**已儲存提交**之標記員（FR-044a 第一 seed 來源）。未提交之草稿不得構成審核單位；兩個 seed 來源皆缺之單位仍不在列舉範圍內（v6.3.1 釐清，issue #784，不變）。此聯集必須由資料層單一函式（`getReviewUnitRows()`，`annotation-workspace.data.js`）提供，`annotation-list` 清單列、工作區 reviewer 導覽（FR-056）、任務摘要（FR-072）、快速審核候選（FR-073）、審核指派之輸入（FR-093）與定稿卡剩餘量（FR-100）皆讀同一份結果，不得各自列舉。列舉不得依任務 ID、樣本 ID 或輸出類型分流（Generalization-First）。本修訂不改變 FR-093 之指派演算法；新單位加入列舉後既有單位之指派位移屬 issue #824 範圍。**v6.12.0 修訂（issue #866，IAA 之評分者列舉亦同源；對應 AC-1.32）**：前段之消費端清單必須再含**本規格供應給 IAA 的評分者列舉**（FR-079 所述之輸入）——IAA 的評分者數與各樣本的值集合必須由同一份聯集結果推導，不得只取示範標記員列這一個 seed 來源。因此一位在本 `run_type` 下具已儲存提交、但無示範列之標記員，必須與其他標記員同樣計入評分者數與各樣本的值集合。本條僅規範供應給 IAA 的**輸入**；α 之計算公式、可計算性門檻與閘門語意之正典仍在 `dataset-017`（閘門語意見 FR-039），不因本修訂而改變。

#### Scenario: AC-1.26 狀態篩選為三態
- **GIVEN** reviewer 開啟 `annotation-list`
- **WHEN** 展開狀態篩選選單
- **THEN** 選項恰為 `待審`／`爭議中`／`已定稿` 三項，MUST NOT 出現 `已同意` 或 `已修改`

#### Scenario: 已提交但無示範列之審核單位進入列舉
- **GIVEN** 某任務某樣本沒有示範標記員列，而一位標記員已於本 `run_type` 提交該樣本
- **WHEN** 被指派到該單位的審核員開啟 `annotation-list` 與 dashboard
- **THEN** 清單出現一列該樣本 × 該標記員之審核單位，狀態為 `待審`，答案欄顯示該標記員提交的答案
- **AND** 任務摘要的待審與未定稿計數各含此單位
- **AND** `快速審核` 可導向此單位，該單位恰被指派給一位審核員

#### Scenario: 草稿與兩個 seed 來源皆缺之單位不進入列舉
- **GIVEN** 某樣本沒有示範標記員列，而一位標記員對該樣本只存了草稿、未提交
- **WHEN** 審核員開啟 `annotation-list`
- **THEN** 清單不出現該樣本之任何審核單位，任務摘要亦不計入

#### Scenario: 已提交但無示範列之標記員計入 IAA 評分者
- **GIVEN** 某任務某 `run_type` 下，一位標記員對該任務的樣本具已儲存提交，但不在任何樣本的示範標記員列中
- **WHEN** 檢視該任務該輸出類型的 IAA
- **THEN** 評分者數含該標記員，各該樣本的值集合含其答案
- **AND** α 依含該標記員之完整值集合計算

14. **AC-1.14（v4.2.0 新增，對應 FR-055）**：**Given** `role = reviewer` 進入 `annotation-list`，**When** 檢視資料清單，**Then** 每一列恰對應一個審核單位（`REVIEW_UNIT_DIMENSIONS`＝`run_id × assignment_id`）——同一樣本由 N 位標記員標記即展開為 N 個連續資料列，各列顯示同一樣本 ID 與文本摘要、各自的標記員帳號與**該標記員本人**的逐輸出類型答案摘要 tag；**And** 分頁總筆數計審核單位數而非樣本數；**And** 本規則於 `dry_run` 與 `official_run` 完全一致，不因 `run_type` 分流。

### Requirement: FR-061 仲裁版面：逐項二選一與 Reject 出口

- **FR-061**（v4.8.0 新增，v4.54.0 修訂，**v5.0.0 修訂，BREAKING**，對應 AC-4.22 ~ AC-4.24、AC-4.54，issue #147／#551／#596；**v9.0.0 修訂，MAJOR**，issue #1053：新增當事審核員已有自己提交時之 FR-103 例外；**v10.1.0 修訂**，對應 AC-4.83，issue #1120：新增第 7 點仲裁輸出項目之計數單位）：工作區 reviewer 視圖必須為爭議池提供**逐項仲裁版面**，切換條件為「該審核單位狀態為 `爭議中`（FR-051）**AND** 目前審核員具仲裁資格（FR-060 之兩條件）」——條件成立時整張審核卡切換為仲裁版面，不成立時，若目前審核員在該單位已有自己的提交，改依 FR-103（**v9.0.0 修訂**，issue #1053）呈現其唯讀摘要版面，其餘情形維持 FR-053 審核卡，三者互斥、不得混渲染：
  1. **仲裁者選邊、不重新標記**：仲裁版面呈現標記員答案的唯讀摘要（一致項的脈絡）與逐爭議項的 A／B 選擇；修正控件與 FR-014B 決策控件一律不渲染——仲裁的產出是「採哪一側」，不是第三份新答案。仲裁不得觸發任何形式的重標。
  2. **A／B 取值與 B 的動態渲染**：A ＝ `annotator_value`（標記員原答案）。B ＝ 該單位審核員的答案，其呈現必須依決策來源動態決定——來源為 `modify` 時呈現 `B · 審核員修正值`（附該審核員之必填理由，FR-016A），採 B 即以該修正值定案；來源為 `bypass` 時呈現 `B · 審核員：無法裁決`（**v6.8.0 修訂**，issue #811：與來源 `modify` 同一組字規則，冒號後為 FR-092 所定之決策值文案，不得含 `Bypass` 字樣——舊標籤把答案值與決策值兩個概念的名字疊在同一個標籤裡；其後「定案為無法判定」描述的是定案後的值，不在本版改名範圍），採 B 即**定案為無法判定**，該項定案值記為無法判定，**不得**回填標記員原答案。一個審核單位恰有一位審核員（FR-093），故每個爭議項恰有一個 B 選項，不存在多個 B 或需合併相同值的情形。（**v6.20.0 釐清**，issue #913）萬一因遺留資料而出現 FR-093（1）明文禁止之同一單位多位審核員提交（例如 v6.17.0 送出閘門前留下的舊紀錄），B 值與其動態渲染所讀取之「該單位審核員」，必須沿用 FR-093（1）已定義之 sticky 擁有者（`getStickyReviewers()`），不得依儲存掃描順序（如 bucket key 字典序）挑選——後者可能選中與標記員答案一致、未產生爭議項之提交者，使 B 值誤讀為未定義。（**v7.4.0 釐清**，issue #975）同一原則亦適用於 `adjudicated` 歷程事件之 `result_snapshot`（`arbitrationFinalizedSnapshot()` 之 `adopt_b` 分支，`annotation-workspace.data.js`）——該讀取點取「該單位審核員」提交時，同樣須沿用 sticky 擁有者、不得依儲存掃描順序挑選，確保 `result_snapshot` 與同一次仲裁之 `finalized_value` 描述同一位審核員；此前僅 B 值（`finalized_value` 路徑，issue #913）已修正，`result_snapshot` 路徑係本版補上。
  3. **第三出口：兩者皆非**：仲裁者判定 A 與 B 皆不可採時必須可選 `兩者皆非`（`ARBITRATION_OUTCOMES.reject`），**理由必填**；送出後該爭議項必須落入最終例外池（FR-095），該單位維持 `爭議中` 直到例外池收尾。
  4. **送出與寫入**：所有爭議項皆已裁定（採 A／採 B／兩者皆非）方可送出，未完成時必須阻擋且不得寫入任何狀態。送出時逐項寫入 `votes[]`（`arbiter_id`、`choice`、`voted_at`）與 `finalized_value` / `finalized_by`——此為 `DisputeItem` 僅有的寫入狀態（FR-059、`DISPUTE_ITEM_SOURCE`）；`choice` 取值必須為 `ARBITRATION_OUTCOMES = adopt_a | adopt_b | reject`。仲裁狀態以**審核單位**定址（`run_id × assignment_id`；單位內再以 `outKey × 合併鍵` 區分爭議項），不得寫入任何 reviewer bucket——爭議屬於單位本身，任何仲裁者的定案必須對該單位的所有檢視者可見。
  5. **仲裁效果說明**（v5.0.0 自 FR-074 第 4 點逐字移入，該條已整組移除）：版面必須載明仲裁的效果為「逐爭議項選定定稿值、不重新標記」。
  6. **狀態機延伸**（修訂 FR-051）：`爭議中` 不是終態——該單位所有爭議項皆已解決（仲裁定案或例外池收尾）時，狀態推導為 `已定稿`；仍有未解決項時維持 `爭議中`。
  7. **仲裁輸出項目之計數單位**（**v10.1.0 新增**，對應 AC-4.83，issue #1120）：凡呈現仲裁進度之計數——含 `task-detail` 進度頁籤之 `待仲裁` 計數，以及 `task-management/014-task-detail` FR-010u 第 (5) 點所稱之「爭議項」聚合層級（issue #1120 OpenSpec change `1120-task-lifecycle-alignment` 稱之為「仲裁輸出項目」）——必須以 FR-059 推導之爭議項（`DisputeItem`）為聚合單位，本點為該計數單位之唯一定義。(a) **單位**：每個爭議項計為 1；其完整識別為 `run_id × assignment_id × outKey × 合併鍵`（所屬審核單位依 FR-051）（FR-059 第 2 點），拆解粒度依 FR-059 第 4 點（集合型逐合併鍵、`sequence_tagging` 逐 token 位置、`multi_dim` 逐維度、其餘整個 outKey 至多一項）；不得以審核單位或輸出類型將同一單位內的多個爭議項合併為一筆計數。(b) **分子與分母**：分母為查詢範圍內之爭議項總數；分子為其中已裁定之爭議項數——即最新裁定為 `reject`，或已有合法仲裁定案（`finalized_value`／`finalized_by`，本條第 4 點）者。(c) **待仲裁**：尚未解決（既無仲裁定案、亦無最終例外池收尾，同 FR-051 之解決判定）且最新裁定不是 `reject` 之爭議項數；最新裁定為 `reject` 而尚未收尾者屬最終例外輸出項目（FR-095），不得計入待仲裁。(d) **範圍**：查詢範圍由呼叫端之查詢上下文決定（例如 014 FR-010u 第 (1) 點），本點不另定範圍；不同 `run_id` 之爭議項必須分別計數，即使 `run_type` 與回合顯示號相同亦不得混合。(e) **不得相加**：本計數不得與審核單位數或標記 assignment 數相加，亦不得與兩者共用分母（014 FR-010u 第 (5) 點）。本點係 OpenSpec change `1120-015-arbitration-output-unit` 回寫，補上 issue #1120 OpenSpec change `1120-task-lifecycle-alignment` 列為 015 擁有之跨 owner 待辦；該 change `design.md` D2 以「審核單位 × 輸出類型」描述此單位，較 FR-059 粗，本點以 FR-059 為準。

  **v5.0.0 移除**：逐項多數決收斂（`DISPUTE_CONVERGENCE_RULE`）、未表態審核員之隱含同意票、偶數平手與全數分歧之不收斂情境，以及 issue #551 之「純退回恆不收斂」與「維持退回」語意全部移除——單一審核員沒有票數可計，且退回機制已不存在（FR-092）。爭議項必須全數由仲裁者逐項裁定，不存在自動收斂路徑。

#### Scenario: AC-4.54 B 依來源動態渲染且 Reject 進例外池
- **GIVEN** 一個 `爭議中` 單位含兩個爭議項：項目 1 之審核員決策為 `修正`（改為 `positive`），項目 2 為 `無法裁決`
- **WHEN** 具資格之仲裁者開啟仲裁版面
- **THEN** 項目 1 之 B 選項顯示審核員修正值 `positive`，項目 2 之 B 選項顯示 `審核員：無法裁決`，且不含 `Bypass` 字樣
- **AND** 仲裁者對項目 2 選 `兩者皆非` 且未填理由時送出被阻擋；填妥理由送出後該項出現於最終例外池，該單位狀態維持 `爭議中`

#### Scenario: AC-4.22 仲裁版面切換

- **GIVEN** 一個 `disputed` 審核單位（FR-051）
- **WHEN** 具仲裁資格的審核員（FR-060：`can_arbitrate` 旗標 AND 非當事人）以完整審核單位身分開啟工作區 reviewer 視圖
- **THEN** 整張審核卡 MUST 切換為仲裁版面（`ws-arbitration-card`）：標記員答案以唯讀摘要呈現、每個未解決爭議項恰渲染一列 A/B 選擇（`ws-arbitration-item`）
- **AND** 修正控件（含作答面板互動元件）與 ✕/✓ 決策按鈕（`ws-review-row-approve` / `ws-review-row-reject`）MUST 為 0 節點——仲裁者選邊、不重新標記
- **AND** 當事審核員於該單位**尚無**自己的提交、未具旗標的審核員、以及任何人開啟非 `disputed` 單位時，皆 MUST 維持 FR-053 審核卡，MUST NOT 出現仲裁版面（見 FR-061）
- **AND**〔issue #1053 新增〕當事審核員於該單位**已有**自己的提交時，改依 FR-103 呈現唯讀摘要版面（`ws-review-submitted-card`），同樣 MUST NOT 出現仲裁版面

#### Scenario: 仲裁輸出項目逐爭議項計數、不以審核單位或輸出類型合併
- **GIVEN** 一個 `official_run` 任務僅含一個 `爭議中` 審核單位，其集合型輸出（`multi_label`）之審核員修正使 FR-052 產生兩個不同合併鍵之差異項
- **WHEN** 專案負責人開啟該任務 `task-detail` 進度頁籤
- **THEN** `待仲裁` 計數為 2（兩個爭議項），不得為 1（審核單位數或輸出類型數）
- **AND** 仲裁者對其中一項選 `adopt_a`、另一項選 `兩者皆非` 並填妥理由送出後，`待仲裁` 計數為 0，`最終例外待處置` 計數為 1（該項屬 FR-095 之最終例外輸出項目）

#### Scenario: AC-7.1 仲裁寫入與計數使用完整單位鍵

- **GIVEN** 同一顯示 sample ID 出現在不同 run
- **WHEN** 仲裁者寫入 votes 並查詢待仲裁計數
- **THEN** 寫入與計數均依 `run_id × assignment_id × outKey × 合併鍵` 分開，不跨 run 合併（AC-7.1）

### Requirement: FR-063 official_run 定案即產生 gold

- **FR-063**（v4.10.0 新增，對應 AC-4.26）：**official_run 定案即產生 gold——正式標記的 gold 資料層契約**。本條將產品決策文件 `docs/product/reviewer-model-redesign.md` 之既有定案（決策②「dry_run 不產 gold，gold 只在正式標記產生」、目標流程分岔節點「該審核單位定案。正式標記時即成為 gold」、資料模型變更表「`GoldRecord` 縮限：只在 official_run 產生」）升格為可引用的正式 FR，不新增決策文件以外的任何行為：
  1. **產生時點**：`run_type = official_run` 之審核單位（`REVIEW_UNIT_DIMENSIONS`，FR-051）狀態推導為 `finalized` 時——不論經由四種定稿來源之何者（**v5.0.0 修訂**，issue #596）：逐項全數 `通過`、仲裁定案（FR-061）、最終例外池收尾（FR-095）、或該單位全部項目遭排除——該單位的定案判斷即成為 gold；每一項定案值皆必須可追溯至其決定者（審核員／仲裁者／專案負責人）；`finalized` 以外的任何狀態不產生 gold。
  2. **gold 承載內容（契約層）**：gold 取自定案後的最終判斷——標記員與審核員一致的部分自動保留（決策③「兩人都同意的部分自動保留」），不一致項逐項採仲裁定案值或例外池收尾值（FR-061 `finalized_value`、FR-095）；經 `exclude_from_dataset` 排除之項目**不產生 gold**（**v5.0.0 新增**，issue #596）；且每筆 gold 必須可追溯至其來源審核單位身分（`run_id × assignment_id`）與定案來源者——參與定案之審核員真實 `reviewer_id`（FR-049、FR-050），經仲裁定案者另含 `finalized_by`（FR-061）。
  3. **dry_run 不產 gold**：`dry_run` 審核單位定案不產生任何樣本層級 gold——維持規格常數 `GOLD_STATUS` 之 v4.0.0 廢止條目（dry_run 不再產出樣本層級 gold，`GoldRecord` 一併失效）；試標的品質產出為 IAA 與每位標記員的被修改率（概念性提及，指標細節屬 dataset-017 範圍，本條僅界定「不產 gold」的邊界）。

  本條僅定義資料層契約，不改變任何版面呈現，亦不恢復已廢止之 `AdjudicationItem`／`GoldRecord` 實體（dry_run 共識仲裁彙總實體，名稱保留不重用，見 FR-053）；official_run gold 的儲存實體形狀決策文件未定，留待後端接上時定義，本條僅鎖定產生時點、來源判斷與可追溯性三項契約。

#### Scenario: 定稿值可回溯至來源與決策者
- **GIVEN** 一筆 `official_run` 樣本經審核員 `修正`、仲裁者採 B 而定稿
- **WHEN** 讀取該樣本之定案答案
- **THEN** 定案值為審核員的修正值，且記錄之來源為仲裁 `adopt_b`、決策者為該仲裁者
- **AND** 另一筆經例外池「自資料集排除」之樣本不出現於最終答案集合，但其排除紀錄可讀出處置者與理由

26. **AC-4.26（v4.10.0 新增，official_run 定案產生 gold）**：**Given** `run_type = official_run` 之審核單位，**When** 其狀態推導為 `finalized`（FR-051；**v5.0.0 修訂**，issue #596：定稿路徑改為「唯一審核員全數 `approve`」或「爭議項全數經仲裁／例外池解決」，`min_reviewers` 門檻已廢止），**Then** 系統必須自該單位之定案判斷產生 gold——一致項自動保留、不一致項採收斂或仲裁定案值，且該 gold 可追溯至來源審核單位（`run_id × assignment_id`）與定案者；**And** `run_type = dry_run` 之審核單位於相同條件下不得產生任何樣本層級 gold（見 FR-063）。

### Requirement: FR-072 審核員任務摘要必須由審核單位狀態推導

- **FR-072**（v4.27.0 新增，對應 AC-1.22，issue #450）：**審核員任務摘要必須由審核單位狀態推導**。`annotation-list` 任務資訊卡（FR-007C）與 dashboard 任務卡（012 FR-020）呈現的審核員進度摘要，不得取用任何預先組好的顯示字串，必須由審核單位狀態（FR-051 `REVIEW_UNIT_STATUS` 三態）即時推導：
  1. **單一計算來源**：四項計數與覆蓋率的正式公式集中由選定的穩定 `run_id` 計算（`computeReviewSummary(run_id)`），兩個消費端皆讀取同一來源，不得各自重算或各自維護第二套公式。既有 `computeReviewSummary(task_id, run_type)`（`annotation-workspace.data.js`）僅為 prototype helper，不得作為正式跨 cycle 查詢鍵。列舉範圍為所選 run 的全部審核單位（`REVIEW_UNIT_DIMENSIONS`＝`run_id × assignment_id`，FR-055），與該 run 的清單資料列同源；`annotation-list` 與 dashboard 的目前工作摘要須由任務目前 cycle 解析對應 run，歷史檢視須顯式選定歷史 `run_id`，沒有目前 run 時不得把舊 cycle 單位計入目前工作摘要。**FR-044a 兩個 seed 來源（已儲存提交、示範標記員答案）皆缺之單位不在列舉範圍內**——此即 AC-3.38 空單位閘門與 FR-067 說明列所指之單位，既不計入待審，亦不構成 FR-073 候選（**v6.3.1 釐清**，issue #784）。**v6.10.0 修訂**（issue #792）：列舉範圍含已於本 `run_type` 儲存提交、但無示範標記員列之標記員（FR-055 v6.10.0 修訂段）；草稿不構成審核單位。
  2. **公式**：`待審 = status 為 pending 之單位數`；`未定稿 = 總單位數 − status 為 finalized 之單位數`；`爭議 = status 為 disputed 之單位數`；`審核覆蓋率 = round((總單位數 − 待審) ÷ 總單位數 × 100)`，總單位數為 0 時覆蓋率為 0。
  3. **重算時機**：推導為讀取時計算、不快取（沿用 FR-051），因此送出通過、送出修正、送出無法裁決、仲裁定案、例外池收尾、未定稿審核單位之標記員重新提交（**v6.19.0 修訂**，issue #908：已定稿單位之標記員寫入依 FR-101 寫入側守衛直接阻擋，不產生任何狀態變更，故本點原列舉之「標記員重新提交」限定為未定稿單位）等任一改變審核單位狀態的操作之後（**v5.0.0 修訂**，issue #596：原列舉之「正式標記退回」隨 FR-014I 移除），重新進入或重新整理清單與 dashboard 皆必須反映最新數值；跨頁往返與 reload 之結果必須一致。
  4. **覆蓋率不等於完成率**：審核覆蓋率衡量「已離開待審的單位比例」，達 100% 不代表任務已完成。覆蓋率 100% 而仍有未定稿或爭議單位時，摘要必須同時揭露未定稿與爭議筆數，且該任務不得顯示為已完成（沿用 issue #310 對覆蓋率與完成率的區分）。
  5. **顯示文字由計數組成**：顯示字串由 `formatReviewSummary()` 依計數組出（覆蓋率恆顯示；待審／未定稿／爭議僅於大於 0 時顯示；IAA 以結構化數值附加於末），中英文各一份；種子資料不得保留預先組好的摘要字串（**v4.44.0 修訂**，issue #501：IAA 亦已改為由 `computeIaaAlpha()` 推導，見 012 FR-023，故種子連結構化 IAA 數值也不再攜帶；種子僅得宣告無法由審核單位狀態推導之欄位——目標單位、run 別、狀態徽章、審核員身分）。
  6. **無審核單位狀態不構成例外**（**v4.44.0 改寫**，issue #501／#529；原文為「無審核單位狀態時之回退」）：摘要**不得**因任務尚無任何已儲存的審核單位狀態而回退至種子值。該情形的推導結果為「全部待審、覆蓋 `0 / n`」，本身即為可陳述的真實狀態；回退反而使任務列顯示與其審核單位列互相矛盾的數字（issue #501 實測：`待審 7 個審核單位 · 任務覆蓋率 34%` 之下十五筆單位列全為待審）。`computeReviewSummary()` 之 `derivable` 旗標維持輸出（仍是公式的正確一環，且供非顯示用途），但**不得有任何顯示端消費者**。**同步生效範圍**：`annotation-list` 任務資訊卡（FR-007C）與 dashboard 任務卡（012 FR-020）兩處消費端須於同一變更移除回退判定，否則同一任務會在兩個畫面得到不同數字。判定與呈現一律不得以任務 ID 白名單分流（Generalization-First）。

  本條不改變 FR-051 狀態機、FR-055 清單粒度與 FR-059／FR-061 之爭議推導契約，僅將既有推導結果延伸為任務層級摘要之唯一來源。

#### Scenario: 已定稿單位之標記員寫入不構成重算時機（issue #908）
- **GIVEN** 一個 `official_run` 審核單位已依 FR-051 推導為 `已定稿`
- **WHEN** 該單位對應之標記員嘗試重新提交或儲存草稿，且該寫入依 FR-101 寫入側守衛被擋下（回傳 `false`、未產生任何寫入）
- **THEN** 該單位之審核單位狀態 MUST 維持 `已定稿`，`computeReviewSummary()` 之計數 MUST NOT 因此次被擋下的嘗試而改變
- **AND** 同一任務中另一個 `未定稿`（`待審` 或 `爭議中`）單位之標記員正常重新提交時，其狀態改變仍 MUST 觸發本條既有之讀取時重算，行為與本次修訂前一致

#### Scenario: 重啟 R1 的審核摘要依 run 隔離

- **GIVEN** 任務的 cycle 1／R1 已保存待審、爭議中與已定稿單位，IAA 退回 draft 後已在 cycle 2 發布新的 R1
- **WHEN** `annotation-list` 或 dashboard 顯示目前工作的審核摘要
- **THEN** 只由 cycle 2／R1 的 `run_id` 及其審核單位推導計數和覆蓋率，不混入 cycle 1／R1；顯式選擇 cycle 1 的歷史檢視仍可讀取該 run 的原摘要（FR-072；AC-7.1）

### Requirement: FR-073 審核員快速入口必須導向下一個可處理審核單位

- **FR-073**（v4.28.0 新增，對應 AC-1.23，issue #449）：**審核員快速入口必須導向下一個可處理審核單位**。自 dashboard `快速審核`（012 FR-021）進入工作區的目標單位，不得取用任何預先指定的固定樣本，必須由審核單位狀態與登入審核員身分即時推導：
  1. **單一列舉來源**：候選單位由 `listReviewUnits(task_id, run_type)`（`annotation-workspace.data.js`）列舉，與 FR-072 摘要計數同一份列舉結果，兩者不得對「有哪些審核單位」給出不同答案；每個單位之狀態沿用 FR-051 `REVIEW_UNIT_STATUS`。**v6.10.0 修訂**（issue #792）：`listReviewUnits()` 之列舉改讀 `getReviewUnitRows()`，已儲存提交而無示範標記員列之單位亦為候選（FR-055 v6.10.0 修訂段）。
  2. **`REVIEW_UNIT_ACTION_PRIORITY`**（數字小者優先，同順位取列舉順序中最前者）：
     - `1` — `pending`（含標記員**無已儲存提交、但依 FR-044a 以示範標記員答案遞補 seed** 而視為待審者，與 FR-072 計數口徑一致；**v6.3.1 釐清**，issue #784：「尚無提交」不含 FR-044a 兩個 seed 來源皆缺之單位——該類單位依 FR-072 第 1 點不在第 1 點列舉範圍內，故不會因 AC-3.38 空單位閘門而成為審核員無法處理的候選）**且該單位依 FR-093 指派予該審核員**（**v6.2.0 修訂**，issue #719：原文未帶指派條件，使候選涵蓋任務內全部 `pending` 單位，審核員因而會被導向他人被指派的單位，與 FR-093「指派由系統在被勾選的審核員之間平均分配，不由審核員自行挑單」及「每個指派對象恰有**一位**審核員」相衝。指派關係由 `getAssignedReviewUnits(run_type, reviewer_id, units)` 推導，粒度依 `REVIEW_ASSIGNMENT_GRANULARITY` 分流：`dry_run` 以樣本、`official_run` 以審核單位。推導必須餵入第 1 點之完整列舉結果，不得先依其他條件篩選再推導——指派為位置性分配，餵入子集會位移每位審核員的份額，使本條與 `annotation-list` 的指派過濾對「誰擁有哪個單位」給出不同答案）
     - `2` — `disputed` 且該審核員依 FR-060 具仲裁資格（名冊 `can_arbitrate` 且未於該單位提交過審核）——**本順位刻意不套用第 1 順位之指派條件**（**v6.2.0 補述**，issue #719）：具資格之仲裁者依 FR-060 第 2 點必未於該單位提交過審核，而該單位之被指派審核員恰是提交者，故合格仲裁者**恆非**該單位之被指派人；若對本順位亦要求指派，FR-060 之仲裁將永無對象可處理
     - `3` —（**v5.0.0 移除**，issue #596）~~`approved` 或 `modified`（未達 `min_reviewers` 定稿門檻）且該審核員尚未於該單位提交過審核~~——`approved`／`modified` 兩個中間狀態隨 `REVIEW_UNIT_STATUS` 收斂為三態而消失，且 FR-093 令每單位恰有一位系統指派的審核員，「同一單位再補一位審核員」的情境不再存在；本順位因此無適用對象，順位編號保留不重用
     - 不可處理 — `finalized`（終態）、以及該審核員無仲裁資格之 `disputed`（**v5.0.0 修訂**，issue #596：原另列之「已提交過審核之 `approved`／`modified`」隨該兩狀態移除而失效）
  3. **身分為判定要素**：可處理與否必須以登入審核員身分推導，已參與該爭議審核的審核員不得被導向自己無資格仲裁的單位（沿用 FR-060 盲審與利益迴避）。
  4. **導頁參數**：導向工作區時必須完整攜帶 `task_id`、`sample_id`、`annotator_id`、`reviewer_id`、`run_type`。上述五項為 prototype 導頁參數，`annotator_id` 在 prototype 必填——其呈現維度為 `sample_id × annotator_id × run_type`；缺少時工作區會依 FR-049 回退為預設標記員身分而開啟另一個單位。正式快速入口另須依 FR-049 攜帶或唯一解析 `run_id × assignment_id`，於服務端驗證 run／task／item／annotator 範圍；只有五項顯示參數時不得猜測跨 cycle 的審核單位（FR-051）。
  5. **無可處理項目時的空狀態**：推導結果為空時必須導向 `annotation-list`（不帶 `sample_id`）並顯示明確空狀態說明（testid `list-no-actionable-notice`，zh／en 同步），不得回退為開啟任務第一筆或任何其他已定稿唯讀單位。
  6. **不得硬編任務 ID**（Generalization-First）：優先序與資格判定僅得讀取審核單位狀態與審核員身分，不得對 T014–T017 或任何任務 ID 分流。

  本條不改變 FR-051 狀態機、FR-055／FR-056 粒度、FR-057 網址同步契約與 FR-060／FR-061 仲裁資格與收斂規則，僅規範入口導頁的目標選擇。

  **v6.15.0 修訂**（issue #868，對應 AC-4.67）：第 2 點第 1 順位之 FR-093 指派自本版起以有效分派名冊 `reviewer_ids - arbiter_ids` 推導。指定仲裁者因不接收新審核單位，對新 `pending` 單位一律不具第 1 順位資格，只能處理依 FR-060 具資格的第 2 順位 `disputed`；非仲裁審核員之優先序不變。issue #824 已黏住給現任仲裁者的歷史單位仍保留原歸屬，不因本段改派。

  **FR-093 v6.15.0 同步修訂**（issue #868，對應 AC-4.63～AC-4.66）：尚未黏住的新審核工作之有效分派名冊為保序集合差 `reviewer_ids - arbiter_ids`；所有指定仲裁者都必須排除，不得只保留第一位或依帳號設例外。既有 sticky 提交仍優先於集合差，即使提交者後來成為仲裁者也不改派，但該人依 FR-060 不得仲裁自己參與的單位。`arbiter_ids = []` 時有效名冊等於完整 `reviewer_ids`；若集合差為空，annotation 必須誠實回傳空分派池，不得把仲裁者偷偷加回，非法設定由 014 FR-010s-1 於儲存時阻擋。清單、工作區、下一個可處理單位與審核負荷必須共用此有效名冊。

  **FR-099 v6.15.0 同步修訂**（issue #868，對應 AC-3.55、AC-3.56、AC-4.67）：未使單位定稿的成功送出仍共用 `findNextActionableReviewUnit()`；但指定仲裁者沒有新 `pending` 指派，故仲裁送出後只在其具 FR-060 資格的 `disputed` 候選中推導。任務中屬於其他 reviewer 的 `pending` 單位不得成為仲裁者目標；`兩者皆非` 使目前單位維持 `disputed` 且無更前候選時，目前單位可再次成為目標，以保留 FR-065 改票能力。非仲裁審核員之 `pending` 優先序不變。

#### Scenario: 保留仲裁者不會被快速入口送進待審單位

- **GIVEN** reviewer C 位於任務 `arbiter_ids`，任務同時有一個指派給 reviewer W 的 `pending` 單位與一個 C 可仲裁的 `disputed` 單位
- **WHEN** 系統為 C 推導下一個可處理單位
- **THEN** 回傳該 `disputed` 單位
- **AND** 不得回傳指派給 W 的 `pending` 單位

#### Scenario: 快速入口以可處理單位為目標

- **GIVEN** 任務同時包含可處理與不可處理的審核單位
- **WHEN** 審核員由快速入口進入工作區
- **THEN** 目標必須由 `findNextActionableReviewUnit()` 依登入身分與既有優先序推導

### Requirement: FR-090 歷程分層遮蔽

- **FR-090**（v4.61.0 新增，對應 AC-4.51，issue #578）：**歷程分層遮蔽**。歷程事件之呈現必須分兩層：事件列（操作者角色與 `actor_id`、時間、`action`）對所有可檢視該樣本者可見；`result_snapshot` 與 `reason` 必須依檢視者角色遮蔽——(1) `role=annotator`：可見自己 `actor_id` 之事件的快照與理由；其他標記員之事件不得進入該檢視者的歷程輸出——**含事件列**（理由是事件列依 FR-016B 承載「對應輸出類型作答摘要」，該摘要即答案內容，僅遮蔽 `result_snapshot` 與 `reason` 仍會經摘要外洩，與 FR-062 相衝突；此處之「標記員不得經任何路徑讀取他人作答內容」為本條**新確立**之規則，正典 v4.60.0 以前並無同名的跨標記員隔離條文可資沿用，其依據為憲章 NON-NEGOTIABLE 之 Data Fairness 與歷程供給層既有以 `identity.annotatorId` 分 bucket 取事件的實作事實）。(2) `role=reviewer`：可見自身審核單位範圍內（同一 `run_id × assignment_id`）全部事件之快照與理由。(3) 具 `can_arbitrate` 之審核員於爭議單位：可見該樣本全部標記員之快照與理由。遮蔽必須於資料供給層完成，不得僅以樣式隱藏——被遮蔽的內容不得存在於該檢視者可取得的呈現輸出中。本條與 FR-062 盲審隔離為疊加關係：一筆事件必須同時通過 FR-062（未提交之審核判斷僅本人可見）與本條，方得呈現其快照與理由。

#### Scenario: AC-4.51 標記員不得經歷程取得他人答案
- **GIVEN** `run_type=dry_run` 之某樣本已有標記員 A 與標記員 B 各自提交
- **WHEN** 標記員 A 檢視該樣本 `歷程` 頁籤
- **THEN** 標記員 B 之事件完全不出現於 A 可取得的任何呈現輸出中——事件列、`result_snapshot` 與 `reason` 皆然
- **AND** reviewer 於 A 與 B 各自的審核單位檢視同一樣本時，兩人之快照與理由皆可見
- **AND** 一筆其他審核員尚未提交之審核草稿事件，即使檢視者為具 `can_arbitrate` 之審核員，仍依 FR-062 完全不納入清單

### Requirement: FR-093 審核指派粒度

- **FR-093**（**v5.0.0 新增**，BREAKING，對應 AC-4.53，issue #596；**v6.11.0 修訂**，對應 AC-4.58、AC-4.59、AC-4.60、AC-4.61，issue #824；**v6.17.0 修訂**，對應 AC-4.70、AC-4.71，issue #921；**v7.1.0 修訂**，對應 AC-4.76 ~ AC-4.79，issue #956；**v7.5.0 修訂**，對應 AC-4.80，issue #1000）：**審核指派粒度**。審核工作必須由系統自動指派，粒度依 `REVIEW_ASSIGNMENT_GRANULARITY` 分流：`dry_run` 以**樣本**為指派單位（同一樣本的多位標記員提交由同一位審核員一併審核，使其得以比對），`official_run` 以**審核單位**（`REVIEW_UNIT_DIMENSIONS`）為指派單位。兩種粒度下，每個指派對象恰有**一位**審核員——不存在同一單位由多人各審一份的情形，因此不存在人數門檻、票數或多數決（`MIN_REVIEWERS_DEFAULT`、`DISPUTE_CONVERGENCE_RULE` 皆已廢止）。指派由系統在被勾選的審核員之間平均分配，不由審核員自行挑單。**明確不存在的規則**：本規格不定義、亦不得實作「審核員不得審核自己標記的資料」——指派不因對象恰為該筆的標記員而排除；非當事人限制**僅**適用於仲裁者（FR-060）。理由：審核員同時是標記員在小型研究團隊中是常態，排除自審會使可指派人數不足而讓任務卡住；而審核者若與標記者為同一人，其 `通過` 只是自我確認，真正的把關落在仲裁（FR-061）與最終例外池（FR-095）兩道出口。（**v6.6.0 釐清**，issue #815，對應 AC-6.12）前述「每個指派對象恰有一位審核員」同樣約束**種子與示範資料**，而非僅約束執行期之指派演算法：一筆在 `rev` 之類的審核結果結構中登錄兩位以上審核員之 `official_run` 種子列，描述的是本資料模型永遠無法產生之狀態，不得存在於示範資料中；該單位若需示範定稿前之第二個判斷，須循 FR-060 之仲裁路徑表達（一位審核員加一位非當事人仲裁者），不得以並列多位審核員表達。（**v6.11.0 修訂**，issue #824，指派之黏住與離冊審核員之可見性，對應 AC-4.58～AC-4.61）：（1）**指派黏住**——一個審核單位一旦存在任一**已儲存的審核提交**，其指派審核員必須恆為該提交者，不得因審核員名冊異動（勾選／取消勾選 `reviewer_ids`）或審核單位集合異動（新單位進入列舉，FR-055）而改派；單位狀態為 `爭議中`（含該判定已被仲裁推翻者）或 `已定稿` 皆不例外；未提交之草稿不造成黏住；同一單位存在多位提交者時（本模型不應產生、示範資料亦禁止之形狀，見前段 v6.6.0 釐清），指派必須以決定性規則取其一，不得依掃描順序浮動。（2）**平均分配之適用範圍**——前文「指派由系統在被勾選的審核員之間平均分配」及 `REVIEW_ASSIGNMENT_GRANULARITY` 所載「任兩位審核員的分派筆數差距不超過 1」自本版起僅約束**尚無已提交審核**之單位所構成的待分配池；已黏住之單位不參與該次分配，亦不計入該差距之判定。理由與 `task-management/014-task-detail` FR-005j 一致——審核員異動時其 `done` 保留為歷史統計，只有 `pending` 退回未指派池；亦與同規格 FR-010f-4「發布後的成員異動不得自動重算既有 assignment」同向。前文平均分配之文字逐字保留為沿革。（3）**`dry_run` 粒度不變**——per_sample 粒度優先於逐單位黏住：同一樣本內任一單位黏住某審核員時，該樣本之**全部**審核單位必須隨之黏住同一位審核員，不得出現同一樣本被拆給兩位審核員的情形。（4）**離冊審核員之唯讀可見**——已不在該任務 `reviewer_ids` 名冊中的審核員，對其持有已提交審核之審核單位必須維持可見：`annotation-list` reviewer 清單（FR-055）與工作區之審核單位導覽（FR-056）必須仍列出該單位，其歷程（FR-050、FR-097）必須仍可開啟；但該審核員不得再對任何審核單位提交審核決策，工作區不得渲染可送出之審核控件（含經鍵盤捷徑之送出路徑，FR-058）。其仲裁者資格不受本條影響，仍依 FR-060 判定；判定順序上，仲裁入口與已定稿唯讀卡（FR-094）皆優先於本條之唯讀呈現。（5）**推導來源**——黏住必須由既有之審核提交推導，不得另存第二份指派資料：正典不定義持久化的指派表，第二份資料一旦與提交歷程不一致即無從裁決；推導不得依任務 ID、樣本 ID 或帳號分流（Generalization-First）。（**v6.17.0 修訂**，issue #921，工作區側之送出指派閘門，對應 AC-4.70、AC-4.71）：前文「不由審核員自行挑單」與「每個審核單位恰有一位指派審核員」此前只由 `annotation-list`（`filterToAssignedUnits()`，issue #824）落實；`annotation-workspace` 從未檢查指派，任一在職審核員皆可在工作區以直接網址開啟他人審核單位並送出決策，造出本條明文禁止的多提交形狀。本版起：（1）審核員以直接網址開啟未指派給自己的審核單位時，工作區必須仍顯示樣本內容（標記員原答案），不得渲染任何可送出的審核控件（含經鍵盤捷徑之送出路徑，FR-058），並必須顯示「本單位未指派給你」之類的明確原因說明；此唯讀呈現與已定稿單位（FR-094）、離冊審核員之唯讀呈現同構，不得實作為完全擋下的無權限頁——真正的存取控管屬於後端職責，非本規格範圍。（2）本點之閘門判定必須晚於仲裁分支與已定稿分支：具仲裁資格者之爭議單位入口，以及已定稿單位之唯讀卡（FR-094），皆優先於本點之唯讀呈現。（3）本點之閘門必須沿用既有之 `getAssignedReviewUnits()` 推導，不得另立第二套指派判定。本版不涵蓋工作區左欄、上一筆／下一筆導覽之指派過濾——該部分列入 issue #956，待該變更落地後另行修訂本條。（**v7.1.0 修訂**，issue #956，工作區左欄／導覽之指派收斂，對應 AC-4.76 ~ AC-4.79）：前段所述之排除自本版起失效。工作區左欄（`ws-sample-item`）與導覽（上一筆／下一筆、送出後自動前進、跳至下一筆待審）之單位列舉，此後只列舉指派給目前審核員的單位，與 `annotation-list` 之 `filterToAssignedUnits()` 同源收斂，兩頁對同一位審核員之單位筆數不再可能給出不同答案。具 FR-060 仲裁資格（`isArbiterCandidate()`）且該單位爭議中者，不受本點過濾排除——鏡射 `annotation-list.html` 之 `arbiterEntry` 判定，理由同構：FR-060 之仲裁入口只給對該單位未提交過審核之非當事人，而非當事人不可能同時是該單位依本條指派之審核員，過濾與仲裁豁免不衝突。本點過濾沿用既有之 `getAssignedReviewUnits()`，不另立第二套指派判定。`getAssignedReviewUnits()`／`getReviewAssignments()` 依位置（round-robin／per-sample 黏著）對其輸入之單位列表進行推導，同一輸入宇宙縮小會使既有消費端的判定位移；既有消費端（如 issue #921 之 `isCurrentUnitAssigned()`）需要完整、未過濾之單位宇宙時，須透過獨立的列舉來源取得，不得以本點過濾後的列舉結果餵入。仲裁送出後之即時可見：具本點仲裁資格之審核員對其目前開啟中的爭議單位送出仲裁裁定後，該單位隨即脫離爭議中，使前段仲裁豁免不再成立；此時該單位仍必須留在該審核員之左欄與導覽，其進度分母不得因此減少——沿用既有 `isArbitrationSubmitted()`（issue #722 進度計數器讀取之同一判定），不得另立第二套「是否已仲裁」判定。（**v7.5.0 修訂**，issue #1000，仲裁者永久黏著，對應 AC-4.80）：前段末句「本點範圍以該審核員仍停留於該單位之當次檢視為限；該審核員切換至其他單位後是否仍看得到該單位不在本點約束範圍內，另案追蹤」自本版起撤銷，改為：具本點仲裁資格之審核員只要曾對某單位送出仲裁裁定（不限是否為目前開啟中之單位、亦不限該次仲裁發生於本版之前或之後），該單位必須恆常出現在該審核員之工作區左欄與導覽，不因其切換至其他單位再切回而消失——與 issue #824／PR #869 已為一般審核員建立之「已審核單位黏住原審核員、離冊審核員維持唯讀可見」可追溯性規則一致。仍必須沿用既有 `isArbitrationSubmitted()`，不得另立第二套「是否已仲裁」判定；`isArbitrationSubmitted()` 之真值只在該審核員曾以自己身分對該單位送出仲裁票時成立，故本點放寬不使任何一般審核員（未曾對該單位送出仲裁票者）之左欄範圍隨之擴大。
**FR-093 v11.0.0 持久化範圍補充（issue #1160）**：上述 (1)～(5) 的提交與完整單位宇宙一律限定同一 `run_id`；Dry per-sample 黏著鍵為 `run_id × dataset_item_id`（014 RunItem 的 canonical 成員，即 dataset-021 的 `dataset_item.id`；來源檔的 id／顯示 sample ID 不保證唯一），Official 為 `run_id × assignment_id`，不同 cycle／run 不互相黏著。正式候選來源為 014 FR-010t 的 run 發布候選快照，未黏住工作只在其中仍具即時 active reviewer membership、矩陣與資源資格且非仲裁者的有效候選間平均分配；無有效候選時維持未指派，不回退到停用者。已提交黏著與責任鏈保留，不能藉停用改派或建立第二份持久化 ReviewAssignment。第 (4) 點離冊唯讀僅適用仍具即時讀取權限的使用者；membership 停用或矩陣撤銷後，下一次讀取／提交／仲裁均依正式授權拒絕，歷史提交與候選快照不得授予權限。prototype 路由與既有兩種 run type 版面維持示範用途。

#### Scenario: 唯一仲裁者不再收到新審核單位

- **GIVEN** 任務 `reviewer_ids = [W, L, C, N]` 且 `arbiter_ids = [C]`
- **WHEN** 系統對尚無提交的審核單位建立自動指派
- **THEN** 新單位只在 W、L、N 間平均分配，C 的新分派數為 0
- **AND** 爭議由 W、L 或 N 的提交產生時，C 仍符合 FR-060 的非當事人條件並可仲裁

#### Scenario: 多位指定仲裁者全部保留

- **GIVEN** `reviewer_ids = [W, L, C, N]` 且 `arbiter_ids = [C, N]`
- **WHEN** 系統建立新指派
- **THEN** 有效分派名冊恰為 `[W, L]`，不得把 N 當作備用審核員加入

#### Scenario: 歷史黏住優先於新角色保留

- **GIVEN** C 過去已對單位 U 提交審核，之後 C 被加入 `arbiter_ids`
- **WHEN** 系統重新推導指派
- **THEN** U 仍指派給 C，不得改寫歷史責任鏈
- **AND** C 對 U 不具仲裁資格，但對自己未參與的其他爭議單位仍可仲裁

#### Scenario: 未指定仲裁者時不縮小審核池

- **GIVEN** `arbiter_ids` 為明確空陣列
- **WHEN** 系統建立新指派
- **THEN** 有效分派名冊等於完整 `reviewer_ids`
- **AND** 系統不得以全域示範名冊偷偷排除任何人

#### Scenario: 失敗的 v4 示範重播不得提交完成 marker

- **GIVEN** 瀏覽器仍有舊版 review-flow demo marker，且 v4 重播任一必要 seed 寫入失敗
- **WHEN** 頁面完成本次 migration 嘗試
- **THEN** 系統不得寫入 v4 完成 marker，亦不得移除舊 marker
- **AND** 下次載入必須重試，只有逐筆驗證 T014～T016 的必要標記提交、審核決策與仲裁票皆存在後，才可寫入 v4 marker 並移除舊 marker

#### Scenario: 試標以樣本為單位指派

- **GIVEN** 一份試標樣本由三位標記員各標一次，任務勾選了兩位審核員
- **WHEN** 系統建立審核指派
- **THEN** 該樣本產生的三個審核單位全部指派給同一位審核員

#### Scenario: 正式標記平均分派且不排除標記員本人

- **GIVEN** `official_run` 有 7 筆樣本、勾選 2 位審核員，其中一位同時是部分樣本的標記員
- **WHEN** 系統建立審核指派
- **THEN** 兩位審核員的分派筆數差距不超過 1
- **AND** 該審核員仍可能被指派到自己標記的樣本，系統不因此排除或重新分派

#### Scenario: 示範種子不得讓多位審核員並行審同一個正式標記單位

- **GIVEN** 任一 `run_type = official_run` 的示範審核單位種子列
- **WHEN** 讀取該列所登錄的審核員集合
- **THEN** 該集合 MUST 恰含一位審核員；含兩位以上者 MUST 視為與本條文直接衝突的失效種子並汰換
- **AND** 該單位若需示範定稿前的第二個判斷，MUST 循 FR-060 的仲裁路徑表達（一位審核員 + 一位非當事人仲裁者），MUST NOT 以並列多位審核員表達

#### Scenario: 已審單位不因名冊異動而改派

- **GIVEN** `official_run` 任務勾選了數位審核員，其中審核員 X 已對某審核單位提交審核
- **WHEN** 專案負責人變更 `reviewer_ids` 勾選（新增或移除一位審核員）後重新列舉指派
- **THEN** 該單位的指派審核員仍為 X
- **AND** 該單位若因仲裁而被推翻判定或已定稿，指派審核員亦仍為 X

#### Scenario: 離冊審核員對其審過的單位唯讀可見

- **GIVEN** 審核員 X 已對某審核單位提交審核，其後被移出該任務的 `reviewer_ids` 名冊
- **WHEN** X 開啟 `annotation-list` reviewer 清單與該單位的工作區
- **THEN** 清單仍列出該單位，工作區導覽仍含該單位，歷程仍可開啟
- **AND** 工作區不渲染任何可送出的審核控件，X 無法再對該單位提交審核決策

#### Scenario: 平均分配只約束尚未被審核的單位

- **GIVEN** `official_run` 共 6 個審核單位，其中 4 個已由同一位審核員提交審核，名冊勾選 3 位審核員
- **WHEN** 系統建立審核指派
- **THEN** 那 4 個單位全部仍指派給該提交者
- **AND** 其餘 2 個單位在 3 位審核員之間分配，該 2 筆的分派差距不超過 1，且 4 個已黏住的單位不計入差距判定

#### Scenario: 試標樣本內任一單位已被審核即整個樣本黏住

- **GIVEN** `dry_run` 某樣本由三位標記員各標一次，審核員 X 已對其中一個單位提交審核
- **WHEN** 系統重新建立審核指派（名冊已異動）
- **THEN** 該樣本的三個審核單位全部指派給 X

#### Scenario: 未指派審核員以直接網址開啟他人單位為唯讀

- **GIVEN** 審核單位 U 依 FR-093 指派給審核員 A，審核員 B 在同一任務的審核員名冊中但未被指派 U
- **WHEN** B 以直接網址開啟 U 的工作區
- **THEN** 畫面仍顯示 U 的標記員原答案（樣本內容）
- **AND** 審核卡不渲染任何可送出的控件，Ctrl/Cmd+Enter 送出捷徑亦不生效
- **AND** 畫面顯示「本單位未指派給你」之類的原因說明

#### Scenario: 指派閘門不擋掉仲裁入口

- **GIVEN** 審核員 C 在該任務的仲裁者名冊中（`arbiter_ids`）且對某爭議單位 U 未提交過審核（具 FR-060 仲裁資格），U 未依 FR-093 指派給 C
- **WHEN** C 開啟 U 的工作區
- **THEN** 渲染仲裁卡與可送出之仲裁控件
- **AND** C 不會看到「本單位未指派給你」的唯讀說明

#### Scenario: 未受派單位不出現在工作區左欄

- **GIVEN** 審核單位 U 依 FR-093 指派給審核員 A，審核員 B 在同一任務的審核員名冊中但未被指派 U，U 目前非爭議中
- **WHEN** B 開啟該任務的工作區
- **THEN** 工作區左欄（`ws-sample-item`）不出現 U
- **AND** 上一筆／下一筆導覽不會走訪到 U

#### Scenario: 受派單位仍出現在工作區左欄，與清單頁一致

- **GIVEN** 審核員 A 依 FR-093 指派到若干審核單位
- **WHEN** A 分別開啟 `annotation-list` 清單頁與工作區
- **THEN** 工作區左欄列出的單位集合與清單頁 `filterToAssignedUnits()` 過濾後列出的單位集合一致
- **AND** 兩頁的單位總數相同

#### Scenario: 仲裁豁免不受左欄過濾影響

- **GIVEN** 審核員 C 在該任務的仲裁者名冊中（`arbiter_ids`）且對某爭議單位 U 未提交過審核（具 FR-060 仲裁資格），U 未依 FR-093 指派給 C
- **WHEN** C 開啟該任務的工作區
- **THEN** 工作區左欄仍出現 U
- **AND** C 選取 U 後渲染仲裁卡與可送出之仲裁控件

#### Scenario: 仲裁送出後,目前開啟中的單位保持可見

- **GIVEN** 審核員 C 具 FR-060 仲裁資格,對目前開啟中的爭議單位 U 送出仲裁裁定
- **WHEN** 裁定送出後 U 之狀態脫離爭議中
- **THEN** C 之工作區左欄仍列出 U
- **AND** C 的進度分母不因此減少
- **AND** C 切換至其他單位後是否仍看得到 U 不在本情境約束範圍內

#### Scenario: 仲裁送出後永久黏著於仲裁者左欄

- **GIVEN** 審核員 C 具 FR-060 仲裁資格,過去（不限本次檢視或先前的檢視）曾對已定稿單位 U 送出仲裁裁定
- **WHEN** C 切換至其他單位後再切回 C 的工作區，或直接重新開啟工作區
- **THEN** U 仍恆常出現在 C 的工作區左欄與導覽，不因 C 不再停留於 U 之當次檢視而消失
- **AND** C 之進度分母包含 U

#### Scenario: 從未仲裁之已定稿單位仍不在仲裁者左欄

- **GIVEN** 審核員 C 具 FR-060 仲裁資格,但從未對已定稿單位 V 送出仲裁裁定，且 V 未依 FR-093 指派給 C
- **WHEN** C 開啟工作區
- **THEN** V 不出現在 C 的工作區左欄與導覽

#### Scenario: 一般審核員之左欄不受本點放寬影響

- **GIVEN** 審核員 B 不具 FR-060 仲裁資格（或具資格但從未對單位 U 送出仲裁裁定），U 未依 FR-093 指派給 B
- **WHEN** B 開啟工作區
- **THEN** U 不出現在 B 的工作區左欄與導覽，B 的左欄範圍仍僅依 FR-093 既有指派範圍列舉

#### Scenario: AC-7.2 停用 reviewer 不取得歷史黏著授權

- **GIVEN** reviewer 已提交並黏住一個單位
- **WHEN** membership 停用或矩陣權限撤銷
- **THEN** 黏著與責任鏈保留，後續讀取、提交與仲裁仍拒絕；不得改派已黏住單位或另存 ReviewAssignment（AC-7.2）

### Requirement: FR-099 審核單位送出後的自動前進

- **FR-099**（**v6.2.0 新增**，對應 AC-3.55、AC-3.56、SC-004Y，issue #719）：**未使單位定稿的審核送出後之自動前進**。`role = reviewer` 於 `annotation-workspace` 完成一次**成功寫入**的送出後，若該次送出**未使該審核單位推導為 `已定稿`**，系統必須自動前進至下一個可處理審核單位。適用兩條送出路徑：審核決策送出（FR-092 之 `approve | modify | bypass` 三向決策）與爭議仲裁送出（FR-061）。使該單位定稿的送出不適用本條之前進，其去向見第 7 點。**第 1 點・目標推導之單一來源**：下一個單位必須由 `findNextActionableReviewUnit(task_id, run_type, reviewer_id)` 取得，其 `REVIEW_UNIT_ACTION_PRIORITY` 優先序、資格判定與候選列舉逐字沿用 FR-073 第 1～3 點。系統不得另立第二套「哪些單位可處理」的判定；亦不得沿用標記端之 `findNextPendingUnit()`——後者所稱「待處理」為「該樣本尚未提交」之二元事實，不含優先序，亦不含 FR-060 之仲裁資格與利益迴避，以之為審核端目標會把審核員送進其無權處理的唯讀單位，正是 FR-073 為 dashboard 入口修掉的同一個缺陷。**第 2 點・前進方式為工作區內切換，不得導頁**：取得目標單位後必須於同一頁面切換至該單位，不得導向 `annotation-workspace` 之新網址。prototype 導頁呈現維度為 `sample_id × annotator_id × run_type`（正式身分仍為 `run_id × assignment_id`）（FR-051、FR-056），故切換必須同時帶入目標單位之 `annotator_id`；缺少該維度時工作區會依 FR-049 回退為預設標記員身分而顯示另一個單位。切換後之網址同步由 FR-057 既有契約承擔，本條不得新增第二個網址寫入點。**第 3 點・方向性刻意不同於標記端**：目標為全體可處理單位中優先序最高者，同順位取列舉順序最前者（FR-073 第 2 點），而非自目前單位往後繞行。因此送出後可能前進至列舉順序在目前單位之前的單位；此為刻意行為。標記端之待處理無優先序故採繞行（FR-022A），審核端之可處理有優先序故採全域最佳；系統不得為了讓兩者「看起來一致」而在審核端加上繞行限制——那會使一個更該優先處理的 `pending` 單位僅因排序在目前單位之前而被跳過。**第 4 點・目標之排除一律由既有資格判定決定，不得以特例達成**：系統不得另加「排除目前單位」之特例判斷；該特例會在單位狀態推導日後變動時與資格判定各說各話，並掩蓋資格判定本身的缺陷。依 FR-073 第 2 點之既有判定，兩條送出路徑的結果**刻意不同**，此差異必須被如實承認而非抹平——(a) **審核決策送出**：送出後該單位或推導為 `已定稿`（不可處理，且依第 7 點不前進），或推導為 `爭議中` 而該審核員已於其上寫入 reviewer 提交、故依 FR-060 第 2 點不具仲裁資格（不可處理），剛送出的單位因而**自然**不會成為目標；(b) **爭議仲裁送出且裁定含「兩者皆非」**：該單位依 FR-061 第 3 點維持 `爭議中` 直到最終例外池（FR-095）收尾，而仲裁狀態依 FR-061 第 4 點不得寫入任何 reviewer bucket，故該仲裁者於 FR-060 第 2 點「查無其 reviewer bucket」之非當事人判定下**仍具仲裁資格**、該單位**仍為可處理**，因此該單位必須仍為合法的前進目標——任務內若無更高優先序之 `pending` 單位，推導結果即為該單位本身，畫面必須停留於其仲裁版面而不得導回清單。此為 FR-065 改票語意（`爭議中` 期間同一仲裁者得改票）的必然結果；系統不得為了讓兩條路徑「看起來一致」而把已投票的仲裁者排除，那等同於在 FR-060 之外私設第三個資格條件。**第 5 點・無可處理項目時的去向**：推導結果為空時必須導向 `annotation-list`（不帶 `sample_id`），且下列兩項必須同時成立——(a) 網址必須經 `buildListReturnUrl()` 這個既有單一 writer 產生，因而保留 FR-081 之檢視狀態四鍵與 FR-049 之身分參數（AC-4.43），系統不得於返回路徑上另立第二個 query 建構器（FR-081 第 3 點）；(b) 網址必須附帶 `notice=no_actionable_review`，觸發 FR-073 第 5 點既有之 `list-no-actionable-notice` 空狀態說明（zh／en 同步）。兩項缺一不可：只保留篩選條件會讓審核員面對一整頁已定稿列而無任何「此任務已無可處理單位」的訊號；只顯示空狀態則會落在未篩選的第 1 頁。系統不得回退為開啟任何已定稿唯讀單位。**第 6 點・未成功寫入的送出不得產生任何導覽**：被 FR-083（每個 outKey 須有一筆決策）、FR-089（`modified`／`bypassed`／`adjudicated` 之理由必填）或工作區既有之空單位與 `已定稿` 守衛擋下而未實際寫入的送出，不得前進，亦不得導頁；畫面必須停留於原單位，使阻擋原因得以呈現。**第 7 點・使單位定稿的送出必須停留於原單位**：一次成功寫入的送出若使該審核單位推導為 `已定稿`（依 FR-051 推導；定稿路徑見 FR-063。本條不得自行列舉哪些逐項決策組合會定稿——該判準完全由 FR-051 決定，任何複述都會隨其演進而失真），系統不得前進、不得導頁，必須就地重渲染為 FR-094 之唯讀定稿卡（`ws-review-finalized-card`）。此非本條新創之例外，而是 AC-3.39 與 FR-053 既有之定稿鎖定契約——「中間狀態不受影響……含促成定稿的那一筆送出本身；仲裁者於現場送出仲裁後，重渲染即落入唯讀結果卡」——本條不得推翻之。理由：定稿卡是該次送出唯一的結果回饋，逕行前進會使審核員無從當場確認自己剛剛定稿了什麼、也無從察覺誤觸；審核員離開已定稿單位的路徑是既有的清單返回入口（FR-081），不由本條接管。**第 8 點・不得硬編任務 ID**（Generalization-First）：前進目標僅得由審核單位狀態與登入審核員身分推導，不得對 T014–T017 或任何任務 ID 分流。本條不改變 FR-022A／FR-022C 與標記端之提交後導覽行為；不改變 FR-060 之仲裁資格條件、FR-061 之仲裁寫入規則、FR-065 之改票語意、AC-3.39／FR-053 之定稿鎖定行為，亦不改變 `REVIEW_UNIT_ACTION_PRIORITY` 之順位定義與 `listReviewUnits()` 之列舉行為。**本版同時修訂 FR-073 第 2 點之第 1 順位**（issue #719，FR-093 缺陷修正）：該順位原未帶指派條件，使審核員被導向他人被指派的 `pending` 單位；修訂後 `findNextActionableReviewUnit()` 之簽章不變而行為改變，FR-073 與本條兩個消費端同步只把依 FR-093 指派予該審核員的 `pending` 單位視為可處理。此為 FR-073 既有缺陷之修正，非本條另立之判定——本條仍不得自立第二套「哪些單位可處理」的判準。

#### Scenario: 仲裁送出後忽略屬於審核員的待審單位

- **GIVEN** reviewer C 是保留仲裁者，正在處理爭議單位 D，且任務另有指派給 reviewer W 的 `pending` 單位 P
- **WHEN** C 對 D 送出 `兩者皆非`，D 仍為 `disputed`
- **THEN** 下一個可處理單位不得是 P
- **AND** 若沒有其他更前的可仲裁爭議，工作區停留於 D

#### Scenario: AC-3.55 未定稿的審核送出成功後自動前進至下一個可處理審核單位

- **GIVEN** `role = reviewer` 進入某任務一個 `待審` 審核單位，且該任務尚有其他 `待審` 單位
- **WHEN** 成功送出一次未使單位定稿的審核決策
- **THEN** 工作區 MUST 於同一頁面切換至 `findNextActionableReviewUnit()` 選出的單位，網址之 `sample_id` 與 `annotator_id` MUST 同步為該單位，且不得發生跳離工作區的導頁
- **AND** 剛送出的單位不得成為切換目標；無可處理單位時返回清單並保留檢視狀態與 `notice=no_actionable_review`
- **AND** 定稿或驗證失敗的送出不得前進

#### Scenario: AC-3.56 仲裁送出共用同一套前進規則

- **GIVEN** `role = reviewer` 且依 FR-060 具仲裁資格，進入某 `爭議中` 單位之仲裁版面
- **WHEN** 成功送出未使單位定稿的仲裁
- **THEN** 前進行為 MUST 與審核送出共用同一個目標推導函式與返回網址建構器
- **AND** 指定仲裁者不得前進至其他 reviewer 的 `pending` 單位；目前單位仍可處理且無更前候選時，畫面 MUST 停留於該仲裁版面
- **AND** 定稿或驗證失敗的仲裁不得產生前進導覽

#### Scenario: SC-004Y 送出後去向的完整性與一致性

- **GIVEN** 一位審核員在同一任務內連續送出，直到該任務已無其可處理單位
- **WHEN** 逐次觀察每次送出後的落點
- **THEN** 被前進到的不可處理單位數 MUST 為 0，定稿送出發生前進或導頁的次數 MUST 為 0
- **AND** 審核與仲裁兩條路徑的目標推導與返回網址建構器 MUST 完全相同，工作區內「哪些單位可處理」的判定實作恰為 1 份
- **AND** 最後返回清單的網址同時含 FR-081 檢視狀態與 `notice=no_actionable_review`，且不含 `sample_id`
