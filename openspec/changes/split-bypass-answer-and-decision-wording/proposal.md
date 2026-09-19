---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #811。「無法判定」一詞同時承載兩個互不相干的概念，畫面上無從區辨：

- **答案值**：標記員對某 outKey 宣告無法作答，資料層為 `OutputAnswer.bypass`，由任務設定 `allow_bypass` 開關控制（`task-management/013-task-new` FR-003j）。
- **決策值**：審核員對某 outKey 的三向決策之一，資料層為 `REVIEW_DECISIONS = approve | modify | bypass` 的 `bypass`（FR-092），落為歷程動作 `bypassed`（FR-086）。

兩者在審核卡上會同時出現：審核員看到標記員的原答案是「無法判定」，自己的決策按鈕也叫「無法判定」；仲裁 B 選項的 `審核員 Bypass（無法判定）` 更把兩個概念的名字疊在同一個標籤裡。issue #810 的仲裁 B 選項誤判即是此混用的下游症狀。

現況另有三處語彙漂移：

1. 同一個決策值在各頁各自手寫（工作區 `reviewBypassLabel`、共用側欄快捷鍵說明 `reviewBypass`、歷程徽章 `ACTION_LABEL.bypassed`、task-detail `arHistoryBypass`、仲裁 `arbitrationChoiceBBypass`），英文已分裂為 `Cannot determine`／`unable to determine`／`undecidable` 三種說法。
2. 答案值同樣重複手寫（工作區 `BYPASS_LABEL_*`、`task-config.engine.js` 兩處行內字面值、清單 `reviewBypassPill`、`BYPASS_FIELD`），清單英文為 `Bypassed (cannot determine)`，與其餘處之 `Unable to determine (Bypass)` 不一致。
3. **toast 鍵名／文案漂移**（issue #818 `## 非目標` 已明列、維護者裁定併入本單）：正典 FR-083 與 AC-3.47 逐字寫 `toastRejectReasonRequired`（`請填寫以下輸出類型的審核理由：{list}`），實作為 `toastReasonRequired`（`請填寫以下輸出類型的理由：{list}`），鍵名與文案兩層皆不一致。

**維護者裁定（2026-09-19，本單依此為準）**：

- 答案值一律顯示為 `無法判定 (Bypass)`／`Unable to determine (Bypass)`，涵蓋任務設定、task-new 預覽 chip、作答／修正面板、清單 pill。
- 決策值一律顯示為 `無法裁決`／`Cannot adjudicate`，涵蓋決策按鈕、歷程事件 `bypassed`、`shared/sidebar.js` 快捷鍵 `B` 說明、仲裁 B 選項。
- 每個概念恰有一個 i18n 來源；側欄快捷鍵說明重用決策按鈕之來源。
- 純措辭變更：不改任何行為、版面與決策集合；FR-014P(2) 不動。

**與 issue #811 追記之差異**：issue 於 2026-09-18 追記的目標字串為答案值去掉 `(Bypass)`（如「允許標記員回報無法判定」）、仲裁 B 為 `B・審核員：無法裁決`。2026-09-19 裁定保留 `無法判定 (Bypass)`，本提案依後者；仲裁 B 選項之組字與追記一致。維護者已於 2026-09-19 確認後者取代追記（design.md 維護者裁定 R4）。

**toast 鍵名採實作、文案採正典（與「一律依正典改實作」之預設不同）**：

- **鍵名保留 `toastReasonRequired`，改正典**。`Reject` 指的是 v5.0.0（issue #596）已移除的退回決策；FR-083 v5.0.0 修訂段本身即要求缺理由文案不得再出現「退回理由」字樣，把一個已不存在的決策名寫回識別字與該條文意旨相反。同一判定的第三類阻擋鍵為 `toastAnswerRequired`（v6.5.0），`toastReasonRequired` 與之命名一致。衍生檢視 FR-083 當時刻意不引用鍵名，正是為了避免擴散這個錯誤識別字。
- **文案採正典 `請填寫以下輸出類型的審核理由：{list}`，改實作**。「審核理由」是 v5.0.0 修訂時刻意寫定的文案，比實作的「理由」更能指明缺的是哪一種理由；此處沒有理由推翻正典。

**不走 Lightweight Path**：產品檔 10 個（遠超 2 個上限）；FR-092 新增「兩個概念各自恰有一個 i18n 來源」的約束屬新增 MUST，非純釐清；且須跨兩份正典（015、013）回寫。

## What Changes

- **修訂 FR-092**：三向決策之中文語彙改為 `通過`／`修正`／`無法裁決`；新增本版修訂段，定義答案值與決策值兩套顯示語彙、各自恰有一個 i18n 來源，並逐一列出兩者的消費面。
- **同步修訂引用決策值文案的既有條文**（僅措辭）：FR-086（`bypassed` 語意與 AC-2.21）、FR-014B（AC-3.51）、FR-051（AC-4.52）、FR-054（快捷鍵 `B` 與 AC-3.54，含側欄快捷鍵總覽重用決策按鈕來源）、FR-061（仲裁 B 選項改為 `B・審核員：無法裁決`，AC-4.54）、FR-016A（AC-3.48、AC-3.53）、FR-064（分支標籤 `修正或無法裁決`，AC-4.55）、FR-070（審核說明第 3 點）、FR-094（微型歷程 `審核 B（無法裁決）`）。
- **修訂 FR-083**：缺理由文案明定鍵名 `toastReasonRequired` 與文案 `請填寫以下輸出類型的審核理由：{list}`（AC-3.47）；判定對象措辭同步為 `無法裁決`。
- **原型實作**（10 個產品檔，分兩個 PR 群組，見 tasks.md）：
  - `shared/sidebar.js` 定義並匯出兩套語彙（唯一來源），其快捷鍵 `B` 說明改讀決策值。
  - 決策值消費端：`shared/annotation-history.js`、`annotation-workspace.config.js`（決策按鈕、仲裁 B 組字、狀態軌分支、審核說明、toast）、`task-detail.html`（`arHistoryBypass`）。
  - 答案值消費端：`annotation-workspace.config.js`（`BYPASS_LABEL_*`、`reviewOriginalAnswerBypass`）、`annotation-list.html`（`reviewBypassPill`）、`task-config.data.js`（`BYPASS_FIELD`）、`task-config.engine.js`（兩處預覽 chip）。
  - 描述決策的敘述句：`task-detail.data.js` 三份示範指引、`dashboard.i18n.js` 與 `dashboard.html` 的審核步驟說明。
- **正典回寫（gate 4）**：015 版號 bump（建議 MINOR 6.7.0 → 6.8.0）與 Changelog 一列；衍生檢視以外的活條文同步措辭；`task-management/013-task-new` FR-003j 之英文 toggle 文案同步（PATCH 8.1.0 → 8.1.1）。

**非目標**：

- 不改 `REVIEW_DECISIONS`、`HISTORY_ACTIONS`、`ARBITRATION_OUTCOMES` 任何識別字，不改資料形狀、送出驗證、狀態推導或版面；FR-014P(2) 不動。
- **描述定案結果的「無法判定」不改**：FR-061「採 B 即定案為無法判定」、FR-063 定稿值「或『無法判定』」、FR-095 `adopt_reviewer`「修正值或『無法判定』」、FR-097「`bypassed` 呈現為『→ 無法判定』」。這些描述的是定案後的值（該項無可採之答案），不是審核員的決策標籤；維護者已於 2026-09-19 裁定維持原措辭（design.md 維護者裁定 R1）。
- 不改 `docs/product/` 下之說明檔（其用語皆為答案值 `無法判定 (Bypass)`，已符合裁定）。
- 不改程式碼註解中提到「無法判定」的說明文字（非使用者可見）。
- 已被取代的條文（如 AC-3.37）、各條文內記錄舊版之修訂段與 Changelog 舊列逐字保留。

## Capabilities

`annotation` — 審核決策與答案值的顯示語彙。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 兩套語彙為全域常數，不含任何任務 ID、輸出類型或 `run_type` 分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 純文案變更，不改任何揭露時機或資料可見範圍 |
| **VI. English-First** | 程式識別字不變；英文文案收斂為單一說法 |
| **X. Change Scope Discipline** | 10 個產品檔拆兩個群組，各 5 檔；見 tasks.md |
| **XX. Source of Truth & Contract Governance** | 每個概念只在 `shared/sidebar.js` 定義一次，其餘消費端讀取、不再手寫副本 |
