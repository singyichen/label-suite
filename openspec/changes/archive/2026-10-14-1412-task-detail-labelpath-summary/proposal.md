---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1412
基準版本: 014 v13.0.0
目標版本: 014 v13.1.0
---

## Why

issue #1412（承接 #1384 逐行盤點）：`task-management/013-task-new` v5.0.0 已將 `multi_label.label_options` 重定義為遞迴 `LabelOptionNode[]`，提交值為完整 `LabelPath[]`；`annotation/015-annotation-workspace` 已同步（FR-024E、FR-024E-1）、017 已於 PR-A（#1428）以 `dataset/017-dataset-analysis-detail` FR-045 定義計數單位為完整 `LabelPath`。014 設定分頁「標記設定」檢視（FR-014i）仍只規定「每個輸出類型一列、value 為 config 欄位摘要」，沒有規範階層 `label_options` 如何摘要。

原型現況（實測）：`summarizeOutputConfigForDisplay()` 對陣列取 `item.name` 後以逗號串接，階層 taxonomy（例如 T003）只會顯示頂層名稱「情緒, 照護情境」，所有子孫節點與層級關係被丟棄，使用者無從在檢視狀態看出實際可勾選的標籤。這與 `dataset/017-dataset-analysis-detail` FR-045 的完整 `LabelPath` 單位不一致：統計與 IAA 以完整路徑計，設定檢視卻只看得到頂層。

維護者裁定（#1412 留言，2026-10-14）：沿用 013 既有對階層 `label_options` 的呈現（taxonomy 樹的唯讀版），不新造格式；013 沒有唯讀呈現時，以縮排清單列出節點。013 的樹編輯器是編輯用元件，沒有唯讀版，因此採縮排清單。

**是否需要存在（YAGNI 檢查）**：需要。013／015／017 都已把階層當一等公民，014 設定檢視是 Project Leader 確認「這個任務到底有哪些可選標籤」的唯一唯讀位置；只顯示頂層會造成誤判，且是現存的實作缺陷，不是新功能。本 change 只定義摘要呈現，不新增編輯能力、常數或欄位。

## What Changes

- **新增 FR-014i-1 階層 `label_options` 的唯讀摘要**：設定分頁「標記設定」檢視狀態中，輸出 config 欄位型別為 taxonomy 樹（registry 欄位 `type = taxonomy-tree`，現為 `multi_label.label_options`）者，value 改以縮排清單列出**每一個可勾選節點**：(1) 一節點一列，縮排深度對應層級，深度由資料決定、不硬編；(2) 每列顯示節點名稱，並以完整 `LabelPath`（依序以 `›` 連接各節點名稱，例如 `情緒 › 負向 › 悲傷`）作為該列的可及名稱與辨識值，與 `dataset/017-dataset-analysis-detail` FR-045 同一單位；(3) 祖先不隱含於子孫之列——branch 節點本身也是獨立一列（每層節點皆可獨立勾選，013 v5.0.0）；(4) 純唯讀，不提供展開／收合、勾選或編輯；(5) 扁平 `label_options` 維持既有「以逗號串接」摘要，不變；(6) 該 config 的其餘欄位（如 `max_selections`）仍依 FR-014i 以文字摘要；(7) 不得硬編層數、節點名稱或任務類型分支。
- **新增 AC-3.85** 與一條 Scenario，涵蓋「階層任務列出每個節點且帶完整路徑」「扁平任務不變」。
- **不修改既有 FR／AC 的語意**：FR-014i 在 gate 4 回寫時僅就地補「階層 `label_options` 見 FR-014i-1」的交叉引用。
- **prototype**：需要變更——`task-detail.config.js` 的摘要函式與 `task-detail.html` 的摘要列渲染（`renderSettingsSummaryRows`）。走 Red／Green：Red 先證明 T003 目前只顯示頂層；既有 `task-detail-task-profiles.spec.ts` 中 T003 的 `'情緒, 照護情境'` 期望值屬於被本 change 修訂的舊行為，由 Red 同批更新。
- **不動概覽「下一步」卡片與 `nextStepGroupsHtml()`**（#1438 平行修改該區域）。

**BREAKING 判定**：非 BREAKING。新增一條 FR，補明先前未規範的階層情境；扁平標籤的既有行為不變，無任何 FR／AC 被移除或推翻 → MINOR（014 v13.0.0 → v13.1.0）。

**delta 形式說明**：FR-014i-1 與 AC-3.85 為全新 ID，置於 `## ADDED Requirements`。FR-014i 的措辭不改，僅在正典就地補交叉引用，不對它下 `## MODIFIED`。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `task-management/014-task-detail`：新增 FR-014i-1 階層 `label_options` 的唯讀摘要。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v13.0.0 → v13.1.0，**MINOR**）。
- 正典待改寫錨點（gate 4）：功能需求段 FR-014i 後新增 FR-014i-1、FR-014i 補交叉引用、驗收情境 AC-3.85、Prototype Traceability 的 `task-detail.config.js` 列補 FR-014i-1、Changelog 新增 v13.1.0 列、版本列同步。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併；Purpose 版本同步 v13.1.0）。
- 不影響 013（由 PR-C 以 Lightweight PATCH 處理）、015、017。

**原型程式（Principle X 之產品檔案盤點）**

- `design/prototype/pages/task-management/task-detail.config.js`（摘要函式）
- `design/prototype/pages/task-management/task-detail.html`（`renderSettingsSummaryRows` 與少量樣式）

合計 2 個產品檔案。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：以 registry 欄位型別 `taxonomy-tree` 判定，不以 `multi_label` 字串或節點名稱分支；層數由資料決定，`TAXONOMY_MAX_DEPTH` 內任意深度皆適用。
- **Data Fairness（NON-NEGOTIABLE）**：摘要只顯示任務設定中的標籤選項，不涉及任何答案資料。
- **Simplicity First / YAGNI**：唯讀縮排清單，不新增展開收合、搜尋或編輯；不新造格式。
