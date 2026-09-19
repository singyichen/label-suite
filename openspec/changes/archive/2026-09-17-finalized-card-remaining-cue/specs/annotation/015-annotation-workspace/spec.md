# Annotation List + Workspace — 定稿卡之本任務剩餘可處理量與歸零去向（issue #766）

## Purpose

本 delta 於 FR-094 之唯讀定稿卡（`ws-review-finalized-card`）新增一行推導而得的本任務剩餘可處理量敘述，並於歸零時以與 `annotation-list` 之 `list-no-actionable-notice` 逐字相同的措辭說明、提供一個回清單連結。FR-099 第 7 點「使單位定稿的送出停留於原單位」與 FR-094「卡片內容為純文字」兩項既有保證皆不變：本 delta 只在停留後的畫面上新增內容，不改變任何導覽時機，亦不在卡內新增任何決策、修正或送出控件。本 delta 不修訂 FR-073、FR-094、FR-099 條文本身。

## ADDED Requirements

### Requirement: FR-100 定稿卡之本任務剩餘可處理量與歸零去向

**FR-100**（本版新增，對應 AC-3.57、AC-3.58、SC-004Z，issue #766）：**唯讀定稿卡必須說明該審核員在本任務上還剩多少可處理單位，並於歸零時提供回清單的去向**。

`role = reviewer` 之工作區渲染 FR-094 之唯讀定稿卡時，卡上 MUST 渲染一段**剩餘量敘述**（testid `ws-finalized-remaining`），位置在唯讀說明之後、第一個 outKey 定稿值之前。本條適用於一切會渲染該卡的情形——開啟一個已定稿單位、FR-099 第 7 點之定稿後就地重渲染、以及語言切換後之重繪——不限於送出之後。

1. **剩餘量之定義與單一判定來源**：剩餘量為本任務、本 `run_type` 中，依 FR-073 第 2 點對**目前登入之審核員身分**判為可處理（第 1 或第 2 順位）之審核單位數；候選列舉沿用 FR-073 第 1 點。此判定 MUST 與 `findNextActionableReviewUnit()` 共用同一份逐單位判定，使兩者對「哪些單位可處理」不可能給出不同答案——恆有「剩餘量為 0 ⇔ `findNextActionableReviewUnit()` 對同一任務、`run_type` 與審核員回傳空值」。系統 MUST NOT 另立第二套計數公式；MUST NOT 新增任何儲存的計數欄位、計數快取或計數狀態（沿用 issue #761 之推導先例）；MUST NOT 由頂部進度 `我的審核提交 {done} / {total}` 相減或換算得出——該進度計的是本人提交數，與可處理量不是同一個量。目前檢視中的已定稿單位依 FR-073 第 2 點本即不可處理，MUST NOT 以任何特例額外排除或納入。

2. **剩餘量大於 0 時**：敘述 MUST 寫出剩餘量之數字（zh／en 同步），MUST NOT 渲染任何連結或其他行動點——回到清單的既有路徑為 FR-080 麵包屑第 2 層，本條不重複之。

3. **剩餘量為 0 時之措辭**：敘述 MUST 由一個標題（testid `ws-finalized-remaining-title`）與一段說明（testid `ws-finalized-remaining-message`）組成，兩者文字 MUST 分別與 `annotation-list` 之 `list-no-actionable-notice`（FR-073 第 5 點）所顯示的標題與說明**逐字相同**，zh 與 en 皆然。系統 MUST NOT 為定稿卡另寫一套「已無可處理項目」的措辭，亦 MUST NOT 依角色（審核員／仲裁者）或依剩餘可處理單位之類型分流措辭。該組措辭 MUST 只有一份定義、由兩個消費端共讀，使兩處不可能因只改其中一處而分歧。

4. **剩餘量為 0 時之回清單連結**：敘述 MUST 另含一個回清單連結（testid `ws-finalized-back-to-list`），其目標網址 MUST 與 FR-099 第 5 點之無可處理出口相同：經 `buildListReturnUrl()` 產生（保留 FR-081 之檢視狀態鍵與 FR-049 之身分參數，MUST NOT 另立第二個 query 建構器），並附帶 `notice=no_actionable_review`，MUST NOT 帶 `sample_id`。該連結 MUST 為導覽用之錨點元素，MUST NOT 為 `button`、表單控件或以腳本攔截點擊後再導頁之元素。

5. **與 FR-099 第 7 點之邊界**：本條不改變使單位定稿的送出之去向——該送出 MUST 仍停留於原單位、MUST NOT 前進、MUST NOT 自動導頁；剩餘量為 0 時亦同，回清單連結 MUST 僅於審核員主動點擊時導頁。本條只補上 FR-099 第 7 點未規範的卡片內容；FR-099 第 7 點所稱「審核員離開已定稿單位的路徑是既有的清單返回入口（FR-081）」仍成立——本條之連結以同一個返回網址建構器產生，是同一入口的另一個觸及點，而非第二套返回路徑。

6. **與 FR-094 之邊界**：FR-094 之純文字約束不變。剩餘量敘述為純文字；歸零時之回清單連結為導覽，不是決策控件、修正控件或送出按鈕，亦非作答面板。卡內 `button` 之數量 MUST NOT 因本條增加。

7. **與已撤銷之 FR-082 之邊界**：FR-082（v4.40.0 撤銷，issue #517）之出口卡提供「下一個可處理單位」「返回審核清單」「返回 Dashboard」三個出口，因三者皆與既有導覽重複而撤銷。本條與之不同處在於：出口數恰為 1、僅於剩餘量為 0 時出現、且其存在理由是「宣告本任務對該審核員已無可處理項目」這項麵包屑無法表達的資訊。系統 MUST NOT 於定稿卡提供「下一個可處理單位」或「返回 Dashboard」出口，MUST NOT 重用 FR-082 之任何已撤銷 testid 或樣式類別。

8. **不得硬編任務 ID**（Generalization-First）：剩餘量僅得由審核單位狀態與登入審核員身分推導，MUST NOT 對 T014–T017 或任何任務 ID 分流。

本條不改變 FR-073 之列舉、優先序與資格判定，不改變 FR-094 之卡片既有內容與純文字約束，不改變 FR-099 任一點之導覽行為，亦不改變 `list-no-actionable-notice` 之 testid、觸發條件與顯示文字；`findNextActionableReviewUnit()` 之簽章與回傳值不變。

#### Scenario: AC-3.57 定稿卡依推導之剩餘量呈現兩種敘述
- **GIVEN** `role = reviewer` 開啟某任務一個 `已定稿` 審核單位，而依 FR-073 第 2 點該審核員於本任務、本 `run_type` 尚有 N 個可處理單位（N > 0）
- **WHEN** 定稿卡渲染完成
- **THEN** `ws-finalized-remaining` MUST 恰為 1 個，位於唯讀說明之後、第一個 outKey 定稿值之前，其文字 MUST 含數字 N
- **AND** 卡內 `ws-finalized-back-to-list` MUST 為 0 個，`ws-finalized-remaining-title` 與 `ws-finalized-remaining-message` MUST 為 0 個
- **AND** 同一頁面上 `findNextActionableReviewUnit()` 對同一任務、`run_type` 與審核員 MUST 回傳非空值
- **AND** 以不同審核員身分開啟同一已定稿單位時，敘述之數字 MUST 依該身分之可處理量推導，MUST NOT 沿用前一身分之結果
- **AND**〔歸零〕同一審核員於本任務已無可處理單位（`findNextActionableReviewUnit()` 回傳空值）時，`ws-finalized-remaining-title` 與 `ws-finalized-remaining-message` 之文字 MUST 分別與 `annotation-list` 於 `notice=no_actionable_review` 下渲染之 `list-no-actionable-notice` 標題與說明逐字相同，且 `ws-finalized-back-to-list` MUST 恰為 1 個
- **AND**〔語言〕切換為 en 後重繪，上述逐字相同之關係 MUST 於 en 仍成立
- **AND**〔送出後即時〕仲裁者送出使其最後一個可處理爭議單位定稿後，就地重渲染之定稿卡 MUST 直接呈現歸零敘述，MUST NOT 需要重新整理才更新

#### Scenario: AC-3.58 歸零連結之目標與既有保證之維持
- **GIVEN** `role = reviewer` 於帶有 FR-081 檢視狀態鍵（如 `status`、`q`）與身分參數之工作區網址，開啟一個剩餘量為 0 的定稿卡
- **WHEN** 點擊 `ws-finalized-back-to-list`
- **THEN** 該次導頁所請求之網址 MUST 同時帶有送出前的 FR-081 檢視狀態鍵、FR-049 身分參數與 `notice=no_actionable_review`，MUST NOT 帶 `sample_id`，且落地頁 MUST 渲染 `list-no-actionable-notice`
- **AND** `ws-finalized-back-to-list` MUST 為錨點元素，卡內 `button` 之數量 MUST 與本條新增前相同（AC-3.52、FR-100 第 6 點）
- **AND**〔不自動導頁〕使單位定稿而剩餘量為 0 之送出後，在未點擊連結前 MUST 停留於原單位、MUST NOT 發生任何導頁，`ws-review-finalized-card` MUST 恰為 1 個（FR-099 第 7 點、AC-3.55、AC-3.56）
- **AND**〔已撤銷出口不復活〕頁面上 FR-082 之已撤銷 testid（`ws-post-submit-cta` 及其子項）與 `.rv-exits` 類別 MUST 為 0 個，卡內 MUST NOT 出現「下一個可處理單位」或「返回 Dashboard」出口

#### Scenario: SC-004Z 剩餘量與清單空狀態之一致性
- **GIVEN** 審核員與仲裁者於同一任務內逐一處理可處理單位，直到該身分已無可處理單位
- **WHEN** 逐次觀察每次渲染之定稿卡，並對照同一時點之 `findNextActionableReviewUnit()` 結果與 `list-no-actionable-notice`
- **THEN** 定稿卡剩餘量為 0 與 `findNextActionableReviewUnit()` 回傳空值兩者不一致的次數 MUST 為 0
- **AND** 定稿卡歸零措辭與清單空狀態措辭不一致之語言數 MUST 為 0，該組措辭於原型原始碼中之定義 MUST 恰為 1 份
- **AND** 為產生剩餘量而新增之儲存欄位或計數快取 MUST 為 0 個，工作區與資料層中「哪些單位可處理」的判定實作 MUST 恰為 1 份
