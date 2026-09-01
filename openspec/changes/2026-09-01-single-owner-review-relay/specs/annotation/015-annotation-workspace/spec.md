## RENAMED Requirements

- FROM: `### Requirement: FR-016A 審計理由擴及所有退回`
- TO: `### Requirement: FR-016A 審核修正與 Bypass 的稽核理由`

- FROM: `### Requirement: FR-064 審核單位脈絡橫幅——第 7 點第 6 項範圍註記`
- TO: `### Requirement: FR-064 審核單位脈絡橫幅`

- FROM: `### Requirement: FR-070 第 6 點 \`official_run\` 文案說明理由可見性`
- TO: `### Requirement: FR-070 審核決策說明必須與真實效果一致`

- FROM: `### Requirement: FR-083 送出阻擋同時指名缺理由之退回`
- TO: `### Requirement: FR-083 送出阻擋同時指名缺理由之決策`

## MODIFIED Requirements

### Requirement: FR-014B 審核決策控件的 toggle 語意

工作區 reviewer 視圖的逐 outKey 決策控件 MUST 支援 active/inactive 切換；再次點擊當前 active 的選項時，視為取消該筆決策並回到未選取狀態。

自 v5.0.0 起，該控件承載的是 `REVIEW_DECISIONS = approve | modify | bypass` 三向決策（FR-092），不再是 `通過 / 退回` 兩向；`退回` 選項 MUST NOT 渲染。三向決策於兩種 `run_type` 完全一致（FR-053），本條 MUST NOT 再依 `run_type` 分流。

#### Scenario: AC-3.51 三向決策控件的 toggle
- **GIVEN** reviewer 開啟一個狀態為 `待審` 的審核單位
- **WHEN** 對某個 outKey 點擊 `通過`
- **THEN** 該 outKey 之 `通過` 呈 active，`修正`／`無法判定` 呈 inactive，畫面上不存在任何 `退回` 控件
- **AND** 再次點擊 `通過` 時該 outKey 回到未決策狀態

### Requirement: FR-016A 審核修正與 Bypass 的稽核理由

Reviewer 於 `dry_run` 與 `official_run` 執行**直接修正**（`decision = modify`）或**標記為無法判定**（`decision = bypass`）時，系統 MUST 強制填寫審計理由並記錄；`decision = approve` 時 MUST NOT 要求理由。

理由呈現契約：該 outKey 選定 `修正` 或 `無法判定` 後，MUST 於同一 `ws-review-row` 內、作答面板之後展開必填理由欄（`<textarea required>`，帶 `data-outkey`）；選 `通過` 或取消決策時 MUST NOT 出現。FR-014N 合併 span 列之每個 outKey 各一欄。理由沿用既有審核提交持久化路徑——reviewer submission payload 於 `decisions` map 旁的 `reasons` map（`{ [outKey]: reason }`）——MUST NOT 另存第二份。

自 v5.0.0 起，本條原涵蓋的 `decision = reject`（退回）已隨退回機制移除（見 FR-014I 之 REMOVED）；既有已寫入的退回理由資料 MUST 原樣保留於歷程中，MUST NOT 被刪除或改寫。

#### Scenario: AC-3.48 退回展開必填理由欄並持久化
- **GIVEN** `role=reviewer` 進入可互動審核單位（任一 `run_type`）
- **WHEN** 對某 outKey 點擊 `修正` 或 `無法判定`
- **THEN** 該列出現必填理由欄（帶 `data-outkey=<outKey>`）；改點 `通過` 或取消決策後該欄隱藏
- **AND** 填入理由並 reload 後理由與決策一併還原；送出後 reviewer submission `answers.reasons[<outKey>]` 等於所填理由

#### Scenario: AC-3.53 修正與 Bypass 皆須理由，通過不須
- **GIVEN** reviewer 對某 outKey 選擇 `無法判定` 而未填理由
- **WHEN** 按下送出審核
- **THEN** 送出被阻擋並指名該 outKey 缺少理由，且不寫入任何審核狀態
- **AND** 同一單位另一個選 `通過` 的 outKey 不出現理由欄，亦不因缺理由而阻擋送出

### Requirement: FR-044 審核列的呈現與 seed 來源

Reviewer 審查列 MUST 僅呈現**受審標記員本人**的提交，MUST NOT 渲染標記分布統計盒（`ws-review-stats`）、批次操作列、FR-014A 之偏差著色，或多標記員清單（`ws-review-annotator-list`）——MUST NOT 以空殼 DOM 形式存在，須完全不渲染。標記員答案 MUST 直接帶入修正/作答控制項（該控制項同時作為顯示與編輯用途，不另外呈現唯讀答案列）。

決策控制 MUST 置於該輸出類型標題列右側（卡片語意 = 單一審查項目），其選項自 v5.0.0 起為 `REVIEW_DECISIONS` 三向（FR-092）。「送出審核」驗證維持「每個 outKey 皆須有決策」，範圍為單一標記員。

**v5.0.0 移除**：原文末段「退回後回退為待標記並保留原答案供修改之機制沿用 FR-014I／AC-3.15」隨退回機制移除而失效——兩種 `run_type` 皆 MUST NOT 提供任何使標記員重新標記的通道。seed 來源規則（真實提交 → FR-044a 示範遞補）不變。

#### Scenario: AC-6.11 正式標記不再產生重標待辦
- **GIVEN** `run_type = official_run` 的一筆樣本，其審核員對某 outKey 送出 `修正`
- **WHEN** 該樣本的標記員回到工作區
- **THEN** 該樣本 MUST NOT 出現於其待辦，狀態 MUST NOT 回退為 `待標記`，畫面上不存在重標理由橫幅

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
- **AND** 另一單位之審核員送出任一 `修正` 或 `無法判定` 後狀態為 `爭議中`，直到仲裁或例外池收尾才轉為 `已定稿`

### Requirement: FR-053 審核卡版面、空單位閘門與定稿卡

工作區 reviewer 審核卡 MUST 對兩種 `run_type` 渲染**同一套版面**，MUST NOT 存在任何依 `run_type` 分流的呈現分支。版面契約：每個 outKey 一列（span 型別依 FR-014N 合併為一列），列內僅有作答/修正控件與其上的一組 `REVIEW_DECISIONS` 三向決策控件（FR-092），無型別標題（FR-014P）；seed 來源為受審標記員本人答案（FR-044、FR-044a）；送出驗證為「每個 outKey 一筆決策」（FR-044）。

**空審核單位閘門**：審核單位「真空」——受審標記員無儲存提交（FR-051 推導為 null）**且**該樣本無 `REVIEWER_MOCK_ROWS` 遞補列——時，本條版面 MUST NOT 渲染決策控件、修正控件與送出按鈕，改渲染空狀態卡（`ws-review-empty-unit`）並保持送出按鈕隱藏（FR-058 快捷鍵同步失效）；「真空」判定 MUST 與 FR-064 橫幅顯示 `尚無標記提交` 的判定同源。

**已定稿單位鎖定**：審核單位狀態推導為 `已定稿`（FR-051）時，本條版面 MUST NOT 渲染決策、修正或送出控件，改渲染 FR-094 之**純文字唯讀結果卡**；`handleReviewSubmit()` 之同源守衛於**進入時**判定，促成定稿的那一筆送出本身不受影響。已定稿單位**全面唯讀**——無決策、無直接修正、無送出；重啟流程延後至後端階段，原型 MUST NOT 發明任何解鎖入口。中間狀態（`待審`／`爭議中`）不受本鎖定影響。

`dry_run` 原有之共識模型元件（`ws-review-stats`、`ws-review-consensus-badge`、`ws-review-apply-majority`、`ws-review-annotator-list` / `ws-review-annotator-row`、`ws-review-set-draft`、`ws-review-source-text`）MUST 完全不渲染，MUST NOT 以空殼 DOM 形式存在。

#### Scenario: AC-3.52 已定稿單位渲染純文字唯讀卡
- **GIVEN** 一個狀態為 `已定稿` 的審核單位
- **WHEN** reviewer 開啟該單位
- **THEN** 畫面渲染純文字唯讀結果卡，不存在任何 disabled 或 enabled 的作答控件、決策控件與送出按鈕
- **AND** 卡上呈現 FR-094 之單行微型衝突歷程

### Requirement: FR-054 審核決策快捷鍵

工作區 reviewer 模式 MUST 實作決策快捷鍵，作用對象為**當前審核單位的全部輸出類型**：一次按鍵即完成該單位的決策，與 FR-044 的「每個 outKey 一筆決策」送出驗證對齊；介面不提供「目前聚焦輸出類型」的概念，因此 MUST NOT 只決定其中一個 outKey。重複按同一鍵取消回未決策（沿用 FR-014B 的 toggle 語意）。

自 v5.0.0 起快捷鍵集合為：`A` = 通過（`approve`）、`B` = 無法判定（`bypass`）。**`R` = 退回 MUST 移除**（退回機制已不存在）。`修正`（`modify`）MUST NOT 綁定快捷鍵——修正必然伴隨值的輸入與必填理由（FR-016A），一次按鍵無法完成，綁定快捷鍵只會產生一個必定被阻擋的送出。

下列情況 MUST NOT 觸發：焦點位於 `input` / `textarea` / `select` / contenteditable、按鍵帶有 `Shift` / `Ctrl` / `Cmd` / `Alt` 修飾鍵、以及 `role = annotator`。共用側欄（spec 008）之快捷鍵總覽 MUST 同步移除 `R`、列出 `B`；批次快捷鍵 `Shift+A` / `Shift+R` 維持既有之廢止狀態。

#### Scenario: AC-3.54 快捷鍵 A 與 B 可用、R 已移除
- **GIVEN** reviewer 開啟一個 `待審` 審核單位且焦點不在輸入控件上
- **WHEN** 按下 `A`
- **THEN** 該單位全部 outKey 標為 `通過`
- **AND** 按下 `B` 時全部 outKey 標為 `無法判定`，按下 `R` 時無任何作用且不產生任何決策

### Requirement: FR-055 annotation-list reviewer 清單粒度

`annotation-list` reviewer 視圖的清單粒度 MUST 為**審核單位**（`REVIEW_UNIT_DIMENSIONS`，FR-051）——同一樣本由 N 位標記員標記即渲染為 N 個連續資料列，兩種 `run_type` 完全一致，MUST NOT 存在任何依 `run_type` 分流的清單分支。

每列 MUST 呈現：樣本 ID、該列標記員帳號、該審核單位的 `REVIEW_UNIT_STATUS`、完成時間、文本摘要、**該標記員本人**的逐輸出類型答案摘要 tag，以及該樣本的跨標記員標記分布統計（統計單位仍為樣本，故同一樣本各列數值相同）。分頁總筆數計審核單位數。

狀態篩選選項 MUST 依角色由對應常數推導，MUST NOT 於選單硬編狀態清單：自 v5.0.0 起 reviewer 為 `REVIEW_UNIT_STATUS` **三態**（`待審`／`爭議中`／`已定稿`），annotator 維持既有三態。導頁（列點擊與行動按鈕）MUST 帶出該列的 `annotator_id`，使工作區審核卡開在同一審核單位。

展開控制項與標記員明細列、逐列決策控件、清單層級 `送出審核` 按鈕維持既有之廢止狀態，testid 與 i18n key 保留不重用。

#### Scenario: AC-1.26 狀態篩選為三態
- **GIVEN** reviewer 開啟 `annotation-list`
- **WHEN** 展開狀態篩選選單
- **THEN** 選項恰為 `待審`／`爭議中`／`已定稿` 三項，MUST NOT 出現 `已同意` 或 `已修改`

### Requirement: FR-060 仲裁資格與清單入口

`annotation-list` reviewer 視圖中，狀態為 `爭議中`（FR-051）的審核單位列，對**具仲裁資格**的審核員 MUST 將列動作按鈕由 `編輯` 換為 `仲裁`（testid `list-arbitrate-entry`）。仲裁資格＝以下兩條件**同時**成立：

1. **名冊勾選**：該審核員已被勾選進該任務的仲裁者名冊（`can_arbitrate`；勾選來源為 014 之審核設定，見 014 FR-010s）；
2. **非當事人**：該審核員於該審核單位**沒有自己的審核提交**——產生爭議的參與者不得仲裁自己參與的爭議。

不符資格者維持 `編輯`；非 `爭議中` 之列對任何人皆 MUST NOT 出現 `仲裁`。`仲裁` 與 `編輯` 導向**同一**工作區網址並攜帶完整審核單位身分，MUST NOT 新增任何網址參數。

**明確不存在的規則**：本規格 MUST NOT 定義、亦 MUST NOT 實作「審核員不得審核自己標記的資料」——非當事人限制**僅**適用於仲裁者。審核指派一律由系統把資料平均分給被勾選的審核員（FR-093），不因指派對象恰為該筆的標記員而排除。

#### Scenario: AC-4.53 仲裁資格兩條件
- **GIVEN** 審核員 X 已被勾選進仲裁者名冊且未對某 `爭議中` 單位提交過審核
- **WHEN** X 檢視該列
- **THEN** 該列動作按鈕為 `仲裁`
- **AND** 對該單位已提交審核的審核員 Y（同樣具名冊勾選）看到的是 `編輯`

### Requirement: FR-061 仲裁版面：逐項二選一與 Reject 出口

工作區 reviewer 視圖 MUST 為爭議池提供**逐項仲裁版面**，切換條件為「該審核單位狀態為 `爭議中`（FR-051）**AND** 目前審核員具仲裁資格（FR-060 兩條件）」——條件成立時整張審核卡切換為仲裁版面，不成立時維持 FR-053 審核卡，兩者互斥、MUST NOT 混渲染：

1. **仲裁者選邊、不重新標記**：仲裁版面呈現標記員答案的唯讀摘要（一致項的脈絡）與逐爭議項的 A／B 選擇；修正控件與決策控件 MUST NOT 渲染——仲裁的產出是「採哪一側」，不是第三份新答案。仲裁 MUST NOT 觸發任何形式的重標。
2. **A／B 取值與 B 的動態渲染**：A ＝ `annotator_value`（標記員原答案）。B ＝ 該單位審核員的答案，其呈現 MUST 依決策來源動態決定：
   - 來源 `modify` → 呈現 `B · 審核員：{修正值}`；採 B 即以該修正值定案。
   - 來源 `bypass` → 呈現 `B · 審核員 Bypass（無法判定）`；採 B 即**定案為無法判定**，該項之定案值記為無法判定，MUST NOT 回填標記員原答案。
   一個審核單位恰有一位審核員（FR-093），故每個爭議項恰有一個 B 選項，MUST NOT 出現多個 B 或需要合併相同值的情形。
3. **第三出口：兩者皆非（Reject）**：仲裁者判定 A 與 B 皆不可採時 MUST 可選 `兩者皆非`，**理由必填**；送出後該爭議項 MUST 落入最終例外池（FR-095），該單位維持 `爭議中` 直到例外池收尾。
4. **送出與寫入**：所有爭議項皆已裁定（採 A／採 B／兩者皆非）方可送出，未完成時 MUST 阻擋且 MUST NOT 寫入任何狀態。送出時逐項寫入 `votes[]`（`arbiter_id`、`choice`、`voted_at`）與 `finalized_value` / `finalized_by`；`choice` 取值 MUST 為 `ARBITRATION_OUTCOMES = adopt_a | adopt_b | reject`。仲裁狀態以**審核單位**定址（`task_id × run_type × annotator_id × sample_id`），MUST NOT 寫入任何 reviewer bucket——爭議屬於單位本身，任何仲裁者的定案必須對該單位的所有檢視者可見。
5. **仲裁效果說明**：版面 MUST 載明仲裁的效果為「逐爭議項選定定稿值、不重新標記」。

**v5.0.0 移除**：逐項多數決收斂（`DISPUTE_CONVERGENCE_RULE`）、隱含同意票、偶數平手／全數分歧之不收斂情境、以及 issue #551 之「純退回恆不收斂」與「維持退回」語意 MUST 全部移除——單一審核員沒有票數可計，且退回機制已不存在。爭議項 MUST 全數由仲裁者逐項裁定，不存在自動收斂路徑。

#### Scenario: AC-4.54 B 依來源動態渲染且 Reject 進例外池
- **GIVEN** 一個 `爭議中` 單位含兩個爭議項：項目 1 之審核員決策為 `修正`（改為 `positive`），項目 2 為 `無法判定`
- **WHEN** 具資格之仲裁者開啟仲裁版面
- **THEN** 項目 1 之 B 選項顯示審核員修正值 `positive`，項目 2 之 B 選項顯示 `審核員 Bypass（無法判定）`
- **AND** 仲裁者對項目 2 選 `兩者皆非` 且未填理由時送出被阻擋；填妥理由送出後該項出現於最終例外池，該單位狀態維持 `爭議中`

### Requirement: FR-062 盲審隔離——未提交的審核判斷僅本人可見

審核員對某審核單位**尚未提交**的審核判斷（草稿決策、修正內容、Bypass 標記，及其草稿歷程事件）MUST 僅對該審核員本人可見：其他任何角色——具仲裁資格的審核員、專案負責人、其他審核員——於任何可見的呈現路徑（右欄 `歷程` 頁籤之合併時序清單、審核卡、仲裁版面、清單、最終例外池收尾畫面）皆 MUST NOT 看到他人未提交的判斷；「已有動作」的事實本身即構成污染，MUST NOT 以摘要或去內容化形式呈現。

**已提交**之審核判斷維持既有規則：獨立保存並可依序讀出（FR-049）、以真實 `actor_id` 合併入時序清單（FR-050）、仲裁定案對所有檢視者可見（FR-061）；annotator 之儲存/提交事件為受審內容之一部分，不受本條影響。

**v5.0.0 理由改寫**：本條原以「獨立審核（一式 N 份，審核員互不影響）」為立論；單人接力模型下已無並行審核員，該立論失效。本條之規則**不變**，其現行理由為：草稿是尚未成立的判斷，讓下游決策者（仲裁者、專案負責人）看到未送出的草稿，會使他們對一個作者尚可撤回的立場產生預設立場，且該草稿在歷程中沒有可究責的送出時點。

#### Scenario: 仲裁者看不到審核員未提交的草稿
- **GIVEN** 某審核單位之審核員已存草稿決策但尚未送出
- **WHEN** 具仲裁資格之另一位審核員或專案負責人檢視該單位之任何畫面與歷程
- **THEN** 該草稿決策、修正內容與其草稿歷程事件皆不出現於其可取得的輸出中

### Requirement: FR-063 official_run 定案即產生 gold

`official_run` 之審核單位推導為 `已定稿`（FR-051）時 MUST 產生該樣本的定案答案（gold）；`dry_run` MUST NOT 產生任何樣本層級之定案答案——試標的產物是一致性與被修改率兩項品質指標（FR-096），不是答案。

自 v5.0.0 起定稿值之來源 MUST 為下列四者之一，且 MUST 逐筆記錄其來源與決策者：

1. 審核員 `approve` → 定稿值 = 標記員原答案，決策者 = 該審核員；
2. 仲裁 `adopt_a` → 定稿值 = 標記員原答案，決策者 = 該仲裁者；
3. 仲裁 `adopt_b` → 定稿值 = 審核員修正值，或「無法判定」（來源為 `bypass` 時），決策者 = 該仲裁者；
4. 最終例外池收尾（FR-095）→ 定稿值 = 採 A／採 B／專案負責人自訂答案，決策者 = 該專案負責人。

經最終例外池「自資料集排除」處置之樣本 MUST NOT 產生定案答案、MUST NOT 進入匯出之最終答案集合，但 MUST 保留排除紀錄（處置者、理由、時間）。

#### Scenario: 定稿值可回溯至來源與決策者
- **GIVEN** 一筆 `official_run` 樣本經審核員 `修正`、仲裁者採 B 而定稿
- **WHEN** 讀取該樣本之定案答案
- **THEN** 定案值為審核員的修正值，且記錄之來源為仲裁 `adopt_b`、決策者為該仲裁者
- **AND** 另一筆經例外池「自資料集排除」之樣本不出現於最終答案集合，但其排除紀錄可讀出處置者與理由

### Requirement: FR-064 審核單位脈絡橫幅

workspace reviewer 視圖 MUST 於審核卡（FR-053）、仲裁版面（FR-061）或唯讀定稿卡（FR-094）上方渲染一個審核單位脈絡橫幅（testid `ws-review-unit-context`），逐審核單位依序呈現：

1. `run_type` 徽章——`dry_run` 為 `試標 R{round}`（`{round}` 取自該任務 `materializedRuns.dry_run.round`，缺值回退為 `1`），`official_run` 為 `正式標記`；
2. 該單位 `REVIEW_UNIT_STATUS` 之**三態** pill（`爭議中` 用 warning／error 色系、`已定稿` 用 success 色系、`待審` 用 info 色系）；標記員未提交時 pill 改顯示 `尚無標記提交`；
3. 開啟審核流程抽屜的觸發鈕（`ws-review-flow-trigger`，文案 `了解審核流程`／`Review flow`），抽屜（桌機靠右側邊、`< 768px` 全寬 modal，`ws-review-flow-drawer`）內渲染審核狀態軌；抽屜重用既有 `.modal-overlay` 覆蓋層與 `LabelSuiteModalFocus` 焦點陷阱，MUST NOT 另立第二套；
4. 可互動單位再於其後掛 FR-070 之審核說明 Tooltip。

**v5.0.0 移除**：`定稿門檻 {x} / {n} 位審核員` chip（`.rv-unit-threshold`）MUST 移除——一個審核單位恰有一位審核員（FR-093），沒有門檻可陳述。橫幅之主題界定維持「審核模型」（`run_type`、狀態、狀態軌），身分不屬之。

**狀態軌（抽屜內）**：MUST 依 FR-051 三態渲染，節點恰為 `待審`／`爭議中`／`已定稿`（`role="listitem"` 恰 3 個），MUST NOT 渲染 `已同意`／`已修改`。分軌版式維持——`待審` 之後分為全同軌（`通過` 直達 `已定稿`）與差異軌（`修正`／`無法判定` → `爭議中` → `已定稿`），`已定稿` 自兩軌皆可達，軌別由資料層推導（`getReviewUnitLane()` 回傳 `'same'`／`'differing'`／`null`，與狀態推導共用同一述詞）。分支條件 MUST 以文字標籤（`.review-track-branch`，`data-branch` 攜帶條件鍵）渲染於連接線上，取值為 `審核通過`／`修正或無法判定`／`仲裁後` 三者；分支標籤 MUST NOT 帶 `aria-hidden`，亦 MUST NOT 帶 `role="listitem"`。`done` 之語意為「位於該單位所屬軌上、且排在目前位置之前的節點」（路線，非訪問紀錄），MUST 以非顏色訊號（加粗）標示。`getReviewUnitStatus` 為 null 時 MUST NOT 渲染狀態軌，亦 MUST NOT 渲染觸發鈕。

#### Scenario: AC-4.37 橫幅子元素序列不因提示改變
- **GIVEN** 任一成立且可互動的審核單位以 reviewer 身分開啟
- **WHEN** 脈絡橫幅與角色相依行動提示皆渲染
- **THEN** 橫幅子元素依序恰為 `.rv-unit-chip.rv-unit-run`、`.rv-unit-state`、`.rv-flow-trigger`、`.rv-review-note`，`.rv-unit-threshold` 不存在
- **AND** `.rv-action-hint` 仍不在橫幅之內

#### Scenario: AC-4.55 橫幅無門檻 chip 且狀態軌為三節點
- **GIVEN** reviewer 開啟任一成立的審核單位
- **WHEN** 檢視橫幅並開啟審核流程抽屜
- **THEN** 橫幅子元素依序為 `run_type` 徽章、三態 pill、抽屜觸發鈕（可互動單位另有說明 Tooltip），且不存在任何定稿門檻元素
- **AND** 抽屜內狀態軌恰 3 個 `role="listitem"` 節點，分支標籤為 `審核通過`／`修正或無法判定`／`仲裁後`

### Requirement: FR-070 審核決策說明必須與真實效果一致

審核說明（`ws-review-note`）MUST 以 `design/system/MASTER.md` §Tooltip 規格呈現——預設隱藏、由真實 `<button>` 觸發、內容以 `role="tooltip"` 泡泡承載並由 `aria-describedby` 關聯，MUST NOT 使用原生 `title` 屬性。渲染位置為 FR-064 橫幅之內、緊接 `ws-review-flow-trigger` 之後（該單位無觸發鈕時為橫幅末項），於審核單位層級、審核卡堆疊之上、不在任何審核卡之內；每個審核單位恰渲染一次。

說明內容 MUST 逐字對應 `REVIEW_DECISIONS` 三向決策的真實效果，MUST NOT 描述任何已不存在的機制：

1. `通過` → 該項直接定稿（`official_run` 即成為最終答案）；
2. `修正` → 修正**不會立即生效**，該項進入爭議池待仲裁；
3. `無法判定` → 同樣進入爭議池，仲裁者採 B 即定案為無法判定；
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
- **THEN** 泡泡逐項說明通過／修正／無法判定三者的效果並載明兩種 run_type 皆不退回重標
- **AND** 泡泡文字不含「退回」「重新標記」「定稿門檻」「多數決」任一字樣

### Requirement: FR-086 歷程動作常數化

歷程事件之 `action` MUST 取自常數集合，MUST NOT 為自由字串。自 v5.0.0 起集合為：

`HISTORY_ACTIONS = draft_saved | submitted | skipped | modified | accepted | bypassed | adjudicated | exception_resolved | excluded`

各值語意：`draft_saved`（標記員或審核員儲存草稿）、`submitted`（標記員提交）、`skipped`（標記員跳過）、`modified`（審核員直接修正答案）、`accepted`（審核員通過）、`bypassed`（審核員標記為無法判定）、`adjudicated`（仲裁者裁定，含採 A／採 B／兩者皆非）、`exception_resolved`（專案負責人於最終例外池定案）、`excluded`（專案負責人自資料集排除）。每個值 MUST 對應唯一的徽章語意色，且該對應 MUST 為單一資料來源驅動，MUST NOT 於渲染端逐值硬編分支。每個值 MUST 有對應的產生點。

**v5.0.0 移除**：`rejected` 隨退回機制移除而自集合刪除。v5.0.0 以前寫入的 `rejected` 事件 MUST 原樣保留、MUST NOT 被刪除或改寫，並依既有規則以中性徽章呈現且不中斷渲染（集合外值之相容處置）。

本條一併修訂關鍵實體 `AnnotationHistoryItem`：其 `action` 可能值 MUST 改列上述九值。

#### Scenario: AC-2.16 七種動作各有對應徽章
- **GIVEN** 某樣本歷程依序包含 `HISTORY_ACTIONS` 全部九種動作各一筆
- **WHEN** 檢視 `歷程` 頁籤
- **THEN** 九筆事件各自呈現一個徽章，且九個徽章的語意色兩兩不同
- **AND** 一筆 v5.0.0 以前寫入的 `rejected` 事件（現已為集合外值）以中性徽章原樣呈現，清單其餘事件正常渲染

#### Scenario: AC-2.21 審核通過與修正皆產生歷程事件
- **GIVEN** 審核員對某樣本一個 `outKey` 送出 `通過`、對另一個 `outKey` 送出 `修正`、對第三個 `outKey` 送出 `無法判定`
- **WHEN** 檢視該樣本 `歷程` 頁籤
- **THEN** 清單分別出現一筆 `accepted`、一筆 `modified` 與一筆 `bypassed` 事件，三者之 `actor_id` 皆為該審核員
- **AND** 該次送出未因此產生重複事件（沿用 FR-016B append-only 與既有重複送出防護）

### Requirement: FR-083 送出阻擋同時指名缺理由之決策

送出驗證 MUST 為「每個 outKey 一筆決策，且 `修正` 與 `無法判定` 者皆有非空理由」（FR-016A）。阻擋 toast MUST 指名全部阻擋之 outKey（多筆以「、」串接）：存在尚未決策者時沿用 `toastSelectDecision`；全部阻擋皆為缺理由時使用缺理由文案。兩類 outKey 之推導 MUST 與送出驗證共用同一份逐 outKey 判定，MUST NOT 另建第二份計算。

存在缺理由之決策時「送出審核」按鈕 MUST 帶 `data-submit-blocked="reason"` 以呈現停用外觀，且 MUST NOT 使用 `disabled` 或 `aria-disabled`（兩者皆會攔下點擊，使 toast 無法指名 outKey）。

**v5.0.0 修訂**：原文之判定對象「退回者」改為「`修正` 與 `無法判定` 者」——退回決策已移除（FR-092）；缺理由文案 MUST NOT 再出現「退回理由」字樣。

#### Scenario: AC-3.47 缺理由阻擋送出並指名 outKey
- **GIVEN** `role=reviewer` 對 `single_label` 點 `無法判定` 但未填理由
- **WHEN** 點擊「送出審核」
- **THEN** 送出中止，toast 指名 `single_label` 且文案不含「退回」字樣，`ws-review-submit-btn` 帶 `data-submit-blocked="reason"`
- **AND** 填入理由後該屬性移除，再送出成功

## ADDED Requirements

### Requirement: FR-092 審核員三向決策

審核員對審核單位每個 outKey 的決策 MUST 取自 `REVIEW_DECISIONS = approve | modify | bypass`（中文語彙 `通過`／`修正`／`無法判定`），三者為全部出口，系統 MUST NOT 提供第四種決策：

1. `approve`（通過）：該 outKey 之定稿值即標記員原答案。該單位全部 outKey 皆為 `approve` 時，單位直接推導為 `已定稿`（FR-051）。
2. `modify`（直接修正）：審核員於作答控件上直接改答案，並依 FR-016A 填寫必填理由。**修正 MUST NOT 立即生效**——該 outKey 之差異成為爭議項（FR-059），單位推導為 `爭議中`，待仲裁裁定方定案。
3. `bypass`（無法判定）：審核員表示自己無法判定該 outKey，並依 FR-016A 填寫必填理由。該 outKey MUST 成為爭議項，其審核員側值 MUST 記為「無法判定」而非任何具體答案值——`bypass` MUST NOT 被推導為「與標記員答案相同」，亦 MUST NOT 使單位推導為 `已定稿`。

送出審核前，該單位每個 outKey MUST 恰有一筆決策（FR-044），未完成時 MUST 阻擋送出並指名缺項（FR-083）。

**明確不存在的出口**：`reject`（退回）MUST NOT 存在於任何 `run_type`。審核員 MUST NOT 有任何使標記員重新標記該樣本的通道。

#### Scenario: 修正不立即生效而進入爭議池
- **GIVEN** 一個 `待審` 審核單位，其審核員將某 outKey 由 `neutral` 直接改為 `positive` 並填妥理由
- **WHEN** 送出審核
- **THEN** 該單位狀態為 `爭議中`，該 outKey 之定稿值尚未產生
- **AND** 該 outKey 出現於爭議池，A 側為 `neutral`、B 側為 `positive`

#### Scenario: Bypass 不得被視為同意
- **GIVEN** 一個審核單位之審核員對全部 outKey 選 `無法判定` 並填妥理由
- **WHEN** 送出審核
- **THEN** 該單位狀態為 `爭議中`，MUST NOT 推導為 `已定稿`
- **AND** 每個 outKey 之爭議項 B 側呈現為「無法判定」，而非標記員的原答案值

### Requirement: FR-093 審核指派粒度

審核指派 MUST 由系統自動執行，MUST NOT 提供手動指派模式。指派對象為該任務**被勾選進審核員名冊**的成員（勾選來源為 014 FR-010s）。指派粒度依 `REVIEW_ASSIGNMENT_GRANULARITY` 分流，此為兩種 `run_type` **唯一**的流程差異：

1. `dry_run: per_sample`——試標中同一份樣本由多位標記員各標一次，其產生的全部審核單位 MUST 指派給**同一位**審核員，使該審核員得以一次看完同一份資料的所有標記；
2. `official_run: per_unit`——每筆樣本恰一位標記員、恰一個審核單位，系統 MUST 把全部審核單位平均分給被勾選的審核員；樣本數不可整除時，任兩位審核員的分派筆數差距 MUST NOT 超過 1。

每個審核單位恰有**一位**指派審核員，MUST NOT 出現同一單位由多位審核員並行審核的情形。

**明確不存在的規則**：系統 MUST NOT 因某位審核員恰為該筆樣本的標記員而將其排除於指派之外——「審核員不得審自己標的資料」不是本規格的規則。非當事人限制僅適用於仲裁者（FR-060）。

#### Scenario: 試標以樣本為單位指派
- **GIVEN** 一份試標樣本由三位標記員各標一次，任務勾選了兩位審核員
- **WHEN** 系統建立審核指派
- **THEN** 該樣本產生的三個審核單位全部指派給同一位審核員

#### Scenario: 正式標記平均分派且不排除標記員本人
- **GIVEN** `official_run` 有 7 筆樣本、勾選 2 位審核員，其中一位同時是部分樣本的標記員
- **WHEN** 系統建立審核指派
- **THEN** 兩位審核員的分派筆數差距不超過 1
- **AND** 該審核員仍可能被指派到自己標記的樣本，系統不因此排除或重新分派

### Requirement: FR-094 純文字定稿結果卡與微型衝突歷程

審核單位狀態為 `已定稿`（FR-051）時，工作區 MUST 以**純文字唯讀結果卡**（`ws-review-finalized-card`）呈現定案內容：

1. **純文字，不渲染控件**：每個 outKey 之定稿值 MUST 以純文字呈現，MUST NOT 渲染任何作答控件（含 `disabled` 狀態的控件）——disabled 控件在視覺上仍宣稱「這裡本來可以操作」，與全面唯讀的語意相衝突。
2. **微型衝突歷程**：卡上 MUST 附一行灰字微型衝突歷程（testid `ws-finalized-trace`），以緊湊符號串接該單位的責任鏈，例如 `歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B`；來源為 `bypass` 時該段呈現為 `審核 B（無法判定）`，經例外池收尾時末段為 `例外池 {處置}`。完整帳號 MUST 於 hover／focus 時展開（沿用 §Tooltip 規格，MUST NOT 使用原生 `title` 屬性）。
3. **由既有資料層推導**：微型歷程 MUST 由該單位既有的審核決策、仲裁裁定與例外池處置推導，MUST NOT 另存第二份，MUST NOT 引入任何任務 ID 或帳號的硬編碼判斷。

本條取代已移除之 FR-069（逐位審核員投票明細）：單一審核員模型下不存在「逐位投票」，責任鏈才是定稿後真正需要被看見的資訊。

#### Scenario: 定稿卡為純文字且附微型歷程
- **GIVEN** 一個經審核員修正、仲裁採 B 而定稿的單位
- **WHEN** 開啟該單位
- **THEN** 每個 outKey 之定稿值以純文字呈現，頁面上該卡片內不存在任何作答控件（含 disabled 者）
- **AND** 卡上出現一行微型歷程 `歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B`，hover 後展開對應的完整帳號

### Requirement: FR-095 最終例外池的逐筆收尾

仲裁裁定為 `reject`（兩者皆非，FR-061 第 3 點）的爭議項 MUST 落入該任務的**最終例外池**。最終例外池 MUST 提供專案負責人逐筆收尾的處置畫面，其處置動作 MUST 取自 `EXCEPTION_POOL_ACTIONS`：

1. `adopt_annotator`（採 A）：以標記員原答案定案，一鍵完成；
2. `adopt_reviewer`（採 B）：以審核員的答案（修正值或「無法判定」）定案，一鍵完成；
3. `custom_answer`（自訂答案）：展開**原始標記介面**——重用該輸出類型之 config-driven 作答控件（`OUTPUT_TYPE_REGISTRY` 驅動），MUST NOT 為例外池另建一套作答 UI；作答值 MUST 限於該輸出類型與其 config 所定義的合法答案空間，超出者 MUST 阻擋定案；定案理由**必填**；
4. `exclude_from_dataset`（自資料集排除）：該樣本不產生定案答案、不進入匯出之最終答案集合，但 MUST 保留排除紀錄（處置者、理由、時間）。

**run_type 分流（唯一一處）**：`custom_answer` MUST 僅於 `official_run` 提供；`dry_run` 之例外池 MUST NOT 渲染自訂答案入口——試標不產生定案答案，自訂答案在試標中沒有可寫入的標的。

處置完成後，`adopt_annotator`／`adopt_reviewer`／`custom_answer` 三者 MUST 使該爭議項解決；該單位全部爭議項解決後推導為 `已定稿`（FR-051）並流入標記結果；`exclude_from_dataset` 則使該單位以排除記號呈現且 MUST NOT 推導為 `已定稿`（FR-063）。

每個處置 MUST 寫入一筆歷程事件（`exception_resolved` 或 `excluded`，FR-086），攜帶處置者、動作、理由與時間。

#### Scenario: AC-4.56 正式標記例外池四動作可用
- **GIVEN** `official_run` 之最終例外池有一筆待處置項目，操作者為專案負責人
- **WHEN** 開啟該項目的收尾畫面
- **THEN** 提供採 A、採 B、自訂答案、自資料集排除四個處置
- **AND** 選自訂答案時展開該輸出類型的原始作答控件，輸入合法值並填妥理由後可定案；未填理由時定案被阻擋

#### Scenario: AC-4.57 試標例外池無自訂答案出口
- **GIVEN** `dry_run` 之最終例外池有一筆待處置項目
- **WHEN** 開啟該項目的收尾畫面
- **THEN** 僅提供採 A、採 B、自資料集排除三個處置
- **AND** 畫面上不存在自訂答案入口，亦不渲染任何作答控件

### Requirement: FR-096 試標歷史回饋

標記員視角 MUST 提供**試標歷史回饋**列表，使標記員在「不退回重標」的前提下仍能自我對齊。列表逐筆呈現該標記員於已完成試標回合中的標記，並 MUST 包含：

1. 被修改筆數（該回合中該標記員被審核員修正或被仲裁改判的項目數）與其占比；
2. 逐筆之「我的答案 → 定案結果」對照；
3. 定案來源（審核員通過／仲裁採 A／仲裁採 B／例外池收尾）與具名決策者；
4. 原因——審核員或仲裁者填寫的理由原文；理由中引用之標註指南段落 MUST 可點擊跳轉至該段落。

**揭露時機（Data Fairness NON-NEGOTIABLE）**：本列表 MUST 僅在該試標回合全部標記提交、任務轉入 `waiting_iaa_confirmation` 之後對標記員開放。回合進行中 MUST NOT 對標記員揭露任何定案結果、他人答案或審核判斷——否則標記員可據以回頭對齊，直接污染同輪 IAA。

本列表 MUST 僅呈現該標記員**本人**的標記與其定案結果，MUST NOT 呈現其他標記員的答案。

#### Scenario: AC-1.27 回合結束後才開放試標歷史回饋
- **GIVEN** 某試標回合仍在進行中（任務狀態為 `dry_run_in_progress`）
- **WHEN** 標記員嘗試進入試標歷史回饋
- **THEN** 該回合之資料不揭露，畫面說明需待該回合結束
- **AND** 任務轉入 `waiting_iaa_confirmation` 後，同一標記員可看到被修改筆數、逐筆「我的答案 → 定案結果」、定案來源與具名決策者、以及理由原文與可跳轉的指南段落引用，且看不到其他標記員的答案

### Requirement: FR-097 歷程事件的責任鏈加詳

右欄 `歷程` 頁籤之事件卡片 MUST 逐卡加詳，使「標記 → 審核 → 仲裁 →（必要時）例外池」的責任鏈可從歷程本身讀出。每張卡片 MUST 呈現：

1. **動作**：`HISTORY_ACTIONS` 之語意徽章與其中文語彙（FR-086）；
2. **值變化**：該事件造成的答案變化，逐 outKey 呈現「前值 → 後值」；`bypassed` 呈現為「→ 無法判定」；`adjudicated` 呈現所採一側及其值；`excluded` 無值變化而呈現排除記號；
3. **耗時**：沿用 FR-088 之 `lead_time` 與其角色可見性規則，本條 MUST NOT 放寬該可見性；
4. **決策者**：真實 `actor_id` 與其角色（沿用 FR-050）。

卡片版式 MUST 沿用既有「說明與檔案｜歷程」頁籤之卡片式設計，MUST NOT 另建第二套版式。全部欄位 MUST 由既有歷程事件推導（FR-016B、FR-087、FR-088、FR-089），MUST NOT 另存第二份；受 FR-062 盲審隔離與 FR-090 分層遮蔽約束。

#### Scenario: 歷程呈現完整責任鏈
- **GIVEN** 一筆經標記員提交、審核員修正、仲裁者採 B 而定稿的樣本
- **WHEN** reviewer 檢視該樣本 `歷程` 頁籤
- **THEN** 清單依序含 `submitted`／`modified`／`adjudicated` 三張卡片，各自呈現動作徽章、逐 outKey 前值 → 後值、耗時與具名決策者
- **AND** 該審核員尚未提交的草稿事件不出現

## REMOVED Requirements

### Requirement: FR-014I 退回回退狀態並攜帶理由

**Reason**: 2026-08-31 會議定案「兩種 `run_type` 皆不退回重標」（issue #596 預期調整第 2 項、流程圖 `review-flow-official-run.html` 移除整條重標迴路）。審核員層級的退回決策已隨 FR-092 三向決策移除，本條所定義的「送出審核時判定為退回 → 將該 annotator bucket 對應樣本狀態回退為 `待標記` → 寫入 `rejected` 歷程事件」整條路徑因此沒有觸發點。

**Migration**: 審核員對有疑慮的答案改用 `modify`（直接修正，進爭議池）或 `bypass`（無法判定，進爭議池）；仲裁無法解決時進最終例外池由專案負責人收尾（FR-095）。既有已回退為 `待標記` 的樣本維持其目前狀態，由標記員照常提交後進入新流程；既有 `rejected` 歷程事件原樣保留並依 FR-086 之集合外值規則以中性徽章呈現。

### Requirement: FR-069 已定稿審核卡的逐位審核員投票明細

**Reason**: 本條建立於「該爭議項全部已提交審核員之逐位投票」之上（其推導輸入為 `DISPUTE_CONVERGENCE_RULE` 的計票輸入）。單人接力模型下一個審核單位恰有一位審核員（FR-093），且多數決收斂已整組移除（FR-061），沒有「逐位投票」可列出——渲染出來只會是恆為單列的表。

**Migration**: 定稿後的責任可追溯性改由 FR-094 之微型衝突歷程承接（`歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B`，hover 展開完整帳號），並由 FR-097 之歷程責任鏈提供完整明細。testid `ws-finalized-vote` 保留不重用。

### Requirement: FR-074 仲裁決策前的爭議形成脈絡

**Reason**: 本條之三項核心資訊——審核門檻脈絡（已提交審核員人數／`min_reviewers`／嚴格多數所需票數）、逐爭議項票數分布、未收斂原因四分類（`single_reviewer`／`even_tie`／`all_divergent`／`no_majority`）——全部建立於多審核員票數之上。`min_reviewers` 與多數決收斂已隨本變更移除，一個爭議項恰有 A、B 兩側各一個立場，票數脈絡沒有可陳述的內容。

**Migration**: 仲裁者所需的裁定前脈絡改由 FR-061 第 2 點承接——A 側為標記員原答案，B 側依決策來源動態呈現（修正值或「無法判定」），並由 FR-016A 之必填理由提供審核員的判斷依據。本條第 4 點之「仲裁效果說明」（逐爭議項選定定稿值、不重新標記）已逐字移入 FR-061 第 5 點，未消失。testid `ws-arbitration-quorum`、`ws-arbitration-votes`、`ws-arbitration-vote-tally`、`ws-arbitration-vote-reason` 保留不重用。

### Requirement: FR-085 標記員重標理由橫幅

**Reason**: 本條之觸發條件為「該樣本於標記員 bucket 狀態為 `pending` 且最新歷程事件為 `rejected`」，與 FR-014I 的 `markSampleRejected()` 寫入同源。退回機制移除後該條件永遠不成立，橫幅成為死碼。

**Migration**: 標記員的品質回饋改由 FR-096 試標歷史回饋（`dry_run`）承接；`official_run` 不再有標記員側的回饋動作——定案由審核員、仲裁者或專案負責人完成，標記員不重標。testid `ws-rework-reasons`、`ws-rework-reason-row` 保留不重用。
