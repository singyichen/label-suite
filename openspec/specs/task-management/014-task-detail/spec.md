# task-management/014-task-detail Specification

## Purpose

任務詳情頁（`task-detail`）是專案負責人設定審核模型、監看審核進度並判定任務可否結案的單一控制面。正典為 `specs/task-management/014-task-detail/spec.md`（v4.2.0）；本文件僅收錄經 OpenSpec change 落地之需求，每條皆引用正典 FR ID，不改動其正典措辭。目前收錄：change `align-014-review-model`（issue #688）之 FR-005j／FR-005k／FR-008b／FR-010s／FR-010s-1／FR-010s-2／FR-010t（修訂，issue #596 單人接力審核模型對齊）、FR-018（新增，最終例外池）；change `task-detail-url-view-state`（issue #726）之 FR-019（新增，頁籤與清單檢視狀態的網址同步）；change `task-detail-seq-tagging-export-dialog`（issue #742）之 FR-020（新增，`sequence_tagging` 匯出對話框與序列匯出欄位）；change `task-detail-export-history-redownload`（issue #772）之 FR-021（新增，匯出記錄重新下載依條件快照重建且不新增紀錄）；change `task-detail-trial-round-from-waiting`（issue #791）之 FR-013（首次收錄修訂後全文，新增試標回合僅自待 IAA 確認狀態發起）；change `task-detail-iaa-precondition-and-override-scope`（issue #783）之 FR-010o-1（修訂，門檻覆寫排除未校準型別）、FR-010o-4（新增，待 IAA 確認頁顯示 IAA 計算狀態）；以及 change `validate-reviewer-arbiter-role-separation`（issue #868）之 FR-010s-1／FR-010t（修訂）。

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

**本次修訂（issue #1120）**：`arbiter_ids` 為空時的發布警示文案 MUST 更新。`arbiter_ids` 為空仍 MUST NOT 阻擋發布，但警示文字 MUST 改為說明爭議項將由 `project_leader` 依 FR-023 自行裁定，MUST NOT 再聲稱「任務將無法結案」——該敘述在 FR-023 生效後已不成立。成員人數檢查第 (1)(2) 點與其「還差 N 位」缺口訊息文字不變。

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

#### Scenario: 空仲裁者名冊的發布警示指向負責人裁定通道

- **GIVEN** 一個 `arbiter_ids` 為空、成員人數檢查皆通過的任務
- **WHEN** `project_leader` 進入發布確認
- **THEN** 發布未被阻擋，警示文字說明爭議項將由負責人自行裁定（FR-023）
- **AND** 警示文字不含「任務將無法結案」之敘述

### Requirement: FR-018 最終例外池

`annotation-progress` 頁籤 MUST 提供「最終例外池」區塊，作為專案負責人逐筆收尾爭議的入口。

1. **入口與計數**：區塊標題列 MUST 顯示待處置項目數；`0` 時 MUST 渲染空狀態（`最終例外池已清空`），MUST NOT 隱藏整個區塊——結案閘門（FR-008b）依賴此處為唯一可稽核的呈現點。
2. **清單欄位**：逐筆呈現樣本 ID、標記員帳號、審核員帳號、爭議的輸出類型、仲裁者帳號與其「兩者皆非」理由、落入例外池的時間。
3. **逐筆導頁**：每列 MUST 提供進入處置畫面的動作，導向 `annotation/015-annotation-workspace` FR-095 之收尾介面並攜帶完整審核單位身分（`task_id × run_type × annotator_id × sample_id`）與爭議項識別。
4. **權限**：本區塊 MUST 僅對 `project_leader` 呈現；其他角色 MUST NOT 看到此區塊，直連進入時 MUST 比照 FR-006 導回並提示無權限。
5. **run 分流**：清單 MUST 可依 `run_type` 篩選；`dry_run` 與 `official_run` 的例外項各自獨立計數，FR-008b 第 4 項之結案閘門 MUST 僅計 `official_run` 的待處置項目。

**本次修訂（issue #1120，BREAKING）**：第 (5) 點之閘門範圍自「FR-008b 第 (4) 項之結案閘門僅計 `official_run` 的待處置項目」改為兩個閘門各自取用對應 `run_type` 的待處置項目——`dry_run` 的待處置例外項 MUST 計入試標完成閘門（FR-008a 與修訂後之 `DRY_RUN_COMPLETION_RULE`），`official_run` 的待處置例外項 MUST 計入結案閘門（FR-008b 第 (4) 項）。清單仍 MUST 可依 `run_type` 篩選，兩者仍各自獨立計數、MUST NOT 相加。第 (1)～(4) 點文字不變，包含 `0` 時必須渲染空狀態而非隱藏區塊，以及僅 `project_leader` 可見之角色邊界。

#### Scenario: SC-043 例外池清單與導頁
- **GIVEN** 某任務有 2 項 `official_run` 待處置例外
- **WHEN** 專案負責人開啟 `annotation-progress`
- **THEN** 「最終例外池」區塊標題顯示 2 項待處置，逐列呈現樣本 ID、標記員、審核員、爭議輸出類型、仲裁者與其理由
- **AND** 點擊任一列進入該爭議項的處置畫面，網址攜帶完整審核單位身分

#### Scenario: 非專案負責人看不到例外池
- **GIVEN** 操作者為 `reviewer`
- **WHEN** 其開啟 `annotation-progress`
- **THEN** 畫面上不存在「最終例外池」區塊

#### Scenario: dry_run 例外項計入試標閘門而不計入結案閘門

- **GIVEN** 一個任務同時存在 `1` 筆待處置的 `dry_run` 例外項與 `0` 筆待處置的 `official_run` 例外項
- **WHEN** 系統分別評估試標完成條件與結案條件
- **THEN** 試標完成條件因該 `dry_run` 例外項而未滿足
- **AND** 結案閘門的例外池條件不因該 `dry_run` 例外項而未滿足
- **AND** 最終例外池清單可依 `run_type` 篩選，兩種計數分列呈現且未相加

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
| `dry_run_in_progress` | `新增試標回合 R{trial_round+1}` 以**停用**狀態顯示，並於按鈕旁以可見文字顯示原因「本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合」 |
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

**本次修訂（issue #1120，BREAKING）**：第 (1) 點之停用原因文字自「本回合全部提交並完成 IAA 後才能新增下一回合」改為涵蓋審核與仲裁——`dry_run_in_progress` 下 `新增試標回合 R{trial_round+1}` MUST 維持可見但停用，其可見原因文字 MUST 說明本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合。該停用依據仍為「本回合尚未結束」，與 IAA 是否達標無關，MUST NOT 被視為違反 FR-010o-3。其餘各點文字不變。

#### Scenario: AC-3.12 自待 IAA 確認新增第二回合須先填修訂紀錄

- **GIVEN** 任務已完成 R1 試標且處於 `waiting_iaa_confirmation`
- **WHEN** `project_leader` 點擊 `新增試標回合 R2` 但未填寫 `prior_round_findings` 與 `guideline_change_summary`、也未勾選 `no_change`
- **THEN** 系統阻擋建立並逐欄提示缺項，任務狀態維持 `waiting_iaa_confirmation`
- **AND** 補齊必填欄位（或勾選 `no_change` 並填寫 `no_change_reason`）後方可成功建立 R2，任務狀態轉為 `dry_run_in_progress`，且新建立的 `TrialRound.sampling_value` 等於本輪實際建立之試標清單筆數（FR-017、FR-010f-2）

#### Scenario: 試標進行中的新增試標回合按鈕停用並顯示原因

- **GIVEN** 任務處於 `dry_run_in_progress`（不論目前是 R1 或其後任一回合）
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 操作列顯示停用狀態的 `新增試標回合 R{trial_round+1}`，按鈕旁可見原因文字「本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合」，且不出現其他執行控制按鈕
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

#### Scenario: 停用原因涵蓋審核與仲裁

- **GIVEN** 一個 `dry_run_in_progress` 任務，其標註已全數提交但仍有審核或仲裁未完成
- **WHEN** `project_leader` 檢視執行控制操作列
- **THEN** `新增試標回合` 按鈕可見且停用，旁側可見原因文字提及必要審核與必要仲裁
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `dry_run_in_progress`

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

### Requirement: FR-007c 工時篩選列單一日期區間選擇器

工時篩選列的日期區間輸入 MUST 以單一日期區間選擇器呈現，不得使用兩個獨立的日期欄位。

**(1) 單一控制項與高亮**。控制項 MUST 於同一日曆介面框選起訖日期；已選範圍 MUST 即時高亮，起訖日與其間的日期需可視覺區分。控制項 MUST 顯示已選範圍（格式 `YYYY-MM-DD ～ YYYY-MM-DD`），未選取時 MUST 顯示適當提示文字。

**(2) 不完整選取不套用**。只完成起點、尚未選取終點前，MUST NOT 套用不完整的新區間——工時明細表與匯總 MUST 維持套用前的結果。

**(3) 反向選取正規化**。允許使用者先點選時間較晚的日期：系統 MUST 將任何起訖點選順序正規化為有效的 `from <= to` 區間，MUST NOT 因點選順序產生無效篩選結果。

**(4) 包含邊界與清除**。完成區間選取後，MUST 套用含起日與迄日的篩選結果（既有 `entry.date < from` / `entry.date > to` 排除式比較不變）。控制項 MUST 提供「清除」操作，清除後 MUST 恢復不限制日期的結果。

**(5) 與其他篩選組合**。日期區間 MUST 可與任務階段、成員篩選（`project_leader`）組合使用；明細與匯總需依組合後的條件一致計算。篩選變更時的分頁重置規則（FR-007a 之 `wlPage` 重設為 1）MUST 不變。

**(6) URL 同步與單邊相容**。控制項 MUST 讀寫既有 `state.workLogDateFrom`／`state.workLogDateTo` 與 `wl_from`／`wl_to` 網址參數（FR-019 文字不變）；既有僅帶 `wl_from` 或僅帶 `wl_to` 的單邊網址 MUST 保留原篩選語意，並在單一控制項中呈現為開放式區間（例如只標示已知一端）。

**(7) 鍵盤操作與焦點**。控制項 MUST 可用鍵盤完整操作：方向鍵移動日期焦點、Enter／Space 選取聚焦日期、Esc 關閉控制項並捨棄尚未完成的選取、焦點 MUST 送回觸發元件。

**(8) 不改變權限邊界**。`reviewer` 的 `work-log` 篩選維度（FR-007：僅日期區間與任務階段，不含成員篩選）MUST 不受本控制項影響。

#### Scenario: 單一控制項取代兩個獨立欄位並清楚呈現已選範圍

- **GIVEN** `project_leader` 開啟 `task-detail` 的 `work-log` tab
- **WHEN** 檢視工時篩選列的日期區間輸入
- **THEN** 畫面僅顯示一個日期區間選擇器，不存在兩個獨立的「起始日期」「結束日期」欄位
- **AND** 點擊後於同一日曆介面可框選跨日或同日區間，選取範圍以高亮清楚呈現，控制項顯示 `YYYY-MM-DD ～ YYYY-MM-DD`

#### Scenario: 不完整選取與反向選取

- **GIVEN** 日曆介面已開啟
- **WHEN** 使用者只點選一個日期（尚未完成區間）
- **THEN** 工時明細表與匯總維持選取前的結果，不套用不完整區間
- **WHEN** 使用者接著點選一個早於第一次點選的日期以完成區間
- **THEN** 系統以較早日期為起點、較晚日期為終點正規化套用，不產生無效篩選結果

#### Scenario: 套用含邊界的區間並可清除

- **GIVEN** 使用者完成一組跨日區間選取
- **WHEN** 檢視工時明細表
- **THEN** 起日與迄日當天的紀錄皆包含在結果中
- **WHEN** 使用者點擊控制項的「清除」
- **THEN** 日期篩選清空，工時明細表與匯總恢復為不限制日期的完整結果

#### Scenario: 與任務階段、成員篩選組合並維持分頁重置規則

- **GIVEN** `project_leader` 已選取一組日期區間
- **WHEN** 進一步調整任務階段或成員篩選
- **THEN** 明細表與匯總依日期區間與新篩選條件的組合結果計算
- **AND** 分頁回到第 1 頁，與既有篩選變更分頁重置規則一致（FR-007a）

#### Scenario: `wl_from`／`wl_to` 網址同步、重新整理與單邊直連還原

- **GIVEN** 使用者以日曆選取一組日期區間
- **WHEN** 檢視網址
- **THEN** 網址依 FR-019 以 `history.replaceState()` 寫回 `wl_from`／`wl_to`，重新整理後畫面與控制項顯示值還原一致
- **GIVEN** 一組僅帶 `wl_from`（或僅帶 `wl_to`）的 `task-detail` 網址
- **WHEN** 直接開啟該網址
- **THEN** 控制項呈現為開放式區間（已知一端正確顯示），工時明細表套用與直接操作到該狀態時一致的單邊篩選結果

#### Scenario: 鍵盤操作與焦點回復

- **GIVEN** 日曆介面已透過鍵盤開啟（trigger 上按 Enter 或 Space）
- **WHEN** 使用者以方向鍵移動日期焦點、以 Enter 完成起訖選取
- **THEN** 選取完成後控制項顯示新區間，焦點送回觸發元件
- **WHEN** 使用者改以 Esc 關閉日曆介面
- **THEN** 尚未完成的選取被捨棄、不套用任何變更，焦點送回觸發元件

### Requirement: FR-022 正式標記池歸零之發布阻擋（成功標準 SC-049）

發布 `開始正式標記` 前，系統 MUST 驗證剩餘正式標記池筆數大於 `0`。剩餘筆數之推導一律沿用 FR-010f-3 之既有推導式，本條 MUST NOT 複製或另建第二份推導式。

**(1) 發布阻擋**。剩餘正式標記池筆數為 `0` 時，系統 MUST 阻擋 `開始正式標記` 發布，任務狀態 MUST 維持 `waiting_iaa_confirmation`，且 MUST NOT 建立任何正式標記清單或 assignment。

**(2) 與 IAA 語意分列**。資料池不足之原因 MUST 與 IAA 相關狀態分列呈現：MUST NOT 以「IAA 未達標」或「IAA 計算中／計算失敗」表述資料池不足，亦 MUST NOT 因資料池不足而改變最新試標回合之 `iaa_computation_status`。最新回合 `iaa_computation_status = done`（含「無法計算」記為 `done`）且 IAA 已達標時，本條之阻擋 MUST 仍然生效——此阻擋依據為資料池筆數，與 IAA 達標與否及計算是否結束皆無關，不構成 FR-010o-3 所禁止之「因 IAA 未達標而停用」，亦不改變 FR-010o-4 之既有停用規則。

**(3) `draft` 階段提前揭露**。任務處於 `draft` 且目前 `sampling_value` 與既有回合設定會使剩餘正式標記池為 `0` 時，系統 MUST 於發布前即顯示原因，並 MUST 以停用狀態呈現對應的執行控制 CTA。此提前揭露 MUST NOT 取代 FR-010t 之成員人數檢查，兩者各自獨立逐項呈現。

**(4) handler 同樣驗證**。本條之驗證 MUST 在操作 handler 內執行：直接呼叫發布 handler（繞過停用的按鈕）MUST 同樣失敗，MUST NOT 改變任務狀態或建立任何清單資料。

**(5) 可取得性**。阻擋原因 MUST NOT 僅以 hover 或顏色傳達；原因文字 MUST 為可見文字，且 MUST 可由鍵盤操作與螢幕閱讀器取得。

**成功標準 SC-049**：任一任務之剩餘正式標記池筆數為 `0` 時，`開始正式標記` 發布成功次數為 `0`——包含點擊停用 CTA 與直接呼叫 handler 兩條路徑；阻擋原因以可見文字逐項呈現且可由螢幕閱讀器取得，並與 IAA 相關狀態分列，最新試標回合之 `iaa_computation_status` 不因阻擋而改變。

#### Scenario: `draft` 抽樣設定會使正式池歸零時提前揭露並停用 CTA

- **GIVEN** 一個 `draft` 任務，其資料集總筆數與目前每回合抽樣筆數設定會使扣除試標後的剩餘正式標記池為 `0`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 畫面以可見文字顯示剩餘正式標記池為 `0` 的原因，對應執行控制 CTA 呈現停用狀態
- **AND** 該原因文字可由鍵盤聚焦路徑與螢幕閱讀器取得，並非僅由 hover 或顏色傳達

#### Scenario: 計算狀態為 `done` 且 IAA 已達標，仍因正式池為 0 阻擋發布

- **GIVEN** 一個任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = done` 且 IAA 已達目標門檻，但剩餘正式標記池筆數為 `0`
- **WHEN** `project_leader` 點擊 `開始正式標記`
- **THEN** 系統阻擋發布，任務狀態維持 `waiting_iaa_confirmation`，未建立任何正式標記清單或 assignment
- **AND** 畫面逐項列出未滿足的原因，其中資料池不足與 IAA 相關狀態分列呈現

#### Scenario: 資料池不足不得被表述為 IAA 問題

- **GIVEN** 一個任務之剩餘正式標記池筆數為 `0`，且最新試標回合 `iaa_computation_status = done`
- **WHEN** `project_leader` 檢視發布阻擋原因
- **THEN** 原因文字指向資料池筆數不足，不含「IAA 未達標」「IAA 計算中」「IAA 計算失敗」任何表述
- **AND** 最新試標回合之 `iaa_computation_status` 不因本次阻擋而改變

#### Scenario: 直接呼叫發布 handler 同樣失敗

- **GIVEN** 一個任務之剩餘正式標記池筆數為 `0`，其 `開始正式標記` CTA 為停用狀態
- **WHEN** 直接呼叫發布 handler，繞過停用的按鈕
- **THEN** 發布失敗，任務狀態不變，未建立任何正式標記清單或 assignment

### Requirement: FR-010u 跨頁籤衍生計數的共用查詢上下文與聚合單位（成功標準 SC-050）

`task-detail` 五個頁籤（`TASK_TABS`）呈現的衍生計數 MUST 以同一組查詢上下文推導，並 MUST 依既有正典定義之聚合單位計數。

**(1) 共用查詢上下文**。任務、`run_type` 與回合為共用查詢上下文：概覽、成員、進度、結果四個頁籤之計數 MUST 由同一組 `task_id × run_type × round` 推導。選取某一回合時 MUST NOT 混入其他回合或其他任務的資料。工時與匯出歷史 MUST 依當前任務篩選；該任務無對應紀錄時 MUST 呈現真實空狀態，MUST NOT 呈現其他任務的通用示範資料。

**(2) `已提交` 的分子分母**。分子為該 `task_id × run_type × round` 範圍內已提交之標記 assignment 數；分母為同範圍內已指派之標記 assignment 數。依 FR-005h 被 `project_leader` 明確排除之標記作業 MUST NOT 計入分子或分母，與 FR-005h 既有的「不計入完成率或標記分布統計」一致。

**(3) `已完成輪次` 的分子**。分子為已結束之試標回合數；當前進行中之回合 MUST NOT 計入。歷史回合與當前回合 MUST 分列呈現，兩者之計數與決策 MUST NOT 交叉累計。「已結束」之判定依既有試標完成規則（FR-008a），本條不另定義該規則。

**(4) 既有定義不得重複**。`已定案 review unit` 之判定式與聚合單位（`sample_id × annotator_id × run_type`）以 `annotation/015-annotation-workspace` FR-051 為正典；`最終例外輸出項目` 之來源與逐筆收尾動作以 `annotation/015-annotation-workspace` FR-095 為正典，其分 `run_type` 獨立計數規則沿用本規格 FR-018 第 (5) 點。本規格 MUST 讀取該兩處既有定義，MUST NOT 另建第二份判定式、分母或狀態清單。

**(5) 單位不得相加**。標記 assignment、審核單位、爭議項（審核單位 × 輸出類型）分屬三個不同聚合層級，MUST NOT 相加為單一數字，亦 MUST NOT 共用同一分母。畫面呈現 MUST 使每個計數的單位可辨識；提交進度與定案進度 MUST 分別命名，MUST NOT 以同一標題涵蓋兩者。

**(6) 時間語意**。已提交時間 MUST NOT 被呈現為審核完成或仲裁完成時間；各階段時間 MUST 取自其各自的事件來源。

**(7) 資料分配與工作完成分離**。樣本池分配的視覺呈現（FR-010p）MUST 附明確的「資料分配」語意說明；分配比例達滿 MUST NOT 被表述為標記或審核工作已完成。

**成功標準 SC-050**：對同一任務依序檢視五個頁籤時，由同一 `task_id × run_type × round` 推導之計數在各頁籤間完全一致，且無任一數字由標記 assignment、審核單位、爭議項三種單位相加而得；該任務無工時或匯出紀錄時兩區塊皆呈現空狀態，不出現其他任務的通用資料。

#### Scenario: 五個頁籤的計數同源且不混入其他任務或回合

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × run_type × round` 推導，數值彼此一致
- **AND** 畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄
- **AND** 該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料

#### Scenario: 三種計數單位分列呈現且不相加

- **GIVEN** 一個任務之標記 assignment、審核單位與爭議項三者數量互不相等
- **WHEN** `project_leader` 檢視進度與結果頁籤
- **THEN** 提交進度與定案進度分別命名呈現，各自的分子分母可辨識其單位
- **AND** 畫面不存在將標記 assignment 數、審核單位數與爭議項數相加後的單一數字
- **AND** 歷史回合與當前回合的計數分列呈現，未交叉累計

### Requirement: FR-023 無仲裁者時爭議由專案負責人裁定（成功標準 SC-051）

任務之 `arbiter_ids` 為空時，`project_leader` MUST 能對該任務的爭議項做最終裁定，其裁定 MUST 與仲裁者裁定等效地使該爭議項視為已解決。本條是試標完成條件（FR-008a）與結案條件（FR-008b）納入「必要仲裁完成」後的唯一出口，避免未指定仲裁者的任務永遠無法完成。

**(1) 觸發條件**。本通道 MUST 僅在 `arbiter_ids` 為空時對 `project_leader` 開放。`arbiter_ids` 非空時 MUST NOT 提供此通道——該情形的爭議仍須由具仲裁資格者依 `annotation/015-annotation-workspace` FR-060 之非當事人條件處理，`project_leader` MUST NOT 藉本條繞過仲裁者。

**(2) 裁定選項與效果**。`project_leader` 之裁定選項 MUST 與仲裁者相同（`annotation/015-annotation-workspace` FR-061 之 `ARBITRATION_OUTCOMES`：採標記員答案／採審核員答案／兩者皆非）。裁定為「兩者皆非」時，該項 MUST 依既有規則落入最終例外池由 `project_leader` 逐筆收尾（FR-018、`annotation/015-annotation-workspace` FR-095），MUST NOT 因裁定者本身即為 `project_leader` 而跳過例外池。`dry_run` 之例外池收尾動作 MUST NOT 提供 `custom_answer`——依 `annotation/015-annotation-workspace` FR-095 第 (3) 點該動作僅適用 `official_run`。

**(3) 可追溯性**。裁定 MUST 記錄裁定者帳號、裁定時間與理由，且 MUST 可與仲裁者所做的裁定區分——畫面與匯出 MUST 標明該筆定案來源為「負責人裁定（無指定仲裁者）」，MUST NOT 呈現為一般仲裁者裁定。「兩者皆非」之理由 MUST 為必填，與 `annotation/015-annotation-workspace` FR-061 第 3 點一致。

**(4) 不改變盲審隔離**。本通道 MUST NOT 使 `project_leader` 看到任何尚未提交的審核判斷，`annotation/015-annotation-workspace` FR-062 之盲審隔離規則不因本條放寬。

**成功標準 SC-051**：`arbiter_ids` 為空且存在爭議項的任務，`project_leader` 可逐項完成裁定並使該任務具備試標完成與結案資格，成功率 100%；裁定來源在畫面與匯出中皆可與仲裁者裁定區分；`arbiter_ids` 非空的任務中，此通道對 `project_leader` 的開放次數為 `0`。

#### Scenario: 無仲裁者任務的爭議可由負責人裁定並解除卡死

- **GIVEN** 一個 `arbiter_ids` 為空的任務，其某審核單位因審核員 `modify` 而推導為「爭議中」
- **WHEN** `project_leader` 開啟該爭議項並選擇採標記員答案或採審核員答案，填妥理由後送出
- **THEN** 該爭議項視為已解決，該審核單位依既有判定式推導為「已定稿」
- **AND** 畫面與匯出標明該筆定案來源為負責人裁定（無指定仲裁者），可與仲裁者裁定區分
- **AND** 該任務不再因此爭議項而無法完成試標或結案

#### Scenario: 有仲裁者時負責人不得取得此通道

- **GIVEN** 一個 `arbiter_ids` 非空的任務，其某審核單位推導為「爭議中」
- **WHEN** `project_leader` 檢視該爭議項
- **THEN** 不提供負責人裁定入口，該爭議項仍僅能由具仲裁資格者處理
- **AND** 嘗試直接呼叫裁定 handler 失敗，該審核單位狀態維持「爭議中」

#### Scenario: 負責人裁定「兩者皆非」仍須經最終例外池

- **GIVEN** 一個 `arbiter_ids` 為空的 `dry_run` 任務，`project_leader` 正在裁定某爭議項
- **WHEN** 其選擇「兩者皆非」並填妥必填理由送出
- **THEN** 該項落入最終例外池並計入 `dry_run` 待處置項目數，該審核單位維持「爭議中」
- **AND** 該任務在例外池收尾前不具備試標完成資格
- **AND** `dry_run` 的收尾動作選項不包含 `custom_answer`

### Requirement: DRY_RUN_COMPLETION_RULE 試標完成規則涵蓋標註、必要審核與必要仲裁（BREAKING）

> **delta 形式註記**：本條改寫正典既有的規格常數 `DRY_RUN_COMPLETION_RULE`（`specs/task-management/014-task-detail/spec.md:56`），屬 BREAKING。置於 ADDED 區段而非 MODIFIED 區段，因為衍生檢視尚未收錄此常數，archive 的標題比對會找不到既有標題。回寫正典時仍為原地改寫。

規格常數 `DRY_RUN_COMPLETION_RULE` MUST 自「僅計標註提交」改為涵蓋標註、必要審核與必要仲裁三者：

`DRY_RUN_COMPLETION_RULE = no unassigned dry-run assignments AND all membership_status=active annotators: assigned_count == completed_count AND all dry_run review units derived as finalized AND no dry_run review unit derived as disputed AND no pending dry_run final-exception-pool item`

**(1) 審核與仲裁的判定來源**。審核單位之定址與狀態判定式 MUST 沿用 `annotation/015-annotation-workspace` FR-051，MUST NOT 於本規格另建第二份判定式。爭議項之裁定 MUST 沿用 `annotation/015-annotation-workspace` FR-061，或於 `arbiter_ids` 為空時沿用本規格 FR-023。

**(2) 合法排除仍然有效**。依 FR-005h 被 `project_leader` 明確排除的標記作業 MUST NOT 計入標註完成度；經最終例外池「自資料集排除」處置的項目 MUST 視為已解決，與 FR-008b 第 (2) 項既有語意一致。本條 MUST NOT 使任何既有合法處置變成永遠無法完成。

**(3) 連帶修訂的驗收與成功標準**。AC-3.2 之 **Then** 子句 MUST 改為「僅在標註、必要審核與必要仲裁皆完成時才自動轉為 `waiting_iaa_confirmation`」；AC-3.16 之充分性敘述 MUST 同步改為新規則；SC-004 MUST 同步改為新規則。三者的 ID 不變。

**(4) 不變動的部分**。`TASK_STATUSES` 五態不變，MUST NOT 新增「待確認完成」狀態或任何重開流程。IAA 仍為顧問性警示，FR-010o-3 與 FR-010o-4 文字不變——本條新增的前置條件與 IAA 達標與否、計算是否結束皆無關，MUST NOT 被表述為 IAA 問題。

#### Scenario: 全員提交但仍有待審核單位時維持試標中

- **GIVEN** 一個 `dry_run_in_progress` 任務，其本回合所有 active 標記員皆 `assigned_count == completed_count` 且無未指派作業，但存在至少一個推導為「待審」的審核單位
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態維持 `dry_run_in_progress`，不自動轉為 `waiting_iaa_confirmation`
- **AND** 畫面以可見文字說明標註已提交、尚有審核待完成，並顯示帶單位的剩餘數

#### Scenario: 審核完成但必要仲裁未完成時仍維持試標中

- **GIVEN** 一個 `dry_run_in_progress` 任務，其本回合標註全數提交、所有審核員皆已提交決策，但存在至少一個推導為「爭議中」的審核單位
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態維持 `dry_run_in_progress`
- **AND** 畫面區分「待審核」與「待仲裁」兩種剩餘項目並各自顯示數量與單位

#### Scenario: 試標例外池有待處置項目時仍維持試標中

- **GIVEN** 一個 `dry_run_in_progress` 任務，其本回合標註與審核皆完成、爭議項皆已裁定，但其中一項裁定為「兩者皆非」而落入 `dry_run` 最終例外池尚未收尾
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態維持 `dry_run_in_progress`
- **AND** 畫面揭露 `dry_run` 例外池待處置項目數為未完成原因之一

#### Scenario: 三者皆完成後才自動轉入待 IAA 確認

- **GIVEN** 一個 `dry_run_in_progress` 任務，其本回合無未指派作業、所有 active 標記員皆完成各自全部試標內容、所有 `dry_run` 審核單位皆推導為「已定稿」、無「爭議中」單位、`dry_run` 最終例外池已清空
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務自動轉為 `waiting_iaa_confirmation` 並對 `project_leader` 發送提醒
- **AND** 此轉換不因最新回合 IAA 未達標或計算尚未結束而被阻擋

### Requirement: FR-008a 試標完成之自動狀態轉換涵蓋審核與仲裁（BREAKING）

> **delta 形式註記**：同上——FR-008a 尚未收錄於衍生檢視，故置於 ADDED 區段；回寫正典（`specs/task-management/014-task-detail/spec.md:584`）時為原地改寫，屬 BREAKING。

FR-008a MUST 原地改寫為：當任務本回合滿足 `DRY_RUN_COMPLETION_RULE` 修訂後之全部條件——沒有未指派 Dry Run 標記作業、每一位 `membership_status = active` 的 `annotator` 皆滿足 `assigned_count == completed_count`、全部 `dry_run` 審核單位皆推導為「已定稿」、不存在推導為「爭議中」的 `dry_run` 審核單位、`dry_run` 最終例外池已清空——時，系統 MUST 自動轉為 `waiting_iaa_confirmation` 並建立提醒。任一條件不符時，系統 MUST 維持 `dry_run_in_progress`，並 MUST 以可見文字逐項列出未滿足的條件與其帶單位的剩餘數。

本條之評估 MUST 以「當前回合」為範圍，與 AC-3.16 既有語意一致：新建立的回合在其本身的標註、審核與仲裁完成前 MUST NOT 轉回 `waiting_iaa_confirmation`。轉換前置條件之狀態機來源仍為 `docs/adr/022-task-state-machine-location.md` Transition Table，該表對應列 MUST 同步修訂並新增 Amendment。

#### Scenario: 未滿足時逐項列出原因與單位

- **GIVEN** 一個 `dry_run_in_progress` 任務同時存在待審核單位與爭議中單位
- **WHEN** `project_leader` 檢視 Overview 的任務狀態與執行控制
- **THEN** 畫面逐項列出未滿足的條件，每一項附帶可辨識單位的剩餘數
- **AND** 原因文字不僅以 hover 或顏色傳達，可由鍵盤與螢幕閱讀器取得
