# task-management/014-task-detail Specification

## Purpose

任務詳情頁（`task-detail`）是專案負責人設定審核模型、監看審核進度並判定任務可否結案的單一控制面。正典為 `specs/task-management/014-task-detail/spec.md`（v4.2.0；issue #868 合併後移回封存路徑）；本文件僅收錄經 OpenSpec change 落地之需求，每條皆引用正典 FR ID，不改動其正典措辭。目前收錄：change `align-014-review-model`（issue #688）之 FR-005j／FR-005k／FR-008b／FR-010s／FR-010s-1／FR-010s-2／FR-010t（修訂，issue #596 單人接力審核模型對齊）、FR-018（新增，最終例外池）；change `task-detail-url-view-state`（issue #726）之 FR-019（新增，頁籤與清單檢視狀態的網址同步）；change `task-detail-seq-tagging-export-dialog`（issue #742）之 FR-020（新增，`sequence_tagging` 匯出對話框與序列匯出欄位）；change `task-detail-export-history-redownload`（issue #772）之 FR-021（新增，匯出記錄重新下載依條件快照重建且不新增紀錄）；change `task-detail-trial-round-from-waiting`（issue #791）之 FR-013（首次收錄修訂後全文，新增試標回合僅自待 IAA 確認狀態發起）；change `task-detail-iaa-precondition-and-override-scope`（issue #783）之 FR-010o-1（修訂，門檻覆寫排除未校準型別）、FR-010o-4（新增，待 IAA 確認頁顯示 IAA 計算狀態）；以及 change `validate-reviewer-arbiter-role-separation`（issue #868）之 FR-010s-1（修訂）。

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

審核設定編輯模式 MUST 提供兩份勾選清單，MUST NOT 提供任何數值輸入框、模式單選或行為 toggle：`reviewer_ids` 的候選為 `membership_status = active AND task_role = reviewer`；`arbiter_ids` 的候選 MUST 為 `reviewer_ids` 子集合，未勾選為 reviewer 者不得出現在 arbiter 候選。兩份名冊元素 MUST 遵守 `REVIEWER_ID_FORMAT`，使用 `TaskMembership.user_id` 作為唯一比對與審核負荷聚合鍵，不得以 Email 或顯示名稱比對；Email 只供顯示。

儲存時 MUST 同時符合：

1. `reviewer_ids` 至少一人；
2. `reviewer_ids - arbiter_ids` 至少一人，因 `arbiter_ids` 成員依 annotation/015 FR-093 保留處理仲裁，不接收新審核單位。

任一條件不符時 MUST 阻擋整筆儲存並顯示可修正錯誤。`arbiter_ids` 仍 MAY 為空；空值依 FR-010s-2 顯示摘要並沿用 FR-010t 發布警示，不構成儲存阻擋。取消 reviewer 勾選時，若同一人亦在 `arbiter_ids`，系統 MUST 同步取消並於儲存前提示。編輯區 MUST 揭露指定仲裁者不會收到新審核單位，且仲裁時另受 015 FR-060 非當事人限制；系統不得因 reviewer 恰為該筆標記員而排除其一般審核指派。

#### Scenario: 全部審核員同時是仲裁者時阻擋儲存

- **GIVEN** PL 在審核設定中勾選兩位 reviewer，並把這兩人都勾為 arbiter
- **WHEN** PL 儲存審核設定
- **THEN** 儲存被阻擋，既有設定不被覆寫
- **AND** 畫面明確提示至少保留一位未被指定為仲裁者的審核員

#### Scenario: 保留一位可分派審核員後可儲存

- **GIVEN** `reviewer_ids = [W, C]` 且 `arbiter_ids = [C]`
- **WHEN** PL 儲存審核設定
- **THEN** 儲存成功，W 是新審核單位的有效分派對象，C 保留處理仲裁

#### Scenario: 空仲裁名冊仍可儲存

- **GIVEN** `reviewer_ids` 至少一人且 `arbiter_ids = []`
- **WHEN** PL 儲存審核設定
- **THEN** 儲存成功
- **AND** 摘要與發布確認仍依既有規則警示未指定仲裁者，不新增儲存阻擋

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

**v4.2.0 修訂**：發布前 MUST 依當下成員狀態重算啟用中的有效分派池 `reviewer_ids - arbiter_ids`，且該集合 MUST 至少一人。若設定儲存後的成員停用或移除使有效分派池歸零，系統 MUST 阻擋發布、顯示至少需一位未被指定為仲裁者的啟用中審核員，且 MUST NOT 建立回合或改變任務狀態。`arbiter_ids = []` 仍依既有規則合法。

#### Scenario: 未勾選審核員時阻擋發布
- **GIVEN** 某 `draft` 任務有足額標記員但 `reviewer_ids` 為空
- **WHEN** 專案負責人點擊 `新增試標回合 R1`
- **THEN** 發布被阻擋並顯示審核員「還差 1 位」
- **AND** 另一任務已勾選審核員但未勾選仲裁者時發布不被阻擋，僅於確認畫面顯示無仲裁者的警示

#### Scenario: 成員異動不得留下零分派池
- **GIVEN** 任務已儲存 `reviewer_ids = [W, C]`、`arbiter_ids = [C]`，之後 W 被停用而只剩 C 為啟用中 reviewer
- **WHEN** 專案負責人發布新增試標回合或開始正式標記
- **THEN** 發布被阻擋並顯示至少需一位未被指定為仲裁者的啟用中審核員
- **AND** 任務狀態與回合數維持不變

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

### Requirement: FR-013 執行控制按鈕依任務狀態顯示，新增試標回合僅自待 IAA 確認狀態發起

Overview「任務狀態與執行控制」的執行控制按鈕 MUST 與任務狀態一一對應，且按鈕 MUST 與「達標條件」位於同一操作列：

| 任務狀態 | 顯示的執行控制按鈕 |
|----------|--------------------|
| `draft` | `新增試標回合 R1` |
| `dry_run_in_progress` | `新增試標回合 R{trial_round+1}` 以**停用**狀態顯示，並於按鈕旁以可見文字顯示原因「本回合全部提交並完成 IAA 後才能新增下一回合」 |
| `waiting_iaa_confirmation` | `開始正式標記` 與 `新增試標回合 R{trial_round+1}` 兩者並列 |
| `official_run_in_progress` | `標記完成` |
| `completed` | 不顯示執行控制按鈕，只顯示狀態 badge 與說明文字 |

**(1) 回合必須先結束才能開下一回合**。`dry_run_in_progress` 表示目前回合仍在進行；此狀態下 `新增試標回合 R{trial_round+1}` MUST 維持可見但停用，點擊 MUST NOT 建立回合、MUST NOT 改變任務狀態，原因文字 MUST 以可見文字呈現（MUST NOT 只放在 tooltip）。下一個回合只能在目前回合依 FR-008a 完成、任務自動進入 `waiting_iaa_confirmation` 之後發起。此停用的依據是「本回合尚未結束」，與 IAA 是否達標無關，因此不違反 FR-010o-3。

**(2) 待 IAA 確認是唯一的決策點**。`waiting_iaa_confirmation` 狀態 MUST 同時提供 `開始正式標記` 與 `新增試標回合 R{trial_round+1}`：兩者是同一決策點上的互斥選項，任一成功後任務即轉入新狀態、操作列改依新狀態的對照表呈現，因此不構成「語意衝突的操作」。本需求不改變 FR-010o-3——IAA 達標與否仍只是顧問性警示，兩個按鈕 MUST NOT 因 IAA 未達標而停用或隱藏。

**(3) 新狀態轉換**。自 `waiting_iaa_confirmation` 成功建立 `新增試標回合 R{n}`（`n >= 2`）時，任務狀態 MUST 轉為 `dry_run_in_progress`；該回合清單建立（FR-010f-2）與狀態轉換 MUST 視為同一動作，MUST NOT 出現「清單已建立但狀態仍為 `waiting_iaa_confirmation`」或「狀態已轉換但清單尚未建立」的可觀察中間狀態。轉換後 MUST NOT 在新回合任何一筆標記提交之前，就因 FR-008a 的完成條件立即轉回 `waiting_iaa_confirmation`——FR-008a 對新回合的評估 MUST 涵蓋本回合剛建立的標記作業。

**(4) 修訂紀錄必填檢查不變**。點擊 `新增試標回合 R{n}`（`n >= 2`）時，若未通過 FR-017 之修訂紀錄必填檢查，系統 MUST 阻擋建立並逐欄列出缺項提示，阻擋樣式比照 FR-010t（逐項顯示未滿足條件，不得靜默忽略點擊）；被阻擋時任務狀態 MUST 維持 `waiting_iaa_confirmation`。

**(5) 狀態機來源**。本需求新增之 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，MUST 同步列入 `docs/adr/022-task-state-machine-location.md` 的 Transition Table 與 `ALLOWED_TRANSITIONS` 白名單；`dry_run_in_progress → dry_run_in_progress`（進行中另開回合）MUST NOT 列入。

**(6) 揭露時點不變**。`annotation/015-annotation-workspace` FR-096 之試標歷史回饋揭露規則不因本需求修改：R{n+1} 只能在 R{n} 已進入 `waiting_iaa_confirmation` 之後建立，因此 R{n} 的揭露前提在 R{n+1} 建立前即已成立；R{n+1} 進行中其本身資料仍一律不揭露。

**(7) 回溯轉換不是跳階（釐清，維護者 2026-09-18 裁定）**。正典使用者故事 3 行為規則「狀態轉換必須符合 `TASK_STATUSES` 順序，不允許跳階」與 SC-004「任務狀態轉換遵循定義順序」的「順序」，MUST 以 `docs/adr/022-task-state-machine-location.md` 的轉換表判定：合法轉換以 ADR-022 轉換表為準；表列的回溯轉換（含本需求新增的 `waiting_iaa_confirmation → dry_run_in_progress`）不視為跳階。gate 4 回寫時於該行為規則與 SC-004 原地補上此句，不新增任何 FR／AC／SC 編號。

#### Scenario: AC-3.12 自待 IAA 確認新增第二回合須先填修訂紀錄

- **GIVEN** 任務已完成 R1 試標且處於 `waiting_iaa_confirmation`
- **WHEN** `project_leader` 點擊 `新增試標回合 R2` 但未填寫 `prior_round_findings` 與 `guideline_change_summary`、也未勾選 `no_change`
- **THEN** 系統阻擋建立並逐欄提示缺項，任務狀態維持 `waiting_iaa_confirmation`
- **AND** 補齊必填欄位（或勾選 `no_change` 並填寫 `no_change_reason`）後方可成功建立 R2，任務狀態轉為 `dry_run_in_progress`，且新建立的 `TrialRound.sampling_value` 等於本輪實際建立之試標清單筆數（FR-017、FR-010f-2）

#### Scenario: 試標進行中的新增試標回合按鈕停用並顯示原因

- **GIVEN** 任務處於 `dry_run_in_progress`（不論目前是 R1 或其後任一回合）
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 操作列顯示停用狀態的 `新增試標回合 R{trial_round+1}`，按鈕旁可見原因文字「本回合全部提交並完成 IAA 後才能新增下一回合」，且不出現其他執行控制按鈕
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `dry_run_in_progress`

#### Scenario: 待 IAA 確認同時提供開始正式標記與新增試標回合

- **GIVEN** 任務處於 `waiting_iaa_confirmation` 且已完成 R1，最新回合 IAA 未達目標門檻
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 操作列同時顯示 `開始正式標記` 與 `新增試標回合 R2`，兩者皆可點擊
- **AND** IAA 未達標只以警示樣式呈現，不停用或隱藏任一按鈕（FR-010o-3）

#### Scenario: 新回合建立後在任何提交前不會自動轉回待確認

- **GIVEN** 任務自 `waiting_iaa_confirmation` 成功建立 R2，任務狀態已轉為 `dry_run_in_progress`，且 R2 尚無任何標記提交
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態 MUST 維持 `dry_run_in_progress`，直到 R2 的標記作業依 `DRY_RUN_COMPLETION_RULE` 全部完成才轉為 `waiting_iaa_confirmation`

#### Scenario: SC-047 每個試標回合都經過待確認決策點

- **GIVEN** `TASK_STATUSES` 五種任務狀態各一個以 `project_leader` 開啟的任務
- **WHEN** 逐一檢視 Overview「任務狀態與執行控制」操作列
- **THEN** 可點擊的 `新增試標回合` 按鈕恰只出現在 `draft`（顯示 R1）與 `waiting_iaa_confirmation`（顯示 R{trial_round+1}）兩種狀態，`dry_run_in_progress` 只出現停用狀態的該按鈕並附原因文字，五種狀態逐一比對 5／5 符合 FR-013 對照表
- **AND** 任一任務自 `draft` 起經歷 N 個試標回合（N >= 2），每一個 R{n}（`n >= 2`）的建立都恰對應一次 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，不存在任何在 `dry_run_in_progress` 期間建立的回合

### Requirement: FR-010o-1 IAA 計算方式唯讀，目標門檻僅限已校準輸出類型覆寫

Overview「抽樣設定」MUST NOT 提供 IAA 計算方式的可選下拉選單；每個 `outputs[].type` 的計算方式 MUST 由 `OUTPUT_TYPE_IAA_REGISTRY` 自動選定並唯讀顯示。

**(1) 可覆寫範圍**。使用者 MUST 只能對同時符合下列兩個條件的輸出類型於 `target_agreement_overrides` 輸入覆寫門檻：該型別在本任務的 `outputs[]` 中，且 `OUTPUT_TYPE_IAA_REGISTRY` 為其登錄了 `default_threshold`。未覆寫時 MUST 顯示 registry 的 `default_threshold` 作為 placeholder 建議值。

**(2) 未校準型別不提供覆寫**。屬 `IAA_UNCALIBRATED_TYPES`（定義與成員以 `dataset/017-dataset-analysis-detail` FR-043 為唯一來源）或 `IAA_GATE_EXCLUDED_TYPES` 的輸出類型，「抽樣設定」編輯狀態 MUST NOT 渲染覆寫輸入框，唯讀摘要 MUST NOT 顯示任何門檻數值。

**(3) 儲存時拒絕**。儲存 `target_agreement_overrides` 時，若含有屬 `IAA_UNCALIBRATED_TYPES` 的 key、或含有不在本任務 `outputs[]` 中的 key，系統 MUST 拒絕整筆儲存並逐項指出不允許的 key，MUST NOT 靜默丟棄該 key 後儲存其餘欄位。持久化後的 `target_agreement_overrides` MUST NOT 含有屬 `IAA_UNCALIBRATED_TYPES` 的 key。

**(4) 校準後自動開放**。某型別自 `IAA_UNCALIBRATED_TYPES` 移出、且 `OUTPUT_TYPE_IAA_REGISTRY` 為其登錄 `default_threshold` 後，該型別的覆寫輸入框 MUST 依第 (1) 點自動出現，MUST NOT 需要修改本頁面依型別分流的程式（憲法：Generalization-First）。

#### Scenario: 未校準型別不顯示門檻覆寫欄位

- **GIVEN** 任務 `outputs[]` 含一個屬 `IAA_UNCALIBRATED_TYPES` 的輸出類型與一個已登錄 `default_threshold` 的輸出類型，且任務處於可編輯抽樣設定的狀態
- **WHEN** `project_leader` 進入 Overview「抽樣設定」編輯狀態
- **THEN** 已登錄門檻的輸出類型列顯示覆寫輸入框，其 placeholder 為 registry 預設門檻
- **AND** 未校準輸出類型列只顯示指標名稱，不渲染覆寫輸入框，且該列不出現任何門檻數值

#### Scenario: 儲存含未校準型別 key 的覆寫被拒絕

- **GIVEN** 任務 `outputs[]` 含一個屬 `IAA_UNCALIBRATED_TYPES` 的輸出類型
- **WHEN** 一筆儲存請求的 `target_agreement_overrides` 含有該輸出類型的 key（無論值是否落在 `0..1`）
- **THEN** 系統拒絕整筆儲存並指出該 key 不允許覆寫
- **AND** 任務既有的 `target_agreement_overrides` 維持儲存前的內容，不含該 key

#### Scenario: 輸出類型完成校準後覆寫欄位自動出現

- **GIVEN** 某輸出類型原屬 `IAA_UNCALIBRATED_TYPES`，其後自該集合移出並於 `OUTPUT_TYPE_IAA_REGISTRY` 登錄 `default_threshold`
- **WHEN** `project_leader` 進入含該輸出類型之任務的 Overview「抽樣設定」編輯狀態
- **THEN** 該輸出類型列顯示覆寫輸入框，placeholder 為新登錄的預設門檻，且可依 FR-010q 驗證後儲存

### Requirement: FR-010o-4 待 IAA 確認頁顯示試標回合 IAA 計算狀態，計算未結束不得呈現為 IAA 未達標

IAA 為非同步計算。任務依 FR-008a 進入 `waiting_iaa_confirmation` 時，最新試標回合的 IAA 可能尚未算完或計算失敗；本需求規定這兩種情況在畫面上的呈現，以及它們與「IAA 未達標」的區別。

**(1) 計算狀態欄位**。`TrialRound` MUST 具備 `iaa_computation_status`，值域恰為 `pending | done | failed`：回合建立時為 `pending`；該回合每一個需計算 IAA 的輸出類型都得到確定結果時為 `done`；計算執行錯誤時為 `failed`。「確定結果」指一個數值，或 `dataset/017-dataset-analysis-detail` FR-039 第 4 點定義的「無法計算」（`De = 0`）；後者 MUST 記為 `done`（與該規格 AC-3.16「不阻擋使用者進入正式標記」一致）。`IAA_GATE_EXCLUDED_TYPES` 不需計算，不列入判斷。本欄位只描述計算是否結束，MUST NOT 承載達標與否。

**(2) 計算中**。最新回合為 `pending` 時，Overview「任務狀態與執行控制」MUST 顯示「IAA 計算中」狀態；達標條件 pills 的 IAA 項、判定 banner 與試標回合歷程 MUST NOT 顯示任何 IAA 數值或達標／未達標判定。

**(3) 計算失敗與重試**。最新回合為 `failed` 時，同一區塊 MUST 顯示計算失敗狀態並提供「重試計算」操作；該操作 MUST 只提供給 `project_leader`。重試後該回合 MUST 回到 `pending` 並重新排入計算；重試 MUST NOT 改變任務狀態、MUST NOT 建立新回合。

**(4) 計算未結束不是 IAA 未達標**。`pending` 與 `failed` MUST NOT 以 IAA 未達標的方式呈現（MUST NOT 使用未達標警示樣式、MUST NOT 顯示「R{n} 未通過」類判定標題），亦 MUST NOT 被任何邏輯當作未達標處理。FR-010o-3 的顧問性警示只適用於 `done` 且得到數值的結果。

**(5) 開始正式標記的前置條件**。最新回合不為 `done` 時，`開始正式標記` MUST 以停用狀態顯示，並於按鈕旁以可見文字說明原因（計算中或計算失敗），系統 MUST NOT 執行 `waiting_iaa_confirmation → official_run_in_progress`（`docs/adr/022-task-state-machine-location.md` Transition Table）。最新回合為 `done` 後，`開始正式標記` 依 FR-010o-3 不因 IAA 未達標而停用；此處的停用依據是「計算尚未結束」，不屬於 FR-010o-3 所禁止的「因 IAA 未達標停用」。

**(6) 新增試標回合的前置條件**。最新回合不為 `done` 時，`waiting_iaa_confirmation` 狀態下的 `新增試標回合 R{trial_round+1}` 同樣 MUST 以停用狀態顯示，並於按鈕旁以可見文字說明原因（計算中或計算失敗）；系統 MUST NOT 執行 `waiting_iaa_confirmation → dry_run_in_progress`（`docs/adr/022-task-state-machine-location.md` Transition Table）。停用依據同樣是「計算尚未結束」，與 IAA 是否達標無關；最新回合為 `done` 後，該按鈕依 FR-013 第 (2) 點可點擊。

#### Scenario: IAA 計算中不呈現為未達標且暫不能開始正式標記

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = pending`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 畫面顯示「IAA 計算中」，IAA 項不顯示任何數值、不顯示未達標警示或「未通過」判定
- **AND** `開始正式標記` 為停用狀態，按鈕旁可見說明計算中的原因文字，點擊後任務狀態維持 `waiting_iaa_confirmation`

#### Scenario: IAA 計算失敗可由專案負責人重試

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = failed`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」並點擊「重試計算」
- **THEN** 點擊前畫面顯示計算失敗狀態與「重試計算」操作，且不以未達標樣式呈現
- **AND** 點擊後該回合回到 `pending`、畫面改為「IAA 計算中」，任務狀態維持 `waiting_iaa_confirmation`，試標回合數不變

#### Scenario: 無法計算視為計算已結束，不阻擋開始正式標記

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合某輸出類型因有效標記員數 `< 2` 而為「無法計算」（`De = 0`），其餘需計算的輸出類型皆已得到數值
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 該回合 `iaa_computation_status = done`，畫面不顯示「IAA 計算中」或計算失敗狀態
- **AND** `開始正式標記` 與 `新增試標回合 R{trial_round+1}` 皆可點擊

#### Scenario: IAA 計算未結束時新增試標回合同樣停用

- **GIVEN** 任務處於 `waiting_iaa_confirmation` 且已完成 R1，最新試標回合 `iaa_computation_status` 為 `pending` 或 `failed`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** `新增試標回合 R2` 為停用狀態，按鈕旁可見說明計算中或計算失敗的原因文字
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `waiting_iaa_confirmation`
