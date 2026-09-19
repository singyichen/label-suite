## MODIFIED Requirements

### Requirement: FR-086 歷程動作常數化

歷程事件之 `action` MUST 取自常數集合，MUST NOT 為自由字串。自 v5.0.0 起集合為：

`HISTORY_ACTIONS = draft_saved | submitted | skipped | modified | accepted | bypassed | adjudicated | exception_resolved | excluded`

各值語意：`draft_saved`（標記員或審核員儲存草稿）、`submitted`（標記員提交）、`skipped`（標記員跳過）、`modified`（審核員直接修正答案）、`accepted`（審核員通過）、`bypassed`（審核員決策為 `無法裁決`）、`adjudicated`（仲裁者裁定，含採 A／採 B／兩者皆非）、`exception_resolved`（專案負責人於最終例外池定案）、`excluded`（專案負責人自資料集排除）。每個值 MUST 對應唯一的徽章語意色，且該對應 MUST 為單一資料來源驅動，MUST NOT 於渲染端逐值硬編分支。每個值 MUST 有對應的產生點。

**v5.0.0 移除**：`rejected` 隨退回機制移除而自集合刪除。v5.0.0 以前寫入的 `rejected` 事件 MUST 原樣保留、MUST NOT 被刪除或改寫，並依既有規則以中性徽章呈現且不中斷渲染（集合外值之相容處置）。

`bypassed` 之徽章文案 MUST 讀自決策值之唯一來源（FR-092 v6.8.0 修訂），MUST NOT 另行手寫。

**v6.8.0 修訂**（issue #811）：`bypassed` 之語意描述由「標記為無法判定」改為「決策為 `無法裁決`」，僅措辭；集合、產生點與徽章語意色不變。

本條一併修訂關鍵實體 `AnnotationHistoryItem`：其 `action` 可能值 MUST 改列上述九值。

#### Scenario: AC-2.16 七種動作各有對應徽章
- **GIVEN** 某樣本歷程依序包含 `HISTORY_ACTIONS` 全部九種動作各一筆
- **WHEN** 檢視 `歷程` 頁籤
- **THEN** 九筆事件各自呈現一個徽章，且九個徽章的語意色兩兩不同
- **AND** 一筆 v5.0.0 以前寫入的 `rejected` 事件（現已為集合外值）以中性徽章原樣呈現，清單其餘事件正常渲染

#### Scenario: AC-2.21 審核通過與修正皆產生歷程事件
- **GIVEN** 審核員對某樣本一個 `outKey` 送出 `通過`、對另一個 `outKey` 送出 `修正`、對第三個 `outKey` 送出 `無法裁決`
- **WHEN** 檢視該樣本 `歷程` 頁籤
- **THEN** 清單分別出現一筆 `accepted`、一筆 `modified` 與一筆 `bypassed` 事件，三者之 `actor_id` 皆為該審核員
- **AND** 該次送出未因此產生重複事件（沿用 FR-016B append-only 與既有重複送出防護）

### Requirement: FR-014B 審核決策控件的 toggle 語意

工作區 reviewer 視圖的逐 outKey 決策控件 MUST 支援 active/inactive 切換；再次點擊當前 active 的選項時，視為取消該筆決策並回到未選取狀態。

自 v5.0.0 起，該控件承載的是 `REVIEW_DECISIONS = approve | modify | bypass` 三向決策（FR-092），不再是 `通過 / 退回` 兩向；`退回` 選項 MUST NOT 渲染。三向決策於兩種 `run_type` 完全一致（FR-053），本條 MUST NOT 再依 `run_type` 分流。

**v6.8.0 修訂**（issue #811）：三向決策之按鈕文案為 `通過`／`修正`／`無法裁決`（FR-092），僅措辭。

#### Scenario: AC-3.51 三向決策控件的 toggle
- **GIVEN** reviewer 開啟一個狀態為 `待審` 的審核單位
- **WHEN** 對某個 outKey 點擊 `通過`
- **THEN** 該 outKey 之 `通過` 呈 active，`修正`／`無法裁決` 呈 inactive，畫面上不存在任何 `退回` 控件
- **AND** 再次點擊 `通過` 時該 outKey 回到未決策狀態

### Requirement: FR-051 審核單位定址與狀態機

審核單位（`ReviewUnit`）MUST 以 `REVIEW_UNIT_DIMENSIONS`（`sample_id × annotator_id × run_type`）定址——同一樣本由 N 位標記員標記即為 N 個各自獨立、狀態互不影響的審核單位。此定址於 `dry_run` 與 `official_run` 完全一致，MUST NOT 依 `run_type` 分流。

自 v5.0.0 起狀態依 `REVIEW_UNIT_STATUS = pending | disputed | finalized`（中文語彙 `待審 / 爭議中 / 已定稿`）單一狀態欄線性推進，判定式為：

1. 標記員未提交 → 不成立審核單位（推導為 null，畫面顯示 `尚無標記提交`）。
2. 該單位之指派審核員尚未送出審核 → `pending`。
3. 審核員送出，且該單位每個 outKey 之決策皆為 `approve` → `finalized`（定稿值即標記員原答案）。
4. 審核員送出，且任一 outKey 之決策為 `modify` 或 `bypass` → `disputed`；該單位之爭議項全部經仲裁裁定（採 A／採 B）或經最終例外池收尾（FR-095）後推導為 `finalized`；任一爭議項仍未解決時維持 `disputed`。
5. 經最終例外池「自資料集排除」處置之單位 MUST NOT 推導為 `finalized`，而以獨立的排除記號呈現且不進入定稿集合（FR-063）。

**v5.0.0 移除**：`approved`／`modified` 兩個過渡態、`min_reviewers` 定稿門檻與「已提交審核員人數 `n`」之計數皆 MUST NOT 再參與推導——一個審核單位恰有一位指派審核員（FR-093），「未達門檻」在結構上不存在。狀態推導 MUST 僅讀取該單位指派審核員之已提交決策與該單位之仲裁／例外池結果；未送出的草稿 MUST NOT 計入。

#### Scenario: AC-4.52 三態狀態機
- **GIVEN** 一個 `official_run` 審核單位，標記員已提交、審核員尚未送出
- **WHEN** 讀取該單位狀態
- **THEN** 狀態為 `待審`
- **AND** 審核員全部 outKey 送出 `通過` 後狀態直接為 `已定稿`，過程中 MUST NOT 出現 `已同意` 或 `已修改`
- **AND** 另一單位之審核員送出任一 `修正` 或 `無法裁決` 後狀態為 `爭議中`，直到仲裁或例外池收尾才轉為 `已定稿`

### Requirement: FR-054 審核決策快捷鍵

工作區 reviewer 模式 MUST 實作決策快捷鍵，作用對象為**當前審核單位的全部輸出類型**：一次按鍵即完成該單位的決策，與 FR-044 的「每個 outKey 一筆決策」送出驗證對齊；介面不提供「目前聚焦輸出類型」的概念，因此 MUST NOT 只決定其中一個 outKey。重複按同一鍵取消回未決策（沿用 FR-014B 的 toggle 語意）。

自 v5.0.0 起快捷鍵集合為：`A` = 通過（`approve`）、`B` = 無法裁決（`bypass`）。**`R` = 退回 MUST 移除**（退回機制已不存在）。`修正`（`modify`）MUST NOT 綁定快捷鍵——快捷鍵作用於當前單位的**全部** outKey，而修正的替代值因 outKey 而異，單一按鍵無法表達；`無法裁決` 是全單位一致的決策故可綁鍵。兩者的必填理由（FR-016A）皆於決策標記後展開，MUST NOT 因快捷鍵而放寬。

下列情況 MUST NOT 觸發：焦點位於 `input` / `textarea` / `select` / contenteditable、按鍵帶有 `Shift` / `Ctrl` / `Cmd` / `Alt` 修飾鍵、以及 `role = annotator`。共用側欄（spec 008）之快捷鍵總覽 MUST 同步移除 `R`、列出 `B`，且 `B` 列之說明文案 MUST 讀自與決策按鈕相同之決策值來源（FR-092 v6.8.0 修訂），MUST NOT 另行手寫；批次快捷鍵 `Shift+A` / `Shift+R` 維持既有之廢止狀態。

#### Scenario: AC-3.54 快捷鍵 A 與 B 可用、R 已移除
- **GIVEN** reviewer 開啟一個 `待審` 審核單位且焦點不在輸入控件上
- **WHEN** 按下 `A`
- **THEN** 該單位全部 outKey 標為 `通過`
- **AND** 按下 `B` 時全部 outKey 標為 `無法裁決`，按下 `R` 時無任何作用且不產生任何決策

### Requirement: FR-061 仲裁版面：逐項二選一與 Reject 出口

工作區 reviewer 視圖 MUST 為爭議池提供**逐項仲裁版面**，切換條件為「該審核單位狀態為 `爭議中`（FR-051）**AND** 目前審核員具仲裁資格（FR-060 兩條件）」——條件成立時整張審核卡切換為仲裁版面，不成立時維持 FR-053 審核卡，兩者互斥、MUST NOT 混渲染：

1. **仲裁者選邊、不重新標記**：仲裁版面呈現標記員答案的唯讀摘要（一致項的脈絡）與逐爭議項的 A／B 選擇；修正控件與決策控件 MUST NOT 渲染——仲裁的產出是「採哪一側」，不是第三份新答案。仲裁 MUST NOT 觸發任何形式的重標。
2. **A／B 取值與 B 的動態渲染**：A ＝ `annotator_value`（標記員原答案）。B ＝ 該單位審核員的答案，其呈現 MUST 依決策來源動態決定：
   - 來源 `modify` → 呈現 `B · 審核員：{修正值}`；採 B 即以該修正值定案。
   - 來源 `bypass` → 呈現 `B · 審核員：無法裁決`（與來源 `modify` 同一組字規則，冒號後改為決策值文案，決策值文案讀自 FR-092 v6.8.0 修訂之唯一來源）；採 B 即**定案為無法判定**，該項之定案值記為無法判定，MUST NOT 回填標記員原答案。
   一個審核單位恰有一位審核員（FR-093），故每個爭議項恰有一個 B 選項，MUST NOT 出現多個 B 或需要合併相同值的情形。
3. **第三出口：兩者皆非（Reject）**：仲裁者判定 A 與 B 皆不可採時 MUST 可選 `兩者皆非`，**理由必填**；送出後該爭議項 MUST 落入最終例外池（FR-095），該單位維持 `爭議中` 直到例外池收尾。
4. **送出與寫入**：所有爭議項皆已裁定（採 A／採 B／兩者皆非）方可送出，未完成時 MUST 阻擋且 MUST NOT 寫入任何狀態。送出時逐項寫入 `votes[]`（`arbiter_id`、`choice`、`voted_at`）與 `finalized_value` / `finalized_by`；`choice` 取值 MUST 為 `ARBITRATION_OUTCOMES = adopt_a | adopt_b | reject`。仲裁狀態以**審核單位**定址（`task_id × run_type × annotator_id × sample_id`），MUST NOT 寫入任何 reviewer bucket——爭議屬於單位本身，任何仲裁者的定案必須對該單位的所有檢視者可見。
5. **仲裁效果說明**：版面 MUST 載明仲裁的效果為「逐爭議項選定定稿值、不重新標記」。

**v5.0.0 移除**：逐項多數決收斂（`DISPUTE_CONVERGENCE_RULE`）、隱含同意票、偶數平手／全數分歧之不收斂情境、以及 issue #551 之「純退回恆不收斂」與「維持退回」語意 MUST 全部移除——單一審核員沒有票數可計，且退回機制已不存在。爭議項 MUST 全數由仲裁者逐項裁定，不存在自動收斂路徑。
**v6.8.0 修訂**（issue #811）：B 選項之 `bypass` 呈現由 `B · 審核員 Bypass（無法判定）` 改為 `B · 審核員：無法裁決`——舊標籤把答案值與決策值兩個概念的名字疊在同一個標籤裡。「採 B 即定案為無法判定」描述的是定案後的值，不在本版改名範圍。

#### Scenario: AC-4.54 B 依來源動態渲染且 Reject 進例外池
- **GIVEN** 一個 `爭議中` 單位含兩個爭議項：項目 1 之審核員決策為 `修正`（改為 `positive`），項目 2 為 `無法裁決`
- **WHEN** 具資格之仲裁者開啟仲裁版面
- **THEN** 項目 1 之 B 選項顯示審核員修正值 `positive`，項目 2 之 B 選項顯示 `審核員：無法裁決`，且不含 `Bypass` 字樣
- **AND** 仲裁者對項目 2 選 `兩者皆非` 且未填理由時送出被阻擋；填妥理由送出後該項出現於最終例外池，該單位狀態維持 `爭議中`

### Requirement: FR-016A 審核修正與 Bypass 的稽核理由

Reviewer 於 `dry_run` 與 `official_run` 執行**直接修正**（`decision = modify`）或**決策為無法裁決**（`decision = bypass`）時，系統 MUST 強制填寫審計理由並記錄；`decision = approve` 時 MUST NOT 要求理由。

理由呈現契約：該 outKey 選定 `修正` 或 `無法裁決` 後，MUST 於同一 `ws-review-row` 內、作答面板之後展開必填理由欄（`<textarea required>`，帶 `data-outkey`）；選 `通過` 或取消決策時 MUST NOT 出現。FR-014N 合併 span 列之每個 outKey 各一欄。理由沿用既有審核提交持久化路徑——reviewer submission payload 於 `decisions` map 旁的 `reasons` map（`{ [outKey]: reason }`）——MUST NOT 另存第二份。

自 v5.0.0 起，本條原涵蓋的 `decision = reject`（退回）已隨退回機制移除（見 FR-014I 之 REMOVED）；既有已寫入的退回理由資料 MUST 原樣保留於歷程中，MUST NOT 被刪除或改寫。

#### Scenario: AC-3.48 退回展開必填理由欄並持久化
- **GIVEN** `role=reviewer` 進入可互動審核單位（任一 `run_type`）
- **WHEN** 對某 outKey 點擊 `修正` 或 `無法裁決`
- **THEN** 該列出現必填理由欄（帶 `data-outkey=<outKey>`）；改點 `通過` 或取消決策後該欄隱藏
- **AND** 填入理由並 reload 後理由與決策一併還原；送出後 reviewer submission `answers.reasons[<outKey>]` 等於所填理由

#### Scenario: AC-3.53 修正與 Bypass 皆須理由，通過不須
- **GIVEN** reviewer 對某 outKey 選擇 `無法裁決` 而未填理由
- **WHEN** 按下送出審核
- **THEN** 送出被阻擋並指名該 outKey 缺少理由，且不寫入任何審核狀態
- **AND** 同一單位另一個選 `通過` 的 outKey 不出現理由欄，亦不因缺理由而阻擋送出

### Requirement: FR-064 審核單位脈絡橫幅

workspace reviewer 視圖 MUST 於審核卡（FR-053）、仲裁版面（FR-061）或唯讀定稿卡（FR-094）上方渲染一個審核單位脈絡橫幅（testid `ws-review-unit-context`），逐審核單位依序呈現：

1. `run_type` 徽章——`dry_run` 為 `試標 R{round}`（`{round}` 取自該任務 `materializedRuns.dry_run.round`，缺值回退為 `1`），`official_run` 為 `正式標記`；
2. 該單位 `REVIEW_UNIT_STATUS` 之**三態** pill（`爭議中` 用 warning／error 色系、`已定稿` 用 success 色系、`待審` 用 info 色系）；標記員未提交時 pill 改顯示 `尚無標記提交`；
3. 開啟審核流程抽屜的觸發鈕（`ws-review-flow-trigger`，文案 `了解審核流程`／`Review flow`），抽屜（桌機靠右側邊、`< 768px` 全寬 modal，`ws-review-flow-drawer`）內渲染審核狀態軌；抽屜重用既有 `.modal-overlay` 覆蓋層與 `LabelSuiteModalFocus` 焦點陷阱，MUST NOT 另立第二套；
4. 可互動單位再於其後掛 FR-070 之審核說明 Tooltip。

**v5.0.0 移除**：`定稿門檻 {x} / {n} 位審核員` chip（`.rv-unit-threshold`）MUST 移除——一個審核單位恰有一位審核員（FR-093），沒有門檻可陳述。橫幅之主題界定維持「審核模型」（`run_type`、狀態、狀態軌），身分不屬之。

**狀態軌（抽屜內）**：MUST 依 FR-051 三態渲染，節點恰為 `待審`／`爭議中`／`已定稿`（`role="listitem"` 恰 3 個），MUST NOT 渲染 `已同意`／`已修改`。分軌版式維持——`待審` 之後分為全同軌（`通過` 直達 `已定稿`）與差異軌（`修正`／`無法裁決` → `爭議中` → `已定稿`），`已定稿` 自兩軌皆可達，軌別由資料層推導（`getReviewUnitLane()` 回傳 `'same'`／`'differing'`／`null`，與狀態推導共用同一述詞）。分支條件 MUST 以文字標籤（`.review-track-branch`，`data-branch` 攜帶條件鍵）渲染於連接線上，取值為 `審核通過`／`修正或無法裁決`／`仲裁後` 三者；分支標籤 MUST NOT 帶 `aria-hidden`，亦 MUST NOT 帶 `role="listitem"`。`done` 之語意為「位於該單位所屬軌上、且排在目前位置之前的節點」（路線，非訪問紀錄），MUST 以非顏色訊號（加粗）標示。`getReviewUnitStatus` 為 null 時 MUST NOT 渲染狀態軌，亦 MUST NOT 渲染觸發鈕。

#### Scenario: AC-4.37 橫幅子元素序列不因提示改變
- **GIVEN** 任一成立且可互動的審核單位以 reviewer 身分開啟
- **WHEN** 脈絡橫幅與角色相依行動提示皆渲染
- **THEN** 橫幅子元素依序恰為 `.rv-unit-chip.rv-unit-run`、`.rv-unit-state`、`.rv-flow-trigger`、`.rv-review-note`，`.rv-unit-threshold` 不存在
- **AND** `.rv-action-hint` 仍不在橫幅之內

#### Scenario: AC-4.55 橫幅無門檻 chip 且狀態軌為三節點
- **GIVEN** reviewer 開啟任一成立的審核單位
- **WHEN** 檢視橫幅並開啟審核流程抽屜
- **THEN** 橫幅子元素依序為 `run_type` 徽章、三態 pill、抽屜觸發鈕（可互動單位另有說明 Tooltip），且不存在任何定稿門檻元素
- **AND** 抽屜內狀態軌恰 3 個 `role="listitem"` 節點，分支標籤為 `審核通過`／`修正或無法裁決`／`仲裁後`

### Requirement: FR-070 審核決策說明必須與真實效果一致

審核說明（`ws-review-note`）MUST 以 `design/system/MASTER.md` §Tooltip 規格呈現——預設隱藏、由真實 `<button>` 觸發、內容以 `role="tooltip"` 泡泡承載並由 `aria-describedby` 關聯，MUST NOT 使用原生 `title` 屬性。渲染位置為 FR-064 橫幅之內、緊接 `ws-review-flow-trigger` 之後（該單位無觸發鈕時為橫幅末項），於審核單位層級、審核卡堆疊之上、不在任何審核卡之內；每個審核單位恰渲染一次。

說明內容 MUST 逐字對應 `REVIEW_DECISIONS` 三向決策的真實效果，MUST NOT 描述任何已不存在的機制：

1. `通過` → 該項直接定稿（`official_run` 即成為最終答案）；
2. `修正` → 修正**不會立即生效**，該項進入爭議池待仲裁；
3. `無法裁決` → 同樣進入爭議池，仲裁者採 B 即定案為無法判定；
4. 兩種 `run_type` 皆**不退回重標**；
5. `dry_run` 之定稿不產生最終答案，只彙總一致性與被修改率。

說明 MUST NOT 出現「退回」「退回理由」「重新標記」「定稿門檻」「多數決」等字樣。

#### Scenario: AC-3.40 兩種 run_type 皆不出現理由可見性句
- **GIVEN** `role=reviewer`、`run_type=official_run`
- **WHEN** 檢視 `ws-review-note-bubble`
- **THEN** 文字不含「退回理由會顯示給標記員」；切換 `run_type=dry_run` 後同樣不含
- **AND** 兩種 `run_type` 之文案僅在「試標之定稿不產生最終答案」一句上不同，其餘逐字相同

#### Scenario: 說明文案與三向決策一致
- **GIVEN** reviewer 開啟一個可互動的審核單位
- **WHEN** 觸發審核說明 Tooltip
- **THEN** 泡泡逐項說明通過／修正／無法裁決三者的效果並載明兩種 run_type 皆不退回重標
- **AND** 泡泡文字不含「退回」「重新標記」「定稿門檻」「多數決」任一字樣

### Requirement: FR-083 送出阻擋同時指名缺理由之決策

送出驗證 MUST 為「每個 outKey 一筆決策，且 `修正` 與 `無法裁決` 者皆有非空理由（FR-016A），且 `修正` 者之修正後答案非空」。阻擋 toast MUST 指名全部阻擋之 outKey（多筆以「、」串接）：存在尚未決策者時沿用 `toastSelectDecision`；全部阻擋皆為缺理由時使用缺理由文案（鍵 `toastReasonRequired`，zh 文案 `請填寫以下輸出類型的審核理由：{list}`）。三類 outKey 之推導 MUST 與送出驗證共用同一份逐 outKey 判定，MUST NOT 另建第二份計算。

存在缺理由之決策時「送出審核」按鈕 MUST 帶 `data-submit-blocked="reason"` 以呈現停用外觀，且 MUST NOT 使用 `disabled` 或 `aria-disabled`（兩者皆會攔下點擊，使 toast 無法指名 outKey）。

**v5.0.0 修訂**：原文之判定對象「退回者」改為「`修正` 與 `無法判定` 者」——退回決策已移除（FR-092）；缺理由文案 MUST NOT 再出現「退回理由」字樣。

**v6.5.0 修訂**（issue #818）：逐 outKey 判定之回傳值集合自兩類阻擋擴為三類，新增「決策為 `修正` 但修正後答案為空」。此前該不變式僅存在於實作註解（「`values[outKey]` 只在 `修正` 時存在，`無法判定` 刻意不存值」），從未由任何條文強制，故一筆空的 `修正` 可被寫入儲存層，於資料層與 `無法判定` 無從區辨。
**v6.8.0 修訂**（issue #811）：缺理由文案之鍵名定為 `toastReasonRequired`、文案定為 `請填寫以下輸出類型的審核理由：{list}`。鍵名不含 `Reject`：退回決策已於 v5.0.0 移除，且與同一判定之第三類阻擋鍵 `toastAnswerRequired` 命名一致；文案保留「審核理由」以指明所缺之理由種類。判定對象之措辭同步為 `無法裁決`，送出驗證本身不變。

#### Scenario: AC-3.47 缺理由阻擋送出並指名 outKey
- **GIVEN** `role=reviewer` 對 `single_label` 點 `無法裁決` 但未填理由
- **WHEN** 點擊「送出審核」
- **THEN** 送出中止，toast 指名 `single_label` 且文案不含「退回」字樣，`ws-review-submit-btn` 帶 `data-submit-blocked="reason"`
- **AND** toast 文案為 `請填寫以下輸出類型的審核理由：single_label`
- **AND** 填入理由後該屬性移除，再送出成功

#### Scenario: AC-3.59 決策為修正但修正後答案為空時阻擋送出
- **GIVEN** `role=reviewer` 之審核單位中，某 outKey 已選 `修正` 且已填妥非空理由，惟其直接修正控件之當前答案為空
- **WHEN** 點擊「送出審核」
- **THEN** 送出 MUST 中止，該 outKey MUST 列入同一份阻擋清單並由 toast 指名，MUST NOT 有任何審核提交被寫入
- **AND** 此第三類阻擋 MUST 由既有逐 outKey 判定同一份推導產生，其回傳值集合 MUST 擴充而非於其外另設旁路；阻擋清單之唯一來源 MUST NOT 因本版新增而變成兩份
- **AND** 決策為 `無法裁決` 且答案為空時 MUST NOT 阻擋——`無法裁決` 依設計不寫入答案值，其空值為契約而非缺漏，兩者 MUST 分別判定

### Requirement: FR-092 審核員三向決策

審核員對審核單位每個 outKey 的決策 MUST 取自 `REVIEW_DECISIONS = approve | modify | bypass`（中文語彙 `通過`／`修正`／`無法裁決`），三者為全部出口，系統 MUST NOT 提供第四種決策：

1. `approve`（通過）：該 outKey 之定稿值即標記員原答案。該單位全部 outKey 皆為 `approve` 時，單位直接推導為 `已定稿`（FR-051）。
2. `modify`（直接修正）：審核員於作答控件上直接改答案，並依 FR-016A 填寫必填理由。**修正 MUST NOT 立即生效**——該 outKey 之差異成為爭議項（FR-059），單位推導為 `爭議中`，待仲裁裁定方定案。
3. `bypass`（無法裁決）：審核員表示自己無法裁決該 outKey，並依 FR-016A 填寫必填理由。該 outKey MUST 成為爭議項，其審核員側值 MUST 記為「無法判定」而非任何具體答案值——`bypass` MUST NOT 被推導為「與標記員答案相同」，亦 MUST NOT 使單位推導為 `已定稿`。

送出審核前，該單位每個 outKey MUST 恰有一筆決策（FR-044），未完成時 MUST 阻擋送出並指名缺項（FR-083）。

**v6.8.0 修訂**（issue #811）：**同字二義拆分**。「無法判定」原同時承載兩個概念，本版起分為兩套顯示語彙：

- **答案值**（標記員對某 outKey 宣告無法作答，`OutputAnswer.bypass`，由 `allow_bypass` 控制）：zh `無法判定 (Bypass)`／en `Unable to determine (Bypass)`。消費面為任務設定、task-new 預覽 chip、作答與修正面板、清單 pill。
- **決策值**（本條之 `bypass`）：zh `無法裁決`／en `Cannot adjudicate`。消費面為決策按鈕、歷程 `bypassed` 徽章（FR-086）、共用側欄快捷鍵總覽之 `B` 列（FR-054）、仲裁 B 選項（FR-061）、定稿卡微型歷程（FR-094）。

兩套語彙 MUST 各自恰有一個 i18n 來源，上列消費面 MUST 讀自該來源，MUST NOT 另行手寫副本；答案值與決策值 MUST NOT 互相取代。描述定案結果之「無法判定」（FR-061 採 B 之定案值、FR-063、FR-095、FR-097）描述的是定案後的值，不在本版拆分範圍。本版不改 `REVIEW_DECISIONS` 識別字、決策集合或任何行為。

**明確不存在的出口**：`reject`（退回）MUST NOT 存在於任何 `run_type`。審核員 MUST NOT 有任何使標記員重新標記該樣本的通道。

#### Scenario: 修正不立即生效而進入爭議池
- **GIVEN** 一個 `待審` 審核單位，其審核員將某 outKey 由 `neutral` 直接改為 `positive` 並填妥理由
- **WHEN** 送出審核
- **THEN** 該單位狀態為 `爭議中`，該 outKey 之定稿值尚未產生
- **AND** 該 outKey 出現於爭議池，A 側為 `neutral`、B 側為 `positive`

#### Scenario: Bypass 不得被視為同意
- **GIVEN** 一個審核單位之審核員對全部 outKey 選 `無法裁決` 並填妥理由
- **WHEN** 送出審核
- **THEN** 該單位狀態為 `爭議中`，MUST NOT 推導為 `已定稿`
- **AND** 每個 outKey 之爭議項 B 側呈現為「審核員：無法裁決」，而非標記員的原答案值

#### Scenario: 答案值與決策值各自同源且互不混用
- **GIVEN** 某標記員對一個 outKey 宣告 `無法判定 (Bypass)`，其審核員對同一 outKey 選 `無法裁決`
- **WHEN** 分別檢視審核卡、仲裁版面、歷程頁籤與共用側欄快捷鍵總覽
- **THEN** 標記員原答案處顯示 `無法判定 (Bypass)`，決策按鈕、仲裁 B 選項、`bypassed` 徽章與快捷鍵 `B` 說明皆顯示 `無法裁決`
- **AND** 切換為英文時分別為 `Unable to determine (Bypass)` 與 `Cannot adjudicate`，且兩組字串皆等於同一個 i18n 來源所定義之值

### Requirement: FR-094 純文字定稿結果卡與微型衝突歷程

審核單位狀態為 `已定稿`（FR-051）時，工作區 MUST 以**純文字唯讀結果卡**（`ws-review-finalized-card`）呈現定案內容：

1. **純文字，不渲染控件**：每個 outKey 之定稿值 MUST 以純文字呈現，MUST NOT 渲染任何作答控件（含 `disabled` 狀態的控件）——disabled 控件在視覺上仍宣稱「這裡本來可以操作」，與全面唯讀的語意相衝突。
2. **微型衝突歷程**：卡上 MUST 附一行灰字微型衝突歷程（testid `ws-finalized-trace`），以緊湊符號串接該單位的責任鏈，例如 `歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B`；來源為 `bypass` 時該段呈現為 `審核 B（無法裁決）`（文案沿用決策值來源，FR-092 v6.8.0 修訂），經例外池收尾時末段為 `例外池 {處置}`。完整帳號 MUST 於 hover／focus 時展開（沿用 §Tooltip 規格，MUST NOT 使用原生 `title` 屬性）。
3. **由既有資料層推導**：微型歷程 MUST 由該單位既有的審核決策、仲裁裁定與例外池處置推導，MUST NOT 另存第二份，MUST NOT 引入任何任務 ID 或帳號的硬編碼判斷。

本條取代已移除之 FR-069（逐位審核員投票明細）：單一審核員模型下不存在「逐位投票」，責任鏈才是定稿後真正需要被看見的資訊。

#### Scenario: 定稿卡為純文字且附微型歷程
- **GIVEN** 一個經審核員修正、仲裁採 B 而定稿的單位
- **WHEN** 開啟該單位
- **THEN** 每個 outKey 之定稿值以純文字呈現，頁面上該卡片內不存在任何作答控件（含 disabled 者）
- **AND** 卡上出現一行微型歷程 `歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B`，hover 後展開對應的完整帳號
