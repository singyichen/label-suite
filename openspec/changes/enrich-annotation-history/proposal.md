---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #578
基準版本: 4.60.0
目標版本: 4.61.0
---

## Why

`annotation-workspace` 右欄「歷程」頁籤目前每筆事件只承載 5 個欄位（`role`、`actor_id`、`at`、`action`、`summary`，見關鍵實體 `AnnotationHistoryItem` 與 FR-016B），只能回答「誰在什麼時候做過動作」，無法回答「改了什麼」「為什麼被退回」「花了多久」。審核員在爭議仲裁時看不到兩位標記員各自改動了什麼，只能從自由文字 `summary` 推測；試標品質迴圈也缺少可據以判斷標記難度的耗時資料。

調研 Label Studio、CVAT、INCEpTION、Argilla、doccano、Prodigy 與 W3C Web Annotation Data Model 後，缺口收斂為四項：結果快照、耗時、`action` 常數化、理由欄位。（此為外部工具調研，其欄位清單與 enum 取值不存在於本倉庫任何文件，故不於此引用具體數字；`docs/research/tool-analysis.md` 之 Label Studio 比較表不涵蓋 annotation-history API。）此外 `action` 目前為自由字串，導致 propose 時原型既有的 7 種歷程徽章樣式（`.submitted`／`.saved`／`.rejected`／`.consensus`／`.divergent`／`.overridden`／`.adjudicated`）僅有 3 種被渲染路徑使用，其餘為死碼——此為 v4.60.0 之狀態描述，本變更實作後該樣式集合已隨 FR-086 改寫。

## What Changes

- **事件欄位擴充**：`AnnotationHistoryItem` 新增 `result_snapshot`、`started_at`、`lead_time`、`reason` 四個欄位，並將 `action` 由自由字串收斂為常數集合 `HISTORY_ACTIONS`。
- **`action` 常數化**：定義 `HISTORY_ACTIONS = draft_saved | submitted | skipped | modified | accepted | rejected | adjudicated`，每個值對應唯一徽章語意色，消除既有徽章死碼。
- **結果快照與差異呈現**：每筆事件保存當下的精簡 `outputs[]` 結果（排除原始文本與資料集欄位），前後兩筆的差異於呈現時計算；`entity_recognition`／`relation_identification` 以逐實體列出新增／刪除／邊界變更。
- **耗時記錄**：以頁面可見時間累計（`visibilitychange`／視窗失焦時暫停）產生 `started_at` 與 `lead_time`；標記員視角不呈現，僅審核員／任務負責人可見。
- **理由必填**：審核退回、審核修改、爭議仲裁、標記員跳過四個動作一律必填 `reason`。其中「標記員跳過」與「爭議仲裁」在本版以前**並無任何產生點**——跳過動作本身不存在於標記工作區，`submitArbitration()` 也不寫任何歷程事件——故此二者為**新增能力**而非 BREAKING；審核退回與審核修改則是在既有動作上補齊必填欄位。
- **分層遮蔽**：事件列（操作者、時間、動作）對所有可檢視者可見；`result_snapshot` 與 `reason` 依角色遮蔽——標記員僅見本人、審核員可見自身審核單位全部、具 `can_arbitrate` 之仲裁者全解。
- **清單彙總欄位**：`annotation-list` 每筆樣本新增「最後動作」「最後活動時間」「累計耗時」三欄，由歷程事件推導，不另存第二份。
- **舊事件相容**：v4.61.0 以前寫入、不具新欄位的事件原樣顯示，缺欄位不渲染，不進行資料遷移、不補寫推估值。

## Capabilities

### New Capabilities

- `annotation/015-annotation-workspace`：標記員「跳過」動作（FR-089／AC-2.20）——本版以前工作區沒有這個動作；一併定義其呈現視角、可用條件與送出後導覽。
- `annotation/015-annotation-workspace`：爭議仲裁的 `adjudicated` 歷程事件（FR-089／AC-3.50）——`submitArbitration()` 本版以前只寫票數與 `finalized_value`，歷程面板上沒有任何裁定紀錄。

### Modified Capabilities

- `annotation/015-annotation-workspace`：`AnnotationHistoryItem` 事件模型擴充與 `action` 常數化（FR-016B 修訂）、快照與差異呈現、耗時記錄與其可見性、四動作理由必填、歷程分層遮蔽、`annotation-list` 清單彙總欄位。

## Impact

**規格**

- 正典：`specs/annotation/015-annotation-workspace/spec.md`（v4.60.0 → v4.61.0，MINOR：僅新增與修訂，無既有 FR 廢止）
- 衍生檢視：`openspec/specs/annotation/015-annotation-workspace/spec.md`（archive 時自動合併）
- 下游（本次不修改，僅需確認相容）：`specs/task-management/014-task-detail/spec.md` FR-015d-4 之逐標記員審核歷程時間軸與本次事件同源，新增欄位為向後相容的擴充；`specs/dataset/017-*` 之 IAA 語意不受影響。

**原型程式**

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`renderHistoryPanel()`（歷程卡片渲染）、`buildHistorySummary()`、`appendReviewHistoryEntry()`、歷程徽章樣式區塊
- `design/prototype/pages/annotation/annotation-workspace.data.js`：`getSampleHistory()` 事件讀寫與遮蔽過濾
- `design/prototype/pages/annotation/annotation-workspace.html`：歷程卡片版型
- `design/prototype/pages/annotation/annotation-list.*`：清單彙總欄位

**既有機制交互**

- FR-062 盲審隔離：新增的 `result_snapshot` 是最高風險的洩漏面，遮蔽規則必須與既有未提交事件隔離規則疊加，不得任一方單獨成立。
- FR-016A 修正稽核理由：既有 `answers.reasons` 為退回理由的唯一儲存位置；本次 `reason` 欄位於審核側必須沿用同一來源，不得另存第二份。
- FR-049 提交紀錄定址／CONC-03：快照會顯著放大 `localStorage` 體積，需於實作階段處理。**實測修正**：`wsSubmissions` 已於 issue #283 由單一整包鍵改為每個 bucket 各自一個鍵（`labelsuite.wsSubmissions.<bucketKey>`），跨 bucket 併發寫入不再互相覆蓋，propose 時所述的整包 read-modify-write lost-update 風險已不存在；同一 bucket 的併發寫入仍為 last-write-wins，原型階段接受，真正的衝突政策屬後端（`CONFLICT_RESOLUTION_POLICY`）。

## Constitution Check

依 `specs/_governance/constitution.md` 逐項檢核與本變更相關的設計時原則：

- **Generalization-First（NON-NEGOTIABLE）**：`HISTORY_ACTIONS` 與快照差異呈現皆不得逐 task 硬編。差異呈現必須由 `OUTPUT_TYPE_REGISTRY` 的輸出類型驅動（純值類型比對值、位置類型比對實體），新增輸出類型時不需修改歷程模組。
- **Data Fairness（NON-NEGOTIABLE）**：`result_snapshot` 使他人答案首次進入歷程面板，於 `dry_run` 試標期間若對標記員可見即構成答案洩漏，將直接污染 IAA。故遮蔽規則為本變更的必要條件而非選配：標記員僅能看到自己的快照，且遮蔽必須在資料供給層完成，不得僅以 CSS 隱藏。
- **可追溯性**：事件維持 append-only，既有事件不得被覆寫或刪除（沿用邊界情況既有規則）；理由必填使「退回／修改／仲裁／跳過」四個會改變他人工作的動作皆具備可稽核依據。
- **Simplicity First / YAGNI**：僅採納四個經需求驗證的欄位，明確不納入 Label Studio 的 `draft_id`／`comment_id`／`organization_id`／`parent_annotation` 等本專案無對應機制的欄位；不新增留言串、不新增系統稽核層（L4），此兩項屬後端階段課題。
- **PR 規模（Principle X）**：本變更拆為六個 PR 群組（事件模型＋`action` 常數／快照＋遮蔽／位置型差異／耗時／理由必填／清單彙總）加一個最終 archive 群組，每組獨立通過驗證後合併，OpenSpec change 保持開啟至最後一組執行 archive 回寫。
