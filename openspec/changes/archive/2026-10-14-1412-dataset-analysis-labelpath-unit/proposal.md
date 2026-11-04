---
對應 Spec: specs/dataset/017-dataset-analysis-detail/spec.md
對應 Issue: #1412
基準版本: 017 v3.1.2
目標版本: 017 v3.2.0
---

## Why

issue #1412（承接 #1384 逐行盤點）：`task-management/013-task-new` v5.0.0 已將 `multi_label.label_options` 重定義為遞迴 `LabelOptionNode[]`，提交值為完整 `LabelPath[]`，`annotation/015-annotation-workspace` 也已同步（FR-024E、FR-024E-1、AC-2A.2）。但正典 017 的 `multi_label` 統計與品質條文（FR-009G、FR-012G、`OUTPUT_TYPE_IAA_REGISTRY` 的 `multi_label` 列、`IAA_LABEL_MIN_POSITIVE`）仍以扁平「標籤」為前提，沒有規範 `LabelPath[]` 如何計次：只計葉節點？父節點是否獨立計次？共現矩陣與稀有標籤排除的粒度為何？後端與前端因此無從對齊，013 也只能一直保留「延後」條文。

維護者已於 #1412 留言裁定（2026-10-14，依「決策依照最佳建議」授權）：

- **計數單位＝完整 `LabelPath`**：每一條提交的路徑算一個標籤，以完整路徑（例如 `A › B`）作為類別鍵，**不**隱含把祖先節點另外計次，避免一筆同時被算進父、子兩類造成重複計數。
- 統計總覽（次數／比例長條圖、共現矩陣）與品質監控（逐標籤 Alpha、`IAA_LABEL_MIN_POSITIVE` 稀有排除）皆以完整路徑為單位，常數值不變。
- 依頂層彙總（roll-up）屬新功能，本單不做（YAGNI）。

**是否需要存在（YAGNI 檢查）**：需要。013／015 已產出 `LabelPath[]`，017 是它的唯一消費端；缺少計數單位時，同一份資料在不同實作會得到不同的長條圖與 Alpha，無法驗收。本 change 只定義單位，不新增 UI、常數或門檻。

本 change 只動正典 017。014 設定檢視與 013 延後條文改為已完成屬 #1412 的 PR-B（等 #1403 合併後），不在此範圍。

## What Changes

- **新增 FR-045 `multi_label` 階層 `LabelPath` 的計數單位**：以完整 `LabelPath` 為「標籤」，定義 (1) 類別鍵與顯示（`A › B`）；(2) 不隱含祖先計次，路徑可止於 branch 或 leaf，`A` 與 `A › B` 為兩個獨立類別；(3) 統計總覽的次數／比例長條圖與共現矩陣皆以完整路徑為列與欄；(4) 品質監控的逐標籤 Alpha 以完整路徑為標籤、`IAA_LABEL_MIN_POSITIVE` 以完整路徑計正例出現次數，常數值（5）不變，排除清單列出完整路徑；(5) 扁平 config 視為長度 1 的 `LabelPath`，結果與扁平計算一致；(6) 依頂層彙總不在本規格，且不得以隱含祖先計次達成；(7) 不得硬編層數、節點名稱或任務類型。
- **新增一條 Scenario**涵蓋「選 `A › B` 不使 `A` 計次」「`A` 與 `A › B` 同時被選為一般共現」「稀有排除以完整路徑計」「扁平 config 一致」。
- **不修改任何既有 FR／AC 的語意**：FR-009G、FR-012G、`OUTPUT_TYPE_IAA_REGISTRY`、`IAA_LABEL_MIN_POSITIVE` 與 `MultiLabelStats` 在 gate 4 回寫時僅就地補一句「標籤＝完整 `LabelPath`，見 FR-045」的交叉引用，不改既有措辭與數值。
- **prototype**：不影響。017 原型 partial 使用扁平固定標籤夾具（等同長度 1 的 `LabelPath`），與 FR-045 第 5 點一致；原型未實作階層 `multi_label` 的統計或 IAA，屬 spec-only 釐清，無 Red／Green 配對。

**BREAKING 判定**：非 BREAKING。新增一條 FR，補明先前未規範的階層情境；扁平標籤的既有行為不變，無任何 FR／AC 被移除或推翻 → MINOR。

**delta 形式說明**：FR-045 為全新 ID，置於 `## ADDED Requirements`。FR-009G、FR-012G 不在衍生檢視內，對其下 `## MODIFIED` 會在 archive 階段 header not found 中止，因此僅在正典就地補交叉引用。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `dataset/017-dataset-analysis-detail`：新增 FR-045 `multi_label` 階層 `LabelPath` 的計數單位。

## Impact

**規格**

- 正典：`specs/dataset/017-dataset-analysis-detail/spec.md`（v3.1.2 → v3.2.0，**MINOR**：新增一條 FR、不改既有行為）。
- 正典待改寫錨點（gate 4）：功能需求段新增 FR-045、成功標準段新增一條對應 SC（編號於回寫時取最大值加一）、規格常數段 `IAA_LABEL_MIN_POSITIVE` 與 `OUTPUT_TYPE_IAA_REGISTRY` 的 `multi_label` 列、FR-009G、FR-012G、關鍵實體 `MultiLabelStats` 補交叉引用、上游相依表補 013 `LabelPath` 與 015 FR-024E-1、Changelog 新增 v3.2.0 列、版本列同步。
- 衍生檢視：`openspec/specs/dataset/017-dataset-analysis-detail/spec.md`（archive 時自動合併）。
- 不影響 014、013、015 正典；014 與 013 由 PR-B 承接。

**原型程式（Principle X 之產品檔案盤點）**

無產品檔案變更。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：計數單位由資料中的 `LabelPath` 決定，不硬編層數、節點名稱或任務類型；`TAXONOMY_MAX_DEPTH` 內任意深度皆適用。
- **Data Fairness（NON-NEGOTIABLE）**：只定義統計與 IAA 的計數單位，不改變任何答案資料的可見範圍。
- **Simplicity First / YAGNI**：不新增常數、欄位或 UI；roll-up 明確排除。
