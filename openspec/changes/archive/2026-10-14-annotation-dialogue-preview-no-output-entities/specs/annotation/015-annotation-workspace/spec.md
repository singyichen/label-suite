# Annotation List + Workspace — 對話預覽不從 Output 預填實體（issue #1371）

## Purpose

本 delta 為 FR-107 新增第 14、15 點：Input 為物件陣列（對話）時，整合預覽不得由 Output 欄位預填實體（Data Fairness），非對話任務行為不變；反白歧義改用專屬提示並補唯一出現 fallback 的驗收。新增 AC-2.44 ~ AC-2.47。

## MODIFIED Requirements

### Requirement: FR-107 整合預覽對話串與發言內座標

工作區中央「整合預覽」（FR-013E、FR-024I）對 Input 欄位為物件陣列的樣本，MUST 依下列規則呈現與記錄，且 MUST NOT 依任務編號或欄位名稱硬編：

1. **對話串（2-A）**：任務設定 `dialogue_fields`（`{text, speaker, utt_id, reply_to}`，specs/task-management/013-task-new/spec.md FR-002c-10）非 `null` 時，整合預覽每則發言一列，顯示發言者、`#` 加發言編號與發言文字；所有發言皆可標記，不得截斷。發言編號取 `dialogue_fields.utt_id` 指向的子欄位值，未設定時為該則的位置編號（自 1 起）。
2. **座標資料契約**：在對話串內標記的實體 MUST 記為 `{text, type, utt_id, start, end}`，`start`／`end` 為**該則發言文字內**的半開區間 `[start, end)`（`end = start + text.length`），與 FR-098、FR-024A-3 同一座標語意。關係識別的三元組 MUST 於 `subjStart`／`subjEnd`／`objStart`／`objEnd` 之外攜帶 `subjUttId`、`objUttId`。
3. **跨發言**：反白起訖落在不同則發言 MUST 被拒絕，顯示提示且不新增實體或關係選取；跨發言的關聯 MUST 以關係識別表達。
4. **原始 JSON 後備（2-C）**：Input 為物件陣列但 `dialogue_fields` 為 `null` 時，整合預覽 MUST 以可摺疊、等寬字的原始 JSON 呈現該 Input 欄位，不得出現 `[object Object]`。
5. **Data Fairness**：對話串與原始 JSON MUST 只渲染角色為 Input 的欄位；Output（如 `gold_triplets`）與 Evidence 不得因此路徑外露（FR-023、FR-024M-1）。
6. **不含端點範圍**：既有非對話路徑的 offset 寫法不在本條範圍（#1341）；本條新增的 `utt_id` 座標一律半開區間。
7. **種子合規**：任務 T013 的 `text` 欄位角色 MUST 為「不使用」、`utterances` 為唯一 Input，並設定 `dialogue_fields`（specs/task-management/013-task-new/spec.md FR-002c-2）。
8. **不從 Output 預填**：Input 為物件陣列時，整合預覽 MUST NOT 以 Output 欄位內容（含 `entity1` 形狀與 `subj`／`rel`／`obj` 形狀的三元組）預填關係三元組；與 ABSA 三元組同一處理（AC-2.35、Data Fairness）。
9. **定位規則**：實體已帶 `utt_id`、`start`、`end` 時 MUST 照座標定位；未帶座標時，其文字在整份對話的發言中恰出現一次才定位到該位置；出現多次或找不到時 MUST NOT 猜測（不得取第一次出現的位置），該實體不標示，並顯示「無法定位」提示與數量。
10. **重疊實體**：同一則發言內區間重疊的實體，後者 MUST NOT 默默略過；儲存格式不變，畫面 MUST 顯示因重疊而未標示的實體數。
11. **發言版面（草圖 2-A）**：對話串每則發言 MUST 顯示頭像、標頭行與發言文字三部分：頭像為圓形、取發言者文字的第一個字元（`dialogue_fields.speaker` 為 `null` 或該則發言者為空時不顯示頭像）；標頭行依序顯示發言者與 `#` 加發言編號；發言文字 MUST 另起一行並保留換行。頭像底色由發言者文字決定（同一發言者同一顏色），不得依發言者名稱硬編顏色。
12. **回覆縮排與回應標記**：`dialogue_fields.reply_to` 非 `null`，且該則發言的 `reply_to` 子欄位值等於**同一樣本內另一則**發言的發言編號時，該則發言 MUST 縮排並顯示「跨發言 · 回應 #n」標記（`n` 為被回覆發言的發言編號，英文介面為 `Cross-turn · replies to #n`）。`reply_to` 為 `null`、該則的值缺漏或為空、值找不到對應發言、或值等於該則自己的發言編號時，MUST NOT 縮排也 MUST NOT 顯示標記。MUST NOT 由實體、關係或 `@名字` 文字推測回覆關係；`dialogue_fields` 缺少 `reply_to` 鍵時視同 `null`。
13. **顯示切換**：對話串上方 MUST 提供「顯示已標實體」與「純文字」兩個按鈕（以 `aria-pressed` 表示目前模式），預設為「顯示已標實體」。「純文字」模式下發言文字不繪製實體標示與關係選取標示，已記錄的實體資料不變，反白標記仍可進行。

14. **不從 Output 預填實體**：Input 為物件陣列（對話）時，整合預覽 MUST NOT 以角色為 Output 的欄位內容預填實體；資料自帶的 `entities` 照常載入。守門 MUST 沿用既有的物件陣列 Input 判斷，不另立判斷。Input 非物件陣列的任務，既有預填行為 MUST 不變（Data Fairness，承接 #1358 裁定 1 之範圍外項目）。
15. **反白歧義提示**：反白選取的 DOM 位置與發言文字不符，而該選取文字在該則發言中出現多次（或找不到）時，MUST NOT 取第一次出現的位置，且 MUST 顯示專屬的反白歧義提示（中英文案，不得顯示未替換的 `{n}` 佔位符）；僅在該則發言中恰出現一次時，才以該唯一位置記錄。

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

#### Scenario: AC-2.36 物件陣列 Input 不從 Output 預填關係三元組

- **GIVEN** 任務 Input 為物件陣列（對話），資料另有角色為 Output 的欄位含 `entity1` 形狀或 `subj`／`rel`／`obj` 形狀的三元組
- **WHEN** 開啟整合預覽
- **THEN** 不預填任何關係三元組
- **AND** 頁面文字不含該 Output 欄位的內容

#### Scenario: AC-2.37 無座標時只在唯一位置定位

- **GIVEN** 某實體無 `utt_id`、`start`、`end`，其文字在整份對話的發言中恰出現一次
- **WHEN** 開啟整合預覽
- **THEN** 該實體標示在該唯一位置，且座標為該則發言內的半開區間
- **AND** 若該文字出現多次，則不標示該實體，顯示「無法定位」提示與數量，不取第一次出現的位置；已帶座標者照座標定位

#### Scenario: AC-2.38 重疊實體顯示未標示數量

- **GIVEN** 同一則發言內有兩個區間重疊的實體
- **WHEN** 開啟整合預覽
- **THEN** 儲存的實體資料不變
- **AND** 畫面顯示因重疊而未標示的實體數

#### Scenario: SC-029 座標以發言編號為單位且與 FR-098 同語意

- **GIVEN** 對話串內標記的任一實體
- **WHEN** 讀取其 `utt_id`、`start`、`end`
- **THEN** 發言文字 `slice(start, end)` 等於該實體 `text`
- **AND** `start`、`end` 皆不超出該則發言文字長度

#### Scenario: AC-2.39 發言版面為頭像、標頭行與另起一行的文字

- **GIVEN** 任務 T013，`dialogue_fields` 含 `speaker` 與 `utt_id`
- **WHEN** 開啟 `annotation-workspace` 的整合預覽
- **THEN** 每則發言顯示頭像（內容為發言者文字的第一個字元）、含發言者與 `#` 加發言編號的標頭行，以及另起一行的發言文字
- **AND** 同一發言者的頭像顏色相同，`speaker` 為 `null` 的對話串不顯示頭像

#### Scenario: AC-2.40 有效 reply_to 的發言縮排並顯示回應標記

- **GIVEN** `dialogue_fields.reply_to` 非 `null`，某則發言的 `reply_to` 值等於同一樣本另一則的發言編號
- **WHEN** 開啟整合預覽
- **THEN** 該則發言縮排，並顯示「跨發言 · 回應 #n」，`n` 為被回覆發言的發言編號
- **AND** 沒有 `reply_to` 值的發言不縮排、不顯示標記

#### Scenario: AC-2.41 無效的 reply_to 不縮排也不標記

- **GIVEN** 某則發言的 `reply_to` 值屬下列之一：缺漏或空值、找不到對應發言、等於該則自己的發言編號；或 `dialogue_fields` 缺少 `reply_to` 鍵
- **WHEN** 開啟整合預覽
- **THEN** 該則發言不縮排，也不顯示回應標記
- **AND** 回覆關係不由實體、關係或 `@名字` 文字推測

#### Scenario: AC-2.42 顯示已標實體與純文字切換

- **GIVEN** 該樣本已有實體標示，兩個切換按鈕預設「顯示已標實體」為 `aria-pressed="true"`
- **WHEN** 按下「純文字」
- **THEN** 發言文字不再繪製實體標示，「純文字」為 `aria-pressed="true"`，且已記錄的實體資料不變
- **AND** 再按「顯示已標實體」後標示恢復

#### Scenario: AC-2.43 T013 種子宣告 reply_to 並有回覆前一則的發言

- **GIVEN** 任務 T013 種子
- **WHEN** 檢視其 `dialogue_fields` 與 `utterances`
- **THEN** `dialogue_fields.reply_to` 非 `null`，且至少一則發言的 `reply_to` 等於前一則的發言編號
- **AND** 所有 `reply_to` 值皆不等於該則自己的發言編號

#### Scenario: AC-2.44 對話 Input 不從 Output 欄位預填實體

- **GIVEN** 任務 Input 為物件陣列（對話），資料的 `entities` 為空，另有角色為 Output 的欄位含 `{text, type}` 形狀的實體陣列
- **WHEN** 開啟整合預覽
- **THEN** 不預填任何實體，`previewEntities` 為空
- **AND** 頁面文字不含該 Output 欄位的內容

#### Scenario: AC-2.45 非對話 Input 的預填行為不變

- **GIVEN** 任務 Input 為字串（非物件陣列），資料的 `entities` 為空，角色為 Output 的欄位含實體陣列；或對話 Input 的資料自帶 `entities`
- **WHEN** 開啟整合預覽
- **THEN** 字串 Input 照既有行為由 Output 欄位預填實體
- **AND** 對話 Input 自帶的 `entities` 照常載入

#### Scenario: AC-2.46 反白歧義顯示專屬提示

- **GIVEN** 反白選取文字在該則發言中出現多次，且反白的 DOM 位置與發言文字不符
- **WHEN** 完成反白
- **THEN** 不新增實體，顯示反白歧義提示（中英各有專屬文案，且不含未替換的 `{n}`）
- **AND** 切換語言後提示文案隨之切換

#### Scenario: AC-2.47 反白 fallback 僅在唯一出現時採用

- **GIVEN** 反白的 DOM 位置與發言文字不符，但選取文字在該則發言中恰出現一次
- **WHEN** 完成反白並已選取實體類型
- **THEN** 新增的實體座標為該唯一出現的位置，`slice(start, end)` 等於選取文字
- **AND** 該文字出現多次時不新增（見 AC-2.46）
