# 設計：enumerate-submitted-review-units（issue #792）

## Context

審核單位（`REVIEW_UNIT_DIMENSIONS`＝`sample_id × annotator_id × run_type`，FR-051）目前由三處各自列舉，三處都只走示範列：

| 位置 | 函式 | 消費端 |
| --- | --- | --- |
| `annotation-workspace.data.js` | `listReviewUnits(taskId, runType)` | `computeReviewSummary()`（FR-072）、`findNextActionableReviewUnit()`（FR-073／FR-100）、`computeReviewWorkload()`、`listReviewUnitStatuses()`、`task-detail.data.js`、`dataset-analysis-detail.html` |
| `annotation-list.html` | `buildAllReviewUnitRows(context)` | reviewer 清單列（FR-055），再經 `filterToAssignedUnits()` 做 FR-093 過濾 |
| `annotation-workspace.config.js` | `buildUnits()` | reviewer 左欄、上下筆導覽、`findNextPendingUnit()`（FR-056） |

三處都是 `datasetRecords × getReviewerMockRows(taskId, sampleId)`。

已儲存提交的位置：bucket key 為 `taskId::role::runType::annotatorId::reviewerId`，標記員 bucket 的 `reviewerId` 固定為 `NO_REVIEWER`（`'-'`）。`listSubmissionBucketKeys()` 以 `SUBMISSION_KEY_PREFIX` 掃出全部 key 並排序；`getSubmission(taskId, 'annotator', runType, sampleId, { annotatorId })` 只在該筆狀態為 `submitted` 時回傳答案。

## Goals / Non-Goals

**Goals**：有已儲存提交的標記員一律成為審核單位；三處列舉讀同一個資料層函式。

**Non-Goals**：見 proposal.md「非目標」。

## Decisions

### D1：資料層新增 `getReviewUnitRows(taskId, runType, sampleId, outKeys)`

回傳該樣本的審核單位列，順序為：

1. `getReviewerMockRows(taskId, sampleId)` 的示範列，原樣、原順序；
2. 在 `listSubmissionBucketKeys()` 中符合 `taskId::annotator::runType::<annotatorId>::-` 形狀、該樣本 `getSubmission()` 非空、且 `annotatorId` 不在第 1 步的標記員列，依 `annotatorId` 排序接在後面。第 2 步的列以示範列同一形狀合成：`{ annotator, answers: { [outKey]: convertSubmissionAnswer(outKey, submission) }, bypass: { [outKey]: !!submission.previewBypass[outKey] } }`。

`listSubmissionBucketKeys()` 已排序，所以同一份 storage 內容永遠產生同一個順序。

**為什麼回傳列而不是只回傳標記員 ID**：清單的答案欄（`buildAnswerCell()`）與標記分布統計（`buildReviewStatsText()`）都讀示範列形狀的 `answers`／`bypass`。只回傳 ID 的話，清單頁得自己再轉換一次提交答案，又多出一份各自維護的邏輯。

**為什麼示範列在前**：既有單位的列舉順序與既有測試都以示範列順序為準。FR-093 的指派會先排序（`getReviewAssignments()` 以 `sample_id`、`annotator_id` 排序），所以列舉順序不影響指派；它只影響同一樣本內的清單列順序，示範列在前可讓既有畫面不變。

**否決的替代方案**：

- **把提交者寫進 `REVIEWER_MOCK_ROWS`**：把執行期資料混進示範種子，且示範種子是 FR-044a 的第二 seed 來源，寫進去會讓 AC-3.38 閘門的判定失真。
- **只修 `listReviewUnits()`，清單與工作區不動**：摘要與清單列會對「有幾個單位」給出不同答案，違反 FR-072 第 1 點「與清單資料列同源」。

### D2：三處消費端改讀 D1

- `listReviewUnits()`：以 `getReviewUnitRows(taskId, runType, sampleId, outKeys)` 取代 `getReviewerMockRows()`，`outKeys` 沿用函式內已有的 `listEntry.outputTypes`。
- `annotation-list.html` 的 `getMockRows(profile, recordId)`：改呼叫 `getReviewUnitRows(profile.id, context.runType, recordId, profile.outputTypes)`；`buildAllReviewUnitRows()` 其餘不變。
- `annotation-workspace.config.js` 的 `buildUnits()`：改讀 `getReviewUnitRows(currentProfile.id, currentRunType, recordId, state.selectedOutputTypes)`。

`demoAnnotatorRow()`（FR-044a 遞補）仍讀 `getReviewerMockRows()`：它的語意就是「示範列」，不是列舉。

### D3：不變量

- **AC-3.38 閘門的單位仍不被列舉**：兩個 seed 來源皆缺 ⇔ 無示範列且 `getSubmission()` 為空，D1 的兩步都不會產生它。`tests/annotation/issue-784-enumerated-units-have-seed-source.spec.ts` 的泛掃不變量（被列舉者 `status !== null` 或有示範列）照舊成立。
- **只列舉已提交**：草稿（`saved`）不進入列舉，`getSubmission()` 已保證這點，審核員不會看到標記員的草稿（FR-062 精神一致）。

### D4：與 FR-093 的互動（交給 #824）

`official_run` 的指派是 `roster[index % roster.length]`，新單位插入排序後的位置，會讓排在它之後的單位換手。這不是本單新引入的問題：任何改變單位集合的操作都會這樣，issue #824 正是追蹤它，維護者已裁定「已審單位黏住原審核員」。本單不改指派演算法；Red 契約只斷言新單位「恰被指派給一位審核員」，不斷言是哪一位。

## Risks / Trade-offs

- **清單答案欄的來源不一致**：示範列標記員即使實際提交過，答案欄仍顯示示範答案（既有行為）；非示範列標記員則顯示其提交。兩者並存於同一張清單。這是既有行為的延續，列在 proposal 非目標，不在本單擴大範圍。
- **每次列舉都掃一次 localStorage key**：`listReviewUnits()` 對每個樣本呼叫一次 D1。prototype 的 key 數量在百位數以內，可接受；D1 內以一次掃描取得本任務、本 `run_type` 的標記員 bucket 清單再逐樣本查詢，避免重複掃描。
