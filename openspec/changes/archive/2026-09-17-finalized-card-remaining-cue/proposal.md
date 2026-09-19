---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #766
基準版本: 015 v6.2.0
目標版本: 015 v6.3.0
---

## Why

FR-099 第 7 點規定：使審核單位定稿的送出必須停留於原單位，並就地重渲染 FR-094 之唯讀定稿卡（`ws-review-finalized-card`）。這條保證了審核員不會被誤帶走，但也讓定稿卡成為審核員／仲裁者在該任務上的**實質終點畫面**——而這張卡只描述「這一個單位怎麼了」，不描述「這一輪還剩什麼、接下來去哪」。

卡片目前依序渲染標題 `審核已定稿`、唯讀說明 `此審核單位已定稿，結果為唯讀。`（`design/prototype/pages/annotation/annotation-workspace.config.js:106-107`，英文於 `:229-230`）、各 outKey 定稿值、已仲裁項之定案列與 FR-094 微型衝突歷程（`renderFinalizedCard()`，同檔 `:4184`）。審核路徑與仲裁路徑共用同一張卡，全程沒有任何剩餘量或去向敘述。issue #720 複驗時確認：仲裁者把最後一個爭議單位定稿後，畫面停在這張卡上；而 `advanceToNextActionableReviewUnit()`（同檔 `:4752`）對已定稿單位於第一行即 return，故此缺口無法靠導覽補，只能補在卡上。

對照之下，未定稿的送出走到無可處理單位時，FR-099 第 5 點會導回清單並顯示 `list-no-actionable-notice`，其措辭 `noActionableReviewTitle`／`noActionableReviewMessage`（`design/prototype/pages/annotation/annotation-list.html:753-754`，英文於 `:826-827`）明確交代了「為什麼沒東西了」。同一件事——「你在這個任務上已無可處理項目」——目前只有一條路徑說得出來。

維護者於 2026-09-16 裁定採 issue #766 之方向 1：定稿卡加一行推導出來的剩餘量敘述，歸零時提供回清單的明確行動點；剩餘量必須推導、不得新增計數欄位或快取，歸零措辭必須與 `annotation-list.html:753-754` 對齊、不得另創第三種講法；不採方向 2（依角色分流措辭）。

## What Changes

- 新增 **FR-100**：定稿卡渲染一行**本任務剩餘可處理量**敘述，對象為目前檢視的審核員身分與 `run_type`。
  - **剩餘量之定義**：本任務中依 FR-073 第 2 點對該審核員判為可處理（第 1 或第 2 順位）之審核單位數。此判定 MUST 與 `findNextActionableReviewUnit()` 共用同一份逐單位判定，因而恆有「剩餘量為 0 ⇔ `findNextActionableReviewUnit()` 回傳 null」；MUST NOT 另立第二套計數，MUST NOT 新增任何儲存的計數欄位或快取，MUST NOT 以頂部進度 `我的審核提交 {done} / {total}`（`wsProgressTextReview`，`annotation-workspace.config.js:33`）相減得出——該進度之分母是本人提交數而非可處理量，兩者不是同一個量。
  - **大於 0 時**：顯示含數字的敘述，不提供任何行動點（麵包屑第 2 層已是既有返回路徑）。
  - **歸零時**：標題與說明 MUST 與 `list-no-actionable-notice` 逐字相同（zh／en 皆然），並提供一個回清單連結；連結目標與 FR-099 第 5 點之無可處理出口為同一網址——經 `buildListReturnUrl()` 產生並附 `notice=no_actionable_review`。
  - **措辭單一來源**：歸零時的標題與說明文字改為單一定義、由 `annotation-list` 與工作區兩個消費端共讀，使兩處在結構上不可能分歧（沿用 `REVIEW_SUMMARY_LABELS` 於 issue #452 為清單與 dashboard 建立的同一形態）。
- FR-100 自述其與既有條文之**邊界**：
  - **FR-099 第 7 點不變**：使單位定稿的送出仍停留於原單位、不前進、不導頁；本條只在停下來之後的畫面上**新增內容**，回清單連結須由審核員主動點擊。
  - **FR-094 之純文字約束不變**：回清單連結是導覽連結，不是決策、修正或送出控件，亦非作答面板；卡內 MUST NOT 因本條新增任何 `button`（AC-3.52 既有守衛），故連結 MUST 為錨點元素。
  - **與已撤銷之 FR-082（v4.40.0，issue #517）的界線**：FR-082 為三個出口（下一個可處理單位／返回審核清單／返回 Dashboard）的出口卡，因與麵包屑、左欄清單重複而撤銷。本條僅提供**一個**出口、**僅於歸零時**出現，且其存在理由是「宣告本任務已無可處理項目」這個麵包屑無法表達的資訊；MUST NOT 提供「下一個可處理單位」或「返回 Dashboard」出口，MUST NOT 重用 FR-082 之任何已撤銷 testid 或樣式類別。
  - **不依角色分流措辭**：審核員與仲裁者看到同一句結構、只是數字不同（issue #766 方向 2 不採用）。
- 新增 **AC-3.57**（剩餘量敘述之推導與兩種呈現）、**AC-3.58**（歸零連結之目標與既有守衛之維持）、**SC-004Z**。
- **不改變**的範圍：FR-073、FR-094、FR-099 條文一字不動；`findNextActionableReviewUnit()` 之簽章與回傳值不變；`advanceToNextActionableReviewUnit()` 之行為不變；`list-no-actionable-notice` 之 testid、觸發條件與顯示文字不變（僅文字定義之所在位置改變）；不觸及任何 API 契約或 DB schema。

## Capabilities

### New Capabilities

無。本變更不新增能力邊界，只在既有唯讀定稿卡上補上一行推導資訊與一個既有返回網址的入口。

### Modified Capabilities

- `annotation/015-annotation-workspace`：唯讀定稿卡新增本任務剩餘可處理量敘述，歸零時以與清單空狀態逐字相同之措辭說明並提供回清單連結。

## Impact

| 原型程式檔案 | 影響 |
| --- | --- |
| `design/prototype/pages/annotation/annotation-workspace.data.js` | 將逐單位可處理判定抽為可同時供「取下一個」與「計數」使用的單一來源；新增歸零措辭之單一定義並匯出 |
| `design/prototype/pages/annotation/annotation-list.html` | `renderNoActionableNotice()` 改讀共用措辭定義，移除本頁 zh／en 各兩個重複鍵；觸發條件與 testid 不變 |
| `design/prototype/pages/annotation/annotation-workspace.config.js` | `renderFinalizedCard()` 渲染剩餘量敘述與歸零連結；新增大於 0 時之敘述文案與連結文字（zh／en） |

- 手寫產品檔案共 3 個，預估 diff 遠低於 300 行，未達憲章原則 X 之 5 檔／300 行上限，故以單一實作群組交付，propose、apply 與 archive 同一 PR（ADR-033 Rule 1 之預設形態）。
- 本變更新增 FR／AC，**不適用 Lightweight Path**。
- 產品原型檔案有變更，`design/system/screen-inventory.md` 須以 `node scripts/gen-screen-inventory.mjs` 重生並獨立提交。
- **排程**：依 2026-09-16 盤點，本 change 為 W2 第一棒、先於 issue #583；兩者檔案不相交，但同搶正典 015 之 Changelog 與版號，須堆疊而非並行——#583 之 archive 須於本 change 合併後重新計算版號。
- 不影響 API 契約、DB schema、後端、`frontend/**` 或任何相依套件；不影響 dashboard `快速審核`（FR-073 第一個消費端）之行為。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **I. Spec-First** | 行為變更先由本 change 的 delta 定義 FR-100，實作任務逐項回溯 FR／AC／SC |
| **II. Generalization-First（NON-NEGOTIABLE）** | 剩餘量僅由審核單位狀態與登入審核員身分推導，不對任何任務 ID 或角色分流；沿用 FR-073 既有判定，不新增逐任務分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 本條只揭露「該審核員自己可處理的單位數」這個他從清單或 dashboard 本就可得的量，不揭露他人答案、他人審核結果或其無資格之爭議內容；FR-060 盲審與利益迴避由既有資格判定承擔 |
| **IV. Test-First** | 三個可觀察行為各為一組 Red（`[@senior-qa]`）＋ Green 配對，Red 先提交並留下預期失敗證據 |
| **X. Change Scope Discipline** | 3 個產品檔案、單一實作群組，propose／apply／archive 同 PR |
| **XX. Source of Truth & Contract Governance** | `specs/annotation/015-annotation-workspace/spec.md` 為唯一正典；歸零措辭改為單一定義，消除兩頁各自持有同一句話的漂移風險 |
