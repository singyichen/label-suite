> 正典：`specs/task-management/014-task-detail/spec.md`（v13.0.0 → v13.1.0，**MINOR**）。issue #1412。
>
> **為何放在 `## ADDED Requirements` 底下**：FR-014i-1 與 AC-3.85 為全新 ID，正典與衍生檢視皆不存在。FR-014i 的措辭不改，僅在 gate 4 回寫正典時就地補「見 FR-014i-1」的交叉引用；對 AC 編號下 `## MODIFIED` 會讓新 ID 落入 MODIFIED 而使 lint 失敗。

## ADDED Requirements

### Requirement: FR-014i-1 階層 label_options 的唯讀摘要

設定分頁「標記設定」檢視狀態的摘要列（FR-014i），當輸出 config 欄位型別為 taxonomy 樹（registry 欄位 `type = taxonomy-tree`，現為 `multi_label.label_options`，遞迴 `LabelOptionNode[]`，見 `task-management/013-task-new` v5.0.0）時，MUST 以縮排清單列出每一個可勾選節點，而非只顯示頂層名稱。

1. 一個節點一列，縮排深度對應節點層級；深度與節點數 MUST 由資料決定，MUST NOT 硬編層數、節點名稱或任務類型分支。
2. 每列 MUST 顯示節點名稱，並以該節點的完整 `LabelPath`（依序以 `›` 連接各節點名稱，例如 `情緒 › 負向 › 悲傷`）作為該列的辨識值與可及名稱，與 `dataset/017-dataset-analysis-detail` FR-045 的計數單位一致。
3. 祖先節點 MUST NOT 隱含於子孫之列：branch 節點本身為獨立一列（每層節點皆可獨立勾選）。
4. 清單 MUST 純唯讀，不提供展開／收合、勾選或任何編輯控制。
5. 扁平 `label_options` 的摘要 MUST 維持以逗號串接標籤名稱，與修正前相同。
6. 該 config 的其餘欄位（例如 `max_selections`）MUST 仍依 FR-014i 以文字摘要，且 MUST NOT 在文字摘要中重複顯示 `label_options`。

#### Scenario: AC-3.85 階層 label_options 以縮排清單列出每個節點

- **GIVEN** 任務的 `outputs[]` 含 `multi_label`，`label_options` 為階層 taxonomy（根節點 `情緒`，其下 `負向`，其下 `悲傷`、`焦慮`）
- **WHEN** 使用者開啟設定分頁並檢視「標記設定」檢視狀態
- **THEN** 摘要列以縮排清單呈現 `情緒`、`負向`、`悲傷`、`焦慮` 各一列，縮排深度依序為 1、2、3、3
- **AND** `悲傷` 該列的辨識值為完整路徑 `情緒 › 負向 › 悲傷`，且 `情緒` 與 `情緒 › 負向` 各有獨立一列
- **AND** 清單不含展開、勾選或編輯控制，摘要中不再出現只含頂層名稱的逗號串接文字
- **AND** 扁平 `label_options` 的任務仍顯示以逗號串接的標籤名稱，與修正前相同
