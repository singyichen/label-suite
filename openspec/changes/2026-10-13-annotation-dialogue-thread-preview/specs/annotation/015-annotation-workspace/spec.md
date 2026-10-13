# Annotation List + Workspace — 整合預覽對話串（issue #1341）

## Purpose

本 delta 定義工作區中央「整合預覽」對物件陣列 Input（對話串）的呈現與反白座標資料契約：依任務設定 `dialogue_fields`（specs/task-management/013-task-new/spec.md FR-002c-10）以 2-A 對話串呈現，無設定時退回 2-C 原始 JSON；反白座標記為 `{utt_id, start, end}`（該則內半開區間 `[start, end)`，對齊 FR-098、FR-024A-3）；只渲染 Input 欄位。本 delta **只新增 FR-107 與 AC-2.31 ~ AC-2.35、SC-029，不修訂任何既有條文**。

## ADDED Requirements

### Requirement: FR-107 整合預覽對話串與發言內座標

工作區中央「整合預覽」（FR-013E、FR-024I）對 Input 欄位為物件陣列的樣本，MUST 依下列規則呈現與記錄，且 MUST NOT 依任務編號或欄位名稱硬編：

1. **對話串（2-A）**：任務設定 `dialogue_fields`（`{text, speaker, utt_id}`，specs/task-management/013-task-new/spec.md FR-002c-10）非 `null` 時，整合預覽每則發言一列，顯示發言者、`#` 加發言編號與發言文字；所有發言皆可標記，不得截斷。發言編號取 `dialogue_fields.utt_id` 指向的子欄位值，未設定時為該則的位置編號（自 1 起）。
2. **座標資料契約**：在對話串內標記的實體 MUST 記為 `{text, type, utt_id, start, end}`，`start`／`end` 為**該則發言文字內**的半開區間 `[start, end)`（`end = start + text.length`），與 FR-098、FR-024A-3 同一座標語意。關係識別的三元組 MUST 於 `subjStart`／`subjEnd`／`objStart`／`objEnd` 之外攜帶 `subjUttId`、`objUttId`。
3. **跨發言**：反白起訖落在不同則發言 MUST 被拒絕，顯示提示且不新增實體或關係選取；跨發言的關聯 MUST 以關係識別表達。
4. **原始 JSON 後備（2-C）**：Input 為物件陣列但 `dialogue_fields` 為 `null` 時，整合預覽 MUST 以可摺疊、等寬字的原始 JSON 呈現該 Input 欄位，不得出現 `[object Object]`。
5. **Data Fairness**：對話串與原始 JSON MUST 只渲染角色為 Input 的欄位；Output（如 `gold_triplets`）與 Evidence 不得因此路徑外露（FR-023、FR-024M-1）。
6. **不含端點範圍**：既有非對話路徑的 offset 寫法不在本條範圍；本條新增的 `utt_id` 座標一律半開區間。
7. **種子合規**：任務 T013 的 `text` 欄位角色 MUST 為「不使用」、`utterances` 為唯一 Input，並設定 `dialogue_fields`（specs/task-management/013-task-new/spec.md FR-002c-2）。

#### Scenario: AC-2.31 對話串一則一列

- **GIVEN** 任務 T013，Input `utterances` 為物件陣列（共 5 則），`dialogue_fields` 為 `{text: 'text', speaker: 'speaker', utt_id: 'utt_id'}`
- **WHEN** 開啟 `annotation-workspace` 的整合預覽
- **THEN** 顯示 5 列，每列各有發言者、`utt_id` 與該則文字
- **AND** 不出現 `[object Object]`，且各則文字不被串成同一段

#### Scenario: AC-2.32 反白座標記為發言編號加該則內半開區間

- **GIVEN** 已選取實體類型，T013 第 `utt_id` 為 0 的發言文字內含「過熱問題」
- **WHEN** 在該則發言內反白「過熱問題」
- **THEN** 新增的實體為 `{text: '過熱問題', type, utt_id: 0, start, end}`，且 `end - start` 等於 4，`start` 為該則文字內的位置
- **AND** 該則文字 `slice(start, end)` 等於「過熱問題」

#### Scenario: AC-2.33 跨發言反白被拒絕

- **GIVEN** 已選取實體類型
- **WHEN** 反白範圍起點在一則發言、終點在另一則發言
- **THEN** 不新增任何實體
- **AND** 顯示跨發言提示

#### Scenario: AC-2.34 無對話設定時退回原始 JSON

- **GIVEN** 任務 Input 為物件陣列且 `dialogue_fields` 為 `null`
- **WHEN** 開啟整合預覽
- **THEN** 顯示可摺疊、等寬字的原始 JSON，內容含該 Input 欄位的值
- **AND** 不出現 `[object Object]`

#### Scenario: AC-2.35 只渲染 Input 且 T013 種子合規

- **GIVEN** T013 資料含角色為 Output 的 `gold_triplets`
- **WHEN** 開啟整合預覽（對話串與原始 JSON 兩種呈現）
- **THEN** 頁面文字不含任何 `gold_triplets` 的內容
- **AND** T013 的 `text` 角色為「不使用」、`utterances` 為唯一 Input

#### Scenario: SC-029 座標以發言編號為單位且與 FR-098 同語意

- **GIVEN** 對話串內標記的任一實體
- **WHEN** 讀取其 `utt_id`、`start`、`end`
- **THEN** 發言文字 `slice(start, end)` 等於該實體 `text`
- **AND** `start`、`end` 皆不超出該則發言文字長度
