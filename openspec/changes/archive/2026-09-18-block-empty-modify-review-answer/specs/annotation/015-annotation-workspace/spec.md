## MODIFIED Requirements

### Requirement: FR-083 送出阻擋同時指名缺理由之決策

送出驗證 MUST 為「每個 outKey 一筆決策，且 `修正` 與 `無法判定` 者皆有非空理由（FR-016A），且 `修正` 者之修正後答案非空」。阻擋 toast MUST 指名全部阻擋之 outKey（多筆以「、」串接）：存在尚未決策者時沿用 `toastSelectDecision`；全部阻擋皆為缺理由時使用缺理由文案。三類 outKey 之推導 MUST 與送出驗證共用同一份逐 outKey 判定，MUST NOT 另建第二份計算。

存在缺理由之決策時「送出審核」按鈕 MUST 帶 `data-submit-blocked="reason"` 以呈現停用外觀，且 MUST NOT 使用 `disabled` 或 `aria-disabled`（兩者皆會攔下點擊，使 toast 無法指名 outKey）。

**v5.0.0 修訂**：原文之判定對象「退回者」改為「`修正` 與 `無法判定` 者」——退回決策已移除（FR-092）；缺理由文案 MUST NOT 再出現「退回理由」字樣。

**本版修訂**：逐 outKey 判定之回傳值集合自兩類阻擋擴為三類，新增「決策為 `修正` 但修正後答案為空」。此前該不變式僅存在於實作註解（「`values[outKey]` 只在 `修正` 時存在，`無法判定` 刻意不存值」），從未由任何條文強制，故一筆空的 `修正` 可被寫入儲存層，於資料層與 `無法判定` 無從區辨。

#### Scenario: AC-3.47 缺理由阻擋送出並指名 outKey
- **GIVEN** `role=reviewer` 對 `single_label` 點 `無法判定` 但未填理由
- **WHEN** 點擊「送出審核」
- **THEN** 送出中止，toast 指名 `single_label` 且文案不含「退回」字樣，`ws-review-submit-btn` 帶 `data-submit-blocked="reason"`
- **AND** 填入理由後該屬性移除，再送出成功

#### Scenario: 決策為修正但修正後答案為空時阻擋送出
- **GIVEN** `role=reviewer` 之審核單位中，某 outKey 已選 `修正` 且已填妥非空理由，惟其直接修正控件之當前答案為空
- **WHEN** 點擊「送出審核」
- **THEN** 送出 MUST 中止，該 outKey MUST 列入同一份阻擋清單並由 toast 指名，MUST NOT 有任何審核提交被寫入
- **AND** 此第三類阻擋 MUST 由既有逐 outKey 判定同一份推導產生，其回傳值集合 MUST 擴充而非於其外另設旁路；阻擋清單之唯一來源 MUST NOT 因本版新增而變成兩份
- **AND** 決策為 `無法判定` 且答案為空時 MUST NOT 阻擋——`無法判定` 依設計不寫入答案值，其空值為契約而非缺漏，兩者 MUST 分別判定
