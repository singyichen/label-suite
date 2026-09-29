---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1053
基準版本: 8.1.0
目標版本: 9.0.0
---

## Why

`role=reviewer` 的審核員對某審核單位提交過審核決策（`decisions`／修正值／理由皆已寫入）後，若該單位因與其他審核意見不一致而進入 `爭議中`，這位**當事審核員**（非仲裁者，即 `isArbiterCandidate()` 為 `false`）重新開啟工作區時，畫面與「這筆單位我還沒審過」完全相同：直接修正面板回填**標記員原答案**而非審核員自己的修正值、三顆決策鈕（通過／修正／無法裁決）皆未選取、裁定理由欄空白，且「送出審核」可直接按下。頂端進度條雖已把這筆算進「已提交」，畫面卻毫無反映，誤按送出會無聲覆寫審核員自己原本已送出的決策與理由。

根因兩處（維護者已實測確認；`reviewUnitBlockReason()`／`seedReviewRow()` 行號為修法前狀態，經 Source-Verify 覆核已隨本 change 自身之新增內容位移，見下方 Impact 段落之修法後行號）：修法前，`reviewUnitBlockReason()`（`design/prototype/pages/annotation/annotation-workspace.config.js`）唯一攔截爭議中單位的分支是 `ARBITRATION`（僅適用具仲裁資格者，即 `isArbiterCandidate()`，`annotation-workspace.data.js:2579`，行號未變），當事審核員恆落回函式尾端 `return null`（互動版面）；即使補上攔截，`seedReviewRow()` 也無條件以呼叫端傳入的 `submission`（標記員提交）播種修正面板，從未檢查審核員自己是否已有一筆不同的提交——這正是修正面板回填 `neutral`（標記員原答案）而非 `positive`（審核員修正值）的直接原因。

維護者已確認採用方案 A（唯讀摘要 ＋ 明確改判入口），本 change 依方案 A 落地。

**分類判定：不符 Lightweight Path，走完整 OpenSpec change flow**——本變更新增 FR（FR-103）與 AC（AC-4.81、AC-4.82），非僅澄清既有條文。

**分級追加為 MAJOR（issue #1053 checkpoint，2026-09-29 維護者裁示，方案 A）**：主 session 初版判定為 MINOR（新增 FR/AC，未動既有條文），經覆核發現不成立——FR-103「MUST NOT 再落回 FR-053 之互動審核卡」與正典 **FR-061**（`specs/annotation/015-annotation-workspace/spec.md:828`，「條件不成立時維持 FR-053 審核卡」）及 **AC-4.22**（同檔 `:584`，「當事審核員…皆維持 FR-053 審核卡，不得出現仲裁版面」）之字面直接牴觸：對「當事審核員、單位爭議中」這個交集情境，FR-103 要求渲染唯讀摘要，FR-061／AC-4.22 原文卻要求渲染 FR-053 互動卡。維護者裁示採方案 A——承認此為推翻，本 change 之 `## MODIFIED Requirements` 對 FR-061、AC-4.22 各加一則「當事審核員於該單位已有自己的提交時，改適用 FR-103」的例外子句，兩條原有「不得出現仲裁版面」之語意逐字保留。**經查證，AC-3.39（「未達門檻單位的其餘審核員仍可正常送出」）之「其餘」天然不含已提交的當事人，不構成第三處衝突，不修訂；FR-094、FR-101 同理不動**——MAJOR 範圍僅限 FR-061、AC-4.22 兩條。比照本 repo 既定規則「推翻既有 FR/AC 文字＝MAJOR」，版本改判為 **9.0.0**（原判定 8.2.0 作廢）。

**追加範圍：寫入側殘留路徑守衛（同一裁示追加，非另一目的）**：主 session 進一步查證 `markSampleSubmitted()`（`annotation-workspace.data.js:420-424`）之寫入鎖僅檢查 `role === 'annotator'`，reviewer 角色寫入路徑無守衛；寫入為整筆覆寫 `answers`（含 `decisions`／`reasons`），而 `getReviewUnitStatus()`／`getDisputeItems()` 正是讀取該欄位推導單位狀態。FR-103 目前只在呈現層隱藏送出控件，若當事審核員經殘留呼叫路徑（如快捷鍵）重新送出，會無聲抹除自己原先造成爭議的決策，使一個仍待仲裁的單位被單方面消解出爭議池——此為方案 A 急迫性高於初版描述之處。維護者裁示於 FR-103 內新增 `handleReviewSubmit()` 進入時第三道守衛（比照既有 issue #307／#308 兩道守衛之寫法），新增 **AC-4.82**；同時**明確排除**「仲裁進行中（爭議項已有 `votes[]`）是否應阻止當事人改判」——維護者裁定該為另一未定之產品問題，不在本 change 範圍，不得順帶實作。此追加與唯讀摘要呈現層是同一缺陷（「當事審核員重入爭議中單位」）在呈現層與寫入層的兩面，仍是單一目的，不拆分。

**單一目的判斷**：單一句描述——「當事審核員重入自己已送出的爭議中審核單位時，呈現層預設顯示唯讀摘要、寫入層阻擋殘留路徑覆寫，取代可誤觸送出並無聲覆寫的空白審核卡」。不拆分。

## What Changes

- 新增 `REVIEW_UNIT_BLOCK.SUBMITTED_DISPUTED`：`reviewUnitBlockReason()` 在既有 `ARBITRATION` 分支之後，新增判定「單位為爭議中，且當前審核員在此單位已有自己的 `reviewer` 提交（`getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 非空）」時回傳此值，不改變既有 `ARBITRATION`／`FINALIZED`／`OFF_ROSTER`／`NOT_ASSIGNED`／`EMPTY` 分支的判定順序與行為。
- 新增唯讀摘要渲染（比照 `renderFinalizedCard()` 的 `.rv-finalized-summary` 語彙）：預設呈現審核員自己送出的決策、修正值與裁定理由，逐項顯示標記員原答案對照，內容須與 `getSubmission()` 的實際回傳值一致；「送出審核」（`ws-review-submit-btn`）於此模式下不可見／不可觸發（隱藏而非僅視覺遮蔽，避免 `Ctrl/Cmd+Enter` 快捷鍵可繞過）。
- 新增「修改我的審核」次要按鈕：按下後切換為既有可編輯的 FR-053 審核卡，修正面板改以**審核員自己的提交值**播種（而非標記員原答案）；`seedReviewRow()` 補一個可選的播種來源參數／新呼叫路徑以支援此路徑，既有無條件呼叫（互動分支之 `submission = getAnnotatorSubmission()`）行為不變。
- 新增「取消，維持原決策」按鈕：退回唯讀摘要，不寫入任何變更。
- 新增 i18n 鍵（zh／en 成對）：`reviewSubmittedTitle`、`reviewSubmittedNote`、`reviewSubmittedDecisionLabel`、`reviewSubmittedValueLabel`、`reviewEditMyDecisionBtn`、`reviewCancelEditBtn`。
- 新增 `handleReviewSubmit()` 第三道進入時守衛：`DISPUTED` AND 當前審核員已有自己的提交 AND 畫面不在「修改我的審核」編輯態 → 直接 `return`，不寫入、不追加歷程事件；不阻擋改判入口本身的正常送出。
- **修訂 FR-061**（正典 `:828`）與 **AC-4.22**（正典 `:584`）：各加一則「當事審核員於該單位已有自己的提交時，改適用 FR-103」的例外子句；兩條原有「不得出現仲裁版面」之語意逐字保留，仲裁者本人視角不受影響。
- **不得更動**：`FINALIZED`（issue #308）分支的行為；`ARBITRATION`（FR-061）分支僅新增排除當事審核員的例外，仲裁者本人（`isArbiterCandidate()` 為真者）視角逐字不變；三分支互斥。
- **明確不做**：不判定、不阻擋「爭議項已有仲裁者 `votes[]` 時是否應限制當事人改判」——另一未定之產品問題，維護者裁定不在本 change 範圍。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `annotation/015-annotation-workspace`：新增 FR-103（審核員重入自己已提交、爭議中審核單位時的唯讀摘要、明確改判入口、寫入側殘留路徑守衛），新增 AC-4.81、AC-4.82；修訂 FR-061、AC-4.22（各加一則排除當事審核員的例外子句）。

### Removed Capabilities

無。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`reviewUnitBlockReason()`（`:3929`）新增一個分支（`ARBITRATION` 分支 `return` 於 `:3935`）、新增渲染函式（仿 `renderFinalizedCard()`，`:4945`）、`seedReviewRow()`（`:3733`）新增可選播種來源、`renderReviewerWorkspace()` 呼叫入口新增一個 `blockReason` 分支、`handleReviewSubmit()` 新增第三道進入時守衛（比照既有 issue #307／#308 兩道寫法，緊接 `:5903` 之 FINALIZED 守衛之後）。上列行號為 commit `e04c624e`（本 change 最終生產碼狀態）之實際行號，供 Source-Verify 逐一核對。
- i18n 新增鍵（zh／en 成對），實際檔案位置以實作時該檔案現況為準（i18n 鍵目前與其他 workspace 字串同置於 `annotation-workspace.config.js` 內）。
- `specs/annotation/015-annotation-workspace/spec.md`：新增 FR-103、AC-4.81、AC-4.82；修訂 FR-061、AC-4.22；版本 8.1.0 → **9.0.0**（**MAJOR**，推翻既有 FR/AC 文字），Changelog 新增一列。
- **不受影響**：`annotation-workspace.data.js` 之 `getSubmission()`／`isArbiterCandidate()`／`isRosterReviewer()` 等既有資料層函式皆重用、不新增或修改；不涉及任何 API 契約或資料庫 schema 變更（純前端原型畫面行為）；不影響標記員視角、`FINALIZED`、`OFF_ROSTER`、`NOT_ASSIGNED`、`EMPTY` 分支；不影響 AC-3.39、FR-094、FR-101（經查證不受本次修訂觸及）。
- **對照組（須逐字不變）**：`T016 / official_run / ofm-03-awaiting-arbitration × kioleemg12`（reviewer_chen 為仲裁者，走 ARBITRATION 版面——仲裁者本人視角不受 FR-061／AC-4.22 例外子句影響）。

## 正典回寫逐字文本（Gate 4 預先記錄，`/opsx:archive` 時逐字採用，不得改寫）

**背景**：本 change 之 `## MODIFIED Requirements`（delta 檔）是為了比對衍生檢視 `openspec/specs/annotation/015-annotation-workspace/spec.md` 之既有標題與精簡內文而寫（其 FR-061 標題為 `### Requirement: FR-061 仲裁版面：逐項二選一與 Reject 出口`，非正典逐字），`openspec archive` 僅用它來合併衍生檢視。**正典 `specs/annotation/015-annotation-workspace/spec.md` 的回寫必須另外手動進行，且是「就地最小修訂」——保留正典既有之條列結構、中文「必須」語態、沿革括號與交互參照，只把例外子句切進原句，不得整段改寫成 delta 檔的英文 MUST 語態或標題格式**。以下兩行是回寫時必須逐字採用的最終正典文字（含前後未變動的既有文字，供合併前逐字 `diff` 核對）：

**FR-061**（正典 `:828`，僅改動「條件不成立時」子句與沿革括號，其餘既有文字——包含下方 1–6 點與 v5.0.0 移除段——逐字不動）：

```
- **FR-061**（v4.8.0 新增，v4.54.0 修訂，**v5.0.0 修訂，BREAKING**，對應 AC-4.22 ~ AC-4.24、AC-4.54，issue #147／#551／#596；**v9.0.0 修訂，MAJOR**，issue #1053：新增當事審核員已有自己提交時之 FR-103 例外）：工作區 reviewer 視圖必須為爭議池提供**逐項仲裁版面**，切換條件為「該審核單位狀態為 `爭議中`（FR-051）**AND** 目前審核員具仲裁資格（FR-060 之兩條件）」——條件成立時整張審核卡切換為仲裁版面，不成立時，若目前審核員在該單位已有自己的提交，改依 FR-103（**v9.0.0 修訂**，issue #1053）呈現其唯讀摘要版面，其餘情形維持 FR-053 審核卡，三者互斥、不得混渲染：
```

**AC-4.22**（正典 `:584`，標題沿革括號原樣不動——依正典既有慣例，AC 標籤之粗體包住整個括號、括號內只留首次新增版本，後續修訂一律寫在本文；本次僅改動第一句 `**And**` 之限定語與末尾新增一句 `**And**`，其餘既有文字逐字不動）：

```
22. **AC-4.22（v4.8.0 新增，仲裁版面切換）**：**Given** 一個 `disputed` 審核單位（FR-051），**When** 具仲裁資格的審核員（FR-060：`can_arbitrate` 旗標 AND 非當事人）以完整審核單位身分開啟工作區 reviewer 視圖，**Then** 整張審核卡必須切換為仲裁版面（`ws-arbitration-card`）：標記員答案以唯讀摘要呈現、每個未解決爭議項恰渲染一列 A/B 選擇（`ws-arbitration-item`）；**And** 修正控件（含作答面板互動元件）與 ✕/✓ 決策按鈕（`ws-review-row-approve` / `ws-review-row-reject`）必須為 0 節點——仲裁者選邊、不重新標記；**And** 當事審核員於該單位**尚無**自己的提交、未具旗標的審核員、以及任何人開啟非 `disputed` 單位時，皆維持 FR-053 審核卡，不得出現仲裁版面（見 FR-061）；**And**〔v9.0.0 新增，issue #1053〕當事審核員於該單位**已有**自己的提交時，改依 FR-103 呈現其唯讀摘要版面，同樣不得出現仲裁版面。
```

Source-Verify 預掃時，須將上述兩行與正典合併後之實際內容逐字 `diff`；`tasks.md` 為 FR-061、AC-4.22 各給一個獨立可勾選項目，不得併入同一項「archive 回寫」任務。

## Constitution Check

- **Generalization-First**：新分支的判定條件（爭議中 ＋ 當前審核員已有自己的提交）重用既有 `getSubmission()`／`REVIEW_UNIT_STATUS.DISPUTED`，不新增任何任務 ID 或輸出類型專屬邏輯；渲染沿用既有 `OUTPUT_TYPE_REGISTRY` 驅動的 `describeOutputAnswer()`／`describeCompactAnswer()`，不硬編任一輸出類型。
- **Data Fairness**：不涉及測試集答案外洩路徑；唯讀摘要只呈現審核員自己已合法讀取的資料（自己的提交、標記員原答案），未新增任何跨角色資料存取。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用；本變更為既有審核工作區單一畫面分支的新增＋既有 UI 元件重用，無新資料結構或互動模型層級的設計決策需要獨立記錄，故省略 `design.md`。
