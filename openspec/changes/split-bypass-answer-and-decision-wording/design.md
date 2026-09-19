# 設計：split-bypass-answer-and-decision-wording（issue #811）

## Context

「無法判定」同時承載答案值（`OutputAnswer.bypass`）與決策值（`REVIEW_DECISIONS` 之 `bypass`）。兩者的顯示字串目前散落在 10 個 prototype 產品檔、約 31 處，其中同一概念被重複手寫多次，英文已分裂為多種說法。維護者 2026-09-19 裁定兩套目標語彙，並要求每個概念恰有一個 i18n 來源（proposal.md `## Why`）。

各頁載入順序（已逐頁查證 `<script src>`）：

- `shared/sidebar.js` 是唯一一支在全部頁面都載入、且排在所有頁面設定檔之前的共用腳本。
- `shared/annotation-history.js` 只在 `annotation-workspace.html` 與 `annotation-list.html` 載入。
- `task-config.data.js`／`task-config.engine.js` 在 `annotation-workspace.html`、`task-new.html`、`task-detail.html` 載入，**不在** `annotation-list.html` 載入。

## Goals / Non-Goals

**Goals**：兩套語彙各有一個定義處；所有使用者可見的決策值與答案值標籤都讀自該處；toast 鍵名與文案與正典一致。

**Non-Goals**：不改識別字、資料形狀、行為或版面；不改描述定案結果的「無法判定」（見 Q1）。

## Decisions

### D1：兩套語彙定義於 `shared/sidebar.js`

`shared/sidebar.js` 新增一個常數物件，例如：

```js
var BYPASS_WORDING = {
  zh: { answer: '無法判定 (Bypass)', decision: '無法裁決' },
  en: { answer: 'Unable to determine (Bypass)', decision: 'Cannot adjudicate' },
};
```

經 `window.LabelSuiteSharedSidebar` 匯出（實際屬性名由 Green 實作決定，Red 契約只斷言「畫面文案等於該來源」）。側欄自身的快捷鍵 `B` 說明（`reviewBypass` 與 `:600` 的靜態 fallback）改讀 `decision`。

**為何選側欄**：這是唯一全頁載入且最先載入的共用腳本，所有消費端（含 `annotation-list.html` 這種不載入 `task-config.*` 的頁面）都讀得到。

**否決的替代方案**：

- 另建 `shared/bypass-wording.js`：要在 15 個 HTML 各加一個 `<script>`，產品檔數從 10 暴增到 25，只為放兩組字串。
- 各頁保留字面值、只改內容：直接違反「每個概念恰有一個 i18n 來源」的裁定，且正是今天英文分裂的成因。
- 定義在 `annotation-workspace.config.js`：側欄與 task-detail 讀不到。

**代價**：側欄本身的職責是導覽，現在多承載一組審核語彙。這是務實取捨，維護者若偏好獨立檔案，只影響 D1 的落點，不影響其餘設計。

### D2：消費端一覽

| 概念 | 消費端 | 做法 |
| --- | --- | --- |
| 決策值 | `annotation-workspace.config.js` `reviewBypassLabel`（zh/en） | 由來源取值；`REVIEW_DECISION_LABEL_KEYS`／`TRACE_DECISION_I18N_KEYS` 仍指向此鍵，決策按鈕與 FR-094 微型歷程因而自動跟著改 |
| 決策值 | 仲裁 B 選項 | 刪除 `arbitrationChoiceBBypass`，`arbitrationBChoiceText()` 之 bypass 分支改為 `t('arbitrationChoiceB') + '：' + 決策值`，得 `B・審核員：無法裁決`；與 `modify` 分支同一組字規則 |
| 決策值 | `shared/annotation-history.js` `ACTION_LABEL.bypassed` | 由來源取 zh 值（此表現況只有中文，不在本單擴充英文） |
| 決策值 | `shared/sidebar.js` 快捷鍵 `B` | 見 D1 |
| 決策值 | `task-detail.html` `arHistoryBypass`（zh/en） | 由來源取值 |
| 答案值 | `annotation-workspace.config.js` `BYPASS_LABEL_ZH`／`_EN` | 由來源取值；其文字比對用途（`:495`、`:967`）不變 |
| 答案值 | `annotation-workspace.config.js` `reviewOriginalAnswerBypass` | 由來源取值（現為 `無法判定`／`Cannot determine`，會改成含 `(Bypass)` 的完整答案值） |
| 答案值 | `annotation-list.html` `reviewBypassPill` | 由來源取值（英文由 `Bypassed (cannot determine)` 改為 `Unable to determine (Bypass)`） |
| 答案值 | `task-config.engine.js` 兩處預覽 chip | 由來源取值 |
| 答案值 | `task-config.data.js` `BYPASS_FIELD` | zh `允許` + 答案值（字串不變）；en 見 Q2 |

### D3：敘述句只改字面措辭

以下是提到決策的完整句子，不是標籤，無法由單一常數組字而不犧牲可讀性：工作區 `reviewNote`、`trackBranchDiffering`（改 `修正或無法裁決`／`Modified or cannot adjudicate`）、`task-detail.data.js` 三份示範指引、`dashboard.i18n.js`／`dashboard.html` 的審核步驟說明。這些句子只把決策名改為 `無法裁決`／`cannot adjudicate`。「恰有一個 i18n 來源」適用於**標籤**；句中的決策名改由 Red 契約守住（斷言這些句子不再含 `無法判定`）。

### D4：描述定案結果的「無法判定」保留

FR-061「採 B 即定案為無法判定」、FR-063、FR-095、FR-097 描述的是**定案後的值**：該項最終沒有可採之答案，語意上較接近答案值。本單只改標籤，不改這些描述。見 Q1。

### D5：toast 鍵名採實作、文案採正典

理由見 proposal.md `## Why`。實作只改文案：zh `請填寫以下輸出類型的審核理由：{list}`；en `Please give a review reason for the following output types: {list}`（正典只規定 zh，en 依 zh 對應補上 `review`）。正典 FR-083 與 AC-3.47 的鍵名在 gate 4 改為 `toastReasonRequired`。兩條中「v4.58.0 修訂」「v5.0.0 修訂」的括號段是沿革，逐字保留；新鍵名以 v6.8.0 修訂段寫入。

### D6：分兩個 PR 群組

10 個產品檔超過單一 PR 5 檔上限，拆成兩個各 5 檔的堆疊群組（tasks.md）。群組 1 建立唯一來源並完成審核面全部標籤；群組 2 處理任務設定面的答案值與敘述句，並收尾 gate 4。群組 2 依賴群組 1 的來源。

## Risks / Trade-offs

- **既有回歸斷言大量改寫**：約 17 支測試斷言舊字串（清單見 tasks.md 1.2）。這些是舊裁定下的斷言，由 senior-qa 在 Red 階段同步，而非由 Green 為了轉綠而改。
- **`issue-809` 兩支測試用 contains 比對 `無法判定`**：`reviewOriginalAnswerBypass` 改為 `無法判定 (Bypass)` 後仍會通過，但斷言語意變弱，Red 階段應改為精確比對。
- **仲裁 B 英文組字沿用全形冒號**：`modify` 分支現況即為 `B · Reviewer：{value}`，本單不改此既有組字規則。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 兩套語彙為全域常數，消費端不加任何任務、輸出類型或 `run_type` 分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 不改任何資料可見範圍或揭露時機 |
| **VII. Design Consistency** | 同一概念在所有頁面同字；英文收斂為單一說法 |
| **X. Change Scope Discipline** | 兩個群組各 5 個產品檔（D6） |
| **XX. Source of Truth & Contract Governance** | 每個標籤只在 `shared/sidebar.js` 定義一次（D1） |

## 待裁定問題

- **Q1**：描述定案結果的「無法判定」（D4）是否也改為 `無法裁決`？本提案建議不改：定案值屬於「該項無答案」，改了反而讓「決策」與「結果」再度混用。
- **Q2**：`BYPASS_FIELD` 英文 toggle 文案。建議 `Allow "Unable to determine (Bypass)"`，與 zh `允許無法判定 (Bypass)` 同構（`允許` + 答案值）。若採用，`task-management/013-task-new` FR-003j 的英文引文要在 gate 4 同步（PATCH）。
- **Q3**：D1 的落點（側欄 vs 獨立共用檔）。
- **Q4**：issue #811 於 2026-09-18 追記的答案值目標字串（去掉 `(Bypass)`），與 2026-09-19 裁定不同；本提案依 2026-09-19 裁定，請確認追記已被取代。
