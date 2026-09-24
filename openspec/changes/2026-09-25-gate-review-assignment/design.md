# 設計：gate-review-assignment（issue #921）

## Context

`design/prototype/pages/annotation/annotation-workspace.data.js` 已經備妥指派推導與查詢：

| 位置 | 函式 | 行為 |
| --- | --- | --- |
| `:2417` | `taskReviewAssignments(taskId, runType, units)` | 帶任務脈絡的指派入口，組合有效名冊（`reviewAssignmentRoster()`，issue #868 排除仲裁者）與黏住查表（`getStickyReviewers()`，issue #824） |
| `:2422` | `getAssignedReviewUnits(taskId, runType, reviewerId, units)` | 呼叫上者後以 `reviewer_id === reviewerId` 過濾，回傳 `{sample_id, annotator_id}[]` |
| `:2410` | `isRosterReviewer(taskId, reviewerId)` | 「是否在該任務審核員名冊」，已被 `reviewUnitBlockReason()` 的 OFF_ROSTER 分支使用 |
| `:2445` | `isArbiterCandidate(taskId, runType, sampleId, identity)` | FR-060 仲裁資格，與上列指派名冊是兩份查表 |

消費端目前只有 `annotation-list.html:1854` 的 `filterToAssignedUnits()`（FR-055 清單列，issue #824 引入）呼叫 `getAssignedReviewUnits()`。`annotation-workspace.config.js` 的 `buildUnits()`（`:1508`）與互動閘門 `reviewUnitBlockReason()`（`:3611`）皆未呼叫，這正是本單要補的缺口——**資料層已就緒，缺的只是工作區這一側的消費**。

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

**Goals**：工作區左欄、導覽、互動閘門三者共用同一份指派事實（`getAssignedReviewUnits()`），未指派審核員無法在工作區送出審核決策；直接網址開啟未指派單位維持唯讀可見（維護者裁定）；仲裁入口不受影響。

**Non-Goals**：見 proposal.md「非目標」。

## Decisions

### D1：`buildUnits()` 拆分為 `buildAllUnits()` ＋ 過濾後的 `buildUnits()`

現行 `buildUnits()`（`:1508`）同時扮演兩個角色：(a) 任務的完整單位宇宙（annotator 角色的唯一單位、reviewer 角色的全部 `sample × annotator` 列舉），(b) 每個呼叫端實際消費的單位清單。`getAssignedReviewUnits()` 的指派推導本身需要 (a) 的**完整**宇宙作輸入（位置性輪流分派的模數是全體單位數，不是過濾後的子集），但左欄渲染、導覽、送出後自動前進需要的是 (b)。

拆分：

- `buildAllUnits()`：現行 `buildUnits()` 函式體逐字搬移，不改變其列舉邏輯（annotator 角色回傳單一單位、reviewer 角色回傳 `getReviewUnitRows()` 的完整列舉）。
- `buildUnits()`：呼叫 `buildAllUnits()`；`currentRole !== 'reviewer'` 時原樣回傳（annotator／project_leader 不受影響，project_leader 本就不呼叫 `buildUnits()`）；`currentRole === 'reviewer'` 時再套用 D2 的過濾。

`buildUnits()` 的既有呼叫端（`renderSampleNav`、`renderSampleList`、`handleSkip`、`handleSubmit`、`setupSampleNav`）**維持原樣呼叫 `buildUnits()`**，不改呼叫點——它們消費的本就該是「這個角色實際看得到的單位」，過濾後的語意對它們全部正確：左欄本就該只列自己的、導覽與送出後自動前進本就該只在自己的單位間移動。

### D2：新增 `filterToAssignedReviewUnits(units)`，鏡射 `annotation-list.html` 的 `filterToAssignedUnits()`

```js
function filterToAssignedReviewUnits(units) {
  var data = window.LabelSuiteAnnotationWorkspaceData;
  var assigned = data.getAssignedReviewUnits(
    currentProfile.id, currentRunType, currentIdentity.reviewerId,
    units.map(function (unit) { return { sample_id: unit.recordId, annotator_id: unit.annotatorId }; }));
  var mine = {};
  assigned.forEach(function (unit) { mine[unit.sample_id + '\u0000' + unit.annotator_id] = true; });
  return units.filter(function (unit) {
    if (mine[unit.recordId + '\u0000' + unit.annotatorId] === true) return true;
    return (
      reviewUnitState(unit) === data.REVIEW_UNIT_STATUS.DISPUTED &&
      data.isArbiterCandidate(currentProfile.id, currentRunType, unit.recordId, unitIdentity(unit))
    );
  });
}
```

NUL 分隔鍵與 `annotation-list.html` 同一設計理由：`sample_id`／`annotator_id` 皆不含 `U+0000`，故不會誤併兩個不同單位。`arbiterEntry` 沒有預算欄位可讀，改為呼叫既有的 `reviewUnitState(unit)`（`:1545`）與 `isArbiterCandidate()`——兩者皆是工作區既有的惰性查詢函式，本單不新增第二套狀態推導。

**為什麼不省略仲裁例外，只靠 `reviewUnitBlockReason()` 的仲裁分支兜底**：`buildUnits()` 若不含仲裁例外，具仲裁資格的爭議單位會直接從左欄與導覽消失——仲裁者要對一個自己不是受審方、且系統從未把它算進「指派給我」的爭議單位表態，正是 FR-060 定義的場景。清單頁已經在過濾函式本身處理這個例外（`unit.arbiterEntry` 析取），工作區必須同構，否則兩頁對「這位審核員能走訪到哪些單位」會給出不同答案——違反本單 proposal 的核心目標。

### D3：`REVIEW_UNIT_BLOCK.NOT_ASSIGNED` 與判定序

`annotation-workspace.config.js`：

- `REVIEW_UNIT_BLOCK`（`:3594`）新增 `NOT_ASSIGNED: 'not_assigned'`。
- `reviewUnitBlockReason()`（`:3611`）判定序改為 **ARBITRATION → FINALIZED → OFF_ROSTER → NOT_ASSIGNED → EMPTY**，新分支插入 OFF_ROSTER 之後、EMPTY 之前：

  ```js
  if (!workspaceData.isRosterReviewer(currentProfile.id, currentIdentity.reviewerId)) {
    return REVIEW_UNIT_BLOCK.OFF_ROSTER;
  }
  if (!isCurrentUnitAssigned()) {
    return REVIEW_UNIT_BLOCK.NOT_ASSIGNED;
  }
  if (unitStatus === null && !demoAnnotatorRow()) return REVIEW_UNIT_BLOCK.EMPTY;
  ```

- `isCurrentUnitAssigned()` 直接重用 D1／D2 的 `buildUnits()`（已過濾、已含仲裁例外），檢查目前單位是否在其中，不另立第二套判定（DRY，proposal.md 非目標第一項）：

  ```js
  function isCurrentUnitAssigned() {
    return buildUnits().some(function (unit) {
      return unit.recordId === String(currentSampleId) && unit.annotatorId === currentAnnotatorId();
    });
  }
  ```

  由於 ARBITRATION 分支已在此之前依 `isArbiterCandidate()` 攔截，走到 `isCurrentUnitAssigned()` 這一步時該單位若是仲裁例外，必定已經在 ARBITRATION 分支被攔下並提前回傳，不會落到這裡——`buildUnits()` 內含仲裁例外因此不會與此處的判定序衝突，只是共用同一份「這位審核員看得到哪些單位」的事實。

**判定序理由**（與 issue #824 之 OFF_ROSTER 相同）：仲裁分支在最前，因為仲裁者資格（`REVIEWER_ROSTER`／`arbiter_ids`）與審核指派（`reviewer_ids`）是兩份名冊，指派閘門排在前面會連帶關掉 FR-060 的仲裁入口；定稿分支次之，定稿單位本就唯讀且資訊量更高；OFF_ROSTER（完全離冊）比 NOT_ASSIGNED（在冊但非本單位受派者）更具體，排在前面；EMPTY（尚無標記員提交）留在最後，未指派審核員不該先看到「暫無可審核內容」這種暗示「稍後回來」的訊息。

### D4：唯讀渲染分支

於渲染函式（`:4944` OFF_ROSTER 分支之後）插入鏡射寫法的新分支：

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

- **既有夾具的左欄／導覽會位移**：多數示範任務（如 T001）未設定 `reviewerIds`，指派回退到全域 4 人名冊（扣除仲裁者後 3 人）。issue #824 為 `annotation-list.html` 加上同一個 `filterToAssignedUnits()` 時，`annotation-list-reviewer.spec.ts:23-37` 已示範過這個位移的正確處理：預設身分 `reviewer_wang` 在 T001 的 15 個單位裡只分到 `official_run: 5`、`dry_run: 6`。工作區走同一份推導，會出現同構位移——任何寫死「reviewer 左欄渲染 N 個 `ws-sample-item`」或「上一筆／下一筆走訪全部 N 個」的既有斷言，只要其預設身分不是分到全部單位的那一位，都會位移。處置：Red 之後以 probe（暫套 Green 跑全量、跑完即還原）盤點受影響的斷言，只同步期望值、不改測試結構——比照 issue #824 tasks.md 1.2 的方法論。
- **`isCurrentUnitAssigned()` 重算整份 `buildUnits()`**：`reviewUnitBlockReason()` 每次渲染呼叫一次，`buildUnits()` 本身在同一次渲染（`renderReviewerWorkspace()` → `renderSampleList()`／`renderSampleNav()`）已被呼叫多次——這是原型既有的重複計算模式（非本單引入），靜態原型無性能要求，故不額外快取。
- **未指派審核員之唯讀可見必然讓其看到受審資料**：與 issue #824 離冊閘門的取捨相同，維護者已裁定此為可接受範圍（Data Fairness 只約束測試集答案外洩，不約束審核員互見彼此審核內容）。
