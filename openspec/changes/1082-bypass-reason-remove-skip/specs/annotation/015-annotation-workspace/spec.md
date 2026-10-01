# Spec Delta

## MODIFIED Requirements

### Requirement: FR-089 動作理由必填

下列四個動作於送出時 MUST 強制填寫理由，缺理由時 MUST 阻擋送出並指名缺理由的項目：審核修正（`modified`）、審核無法裁決（`bypassed`）、爭議仲裁（`adjudicated`）、標記員無法判定（`OutputAnswer.bypass`）。理由 MUST 寫入該筆歷程事件之 `reason`。

審核側（`modified`、`bypassed`）之理由 MUST 寫入 FR-016A 既有的持久化路徑（reviewer submission `decisions` map 旁的 `reasons` map），MUST NOT 另存第二份。爭議仲裁（`adjudicated`）之理由自始即以理由必填為契約，本段不受本次修訂影響。FR-083 之送出阻擋維持既有行為。

**v10.0.0 修訂（issue #1082，標記員跳過整組移除，理由必填承接方改為 Bypass）**：下列四個動作之列舉原末項為「標記員跳過（`skipped`）」，隨附之「跳過動作本身之定義」整段——入口可見性、FR-013A 三態可用條件、不改變樣本狀態、產生獨立之 `skipped` 歷程事件、導覽重用 FR-022A／FR-022C——隨跳過功能（`#wsSkipGroup`、`handleSkip()`、`markSampleSkipped()`）整組移除，MUST NOT 保留任何形式之跳過入口或替代機制；若日後有真實需求，須另開 issue 以 Feature 流程處理，不屬本條範圍。理由必填之承接方改為標記員既有之「無法判定 (Bypass)」勾選項：標記員對某 outKey 勾選該項時，理由欄位於同一提交流程內必填（展開／收起與驗證時機見本條新增 AC-2.29）；理由 MUST NOT 另立獨立之送出動作或歷程事件，MUST 隨標記員既有之「提交」路徑一併送出，寫入該筆 `submitted` 歷程事件之 `reason`（逐 outKey，格式比照既有 `buildHistorySummary()` 之逐 outKey 組字串慣例）。多輸出類型任務下，每個已勾選 Bypass 的 outKey 之理由各自判定必填、各自寫入，不得以任一 outKey 之理由替代另一 outKey。既有（本次變更以前寫入）之 `skipped` 歷程事件依 FR-086 既有規則以中性徽章呈現，MUST NOT 被遷移、改寫或刪除（見 FR-086 v10.0.0 修訂）。

**正典回寫註記（本段僅供 Source-Verify 與 archive 對照，不構成規範文字）**：本條下方「AC-2.20 跳過必須填寫理由」一景，其所述「標記員於某樣本點擊「跳過」」之互動路徑已隨本版移除、不再可觸發；依 OpenSpec 工具對 MODIFIED 區塊「不得遺漏既有情境」之機制限制，該景逐字保留於本 delta 檔以滿足 schema 驗證，但於 G3 正典回寫時，canonical `specs/annotation/015-annotation-workspace/spec.md` 之 **AC-2.20 本體文字將被取代**為下方新增「Bypass 理由必填，未填阻擋送出、填寫後理由進入 submitted 事件」一景之內容（沿用 AC-2.20 之 id，不新增 AC 編號，呼應 issue #1082「AC-2.20：改寫為 Bypass 理由必填情境」之明確指示）；本情境標題所稱「跳過」自本版起為歷史保留文字，MUST NOT 被理解為現行可用之互動路徑。

#### Scenario: AC-2.20 跳過必須填寫理由
- **GIVEN** 標記員於某樣本點擊「跳過」
- **WHEN** 未填寫理由即嘗試送出
- **THEN** 送出被阻擋且提示需填寫理由，該樣本未產生 `skipped` 歷程事件
- **AND** 填寫理由後送出，`skipped` 事件之 `reason` 等於所填理由
- **AND**〔v10.0.0 歷史保留，issue #1082〕本情境所述之「跳過」入口已隨跳過功能整組移除，不再存在對應之互動路徑；本情境之 Given/When/Then 本體描述 v10.0.0 以前的既有行為，保留僅供正典回寫時之對照，正典 AC-2.20 之現行文字已由下方「Bypass 理由必填，未填阻擋送出、填寫後理由進入 submitted 事件」情境取代

#### Scenario: Bypass 理由必填，未填阻擋送出、填寫後理由進入 submitted 事件
- **GIVEN** 標記員對某樣本之某 outKey 勾選「無法判定 (Bypass)」
- **WHEN** 未填寫理由即嘗試送出
- **THEN** 送出被阻擋，理由欄位下方出現行內錯誤訊息，且顯示警告 toast 指名缺理由的 outKey
- **AND** 該樣本未產生 `submitted` 歷程事件，既有 bucket 內容維持原狀
- **AND**〔填寫後送出〕標記員填寫理由後再次送出，送出成功，`submitted` 事件之 `reason` 含該 outKey 與所填理由
- **AND**〔多輸出類型獨立判定〕**GIVEN** 任務含兩個以上輸出類型且皆勾選 Bypass，**WHEN** 僅其中一個 outKey 填寫理由、另一 outKey 留空即嘗試送出，**THEN** 送出被阻擋且 toast 僅指名理由留空之該 outKey，已填寫之 outKey 不受影響

#### Scenario: AC-2.29 Bypass 理由欄位之展開／收起與驗證時機
- **GIVEN** 標記員於某 outKey 之標記卡尾端 `.preview-bypass-row`
- **WHEN** 勾選「無法判定 (Bypass)」
- **THEN** 理由輸入框立即於同一列向右展開，且不顯示任何錯誤（依 `design/system/ux-conventions.md` UXC-04）
- **AND** 標記員開始輸入時既有行內錯誤立即清除（依 UXC-05），填妥理由後欄位下方顯示說明文字「理由會隨提交寫入歷程，審核員可見」
- **AND** 標記員取消勾選該 Bypass
- **THEN** 理由欄位收起，先前已填寫之內容被清空
- **AND**〔多輸出類型獨立性〕**GIVEN** 任務含兩個以上輸出類型且 `allow_bypass` 皆為真，**WHEN** 僅勾選其中一個 outKey 之 Bypass，**THEN** 僅該 outKey 之理由欄位展開，其餘未勾選 outKey 之理由欄位不渲染，彼此互不影響

#### Scenario: AC-3.50 仲裁定案必須填寫理由
- **GIVEN** 具 `can_arbitrate` 之審核員對爭議單位進行仲裁
- **WHEN** 未填寫理由即送出定案
- **THEN** 送出被阻擋且指名缺理由之項目
- **AND** 填寫理由後定案，`adjudicated` 事件之 `reason` 等於所填理由

### Requirement: FR-086 歷程動作常數化

歷程事件之 `action` MUST 取自常數集合，MUST NOT 為自由字串。

**v10.0.0 修訂（issue #1082，`skipped` 隨跳過功能整組移除）**：`HISTORY_ACTIONS` 自九值改為**八值**——`draft_saved | submitted | modified | accepted | bypassed | adjudicated | exception_resolved | excluded`，移除 `skipped`（標記員跳過動作已隨 FR-089 整組移除，不再有任何產生點）。各值語意維持既有定義不變（移除 `skipped` 一項）。每個值 MUST 對應唯一的徽章語意色，且該對應 MUST 為單一資料來源驅動，MUST NOT 於渲染端逐值硬編分支。

`ACTION_LABEL`（`design/prototype/pages/shared/annotation-history.js`）同步移除「已跳過」對應鍵，`skipped` MUST NOT 再出現於該對照表之例外清單（不比照 `rejected`／`saved` 保留中文標籤）。既有（本次變更以前寫入）之 `skipped` 事件 MUST 依本條既有「集合外值以中性徽章呈現且以英文原值顯示」通則處理：歷史事實不因模型改版而失真，MUST NOT 被遷移、改寫或刪除，MUST NOT 中斷渲染。

本條一併修訂關鍵實體 `AnnotationHistoryItem`：其 `action` 可能值 MUST 改列上述八值。

本條其餘既有段落（`bypassed` 徽章文案同源、v6.8.0／issue #583 修訂段）維持既有文字不變，不受本次修訂影響。

#### Scenario: AC-2.16 七種動作各有對應徽章
- **GIVEN** 某樣本歷程依序包含 `HISTORY_ACTIONS` 全部**八種**動作各一筆
- **WHEN** 檢視 `歷程` 頁籤
- **THEN** 八筆事件各自呈現一個徽章，且八個徽章的語意色兩兩不同
- **AND** 一筆 v5.0.0 以前寫入的 `rejected` 事件（現已為集合外值）以中性徽章原樣呈現，清單其餘事件正常渲染

#### Scenario: AC-2.21 審核通過與修正皆產生歷程事件
- **GIVEN** 審核員對某樣本一個 `outKey` 送出 `通過`、對另一個 `outKey` 送出 `修正`、對第三個 `outKey` 送出 `無法裁決`
- **WHEN** 檢視該樣本 `歷程` 頁籤
- **THEN** 清單分別出現一筆 `accepted`、一筆 `modified` 與一筆 `bypassed` 事件，三者之 `actor_id` 皆為該審核員
- **AND** 該次送出未因此產生重複事件（沿用 FR-016B append-only 與既有重複送出防護）

#### Scenario: 審核員送出不產生 submitted 事件
- **GIVEN** 審核員對某審核單位之每個 `outKey` 各選定一個決策
- **WHEN** 審核員送出審核
- **THEN** 該次送出寫入之事件數等於 `outKey` 數，每筆之 `action` 皆屬 `accepted`／`modified`／`bypassed`，`role` 皆為 `reviewer`
- **AND** 該次送出未寫入任何 `action` 為 `submitted` 之事件
- **AND** 標記員提交仍寫入恰一筆 `submitted` 事件

#### Scenario: 既有 skipped 事件以中性徽章與英文原值呈現，不遷移不改寫
- **GIVEN** 一筆本次變更以前寫入之 `skipped` 歷程事件
- **WHEN** 於歷程頁籤渲染該事件
- **THEN** 徽章必須以中性色呈現且可見文字為英文原值 `skipped`（不比照 `rejected`／`saved` 顯示中文標籤）
- **AND** 該事件之既有欄位（`actor_id`、`at`、`summary` 等）必須原樣保留，不得因 `HISTORY_ACTIONS` 集合變更而被改寫、遷移或移除
- **AND** 渲染過程不得因 `skipped` 已不在 `HISTORY_ACTIONS` 集合內而中斷或報錯

### Requirement: FR-101 標記員定稿鎖定

本需求對應正典 FR-101。`official_run` 審核單位一旦依 FR-051 推導為 `已定稿`，且該推導成立之前提——受審標記員存在真實已儲存提交（FR-051 判定式首句：標記員未提交 → 不成立審核單位，推導為 `null`）——已滿足時，該標記員自身之後續寫入 MUST 被鎖定，不得再變更已定稿之作答，亦 MUST NOT 使單位狀態翻回 `爭議中` 或 `待審`。

**範圍限定**、**觸發條件（不得誤觸的邊界）**、**寫入側守衛**、**不引入定稿快照**、**不提供解鎖入口**：本條此五段維持既有文字不變，不受本次修訂影響。

**呈現（v10.0.0 修訂，issue #1082）**：鎖定生效時，畫面 MUST 渲染鎖定提示（testid `ws-annotator-finalized-notice`），文案為「此標記結果已定稿，無法再修改或提交」（en: "This annotation is finalized and can no longer be edited or submitted."）；視覺 MUST 沿用 FR-094 唯讀卡之語言慣例，但色階 MUST 採資訊色（`--color-info`／`--color-info-bg`／`--color-info-border`），MUST NOT 沿用 FR-094 之錯誤色。作答控制與**儲存草稿／提交**兩個既有控件（`wsSaveBtn`、`wsSubmitBtn`；**v10.0.0 修訂**：原列舉三個既有控件含 `wsSkipBtn`，該控件隨跳過功能整組移除，本點改為兩個既有控件）MUST 保留在畫面上並套用原生 `disabled` 屬性與 `aria-disabled="true"`，MUST NOT 自 DOM 移除或隱藏，MUST NOT 以非原生互動元素（例如 `div`）取代原生控件；兩者既有觸控高度 MUST NOT 因本條縮減。定稿當下已選定之作答 MUST 維持可辨識，MUST NOT 使已選與未選選項套用相同的視覺結果（例如整排轉灰致無法分辨曾選定何值）。自動儲存狀態列（`ws-autosave-status`）鎖定生效時 MUST 改顯示「已定稿，不再自動儲存」（en: "Finalized — autosave stopped."），MUST NOT 沿用鎖定前之 INITIAL／DIRTY／SAVED 三態文案。

#### Scenario: AC-2.27 已定稿單位鎖定標記員寫入，示範列 seed 單位不觸發鎖定
- **GIVEN** 一個 `official_run` 審核單位已有標記員之真實已儲存提交且依 FR-051 推導為 `已定稿`
- **WHEN** 該標記員以 annotator 身分重新開啟該單位之工作區
- **THEN** 畫面 MUST 渲染鎖定提示 `ws-annotator-finalized-notice`，`wsSaveBtn`、`wsSubmitBtn` 兩者皆帶 `disabled` 屬性與 `aria-disabled="true"`，且皆仍存在於 DOM 中（**v10.0.0 修訂**：不再列舉 `wsSkipBtn`，該控件已隨跳過功能整組移除，不存在於 DOM）
- **AND** 嘗試以既有 `Ctrl/Cmd+S`（儲存）或 `Ctrl/Cmd+Enter`（提交）快捷鍵，皆 MUST NOT 改變該單位之儲存內容或狀態
- **AND** 自動儲存狀態列 MUST 顯示「已定稿，不再自動儲存」
- **AND** 該單位狀態於前後兩次讀取皆 MUST 維持 `已定稿`，MUST NOT 因上述任何嘗試翻回 `爭議中` 或 `待審`
- **AND**〔示範列 seed 豁免〕**GIVEN** 另一個 `official_run` 審核單位僅由 FR-044a 示範標記員答案遞補構成一筆審核員已核可決策，該樣本對應之標記員本人尚無任何真實儲存提交，**WHEN** 該標記員以 annotator 身分首次開啟並提交該單位，**THEN** 提交前畫面 MUST NOT 渲染 `ws-annotator-finalized-notice`，兩個控件皆 MUST NOT 帶 `disabled` 或 `aria-disabled`；**AND** 該次提交 MUST 正常寫入成功（`markSampleSubmitted()` 回傳 `true`），MUST NOT 被本條鎖定機制阻擋
- **AND**〔dry_run 不受影響〕同一組資料以 `dry_run` 開啟時，本條鎖定機制不生效，標記員之寫入不受任何額外阻擋

### Requirement: FR-092 審核員三向決策

審核員對審核單位每個 outKey 的決策 MUST 取自 `REVIEW_DECISIONS = approve | modify | bypass`（中文語彙 `通過`／`修正`／`無法裁決`），三者為全部出口，系統 MUST NOT 提供第四種決策。本條既有之三向決策定義、答案值與決策值兩套語彙各自單一來源（v6.8.0 修訂）、明確不存在的出口（`reject`）、決策與答案變更之失效規則（v6.26.0 修訂）維持既有文字不變，不受本次修訂影響。

**v10.0.0 新增（issue #1082，審核卡 Bypass 答案 chip 補顯示理由）**：審核卡／仲裁版面顯示標記員「無法判定 (Bypass)」答案值之處（`ws-review-original-answer`，`originalIsBypass` 分支），MUST 於該 chip 旁顯示該 outKey 對應之標記員 Bypass 理由；理由來源為 FR-089 v10.0.0 新持久化路徑（標記員提交 payload，逐 outKey）。本次變更以前寫入、不具理由欄位之舊 Bypass 答案，該區塊 MUST NOT 顯示理由文字、MUST NOT 報錯，亦 MUST NOT 為其補寫推估理由（沿用本規格對缺欄位舊資料之既有處置原則）。

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

#### Scenario: 修正決策改答案後保留決策與理由欄（issue #925）
- **GIVEN** reviewer 對某 outKey 已點選「修正」（`modify`）決策並填入必填理由
- **WHEN** reviewer 接著在同一 outKey 的直接修正控件上，把答案改成另一個與原答案不同的值
- **THEN** 該 outKey 的「修正」決策按鈕必須維持 `aria-pressed="true"` 且理由欄（`ws-review-reason`）必須維持可見、既有輸入內容不得被清空
- **AND** 不得顯示 `toastReviewDecisionResetOnEdit` toast
- **AND** 若此時該審核單位所有 outKey 皆已決策，送出審核（`ws-review-submit-btn` 或 `ws-review-quick-submit-btn`）必須正常成功，不得被「請完成以下輸出類型的審核決策」toast 擋下

#### Scenario: 通過／無法裁決決策改答案後仍須重置（issue #925 迴歸不變量）
- **GIVEN** reviewer 對某 outKey 已點選「通過」（`approve`）決策
- **WHEN** reviewer 接著在同一 outKey 的直接修正控件上，把答案改成另一個與原答案不同的值
- **THEN** 該 outKey 的「通過」決策必須被清空（決策按鈕 `aria-pressed` 回到 `false`），且必須顯示 `toastReviewDecisionResetOnEdit` toast
- **AND** 對「無法裁決」（`bypass`）決策重複上述操作，理由欄必須連同決策一併清空，且同樣顯示該 toast——本情境為既有行為，本次收窄 MUST NOT 使其失效

#### Scenario: AC-3.66 審核卡之 Bypass 答案 chip 旁顯示標記員理由
- **GIVEN** 標記員對某 outKey 提交「無法判定 (Bypass)」且填有理由
- **WHEN** 審核員檢視該樣本之審核卡
- **THEN** 該 outKey 之「無法判定 (Bypass)」chip 旁必須顯示標記員所填之理由文字
- **AND**〔舊資料缺理由〕**GIVEN** 一筆本次變更以前寫入、不具理由欄位之 Bypass 答案，**WHEN** 審核員檢視該審核卡，**THEN** chip 正常顯示但理由區塊不渲染任何文字，不得顯示空字串、`undefined` 或觸發渲染錯誤
