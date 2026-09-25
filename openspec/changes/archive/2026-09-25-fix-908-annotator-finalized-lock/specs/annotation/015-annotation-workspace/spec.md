# Spec Delta

## ADDED Requirements

### Requirement: FR-101 標記員定稿鎖定

`official_run` 審核單位一旦依 FR-051 推導為 `已定稿`，且該推導成立之前提——受審標記員存在真實已儲存提交（FR-051 判定式首句：標記員未提交 → 不成立審核單位，推導為 `null`）——已滿足時，該標記員自身之後續寫入 MUST 被鎖定，不得再變更已定稿之作答，亦不得使單位狀態翻回 `爭議中` 或 `待審`。

**範圍限定**：本條僅適用 `official_run`；`dry_run` 因 `submissionBucketKey()` 無 round 維度，本條鎖定範圍 MUST NOT 涵蓋 `dry_run`，試標之後續回合不受影響。

**觸發條件（不得誤觸的邊界）**：本條 MUST NOT 對僅由 FR-044a 示範標記員答案遞補、標記員本人尚無任何真實儲存提交的審核單位觸發鎖定。此類單位之 `getReviewUnitStatus()` 依 FR-051 判定式首句恆推導為 `null`，不成立「已定稿」狀態，本條鎖定天然不觸發；標記員本人之首次提交 MUST 正常送出，不得因該單位已有示範列遞補或既有審核員決策而顯示定稿鎖定提示。本條鎖定判定 MUST 沿用（或等價於）`getReviewUnitStatus()` 既有之判定式，使「存在真實已提交紀錄」這項前提結構性地成立，MUST NOT 另立第二套不要求真實提交存在的判定捷徑（例如直接查詢審核決策記錄或 `REVIEWER_MOCK_ROWS` 遞補列本身是否存在）。

**寫入側守衛**：`markSampleSubmitted()`、`markSampleSaved()`、`appendSampleTimelineEvent()`（`annotation-workspace.data.js`）三個標記員寫入點，於執行寫入前，當呼叫之 `role` 為 `annotator` 時，MUST 先以寫入前（pre-write）狀態呼叫上述判定；判定為 `已定稿` 時，MUST 直接回傳 `false`、MUST NOT 寫入任何欄位、MUST NOT 追加任何歷程事件，既有 bucket 內容維持原狀；未鎖定時 MUST 回傳 `true` 並維持既有寫入行為不變。判定所需之 outKeys MUST 由 `resolveTaskProfile(taskId).outputs`（`annotation-workspace.data.js:51`）內部推導取得，三個函式之既有簽章 MUST NOT 因本條新增參數。審核員或仲裁者之寫入路徑不屬本條範圍（FR-094、AC-3.39 已規範），不受本條三個函式之守衛約束於其 `role` 非 `annotator` 之呼叫。標記員自身促成單位轉為已定稿的那一筆提交，因寫入前狀態尚未轉為已定稿，MUST 正常寫入、不被本條擋下。

**呈現**：鎖定生效時，畫面 MUST 渲染鎖定提示（testid `ws-annotator-finalized-notice`），文案為「此標記結果已定稿，無法再修改或提交」（en: "This annotation is finalized and can no longer be edited or submitted."）；視覺 MUST 沿用 FR-094 唯讀卡之語言慣例，但色階 MUST 採資訊色（`--color-info`／`--color-info-bg`／`--color-info-border`），MUST NOT 沿用 FR-094 之錯誤色——定稿是終態，不是錯誤。作答控制與 跳過／儲存草稿／提交 三個既有控件（`wsSkipBtn`、`wsSaveBtn`、`wsSubmitBtn`）MUST 保留在畫面上並套用原生 `disabled` 屬性與 `aria-disabled="true"`，MUST NOT 自 DOM 移除或隱藏，MUST NOT 以非原生互動元素（例如 `div`）取代原生控件；三者既有觸控高度 MUST NOT 因本條縮減。定稿當下已選定之作答 MUST 維持可辨識，MUST NOT 使已選與未選選項套用相同的視覺結果（例如整排轉灰致無法分辨曾選定何值）。自動儲存狀態列（`ws-autosave-status`）鎖定生效時 MUST 改顯示「已定稿，不再自動儲存」（en: "Finalized — autosave stopped."），MUST NOT 沿用鎖定前之 INITIAL／DIRTY／SAVED 三態文案。

**不引入定稿快照**：本條判定 MUST 沿用 FR-072(3) 既有之讀取時計算、不快取原則，MUST NOT 引入任何持久化之定稿快照欄位。

**不提供解鎖入口**：本條 MUST NOT 新增任何一般解鎖操作；重啟流程（FR-016A 審計理由）延後至後端階段，原型不提供任何解鎖入口。

#### Scenario: AC-2.27 已定稿單位鎖定標記員寫入，示範列 seed 單位不觸發鎖定
- **GIVEN** 一個 `official_run` 審核單位已有標記員之真實已儲存提交且依 FR-051 推導為 `已定稿`
- **WHEN** 該標記員以 annotator 身分重新開啟該單位之工作區
- **THEN** 畫面必須渲染鎖定提示 `ws-annotator-finalized-notice`，`wsSkipBtn`、`wsSaveBtn`、`wsSubmitBtn` 三者皆帶 `disabled` 屬性與 `aria-disabled="true"`，且皆仍存在於 DOM 中
- **AND** 嘗試以既有 `Ctrl/Cmd+S`（儲存）或 `Ctrl/Cmd+Enter`（提交）快捷鍵，皆不得改變該單位之儲存內容或狀態
- **AND** 自動儲存狀態列必須顯示「已定稿，不再自動儲存」
- **AND** 該單位狀態於前後兩次讀取皆維持 `已定稿`，不得因上述任何嘗試翻回 `爭議中` 或 `待審`
- **AND**〔示範列 seed 豁免〕**GIVEN** 另一個 `official_run` 審核單位僅由 FR-044a 示範標記員答案遞補構成一筆審核員已核可決策，該樣本對應之標記員本人尚無任何真實儲存提交，**WHEN** 該標記員以 annotator 身分首次開啟並提交該單位，**THEN** 提交前畫面不得渲染 `ws-annotator-finalized-notice`，三個控件皆不得帶 `disabled` 或 `aria-disabled`；**AND** 該次提交必須正常寫入成功（`markSampleSubmitted()` 回傳 `true`），不得被本條鎖定機制阻擋
- **AND**〔dry_run 不受影響〕同一組資料以 `dry_run` 開啟時，本條鎖定機制不生效，標記員之寫入不受任何額外阻擋

## MODIFIED Requirements

### Requirement: FR-072 審核員任務摘要必須由審核單位狀態推導

**審核員任務摘要必須由審核單位狀態推導**。`annotation-list` 任務資訊卡（FR-007C）與 dashboard 任務卡（012 FR-020）呈現的審核員進度摘要，不得取用任何預先組好的顯示字串，必須由審核單位狀態（FR-051 `REVIEW_UNIT_STATUS` 三態）即時推導：

1. **單一計算來源**：四項計數與覆蓋率的公式集中定義於 `computeReviewSummary(task_id, run_type)`（`annotation-workspace.data.js`），兩個消費端皆讀取同一函式，不得各自重算或各自維護第二套公式。列舉範圍為該任務全部審核單位（`REVIEW_UNIT_DIMENSIONS`＝`sample_id × annotator_id × run_type`，FR-055），與清單資料列同源。**FR-044a 兩個 seed 來源（已儲存提交、示範標記員答案）皆缺之單位不在列舉範圍內**——此即 AC-3.38 空單位閘門與 FR-067 說明列所指之單位，既不計入待審，亦不構成 FR-073 候選（**v6.3.1 釐清**，issue #784）。**v6.10.0 修訂**（issue #792）：列舉範圍含已於本 `run_type` 儲存提交、但無示範標記員列之標記員（FR-055 v6.10.0 修訂段）；草稿不構成審核單位。
2. **公式**：`待審 = status 為 pending 之單位數`；`未定稿 = 總單位數 − status 為 finalized 之單位數`；`爭議 = status 為 disputed 之單位數`；`審核覆蓋率 = round((總單位數 − 待審) ÷ 總單位數 × 100)`，總單位數為 0 時覆蓋率為 0。
3. **重算時機**：推導為讀取時計算、不快取（沿用 FR-051），因此送出通過、送出修正、送出無法裁決、仲裁定案、例外池收尾、未定稿審核單位之標記員重新提交（**v6.19.0 修訂**，issue #908：已定稿單位之標記員寫入依 FR-101 寫入側守衛直接阻擋，不產生任何狀態變更，故本點原列舉之「標記員重新提交」限定為未定稿單位）等任一改變審核單位狀態的操作之後（**v5.0.0 修訂**，issue #596：原列舉之「正式標記退回」隨 FR-014I 移除），重新進入或重新整理清單與 dashboard 皆必須反映最新數值；跨頁往返與 reload 之結果必須一致。
4. **覆蓋率不等於完成率**：審核覆蓋率衡量「已離開待審的單位比例」，達 100% 不代表任務已完成。覆蓋率 100% 而仍有未定稿或爭議單位時，摘要必須同時揭露未定稿與爭議筆數，且該任務不得顯示為已完成（沿用 issue #310 對覆蓋率與完成率的區分）。
5. **顯示文字由計數組成**：顯示字串由 `formatReviewSummary()` 依計數組出（覆蓋率恆顯示；待審／未定稿／爭議僅於大於 0 時顯示；IAA 以結構化數值附加於末），中英文各一份；種子資料不得保留預先組好的摘要字串（**v4.44.0 修訂**，issue #501：IAA 亦已改為由 `computeIaaAlpha()` 推導，見 012 FR-023，故種子連結構化 IAA 數值也不再攜帶；種子僅得宣告無法由審核單位狀態推導之欄位——目標單位、run 別、狀態徽章、審核員身分）。
6. **無審核單位狀態不構成例外**（**v4.44.0 改寫**，issue #501／#529；原文為「無審核單位狀態時之回退」）：摘要**不得**因任務尚無任何已儲存的審核單位狀態而回退至種子值。該情形的推導結果為「全部待審、覆蓋 `0 / n`」，本身即為可陳述的真實狀態；回退反而使任務列顯示與其審核單位列互相矛盾的數字（issue #501 實測：`待審 7 個審核單位 · 任務覆蓋率 34%` 之下十五筆單位列全為待審）。`computeReviewSummary()` 之 `derivable` 旗標維持輸出（仍是公式的正確一環，且供非顯示用途），但**不得有任何顯示端消費者**。**同步生效範圍**：`annotation-list` 任務資訊卡（FR-007C）與 dashboard 任務卡（012 FR-020）兩處消費端須於同一變更移除回退判定，否則同一任務會在兩個畫面得到不同數字。判定與呈現一律不得以任務 ID 白名單分流（Generalization-First）。

本條不改變 FR-051 狀態機、FR-055 清單粒度與 FR-059／FR-061 之爭議推導契約，僅將既有推導結果延伸為任務層級摘要之唯一來源。

#### Scenario: 已定稿單位之標記員寫入不構成重算時機（issue #908）
- **GIVEN** 一個 `official_run` 審核單位已依 FR-051 推導為 `已定稿`
- **WHEN** 該單位對應之標記員嘗試重新提交或儲存草稿，且該寫入依 FR-101 寫入側守衛被擋下（回傳 `false`、未產生任何寫入）
- **THEN** 該單位之審核單位狀態必須維持 `已定稿`，`computeReviewSummary()` 之計數不得因此次被擋下的嘗試而改變
- **AND** 同一任務中另一個 `未定稿`（`待審` 或 `爭議中`）單位之標記員正常重新提交時，其狀態改變仍必須觸發本條既有之讀取時重算，行為與本次修訂前一致
