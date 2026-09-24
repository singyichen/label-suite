# 設計：gate-review-assignment（issue #921）

## Context

`design/prototype/pages/annotation/annotation-workspace.data.js` 已經備妥指派推導與查詢：

| 位置 | 函式 | 行為 |
| --- | --- | --- |
| `:2417` | `taskReviewAssignments(taskId, runType, units)` | 帶任務脈絡的指派入口，組合有效名冊（`reviewAssignmentRoster()`，issue #868 排除仲裁者）與黏住查表（`getStickyReviewers()`，issue #824） |
| `:2422` | `getAssignedReviewUnits(taskId, runType, reviewerId, units)` | 呼叫上者後以 `reviewer_id === reviewerId` 過濾，回傳 `{sample_id, annotator_id}[]` |
| `:2410` | `isRosterReviewer(taskId, reviewerId)` | 「是否在該任務審核員名冊」，已被 `reviewUnitBlockReason()` 的 OFF_ROSTER 分支使用 |
| `:2445` | `isArbiterCandidate(taskId, runType, sampleId, identity)` | FR-060 仲裁資格，與上列指派名冊是兩份查表 |

消費端目前只有 `annotation-list.html:1854` 的 `filterToAssignedUnits()`（FR-055 清單列，issue #824 引入）呼叫 `getAssignedReviewUnits()`。`annotation-workspace.config.js` 的 `buildUnits()`（`:1516`）與互動閘門 `reviewUnitBlockReason()`（`:3623`）皆未呼叫，這正是本單要補的缺口——**資料層已就緒，缺的只是工作區這一側的消費**。

`annotation-list.html` 的既有寫法是本單的直接參照範本：

```js
function filterToAssignedUnits(context, units) {
  var reviewerId = context.identity && context.identity.reviewerId;
  if (!reviewerId) return units;
  var assigned = window.LabelSuiteAnnotationWorkspaceData.getAssignedReviewUnits(
    context.taskId, context.runType, reviewerId,
    units.map(function (unit) { return { sample_id: unit.recordId, annotator_id: unit.annotator }; }));
  var mine = {};
  assigned.forEach(function (unit) { mine[unit.sample_id + '\u0000' + unit.annotator_id] = true; });
  return units.filter(function (unit) {
    return mine[unit.recordId + '\u0000' + unit.annotator] === true || unit.arbiterEntry;
  });
}
```

`unit.arbiterEntry` 是清單頁自己算好存在 unit 物件上的欄位（`爭議中 AND isArbiterCandidate`）。工作區的 `buildUnits()` 單位物件沒有預先算好的狀態欄位（`reviewUnitState(unit)` 是另一個惰性查詢函式），所以工作區側的過濾函式需要在過濾當下自行查詢狀態與仲裁資格，而不是讀一個預算欄位。

## Goals / Non-Goals

**Goals**：工作區的互動閘門（`reviewUnitBlockReason()`）與 `annotation-list` 共用同一份指派事實（`getAssignedReviewUnits()`），未指派審核員無法在工作區送出審核決策；直接網址開啟未指派單位維持唯讀可見（維護者裁定）；仲裁入口不受影響。

**Non-Goals**：見 proposal.md「非目標」，尤其是工作區左欄／導覽的指派過濾——移交 issue #956（apply 階段升級裁定，見 proposal.md「範圍收斂」）。

## Decisions

### D1：`buildUnits()` 維持不變

`buildUnits()`（`:1516`）繼續列舉任務的完整單位宇宙（annotator 角色回傳單一單位、reviewer 角色回傳 `getReviewUnitRows()` 的完整列舉），不套用任何指派過濾——左欄、導覽、送出後自動前進因此繼續顯示全部單位，與 #921 修復前相同。這是 apply 階段的範圍收斂結果：`buildUnits()` 拆分為未過濾／過濾兩版曾是 propose 階段的原始設計，但過濾左欄會牽動的既有測試面遠超單一 PR 範圍，已移交 issue #956。本變更**只**在 D2 為互動閘門新增一個單一單位的指派檢查，不改動 `buildUnits()` 本身或其任何既有呼叫端。

### D2：新增 `isCurrentUnitAssigned()`，直接餵給既有的 `getAssignedReviewUnits()`

```js
function isCurrentUnitAssigned() {
  var data = window.LabelSuiteAnnotationWorkspaceData;
  var units = buildUnits().map(function (unit) {
    return { sample_id: unit.recordId, annotator_id: unit.annotatorId };
  });
  var assigned = data.getAssignedReviewUnits(currentProfile.id, currentRunType, currentIdentity.reviewerId, units);
  return assigned.some(function (unit) {
    return unit.sample_id === String(currentSampleId) && unit.annotator_id === currentAnnotatorId();
  });
}
```

`getAssignedReviewUnits()` 的指派推導需要**完整**單位宇宙作輸入（位置性輪流分派的模數是全體單位數），`buildUnits()`（D1，未過濾）正好就是這個宇宙，直接餵給既有函式即可，不必另建 `annotation-list.html` `filterToAssignedUnits()` 那樣的清單過濾器——本變更只需要回答「目前這一個單位是不是指派給我」，不需要回答「把整份清單過濾成只剩我的」（那是 #956 的問題）。也因此不需要 `unit.arbiterEntry` 那樣的仲裁例外析取：由 D3 說明，`reviewUnitBlockReason()` 的 ARBITRATION 分支已經先於本檢查攔截，走到這裡時該單位必定不是仲裁例外。

### D3：`REVIEW_UNIT_BLOCK.NOT_ASSIGNED` 與判定序

`annotation-workspace.config.js`：

- `REVIEW_UNIT_BLOCK`（`:3602`）新增 `NOT_ASSIGNED: 'not_assigned'`。
- `reviewUnitBlockReason()`（`:3623`）判定序改為 **ARBITRATION → FINALIZED → OFF_ROSTER → EMPTY → NOT_ASSIGNED**，新分支插入 EMPTY 之後：

  ```js
  if (!workspaceData.isRosterReviewer(currentProfile.id, currentIdentity.reviewerId)) {
    return REVIEW_UNIT_BLOCK.OFF_ROSTER;
  }
  if (unitStatus === null && !demoAnnotatorRow()) return REVIEW_UNIT_BLOCK.EMPTY;
  if (!isCurrentUnitAssigned()) {
    return REVIEW_UNIT_BLOCK.NOT_ASSIGNED;
  }
  ```

- `isCurrentUnitAssigned()`（D2）供本判定序調用，不另立第二套判定（DRY，proposal.md 非目標第一項）。ARBITRATION 分支已在此之前依 `isArbiterCandidate()` 攔截，走到 `isCurrentUnitAssigned()` 這一步時該單位若是仲裁例外，必定已經在 ARBITRATION 分支被攔下並提前回傳，不會落到這裡，故 D2 不需要另外的仲裁例外析取。

**判定序理由（EMPTY 在 NOT_ASSIGNED 之前——本節與 propose 階段的原始設計不同，經 apply 階段實測發現並修正，詳見 tasks.md 1.4 的位移／前提消失判定）**：仲裁分支在最前，因為仲裁者資格（`REVIEWER_ROSTER`／`arbiter_ids`）與審核指派（`reviewer_ids`）是兩份名冊，指派閘門排在前面會連帶關掉 FR-060 的仲裁入口；定稿分支次之，定稿單位本就唯讀且資訊量更高；OFF_ROSTER（完全離冊）比 NOT_ASSIGNED（在冊但非本單位受派者）更具體，排在更前面。**EMPTY 必須排在 NOT_ASSIGNED 之前，而非之後**：一個真正空的單位（標記員尚無提交、也無示範列）在 `getReviewUnitRows()`／`buildUnits()` 中不會產生任何列舉項——它對**任何人**都不構成「已指派」，包括未來輪值會分到它的那位審核員。若指派檢查排在 EMPTY 之前，該未來受派者會被告知「本單位未指派給你」，但這是假話：指派根本尚未發生。EMPTY（尚無標記員提交）先於 NOT_ASSIGNED，才能對這種情況給出正確的訊息；一旦標記員提交，該單位進入列舉並取得真正的指派對象，NOT_ASSIGNED 才對非受派者正確生效。

### D4：唯讀渲染分支

於渲染函式（`:4996` OFF_ROSTER 分支之後）插入鏡射寫法的新分支：

```js
if (blockReason === REVIEW_UNIT_BLOCK.NOT_ASSIGNED) {
  if (reviewSubmitBtn) reviewSubmitBtn.classList.add('hidden');
  var notAssignedInputCard = document.createElement('div');
  notAssignedInputCard.className = 'content-card';
  notAssignedInputCard.setAttribute('data-testid', 'ws-input-content');
  notAssignedInputCard.textContent = buildReviewerInputText(rawRecord, currentProfile.fieldRoleMap);
  preview.appendChild(notAssignedInputCard);
  var notAssignedCard = document.createElement('div');
  notAssignedCard.className = 'content-card';
  notAssignedCard.setAttribute('data-testid', 'ws-review-not-assigned');
  notAssignedCard.textContent = t('reviewNotAssignedNote');
  preview.appendChild(notAssignedCard);
  return;
}
```

隱藏送出鈕同時關閉 FR-058 之 Ctrl/Cmd+Enter 捷徑（`setupActionShortcuts` 已跳過隱藏按鈕，既有機制，不需另外處理）。

新增 i18n 鍵 `reviewNotAssignedNote`（zh／en 各一，緊接 `reviewOffRosterNote` 之後）：

- zh：「這個審核單位未指派給你，可檢視內容但無法提交審核決策。」
- en：「This review unit is not assigned to you. You can view its content, but you cannot submit a review decision.」

歷程頁籤不在本閘門範圍內：與 issue #824 之 OFF_ROSTER 相同，它是另一個頁籤、讀 `getSampleHistory()`，本單不動它。

## Risks / Trade-offs

- **左欄／導覽的指派過濾已移交 #956**：propose 階段的原始設計曾把 `buildUnits()` 一併拆為過濾版，apply 階段跑既有測試才發現這牽動約 48 個既有測試檔（reviewer 角色工作區測試廣泛假設任一在冊審核員可開啟任一單位），已由 team lead 升級判定移交 issue #956（`buildUnits()` 維持不過濾，見 D1）。本變更仍會使**少數**既有測試轉紅——凡是直接以 URL 開啟一個「有內容、但不是預設身分實際受派」之單位並期待互動控件的既有測試——已逐一 triage：3 則為位移（開啟身分改為傳入實際受派者）、2 則為前提消失（`annotation-workspace-arbitration.spec.ts` 兩則「非受派者仍正常審核」案例，其前提正是本單修復的漏洞本身，已重新命名並改斷言驗證正確行為），1 則由 D3 的判定序修正自動轉綠、無需測試改動。
- **`isCurrentUnitAssigned()` 重算整份 `buildUnits()`**：`reviewUnitBlockReason()` 每次渲染呼叫一次，`buildUnits()` 本身在同一次渲染（`renderReviewerWorkspace()` → `renderSampleList()`／`renderSampleNav()`）已被呼叫多次——這是原型既有的重複計算模式（非本單引入），靜態原型無性能要求，故不額外快取。
- **未指派審核員之唯讀可見必然讓其看到受審資料**：與 issue #824 離冊閘門的取捨相同，維護者已裁定此為可接受範圍（Data Fairness 只約束測試集答案外洩，不約束審核員互見彼此審核內容）。
