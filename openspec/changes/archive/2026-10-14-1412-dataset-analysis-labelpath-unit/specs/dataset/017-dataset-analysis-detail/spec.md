> 正典：`specs/dataset/017-dataset-analysis-detail/spec.md`（v3.1.2 → v3.2.0，**MINOR**）。issue #1412。
>
> **為何 FR-045 放在 `## ADDED Requirements` 底下**：FR-045 為全新 ID，正典與衍生檢視皆不存在。FR-009G、FR-012G 等既有條文不在衍生檢視內，對它們下 `## MODIFIED` 會在 archive 階段 header not found 硬中止，因此 gate 4 回寫正典時僅就地補「見 FR-045」的交叉引用，不改既有措辭，也不新增第二條同 ID 條文。

## ADDED Requirements

### Requirement: FR-045 multi_label 階層 LabelPath 的計數單位

當任務 `outputs[]` 含 `multi_label` 時，017 的統計總覽與品質監控 MUST 以**完整 `LabelPath`** 作為「標籤」的計數單位。`LabelPath` 為 `task-management/013-task-new` 定義、`annotation/015-annotation-workspace` FR-024E-1 提交於 `selected: LabelPath[]` 的 root-to-selected-node 節點 ID 序列。

1. 每一條提交的 `LabelPath` MUST 算一個標籤，類別鍵 MUST 為完整路徑（畫面顯示為依序以 `›` 連接各節點名稱，例如 `A › B`）。同名但路徑不同的節點 MUST 視為不同類別。
2. 系統 MUST NOT 隱含計入祖先節點：提交 `A › B` 不使 `A` 的次數增加。路徑可止於 branch 或 leaf，因此 `A` 與 `A › B` 為兩個獨立類別，僅在標記員另外提交 `A` 本身時 `A` 才被計次。
3. 統計總覽的標籤次數／比例長條圖與多標籤共現矩陣，列與欄 MUST 皆以完整 `LabelPath` 為單位。標記員於同一筆樣本同時提交 `A` 與 `A › B` 時，兩者之間 MUST 為一般共現，MUST NOT 因階層關係特殊處理、合併或略過。比例的母體定義不變，僅類別鍵改為完整路徑。
4. 品質監控的逐標籤 Krippendorff's Alpha MUST 以完整 `LabelPath` 為「標籤」，巨集平均對象為各完整路徑；`IAA_LABEL_MIN_POSITIVE` 的「正例出現次數」MUST 以完整路徑計，MUST NOT 把子孫路徑的出現次數併入祖先路徑。常數值不變。排除於巨集平均的稀有標籤，其排除清單 MUST 列出完整路徑。
5. 其他以「標籤」為單位的 `multi_label` 品質指標（例如 FR-035 的逐樣本投票分裂度取各標籤平均）同樣以完整路徑為標籤。
6. 扁平 config 與舊資料視為長度為 1 的 `LabelPath`，其統計與 Alpha MUST 與扁平標籤的既有計算結果一致。
7. 依頂層（或任一祖先層）彙總（roll-up）不在本規格範圍；MUST NOT 以隱含祖先計次提供。
8. 計數 MUST 由資料中的 `LabelPath` 驅動，MUST NOT 硬編層數、節點名稱或任務類型分支。

#### Scenario: 以完整 LabelPath 計次且不隱含祖先

- **GIVEN** 一個 `outputs[]` 含 `multi_label` 的任務，階層 taxonomy 含 `A` 與其子節點 `A › B`，一位標記員對某樣本提交 `[A › B]`
- **WHEN** 系統計算統計總覽的標籤次數與共現矩陣
- **THEN** 類別 `A › B` 次數為 1，類別 `A` 次數為 0
- **AND** 另一位標記員對另一樣本提交 `[A, A › B]` 時，`A` 與 `A › B` 次數各增加 1，且共現矩陣中兩者的共現格為 1
- **AND** 品質監控的逐標籤 Alpha 與 `IAA_LABEL_MIN_POSITIVE` 皆以 `A` 與 `A › B` 為兩個獨立標籤，正例出現次數不足 `IAA_LABEL_MIN_POSITIVE` 的完整路徑被排除於巨集平均並列於排除清單
- **AND** 以僅含長度為 1 的 `LabelPath` 的扁平資料重算，結果與扁平標籤既有計算相同
