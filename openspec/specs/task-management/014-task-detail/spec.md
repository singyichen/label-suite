# task-management/014-task-detail Specification

## Purpose

任務詳情頁（`task-detail`）是專案負責人設定審核模型、監看審核進度並判定任務可否結案的單一控制面。正典為 `specs/_archive/014-task-detail/spec.md`（v3.2.0，已封存）；本文件僅收錄經 OpenSpec change 落地之需求，每條皆引用正典 FR ID，不改動其正典措辭。目前收錄：change `align-014-review-model`（issue #688）之 FR-005j／FR-005k／FR-008b／FR-010s／FR-010s-1／FR-010s-2／FR-010t（修訂，issue #596 單人接力審核模型對齊）、FR-018（新增，最終例外池）；change `task-detail-url-view-state`（issue #726）之 FR-019（新增，頁籤與清單檢視狀態的網址同步）；change `task-detail-seq-tagging-export-dialog`（issue #742）之 FR-020（新增，`sequence_tagging` 匯出對話框與序列匯出欄位）。本檔於該 change archive 前以正典 v2.11.3 原文建立基線，使 MODIFIED 有可比對的前值，archive 後基線內容已被完整取代。

## Requirements

### Requirement: FR-005j 審核指派區塊

`member-management` MUST 在成員清單之後提供「審核指派」區塊：顯示未指派審核筆數，並為每位啟用中審核員（`membership_status = active AND task_role = reviewer`）呈現已指派／待審／已完成三欄；被勾選為仲裁者（`can_arbitrate = true`）的審核員 MUST 顯示「仲裁」標籤。

自 v3.0.0 起本區塊 MUST 恆為唯讀——審核指派一律由系統自動執行（`annotation/015-annotation-workspace` FR-093：試標以樣本為單位、正式標記平均分派給被勾選的審核員），MUST NOT 出現「自動補齊」「指派…」或任何逐列操作按鈕；`review_assignment_mode` 已移除，MUST NOT 再依模式分流呈現。

移除或停用仍有待審負荷的審核員時，其 `pending` 筆數 MUST 退回未指派池並由系統重新分派，`done` MUST 保留為歷史統計（比照 FR-005f 對標記員的規則）。

#### Scenario: 審核指派區塊唯讀且標示仲裁者
- **GIVEN** 專案負責人開啟 `member-management`
- **WHEN** 檢視「審核指派」區塊
- **THEN** 每位啟用中審核員呈現已指派／待審／已完成三欄，被勾選為仲裁者者帶「仲裁」標籤
- **AND** 區塊內不存在任何指派或補齊按鈕

### Requirement: FR-005k 爭議池與最終例外池的負荷列

審核指派區塊底部 MUST 顯示爭議池列 `{n} 項待仲裁`，其後 MUST 顯示最終例外池列 `{m} 項待處置`（`m` = 仲裁裁定為「兩者皆非」而落入最終例外池、尚未由專案負責人收尾的項目數，見 FR-018）。

兩列皆 MUST 恆為唯讀資訊列：仲裁資格由系統依 `ARBITER_CANDIDATE_RULE` 與 `annotation/015-annotation-workspace` FR-060 之非當事人條件自動判定，具資格者自 `annotation-list` 進入認領；例外池處置由專案負責人自標記進度進入（FR-018）。本區塊 MUST NOT 提供「分派給仲裁者」或任何分派按鈕。`arbitration_enabled` 已移除，MUST NOT 再以該開關停用任何呈現。

#### Scenario: 兩列皆為唯讀且無分派按鈕
- **GIVEN** 某任務有 3 項待仲裁、2 項待處置
- **WHEN** 專案負責人檢視審核指派區塊底部
- **THEN** 依序顯示 `3 項待仲裁` 與 `2 項待處置` 兩列
- **AND** 兩列皆不含任何按鈕

### Requirement: FR-008b 任務結案前置條件

任務狀態由 `official_run_in_progress` 轉為 `completed` 前，系統 MUST 驗證下列全部前置條件（issue #180 完整條件；ADR-022 2026-08-19 修訂版轉換表）：

1. 正式標記作業全數提交（已排除作業不計入）；
2. 全部審核單位（`annotation/015-annotation-workspace` FR-051）皆推導為 `已定稿`，或經最終例外池「自資料集排除」處置；
3. 不存在狀態為 `爭議中` 的審核單位；
4. **最終例外池已清空**——不存在待處置的 `official_run` 例外項目（FR-018）；
5. 品質指標計算完成可用。

任一條件不符時，系統 MUST 阻擋轉換並逐項列出未滿足的具體原因，MUST NOT 僅以「全部標記已提交」作為完成依據。

**v3.0.0 修訂**：原第 (2) 項之「依生效審核設定（`min_reviewers`）應完成的 review unit 全數定案」改為上列第 2 項——`min_reviewers` 已移除，審核單位恆有一位審核員；原第 (4) 項「應仲裁項目全數完成仲裁」由上列第 3、4 項取代——仲裁完成不再等於結案就緒，仲裁裁定為「兩者皆非」者仍須經例外池收尾。

#### Scenario: 例外池未清空時阻擋結案
- **GIVEN** 某 `official_run_in_progress` 任務全部標記已提交、無 `爭議中` 單位，但最終例外池尚有 2 項待處置
- **WHEN** 專案負責人點擊 `標記完成`
- **THEN** 轉換被阻擋，並逐項列出「最終例外池尚有 2 項待處置」作為未滿足原因
- **AND** 例外池清空後再次點擊即可轉為 `completed`

### Requirement: FR-010s Overview 審核設定區塊（檢視模式）

Overview MUST 在「抽樣設定」之後提供獨立「審核設定」區塊。自 v3.0.0 起檢視模式顯示**兩個**欄位：

1. `審核員`（`reviewer_ids`）——摘要值為 `已勾選 N 人`；`N = 0` 時為 `未勾選審核員`；
2. `仲裁者`（`arbiter_ids`）——摘要值規則見 FR-010s-2。

編輯權限與抽樣設定相同（`OVERVIEW_EDITABLE_STATUS` + `OVERVIEW_EDITABLE_ROLE`），編輯／儲存／取消與未儲存離開確認行為與抽樣設定一致。

**v3.0.0 移除**：`每筆資料審核員數`（`min_reviewers`）、`審核指派方式`（`review_assignment_mode`）、`一致即定案`（`agreement_auto_finalize`）、`第三人仲裁`（`arbitration_enabled`）四個欄位 MUST NOT 再渲染——審核單位恆有一位審核員、指派恆為系統自動、一致即定案已成為 `approve` 決策的固有語意（`annotation/015-annotation-workspace` FR-092）、仲裁已成為爭議項的唯一去向而非可關閉的選配。

#### Scenario: 審核設定僅剩兩份名冊
- **GIVEN** 專案負責人開啟 `draft` 任務的 Overview
- **WHEN** 檢視「審核設定」區塊
- **THEN** 恰顯示 `審核員` 與 `仲裁者` 兩個欄位
- **AND** 區塊內不存在審核員數、指派方式、一致即定案、第三人仲裁任一欄位

### Requirement: FR-010s-1 審核設定編輯模式

審核設定編輯模式 MUST 提供**兩份勾選清單**，MUST NOT 提供任何數值輸入框、模式單選或行為 toggle：

1. `審核員` 勾選清單——候選 = `membership_status = active AND task_role = reviewer`；勾選結果寫入 `reviewer_ids`，即系統自動指派的分派對象（`annotation/015-annotation-workspace` FR-093）；
2. `仲裁者` 勾選清單——候選 MUST 為 `reviewer_ids` 的子集合（未被勾選為審核員者 MUST NOT 出現於仲裁者候選）；勾選結果寫入 `arbiter_ids`，即 `can_arbitrate = true` 的來源（`annotation/015-annotation-workspace` FR-060 條件一）。

兩份名冊寫入的元素 MUST 遵守 `REVIEWER_ID_FORMAT`：值為該成員的 `TaskMembership.user_id`（不透明 user id，形狀比照 `annotation/015-annotation-workspace` 之 `REVIEWER_ROSTER`），MUST NOT 寫入 Email 或顯示名稱。消費端比對審核員身分時 MUST 以該 id 為唯一鍵；成員清單「審核負荷」欄之聚合亦 MUST 以該 id 為鍵。Email 僅供成員清單顯示，MUST NOT 參與比對。

驗證：儲存時 `reviewer_ids` 至少 1 人，否則 MUST 阻擋儲存並顯示可修正錯誤訊息。`arbiter_ids` 允許為空並於摘要值標示（FR-010s-2），不阻擋儲存。取消勾選某審核員時，若其 `arbiter_ids` 亦被勾選，MUST 同步取消並於儲存前提示。

編輯區塊 MUST 載明：仲裁時另受非當事人限制（對該審核單位已提交審核者不得仲裁該單位，`annotation/015-annotation-workspace` FR-060），且系統 MUST NOT 因某審核員恰為該筆的標記員而排除其審核指派。

#### Scenario: 仲裁者候選限於已勾選審核員
- **GIVEN** 任務有 4 位啟用中審核員，其中 2 位被勾選為 `審核員`
- **WHEN** 專案負責人展開 `仲裁者` 勾選清單
- **THEN** 候選恰為該 2 位被勾選的審核員
- **AND** 取消勾選其中一位審核員時，其仲裁者勾選同步取消並於儲存前提示

#### Scenario: 名冊以不透明 user id 儲存而非 Email
- **GIVEN** 專案負責人於審核設定勾選一位啟用中審核員並儲存
- **WHEN** 檢視該任務的 `reviewer_ids`
- **THEN** 其元素為該成員的 `TaskMembership.user_id`（形如 `reviewer_wang`），不含任何 Email 字串
- **AND** 審核工作分派、審核負荷聚合與審核員身分比對皆以該 id 為鍵，Email 僅出現於成員清單顯示欄

### Requirement: FR-010s-2 仲裁者摘要值規則

`仲裁者` 欄位之摘要值 MUST 依下列規則產生：`arbiter_ids` 為空 → `未指定仲裁者`；已指定 → `仲裁者 N 人`。

**v3.0.0 修訂**：原規則之 `停用` 與 `啟用 · ...` 前綴隨 `arbitration_enabled` 移除而刪除——仲裁不再是可停用的選配。

#### Scenario: 摘要值不含啟用停用前綴
- **GIVEN** 某任務已勾選 2 位仲裁者
- **WHEN** 檢視審核設定區塊
- **THEN** `仲裁者` 摘要值為 `仲裁者 2 人`，不含 `啟用` 或 `停用` 字樣

### Requirement: FR-010t 發布前的成員人數檢查

發布 `新增試標回合 R{n}` 或 `開始正式標記` 前，系統 MUST 驗證實際啟用成員人數：

1. `membership_status = active` 且 `task_role = annotator` 的人數 `>= min_annotators`；
2. 被勾選為審核員（`reviewer_ids`）且 `membership_status = active` 的人數 `>= 1`。

任一條件不足時，系統 MUST 阻擋發布，並逐角色顯示缺口訊息「還差 N 位」（`N = 應有人數 - 實際人數`）。發布前檢查 MUST NOT 僅驗證抽樣／審核設定值本身（決策 D3，issue #189）。

`arbiter_ids` 為空時 MUST NOT 阻擋發布，但 MUST 於發布確認顯示警示：未指定仲裁者時，爭議項將無人可仲裁而堆積於爭議池，任務將無法結案（FR-008b 第 3 項）。

**v3.0.0 修訂**：原「active reviewer 人數 `>= min_reviewers`」改為上列第 2 項——`min_reviewers` 已移除，審核只需至少一位被勾選的審核員即可運作。

#### Scenario: 未勾選審核員時阻擋發布
- **GIVEN** 某 `draft` 任務有足額標記員但 `reviewer_ids` 為空
- **WHEN** 專案負責人點擊 `新增試標回合 R1`
- **THEN** 發布被阻擋並顯示審核員「還差 1 位」
- **AND** 另一任務已勾選審核員但未勾選仲裁者時發布不被阻擋，僅於確認畫面顯示無仲裁者的警示

### Requirement: FR-018 最終例外池

`annotation-progress` 頁籤 MUST 提供「最終例外池」區塊，作為專案負責人逐筆收尾爭議的入口。

1. **入口與計數**：區塊標題列 MUST 顯示待處置項目數；`0` 時 MUST 渲染空狀態（`最終例外池已清空`），MUST NOT 隱藏整個區塊——結案閘門（FR-008b）依賴此處為唯一可稽核的呈現點。
2. **清單欄位**：逐筆呈現樣本 ID、標記員帳號、審核員帳號、爭議的輸出類型、仲裁者帳號與其「兩者皆非」理由、落入例外池的時間。
3. **逐筆導頁**：每列 MUST 提供進入處置畫面的動作，導向 `annotation/015-annotation-workspace` FR-095 之收尾介面並攜帶完整審核單位身分（`task_id × run_type × annotator_id × sample_id`）與爭議項識別。
4. **權限**：本區塊 MUST 僅對 `project_leader` 呈現；其他角色 MUST NOT 看到此區塊，直連進入時 MUST 比照 FR-006 導回並提示無權限。
5. **run 分流**：清單 MUST 可依 `run_type` 篩選；`dry_run` 與 `official_run` 的例外項各自獨立計數，FR-008b 第 4 項之結案閘門 MUST 僅計 `official_run` 的待處置項目。

#### Scenario: SC-043 例外池清單與導頁
- **GIVEN** 某任務有 2 項 `official_run` 待處置例外
- **WHEN** 專案負責人開啟 `annotation-progress`
- **THEN** 「最終例外池」區塊標題顯示 2 項待處置，逐列呈現樣本 ID、標記員、審核員、爭議輸出類型、仲裁者與其理由
- **AND** 點擊任一列進入該爭議項的處置畫面，網址攜帶完整審核單位身分

#### Scenario: 非專案負責人看不到例外池
- **GIVEN** 操作者為 `reviewer`
- **WHEN** 其開啟 `annotation-progress`
- **THEN** 畫面上不存在「最終例外池」區塊

### Requirement: FR-019 頁籤與清單檢視狀態的網址同步

`task-detail` MUST 讓「目前頁籤」與四個頁籤的清單控制項狀態在網址與畫面之間雙向同步，使任一畫面座標可經由複製網址被重現與分享（UX 慣例 `UXC-11`）。

**(1) 同步範圍**。MUST 納入下列檢視狀態，每一項各對應一個網址查詢參數：

| 頁籤 | 檢視狀態 | 查詢參數 |
|------|---------|---------|
| （全頁） | 目前頁籤 | `tab` |
| `annotation-progress` | 階段（試標回合／正式標記） | `ap_stage` |
| `annotation-progress` | 排序 | `ap_sort` |
| `annotation-results` | 階段篩選 | `ar_stage` |
| `annotation-results` | 任務狀態篩選 | `ar_status` |
| `annotation-results` | 標記員篩選 | `ar_annotator` |
| `annotation-results` | 審核員篩選 | `ar_reviewer` |
| `annotation-results` | 審核狀態篩選 | `ar_review_status` |
| `annotation-results` | 頁碼 | `ar_page` |
| `member-management` | 頁碼 | `mm_page` |
| `work-log` | 日期起 | `wl_from` |
| `work-log` | 日期訖 | `wl_to` |
| `work-log` | 階段篩選 | `wl_stage` |
| `work-log` | 成員篩選 | `wl_member` |
| `work-log` | 頁碼 | `wl_page` |

參數名 MUST 帶頁籤前綴（`ap_` / `ar_` / `mm_` / `wl_`）以與既有路由參數 `task_id`、`task_role`、`role`、`tab`、`status` 區隔——`status` 已被任務狀態覆寫語意佔用，篩選器 MUST NOT 爭用該名稱。

不在同步範圍內的頁內狀態（`overview` 的「執行控制」次級頁籤、匯出記錄對話框分頁、成員標記細項下鑽分頁）MUST NOT 寫入網址。

**(2) 寫回**。使用者變更上述任一狀態後，系統 MUST 以 `history.replaceState()` 更新網址，MUST NOT 使用 `pushState()`——篩選調整屬頁內行為，不得產生瀏覽歷史紀錄（既有條款：tab 切換為頁內行為，不觸發路由跳轉）。

寫回 MUST 在既有查詢參數之上增刪，MUST NOT 重建空白參數集：`task_id`、`task_role`／`role` 等既有路由參數 MUST 原樣保留。處於預設值的檢視狀態 MUST 自網址移除，使未經操作的頁面維持簡潔網址。

**(3) 還原**。頁面載入時，系統 MUST 在首次渲染前讀取上述參數並套用；套用結果 MUST 與使用者親自操作到該狀態時的畫面完全一致，包含篩選控制項的選取值、清單內容與分頁列的目前頁。

**(4) 無效值回退**。每個參數 MUST 在套用前對照其合法值集合驗證——篩選值對照該篩選器目前提供的選項、頁碼須為正整數且不得超出該清單的總頁數。不合法者 MUST 靜默回退為該狀態的預設值並繼續渲染，MUST NOT 使清單呈現空白、拋出錯誤或阻斷頁面載入。合法值集合 MUST 由既有選項來源推導，MUST NOT 於網址解析處硬編第二份清單。

**(5) 角色邊界**。網址檢視狀態 MUST NOT 成為角色守門的旁路：`reviewer` 以任何參數組合直連 `member-management` 時，仍 MUST 依 FR-006 導回 `overview` 並提示無權限；導回後網址 MUST 一併改寫為實際呈現的頁籤，MUST NOT 留下與畫面不符的 `tab=member-management`。同理，被導回後不適用的頁籤參數 MUST 自網址移除。

網址 MUST 僅承載檢視狀態（頁籤、篩選值、頁碼），MUST NOT 承載任何標記答案內容或跨角色資料。

#### Scenario: AC-1.8 篩選與翻頁即時寫回網址
- **GIVEN** `project_leader` 開啟 `/task-detail?task_id=T-001`
- **WHEN** 切換至 `annotation-results`、將審核狀態篩選為「爭議中」並翻到第 3 頁
- **THEN** 網址更新為含 `tab=annotation-results`、`ar_review_status=disputed` 與 `ar_page=3` 的查詢字串
- **AND** `task_id=T-001` 仍保留於網址
- **AND** 瀏覽歷史未新增任何一筆紀錄，按上一頁鍵直接離開本頁

#### Scenario: AC-1.9 貼上網址還原完整畫面座標
- **GIVEN** 一組帶有 `tab=work-log`、`wl_stage`、`wl_member` 與 `wl_page=2` 的 `task-detail` 網址
- **WHEN** 另一位具權限的使用者於新分頁開啟該網址
- **THEN** 頁面直接停在 `work-log`，階段與成員篩選呈現網址所指定的選取值，清單停在第 2 頁
- **AND** 畫面內容與親自操作到該狀態時一致

#### Scenario: SC-044 無效參數靜默回退為預設值
- **GIVEN** 網址帶有不存在的篩選值（如 `ar_stage=r99`）與超出總頁數的頁碼（如 `ar_page=999`）
- **WHEN** 使用者開啟該網址
- **THEN** 該兩項各自回退為預設值（階段為全部、頁碼為可用的最後一頁）並正常渲染清單
- **AND** 頁面不出現空白清單、錯誤訊息或載入中斷

#### Scenario: AC-2.5 reviewer 直連受限頁籤時網址一併導正
- **GIVEN** `task_role = reviewer`
- **WHEN** 直接開啟帶 `tab=member-management&mm_page=2` 的 `task-detail` 網址
- **THEN** 系統依 FR-006 導回 `overview` 並提示無權限
- **AND** 網址改寫為對應 `overview` 的參數，不再含 `tab=member-management` 或 `mm_page`

### Requirement: FR-020 `sequence_tagging` 匯出對話框與序列匯出欄位

`annotation-results` 的匯出功能 MUST 在任務 `outputs[]` 含 `sequence_tagging` 時，以一個匯出對話框承載標註方案與詞元單位的選擇，並依 `dataset/017` FR-041 與 FR-042 所定義的推導契約產生序列與其 metadata。本需求只規範畫面行為與匯出檔欄位的呈現，MUST NOT 重新定義推導規則本身。

**(1) 唯一推導入口**。序列的產生 MUST 一律呼叫共用純函式模組（`dataset/017` FR-041 第 2 點要求推導為純函式；原型落點 `design/prototype/pages/shared/span-tagging-export.js` 之 `LabelSuiteSpanTaggingExport.deriveSequence()`）。本頁 MUST NOT 自行拼接 `B-` / `I-` / `E-` / `S-` / `O` 標記前綴、MUST NOT 自行判斷 span 與 token 的邊界關係、MUST NOT 複製任何一份方案轉換表或詞元對齊規則。此條為硬性界線：`dataset/017` FR-041 本文已將本推導訂為跨模組唯一權威來源（SSoT），本頁多存在一份轉換邏輯，就是多一個 `E-` 的定義。

同理，方案與詞元單位的合法值域與預設值 MUST 取自 `dataset/017` 的 `EXPORT_TAGGING_SCHEMES`、`EXPORT_DEFAULT_TAGGING_SCHEME`、`EXPORT_TOKEN_UNITS`、`EXPORT_DEFAULT_TOKEN_UNIT` 四個規格常數，MUST NOT 於本頁的畫面標記或程式碼硬編第二份選項清單。

**(2) 對話框與選擇器**。匯出對話框 MUST 提供兩組選擇器：

| 選擇器 | 值域 | 預設值 |
|--------|------|--------|
| 標註方案 | `EXPORT_TAGGING_SCHEMES`（`BIO` / `BIOES` / `IOB2`） | `EXPORT_DEFAULT_TAGGING_SCHEME`（`BIO`） |
| 詞元單位 | `EXPORT_TOKEN_UNITS`（`character` / `word`） | `EXPORT_DEFAULT_TOKEN_UNIT`（`character`） |

詞元單位選為 `word` 時，對話框 MUST 額外提供切詞引擎的選擇；選為 `character` 時 MUST NOT 要求使用者提供任何切詞資訊。對話框的出現與否 MUST 依 `outputs[]` 是否含 `sequence_tagging` 判定，MUST NOT 以任務 ID 白名單或其他非設定驅動的方式分流（憲法：Generalization-First）。既有的兩種匯出格式（`EXPORT_FORMATS`）與既有的階段指定（FR-009a）語意不變，對話框 MUST 承接而非取代它們。

**(3) 匯出檔 metadata**。匯出檔 MUST 記錄本次匯出實際採用的選項，且 MUST 同時出現在 `JSON`（FR-015g 之 `manifest`）與 `JSON-MIN`（FR-015h）兩種格式，否則 JSON-MIN 的匯出結果無法被重現：

- 兩種詞元單位皆 MUST 記錄 `tagging_scheme` 與 `token_unit`。
- `token_unit = word` 時 MUST 額外記錄 `tokenizer.engine`、`tokenizer.version`、`alignment_mode` 與 `expanded_span_count`。
- `token_unit = character` 時 MUST NOT 寫入任何 tokenizer 相關欄位、對齊模式或擴張筆數——依 `dataset/017` FR-042 第 5 點，一份宣稱用過其實沒用過的切詞引擎的檔案，比什麼都不說更糟。

標註方案的選擇 MUST NOT 被寫回任務 config：依 `dataset/017` FR-041 第 3 點，方案屬於匯出當下的輸出格式選項，同一份標記結果 MUST 可用不同方案重複匯出而不需重新標記，且任務設定 MUST NOT 因一次匯出而改變。

匯出記錄（FR-010i-2 之條件快照）MUST 一併保存本次的標註方案、詞元單位與（詞級時）切詞引擎識別，使重新下載重建出的檔案與原檔逐字元相同。

**(4) 對齊擴張摘要**。`token_unit = word` 的匯出完成後，畫面 MUST 顯示「N 段標記因對齊被擴張」摘要，`N` 取自模組回傳的擴張筆數；`N = 0` 時 MUST NOT 顯示該摘要。摘要 MUST 可展開，展開後逐筆列出原始標記文字、擴張後文字與起訖 offset 差值，三項皆直接取自模組回傳的擴張清單，本頁 MUST NOT 重算。`token_unit = character` 時 MUST NOT 顯示該摘要（字元級不可能發生擴張）。

擴張 MUST 只發生於匯出產物：依 `dataset/017` FR-042 第 4 點，已儲存的 `spans[]` MUST NOT 被本流程修改，標記員圈選的字元 offset 仍為權威值。

**(5) 缺 tokenizer 版本時阻擋**。`token_unit = word` 且所選切詞引擎未提供 `engine` 或 `version` 任一欄位時，該次匯出 MUST 被阻擋：畫面 MUST 顯示可理解的原因（指出缺少的是切詞引擎版本資訊，而非顯示原始錯誤字串或靜默失敗），且 MUST NOT 產生任何匯出檔、MUST NOT 於匯出記錄表新增紀錄。使用者改回 `character` 後 MUST 能正常完成匯出。阻擋判定 MUST 以模組回傳的阻擋結果為準，MUST NOT 於本頁另行實作一套 tokenizer 欄位檢查。

**(6) 適用邊界與其他輸出類型**。本需求 MUST 僅適用標記值為字元 offset `spans[]` 的 `sequence_tagging`。

標記值攜帶 `entities[]` 的實體型結果（`entity_recognition` 任務，以及 ADR-029 遷移前留下的 legacy 實體資料）MUST NOT 套用本需求所指名的序列推導——依 `dataset/017` FR-041 第 1 點，`entity_recognition` 允許重疊與巢狀，不具 span 與扁平序列之間的雙射性質。其匯出結果欄位 MUST 全文依 FR-015i-3 辦理，該條所定義的 `entities[]` 與 `entities_summary` 語意 MUST NOT 因本需求而改變。

反向亦然：FR-015i-3 所稱的實體型結果 MUST NOT 被理解為涵蓋 `spans[]`——`LEGACY_TASK_TYPE_EXPORT_ENUM` 不含 `sequence_tagging`，其匯出檔的 `task_type` 欄位雖同樣落在 `sequence_labeling`，結果欄位分流仍依 FR-015i 所定「依標記結果實際結構決定」，而 `spans[]` 的結果欄位由本需求承接。

其餘六種輸出類型的匯出欄位、兩種格式的結構、匯出記錄表與重新下載語意皆 MUST 維持不變。

#### Scenario: AC-1.10 字元級匯出記錄方案與單位且不動任務設定

- **GIVEN** 任務 `outputs[]` 含 `sequence_tagging`，某樣本已提交 `spans[]` 形狀的標記結果
- **WHEN** `project_leader` 於 `annotation-results` 點擊匯出，於對話框維持預設（方案 `BIO`、單位 `character`）並確認
- **THEN** 匯出檔的 metadata 記錄 `tagging_scheme` 為 `BIO`、`token_unit` 為 `character`
- **AND** 匯出檔不含 `tokenizer.engine`、`tokenizer.version`、對齊模式或擴張筆數任一欄位
- **AND** 畫面未顯示任何擴張摘要
- **AND** 同一份標記結果改選 `BIOES` 再次匯出可正常完成，兩份檔案的 `tagging_scheme` 各自為 `BIO` 與 `BIOES`
- **AND** 兩次匯出後任務設定未被寫入任何標註方案或詞元單位欄位

#### Scenario: AC-1.11 詞級匯出顯示擴張摘要並可展開逐筆比對

- **GIVEN** 任務 `outputs[]` 含 `sequence_tagging`，某樣本有一筆標記的邊界落在所選切詞引擎的 token 內部
- **WHEN** `project_leader` 於匯出對話框選擇單位 `word`、指定一個具備版本資訊的切詞引擎並確認
- **THEN** 匯出完成，檔案 metadata 含 `tokenizer.engine`、`tokenizer.version`、對齊模式與擴張筆數
- **AND** 畫面顯示「N 段標記因對齊被擴張」摘要，`N` 與 metadata 的擴張筆數一致
- **AND** 展開摘要後逐筆顯示原始標記文字、擴張後文字與起訖 offset 差值
- **AND** 該樣本已儲存的 `spans[]` 起訖值未被改動
- **AND** 同一任務改選單位 `character` 匯出時，該摘要不出現

#### Scenario: AC-1.12 缺切詞引擎版本時阻擋匯出並說明原因

- **GIVEN** `project_leader` 於匯出對話框選擇單位 `word`
- **WHEN** 所選切詞引擎未提供版本資訊，使用者觸發匯出
- **THEN** 該次匯出被阻擋，畫面顯示可理解的原因，指出缺少切詞引擎版本資訊
- **AND** 未產生任何匯出檔，匯出記錄表未新增紀錄
- **AND** 使用者於同一對話框改回單位 `character` 後匯出正常完成
- **AND** 該次匯出的檔案不含 tokenizer metadata，畫面亦未顯示擴張摘要

#### Scenario: SC-045 序列推導唯一入口與選項來源可被靜態驗證

- **GIVEN** `task-detail` 的匯出實作
- **WHEN** 以原始碼掃描檢視序列推導與選項渲染的來源
- **THEN** 序列的唯一產生入口為共用模組的推導函式，頁面內不存在自行拼接標記前綴、自行判斷 span 與 token 邊界或複製方案轉換表的程式碼
- **AND** 兩組選擇器的選項由模組匯出的方案與單位常數渲染，頁面內不存在第二份硬編的選項清單
- **AND** `entity_recognition` 任務的匯出路徑未呼叫該推導函式

#### Scenario: AC-1.13 實體型結果的匯出不因序列推導而改變

- **GIVEN** 一個 `entity_recognition` 任務，其標記值為 `entities[]`
- **WHEN** `project_leader` 於 `annotation-results` 匯出該任務的結果
- **THEN** 匯出流程不出現標註方案或詞元單位的選擇，亦不呼叫序列推導
- **AND** 匯出結果仍逐欄位包含 `entities[]`，每個 entity 保留 `text`、`label` 與 span/offset 語意
- **AND** `JSON-MIN` 的扁平化欄位仍為 `entities_summary`

### Requirement: FR-021 匯出記錄重新下載依條件快照重建且不新增紀錄

`annotation-results` 匯出記錄表每一列「操作」欄的「下載」MUST 以該列保存的條件快照（FR-010i-2）為唯一依據重建匯出結果並觸發下載。本需求是 FR-010i-2 與 FR-020 第 3 點的讀取側；兩者既有條文維持原文，本需求不改寫其語意，只補上重新下載的行為與快照為達成逐字元相同所需的最小欄位。

**(1) 唯一依據**。重新下載 MUST NOT 讀取使用者當前畫面上的任何篩選狀態（標記階段、提交狀態、標記員、審核員、審核狀態）、MUST NOT 讀取 FR-020 匯出對話框目前的選項（標註方案、詞元單位、切詞引擎），且 MUST NOT 開啟匯出對話框。畫面篩選與對話框選項在重新下載前後 MUST 維持原值，重新下載不得回寫它們。

**(2) 不新增匯出記錄**。重新下載 MUST NOT 在匯出記錄表新增任何一列，MUST NOT 改變既有各列的內容與排列順序；使用者故事 1 介面定義「匯出記錄表」區塊所述「新記錄即時插入表格最前列」只適用於匯出按鈕觸發的匯出，不適用於重新下載。

**(3) 快照最小欄位**。為使重建結果不受重新下載當下的畫面狀態影響，每筆匯出記錄的條件快照除 FR-010i-2 列舉之欄位與 FR-020 第 3 點之序列欄位外，MUST 另外保存：

| 快照欄位 | 理由 |
|----------|------|
| 審核員篩選值與審核狀態篩選值 | 兩者都會改變匯出的樣本集合，屬使用者故事 1 介面定義「匯出記錄表」區塊所要求保存之「任何會影響匯出結果集合的條件」 |
| 匯出時間（完整精度） | FR-010i-1 要求 metadata 含 `exported_at`，且下載檔名由匯出時間組成 |
| 匯出人 | FR-010i-1 要求 metadata 含 `exported_by`；重新下載者不取代原匯出人 |
| 匯出當下的介面語言 | 匯出檔的任務名稱依介面語言取值，切換語言後重建會得到不同的檔案 |

同一次匯出內，metadata 的匯出時間與下載檔名所用的匯出時間 MUST 為同一個值。

**(4) 逐字元相同**。在該任務的標記結果與切詞引擎資料皆未變動的前提下，重新下載產生的檔案內容 MUST 與該筆紀錄原始下載的檔案逐字元相同，下載檔名 MUST 與原始檔名相同。此要求適用所有任務類型與 `EXPORT_FORMATS` 兩種格式；`sequence_tagging` 任務（FR-020）之方案、單位、切詞引擎 metadata 與序列內容亦在此列。

**(5) 單一產生路徑**。重新下載 MUST 沿用匯出按鈕所用的同一組匯出內容產生邏輯，只把條件來源由畫面狀態換成快照，MUST NOT 另建第二份匯出內容組裝程式碼；`sequence_tagging` 的序列產生入口仍受 FR-020 第 1 點與 SC-045 約束，頁面內推導函式的呼叫點不因重新下載而增加。重新下載 MUST NOT 顯示 FR-020 第 4 點的對齊擴張摘要——摘要屬於匯出對話框內的當次匯出回饋。

**(6) 無法重建時**。以下兩種情況 MUST NOT 產生任何檔案、MUST NOT 新增匯出記錄，且 MUST NOT 以預設值或當前畫面狀態補齊缺漏條件：

- 該列沒有條件快照，或快照缺少第 3 點與 FR-010i-2 所列任一必要欄位（例如本需求生效前留下的紀錄）：該列的「下載」MUST 呈停用狀態，並以可理解的中文說明此筆紀錄缺少重建所需的匯出條件。
- 快照的詞元單位為 `word`，而快照所記錄的切詞引擎在重新下載當下已不可用或未提供版本資訊：重新下載 MUST 被阻擋並顯示可理解的中文原因，明確指出缺的是該切詞引擎；阻擋與否 MUST 以共用推導模組的回傳值為準（FR-020 第 1 點），本頁不得自行判斷引擎欄位是否齊全。

#### Scenario: AC-1.14 `sequence_tagging` 重新下載不受當前篩選與對話框選項影響且不新增紀錄

- **WHEN** `project_leader` 於 `sequence_tagging` 任務選定一組頁面篩選、於匯出對話框選擇標註方案 `BIOES`、詞元單位 `word` 與一個具版本資訊的切詞引擎並完成一次 `JSON` 匯出，隨後改變頁面篩選、於匯出對話框改選其他方案與單位後取消，再按下該筆匯出記錄列的「下載」
- **THEN** 下載的檔案內容與第一次匯出的檔案逐字元相同，檔名亦相同
- **AND** 檔案 metadata 的標註方案、詞元單位與切詞引擎仍為第一次匯出時的值
- **AND** 匯出記錄表的列數與按下「下載」之前相同，匯出對話框未被開啟，畫面未出現對齊擴張摘要
- **AND** 頁面篩選維持使用者改變後的值

#### Scenario: AC-1.15 非序列任務重新下載同樣以快照為準（含審核篩選與介面語言）

- **WHEN** `project_leader` 於一個非 `sequence_tagging` 任務套用審核員與審核狀態篩選後完成一次 `JSON-MIN` 匯出，隨後清除全部篩選、切換介面語言，再按下該筆匯出記錄列的「下載」
- **THEN** 下載的檔案內容與原始匯出逐字元相同，檔名亦相同
- **AND** 匯出記錄表的列數不變

#### Scenario: AC-1.16 缺少快照或切詞引擎不可用時不產檔

- **WHEN** 匯出記錄表中存在一筆沒有條件快照的既有紀錄
- **THEN** 該列的「下載」為停用狀態並附中文說明，點擊不產生任何檔案
- **WHEN** 一筆 `word` 單位的 `sequence_tagging` 匯出紀錄所記錄的切詞引擎於重新下載當下已不可用，使用者按下該列的「下載」
- **THEN** 畫面顯示指出該切詞引擎不可用的中文原因，沒有任何檔案被產生
- **AND** 匯出記錄表的列數不變

#### Scenario: SC-046 重新下載可重現性

- **WHEN** 以 Playwright 對同一筆匯出記錄，在變更頁面篩選、匯出對話框選項與介面語言之後執行重新下載
- **THEN** 重建檔與原始下載檔逐字元相同的比率為 100%，且每次重新下載後匯出記錄表列數增量為 0
