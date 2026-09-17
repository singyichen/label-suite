# 設計：finalized-card-remaining-cue（issue #766）

## Context

動機見 proposal.md「Why」。以下只記錄實作前必須先定下的技術選擇。

現況中與本變更相關的三個事實：

- **可處理判定只活在「取下一個」裡**：`findNextActionableReviewUnit()`（`design/prototype/pages/annotation/annotation-workspace.data.js:2960`）以 `listReviewUnits()` 之完整列舉建出 FR-093 指派集合，再逐單位呼叫 `reviewUnitActionRank()`（同檔 `:2946`）取最佳者。資料層目前沒有任何「可處理單位有幾個」的函式。
- **歸零措辭只存在於清單頁**：`noActionableReviewTitle`／`noActionableReviewMessage` 定義於 `design/prototype/pages/annotation/annotation-list.html` 之頁內字典（zh `:753-754`、en `:826-827`），由 `renderNoActionableNotice()`（同檔 `:2229`）讀取。工作區有自己的一份頁內字典（`annotation-workspace.config.js` 之 `I18N`，`t()` 於 `:310`），兩頁不共用字典。
- **資料層已有跨頁共用文案的先例**：`REVIEW_SUMMARY_LABELS` 與 `formatReviewSummary()`（`annotation-workspace.data.js:2866`、`:2885`）自 issue #452 起由 `annotation-list.html` 與 `dashboard.js` 共讀，理由正是「文案定義唯一來源、不維護第二套措辭」。兩個頁面皆已載入該資料層（`annotation-list.html:712`、`annotation-workspace.html:1292`）。

## Goals / Non-Goals

**Goals**

- 剩餘量與「取下一個」在程式結構上共用同一份逐單位判定，使 FR-100 第 1 點之「剩餘量為 0 ⇔ 取下一個回傳空值」由構造保證而非由測試碰巧覆蓋。
- 歸零措辭於原始碼中恰有一份定義。

**Non-Goals**

- 不改變 `findNextActionableReviewUnit()` 之簽章與回傳值，不改變 dashboard、清單與 FR-099 前進三個既有消費端之行為。
- 不為剩餘量大於 0 之敘述建立跨頁共用定義——該文案只有工作區一個消費端。
- 不調整 issue #761 之 `computeReviewWorkload()`（見 Risks）。

## Decisions

### D1：抽出「可處理單位清單」為單一判定，取下一個與計數皆由其推導

資料層新增一個回傳「本任務對該審核員可處理之審核單位（含其順位）」之函式，內容即 `findNextActionableReviewUnit()` 現有的指派集合建構與逐單位判定；`findNextActionableReviewUnit()` 改為自該清單挑出順位最小、列舉最前者，工作區以該清單之長度為剩餘量。

- **為何不另寫一個計數函式**：另寫即使今天逐行相同，日後修訂 FR-073 順位（v6.2.0 才剛為第 1 順位補上指派條件）時必須改兩處，漏改一處即出現「卡片說還有 1 個、送出後卻被導回清單」的矛盾。
- **為何不讓工作區反覆呼叫 `findNextActionableReviewUnit()` 計數**：該函式只回傳最佳者，無法計數。
- **為何不沿用 `computeReviewWorkload()` 之 `pending`**：該量為「指派予該審核員且尚未審」之數，不含第 2 順位之可仲裁爭議，且其名冊由呼叫端傳入；以之為剩餘量會讓仲裁者在仍有可仲裁爭議時看到 0。issue #766 裁決所稱「沿用 #761 同一資料來源」於本設計的落點是**同一個列舉來源** `listReviewUnits()`，而非同一個計數結果。

### D2：歸零措辭移入資料層並由兩頁共讀

仿 `REVIEW_SUMMARY_LABELS` 之形態，於資料層新增並匯出一組 zh／en 之歸零標題與說明；`annotation-list.html` 之 `renderNoActionableNotice()` 改讀該定義並移除頁內四個重複鍵，工作區定稿卡讀同一定義。

- **替代方案 A（兩頁各留一份字典鍵＋跨頁逐字相等測試）**：改動較小，但「單一定義」退化為「兩份定義由測試監督」，違反 `.claude/rules/general.md` DRY「共用常數必須有單一來源」；且測試只能抓到已發生的分歧。
- **替代方案 B（新增 `pages/shared/` 檔案）**：兩頁已共同載入資料層，另開共用檔只為兩句文案屬過度抽象。

### D3：回清單連結之網址與 FR-099 第 5 點出口共用同一建構

工作區中 `advanceToNextActionableReviewUnit()`（`annotation-workspace.config.js:4752`）以 `buildListReturnUrl()` 加 `&notice=no_actionable_review` 組出無可處理出口。定稿卡連結必須得出同一網址，實作時將該組合抽為一處供兩者共用，而非於卡片內再串一次字串。

- **為何附 `notice`**：落地清單顯示同一段空狀態說明，使「已無可處理項目」在卡片與清單兩個畫面之間連續，且與 FR-099 第 5 點之落地頁完全一致。替代方案（不附 `notice`，只回到保留篩選之清單）經維護者於 2026-09-17 審閱後不採用。

### D4：連結為錨點元素、位於唯讀說明之後

`issue-596-finalized-card.spec.ts` 之 AC-3.52 守衛斷言卡內除歷程帳號觸發元素外之 `button` 為 0 個，故連結必須為 `<a href>`；放在唯讀說明之後、定稿值之前，使長卡片不需捲動即可見到去向。testid 與樣式類別一律新取，避開 `issue-517-post-submit-cta-removed.spec.ts` 反向斷言之 `ws-post-submit-cta*` 與 `.rv-exits*`。

## Risks / Trade-offs

- **[風險] 第 1 順位含標記員尚未提交之單位（FR-073 第 2 點）**，此類單位受 issue #307 空單位閘門阻擋、審核員實際無法作答，剩餘量可能高於審核員實際能處理之數 → 本變更刻意沿用 FR-073 既有口徑，不另立例外（另立即為第二套判定）；是否調整 FR-073 本身已另立 issue #784 追蹤，不在本變更範圍。
- **[風險] `getAssignedReviewUnits()` 之名冊取自任務 `reviewerIds`、缺值時回退示範名冊，而 `computeReviewWorkload()` 之名冊由 014 呼叫端傳入** → 兩者於同一任務上理應一致，但不在本變更範圍；Red 契約僅以 `findNextActionableReviewUnit()` 為對照基準。
- **[取捨] 每次渲染定稿卡皆完整列舉一次任務之審核單位** → 原型之種子任務規模極小，與 FR-099 前進判定相同成本，可接受；後端實作階段由 API 提供計數時再議。
- **[風險] 移動歸零措辭可能打斷既有清單空狀態測試** → 顯示文字逐字不變，群組回歸須涵蓋 `list-no-actionable-notice` 之既有測試與 dashboard 測試。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | D1 之判定僅讀審核單位狀態、指派與審核員身分，無任務 ID 分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 只揭露該審核員本人可處理之單位數，資格判定沿用 FR-060，不揭露他人答案或其無資格之爭議內容 |
| **X. Change Scope Discipline** | 3 個產品檔案、單一實作群組 |
| **XX. Source of Truth & Contract Governance** | D1 使可處理判定唯一、D2 使歸零措辭唯一 |
