# task-management/014-task-detail Specification

## Purpose

任務詳情頁（`task-detail`）是專案負責人設定審核模型、監看審核進度並判定任務可否結案的單一控制面。正典為 `specs/task-management/014-task-detail/spec.md`（v11.0.0）；本文件僅收錄經 OpenSpec change 落地之需求，每條皆引用正典 FR ID，不改動其正典措辭。目前收錄：change `align-014-review-model`（issue #688）之 FR-005j／FR-005k／FR-008b／FR-010s／FR-010s-1／FR-010s-2／FR-010t（修訂，issue #596 單人接力審核模型對齊）、FR-018（新增，最終例外池）；change `task-detail-url-view-state`（issue #726）之 FR-019（新增，頁籤與清單檢視狀態的網址同步）；change `task-detail-seq-tagging-export-dialog`（issue #742）之 FR-020（新增，`sequence_tagging` 匯出對話框與序列匯出欄位）；change `task-detail-export-history-redownload`（issue #772）之 FR-021（原新增條文，v8.0.0 已修訂為重新下載不可變原始產物）；change `task-detail-trial-round-from-waiting`（issue #791）之 FR-013（首次收錄修訂後全文，新增試標回合僅自待 IAA 確認狀態發起）；change `task-detail-iaa-precondition-and-override-scope`（issue #783）之 FR-010o-1（修訂，門檻覆寫排除未校準型別）、FR-010o-4（新增，待 IAA 確認頁顯示 IAA 計算狀態）；以及 change `validate-reviewer-arbiter-role-separation`（issue #868）之 FR-010s-1／FR-010t（修訂）；以及 change `1141-task-detail-quality-metrics-gate`（issue #1141）之 FR-008b（修訂，第 5 項引用品質指標就緒訊號）；以及 change `mvp-export-record-contract`（issue #1160）之 FR-009a／FR-010i／FR-015e／FR-015h（首次收錄）與 FR-010i-1／FR-010i-2／FR-020／FR-021／FR-024（修訂原檔下載與逐 run 追溯契約）。

change `mvp-export-snapshot-isolation-correction`（issue #1160）補充 FR-010b／FR-010c 的跨 run 隔離語意，以及 FR-010i-1／FR-010i-2／FR-021 的請求接受時間與結果快照時間契約。

change `task-run-publication-integrity`（issue #1160）修訂 FR-010f／FR-010f-6 的公開清單回執、發布交易與目標作用域冪等契約，新增 FR-010f-7、AC-3.48～AC-3.50 與 SC-059～SC-061 的工作位唯讀狀態及失敗恢復規則；正典版本為 v10.0.0。這些資料表仍是未部署候選。

change `database-final-audit`（issue #1160）新增 FR-010o-5／FR-025、AC-3.51～AC-3.52 與 SC-062～SC-063：試標回合的完整 IAA 結果與 `done` 同交易保存，任務狀態及隔離異動以 `audit_events` 單一事件來源追溯；正典版本為 v11.0.0，資料表仍為未部署候選。

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
5. **品質指標就緒**——依 `dataset/017-dataset-analysis-detail` 之 `QUALITY_METRICS_READY_RULE` 推導的 `quality_metrics_ready` 為就緒。最新一輪 IAA 計算尚在進行（`pending`）或失敗（`failed`）時為未就緒；`done` 為就緒，含因 `De = 0` 而「無法計算」者；缺少訊號時視為就緒。

任一條件不符時，系統 MUST 阻擋轉換並逐項列出未滿足的具體原因，MUST NOT 僅以「全部標記已提交」作為完成依據。第 5 項未就緒時，原因 MUST 為可見的繁體中文文字（說明品質指標尚在計算或計算失敗），MUST NOT 僅以 hover 或顏色呈現。

**v3.0.0 修訂**：原第 (2) 項之「依生效審核設定（`min_reviewers`）應完成的 review unit 全數定案」改為上列第 2 項——`min_reviewers` 已移除，審核單位恆有一位審核員；原第 (4) 項「應仲裁項目全數完成仲裁」由上列第 3、4 項取代——仲裁完成不再等於結案就緒，仲裁裁定為「兩者皆非」者仍須經例外池收尾。

#### Scenario: 例外池未清空時阻擋結案
- **GIVEN** 某 `official_run_in_progress` 任務全部標記已提交、無 `爭議中` 單位，但最終例外池尚有 2 項待處置
- **WHEN** 專案負責人點擊 `標記完成`
- **THEN** 轉換被阻擋，並逐項列出「最終例外池尚有 2 項待處置」作為未滿足原因
- **AND** 例外池清空後再次點擊即可轉為 `completed`

#### Scenario: 品質指標未就緒時阻擋結案並顯示原因
- **GIVEN** 某 `official_run_in_progress` 任務第 1 至 4 項皆已滿足，但最新一輪試標回合的 `iaa_computation_status` 為 `pending` 或 `failed`
- **WHEN** 專案負責人檢視 `標記完成`
- **THEN** `標記完成` 為停用狀態，並顯示可見的品質指標未就緒原因，任務狀態維持 `official_run_in_progress`
- **AND** 直接呼叫完成 handler 同樣失敗，狀態不變

#### Scenario: 品質指標就緒時不被第 5 項阻擋
- **GIVEN** 某 `official_run_in_progress` 任務第 1 至 4 項皆已滿足，且最新一輪 `iaa_computation_status` 為 `done`（含某輸出類型「無法計算」），或該任務沒有品質指標訊號
- **WHEN** 專案負責人點擊 `標記完成`
- **THEN** 轉換不因第 5 項被阻擋，任務轉為 `completed`

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

- **FR-010s-1**（**v3.0.0 修訂，BREAKING**，對應 AC-3.7、AC-3.8，issue #688）：審核設定編輯模式必須提供兩份勾選清單，不得提供任何數值輸入框、模式單選或行為 toggle：(1) `審核員` 勾選清單——候選 = `membership_status = active AND task_role = reviewer`；勾選結果寫入 `reviewer_ids`，即系統自動指派的分派對象（`015` FR-093）。(2) `仲裁者` 勾選清單——候選必須為 `reviewer_ids` 的子集合（未被勾選為審核員者不得出現於仲裁者候選）；勾選結果寫入 `arbiter_ids`，即 `can_arbitrate = true` 的來源（`015` FR-060 條件一）。兩份名冊寫入的元素必須遵守 `REVIEWER_ID_FORMAT`：值為該成員的 `TaskMembership.user_id`，不得寫入 Email 或顯示名稱；消費端比對審核員身分與成員清單「審核負荷」欄聚合皆必須以該 id 為唯一鍵，Email 僅供成員清單顯示。驗證：儲存時 `reviewer_ids` 至少 1 人，否則必須阻擋儲存並顯示可修正錯誤訊息；`arbiter_ids` 允許為空並於摘要值標示（FR-010s-2），不阻擋儲存；取消勾選某審核員時，若其 `arbiter_ids` 亦被勾選，必須同步取消並於儲存前提示。編輯區塊必須載明：仲裁時另受非當事人限制（對該審核單位已提交審核者不得仲裁該單位，`015` FR-060），且系統不得因某審核員恰為該筆的標記員而排除其審核指派。 目前名冊正典為同任務 reviewer membership 關聯列（含 `can_arbitrate` 與穩定排序）；`reviewer_ids`／`arbiter_ids` 僅是 user ID 相容投影，不另存可分歧 JSON 名冊。
  **v4.2.0 修訂**（issue #868，對應 AC-3.21～AC-3.23、SC-048）：`arbiter_ids` 中的每位成員依 015 FR-093 皆保留處理仲裁，不接收新的審核單位。儲存時除 `reviewer_ids` 至少一人外，`reviewer_ids - arbiter_ids` 亦必須至少一人；否則整筆儲存必須被阻擋並顯示可修正錯誤「請至少保留一位未被指定為仲裁者的審核員」。驗證必須採 ID 集合差，不得只比較兩陣列長度。`arbiter_ids = []` 仍合法並沿用 FR-010s-2／FR-010t 警示。編輯區 helper text 必須揭露指定仲裁者不接收新審核單位；FR-060 非當事人限制不變。

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

#### Scenario: FR-010s-1 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-010s-1；AC-3.44）

### Requirement: FR-010s-2 仲裁者摘要值規則

`仲裁者` 欄位之摘要值 MUST 依下列規則產生：`arbiter_ids` 為空 → `未指定仲裁者`；已指定 → `仲裁者 N 人`。

**v3.0.0 修訂**：原規則之 `停用` 與 `啟用 · ...` 前綴隨 `arbitration_enabled` 移除而刪除——仲裁不再是可停用的選配。

#### Scenario: 摘要值不含啟用停用前綴
- **GIVEN** 某任務已勾選 2 位仲裁者
- **WHEN** 檢視審核設定區塊
- **THEN** `仲裁者` 摘要值為 `仲裁者 2 人`，不含 `啟用` 或 `停用` 字樣

### Requirement: FR-010t 發布前的成員人數檢查

- **FR-010t**（**v3.0.0 修訂**，對應 AC-3.10，issue #688）：發布 `新增試標回合 R{n}` 或 `開始正式標記` 前，系統必須驗證實際啟用成員人數：(1) `membership_status = active` 且 `task_role = annotator` 的人數 `>= min_annotators`；(2) 被勾選為審核員（`reviewer_ids`）且 `membership_status = active` 的人數 `>= 1`。任一條件不足時，系統必須阻擋發布，並逐角色顯示缺口訊息「還差 N 位」（`N = 應有人數 - 實際人數`）。發布前檢查不得僅驗證抽樣／審核設定值本身（決策 D3，issue #189）。`arbiter_ids` 為空時不得阻擋發布，但必須於發布確認顯示警示：未指定仲裁者時，爭議項將無人可仲裁而堆積於爭議池，任務將無法結案（FR-008b 第 3 項）。原「active reviewer 人數 `>= min_reviewers`」改為上列第 (2) 項——`min_reviewers` 已移除，審核只需至少一位被勾選的審核員即可運作。 同發布交易凍結當下所選 active reviewer membership、仲裁資格與排序為 run 候選池；此快照不是審核指派或永久授權。後續讀取／提交／分派／仲裁仍查即時 active membership、矩陣與資源條件；停用後候選歷史保留但立即失去授權。審核黏著依 annotation-015 FR-093(5) 自 submission 推導。
  **v4.2.0 修訂**（issue #868，對應 AC-3.24、SC-048）：發布前除上述人數檢查外，`membership_status = active` 的有效分派池 `reviewer_ids - arbiter_ids` 亦必須至少一人；此檢查必須在每次發布時以當下成員狀態重算，避免設定儲存後的停用或移除使分派池歸零。有效分派池為空時必須阻擋發布、顯示可修正訊息「至少需 1 位未被指定為仲裁者的啟用中審核員」，且不得建立回合或改變任務狀態。`arbiter_ids = []` 仍依既有規則合法。
  **v5.0.0 修訂**（issue #1120，對應 AC-3.39、SC-051）：`arbiter_ids` 為空時的發布警示文案必須更新。`arbiter_ids` 為空仍不得阻擋發布，但警示文字必須改為說明爭議項將由 `project_leader` 依 FR-023 自行裁定，不得再聲稱「任務將無法結案」——該敘述在 FR-023 生效後已不成立。成員人數檢查第 (1)(2) 點與其「還差 N 位」缺口訊息文字不變。

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

#### Scenario: FR-010t 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-010t；AC-3.44）

### Requirement: FR-018 最終例外池

- **FR-018**（**v3.0.0 新增**，對應 AC-3.13、SC-043，issue #688）：`annotation-progress` tab 必須提供「最終例外池」區塊，作為專案負責人逐筆收尾爭議的入口：(1) 區塊標題列必須顯示待處置項目數；`0` 時必須渲染空狀態（`最終例外池已清空`），不得隱藏整個區塊——結案閘門（FR-008b）依賴此處為唯一可稽核的呈現點。(2) 清單欄位逐筆呈現樣本 ID、標記員帳號、審核員帳號、爭議的輸出類型、仲裁者帳號與其「兩者皆非」理由、落入例外池的時間。(3) 每列必須提供進入處置畫面的動作，導向 `015` FR-095 之收尾介面並攜帶完整審核單位身分（穩定 `run_id`／`assignment_id`，加上 task／cycle／run_type／樣本／標記員顯示維度）與爭議項識別；該動作按鈕/連結必須於操作欄內單行呈現、不得換行為兩行，窄螢幕下改依既有表格水平捲動（`.table-scroll`）呈現，不得以按鈕換行取代（v4.2.1 釐清，issue #1057，Lightweight Path PATCH，未新增或移除 FR/AC）。(4) 本區塊必須僅對 `project_leader` 呈現；其他角色不得看到此區塊，直連進入時須比照 FR-006 導回並提示無權限。(5) 清單必須可依 `run_type` 篩選；`dry_run` 與 `official_run` 的例外項各自獨立計數，FR-008b 第 (4) 項之結案閘門僅計 `official_run` 的待處置項目。

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

#### Scenario: FR-018 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-018；AC-3.44）

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

匯出記錄（FR-010i-2 之條件快照）MUST 一併保存本次的標註方案、詞元單位與（詞級時）切詞引擎識別，供原始產物的版本追溯與重製驗證；重新下載只讀已保存的原始產物，不重新推導序列。

**(4) 對齊擴張摘要**。`token_unit = word` 的匯出完成後，畫面 MUST 顯示「N 段標記因對齊被擴張」摘要，`N` 取自模組回傳的擴張筆數；`N = 0` 時 MUST NOT 顯示該摘要。摘要 MUST 可展開，展開後逐筆列出原始標記文字、擴張後文字與起訖 offset 差值，三項皆直接取自模組回傳的擴張清單，本頁 MUST NOT 重算。`token_unit = character` 時 MUST NOT 顯示該摘要（字元級不可能發生擴張）。

擴張 MUST 只發生於匯出產物：依 `dataset/017` FR-042 第 4 點，已儲存的 `spans[]` MUST NOT 被本流程修改，標記員圈選的字元 offset 仍為權威值。

**(5) 缺 tokenizer 版本時阻擋**。`token_unit = word` 且所選切詞引擎未提供 `engine` 或 `version` 任一欄位時，該次匯出 MUST 被阻擋：畫面 MUST 顯示可理解的原因（指出缺少的是切詞引擎版本資訊，而非顯示原始錯誤字串或靜默失敗），且 MUST NOT 產生任何匯出檔、MUST NOT 於匯出記錄表新增紀錄。使用者改回 `character` 後 MUST 能正常完成匯出。阻擋判定 MUST 以模組回傳的阻擋結果為準，MUST NOT 於本頁另行實作一套 tokenizer 欄位檢查。

**(6) 適用邊界與其他輸出類型**。本需求 MUST 僅適用標記值為字元 offset `spans[]` 的 `sequence_tagging`。

標記值攜帶 `entities[]` 的實體型結果（`entity_recognition` 任務，以及 ADR-029 遷移前留下的 legacy 實體資料）MUST NOT 套用本需求所指名的序列推導——依 `dataset/017` FR-041 第 1 點，`entity_recognition` 允許重疊與巢狀，不具 span 與扁平序列之間的雙射性質。其匯出結果欄位 MUST 全文依 FR-015i-3 辦理，該條所定義的 `entities[]` 與 `entities_summary` 語意 MUST NOT 因本需求而改變。

反向亦然：FR-015i-3 所稱的實體型結果 MUST NOT 被理解為涵蓋 `spans[]`——`LEGACY_TASK_TYPE_EXPORT_ENUM` 不含 `sequence_tagging`，其匯出檔的 `task_type` 欄位雖同樣落在 `sequence_labeling`，結果欄位分流仍依 FR-015i 所定「依標記結果實際結構決定」，而 `spans[]` 的結果欄位由本需求承接。

其餘輸出類型的匯出欄位與欄位分流規則皆 MUST 維持不變；格式版本與重新下載依 FR-015h、FR-021 的 v8.0.0 修訂。

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

#### Scenario: 新匯出缺切詞器版本但舊原檔有效

- **GIVEN** 切詞器版本資訊已不可用，先前詞級匯出仍有有效原檔
- **WHEN** 使用者分別新建詞級匯出及下載舊檔
- **THEN** 新建匯出被阻擋，舊檔通過 FR-021 檢查後按原位元組交付且不重新切詞

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

- **FR-022**（**v5.0.0 新增**，對應 AC-3.25～AC-3.28、SC-049，issue #1120）：發布 `開始正式標記` 前，系統必須驗證剩餘正式標記池筆數大於 `0`。剩餘筆數之推導一律沿用 FR-010f-3 之既有推導式，本條不得複製或另建第二份推導式。(1) **發布阻擋**：剩餘正式標記池筆數為 `0` 時，系統必須阻擋 `開始正式標記` 發布，任務狀態必須維持 `waiting_iaa_confirmation`，且不得建立任何正式標記清單或 assignment。(2) **與 IAA 語意分列**：資料池不足之原因必須與 IAA 相關狀態分列呈現：不得以「IAA 未達標」或「IAA 計算中／計算失敗」表述資料池不足，亦不得因資料池不足而改變最新試標回合之 `iaa_computation_status`。最新回合 `iaa_computation_status = done`（含「無法計算」記為 `done`）且 IAA 已達標時，本條之阻擋必須仍然生效——此阻擋依據為資料池筆數，與 IAA 達標與否及計算是否結束皆無關，不構成 FR-010o-3 所禁止之「因 IAA 未達標而停用」，亦不改變 FR-010o-4 之既有停用規則。(3) **`draft` 階段提前揭露**：任務處於 `draft` 且目前 `sampling_value` 與既有回合設定會使剩餘正式標記池為 `0` 時，系統必須於發布前即顯示原因，並必須以停用狀態呈現對應的執行控制 CTA。此提前揭露不得取代 FR-010t 之成員人數檢查，兩者各自獨立逐項呈現。(4) **handler 同樣驗證**：本條之驗證必須在操作 handler 內執行：直接呼叫發布 handler（繞過停用的按鈕）必須同樣失敗，不得改變任務狀態或建立任何清單資料。(5) **可取得性**：阻擋原因不得僅以 hover 或顏色傳達；原因文字必須為可見文字，且必須可由鍵盤操作與螢幕閱讀器取得。 剩餘池一律依 FR-010d 的 sealed-version `dataset_total`，只扣本 cycle 已發布 Dry run 實際 `item_count`；每次 Rn 先套用累計上限，不得耗盡正式池。

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

#### Scenario: FR-022 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-022；AC-3.41）

### Requirement: FR-010u 跨頁籤衍生計數的共用查詢上下文與聚合單位（成功標準 SC-050）

- **FR-010u**（**v5.0.0 新增**，對應 AC-1.26、AC-1.27、SC-050，issue #1120）：`task-detail` 五個頁籤（`TASK_TABS`）呈現的衍生計數必須以同一組查詢上下文推導，並必須依既有正典定義之聚合單位計數。(1) **共用查詢上下文**：任務、cycle、`run_type` 與回合為共用查詢上下文，概覽、成員、進度、結果四個頁籤之計數必須由同一組 `task_id × cycle_id × run_type × round_no` 推導；選取某一回合時不得混入其他回合或其他任務的資料。工時與匯出歷史必須依當前任務篩選；該任務無對應紀錄時必須呈現真實空狀態，不得呈現其他任務的通用示範資料。(2) **`已提交` 的分子分母**：分子為該 `task_id × cycle_id × run_type × round_no` 範圍內已提交之標記 assignment 數；分母為同範圍內未排除之標記工作 slot 數（含退回未指派的 slot）。依 FR-005h 被 `project_leader` 明確排除之標記作業不得計入分子或分母，與 FR-005h 既有的「不計入完成率或標記分布統計」一致。(3) **`已完成輪次` 的分子**：分子為已結束之試標回合數；當前進行中之回合不得計入。歷史回合與當前回合必須分列呈現，兩者之計數與決策不得交叉累計。「已結束」之判定依既有試標完成規則（FR-008a），本條不另定義該規則。(4) **既有定義不得重複**：`已定案 review unit` 之判定式與聚合單位（穩定 run／assignment 範圍內之樣本／標記員維度）以 `annotation/015-annotation-workspace` FR-051 為正典；`最終例外輸出項目` 之來源與逐筆收尾動作以 `annotation/015-annotation-workspace` FR-095 為正典，其分 `run_type` 獨立計數規則沿用本規格 FR-018 第 (5) 點。本規格必須讀取該兩處既有定義，不得另建第二份判定式、分母或狀態清單。(5) **單位不得相加**：標記 assignment、審核單位、爭議項（同一 run 範圍，以 `annotation/015-annotation-workspace` FR-061 第 7 點為計數單位：審核單位內之 `outKey × 合併鍵`，依 FR-059）分屬三個不同聚合層級，不得相加為單一數字，亦不得共用同一分母。畫面呈現必須使每個計數的單位可辨識；提交進度與定案進度必須分別命名，不得以同一標題涵蓋兩者。(6) **時間語意**：已提交時間不得被呈現為審核完成或仲裁完成時間；各階段時間必須取自其各自的事件來源。(7) **資料分配與工作完成分離**：樣本池分配的視覺呈現（FR-010p）必須附明確的「資料分配」語意說明；分配比例達滿不得被表述為標記或審核工作已完成。 上述範圍等價於穩定 `run_id`；重複 R1 不得合併 cycle。提交分母為同 run 未排除工作 slot 數（含退回未指派者），重指派不增分母；舊 cycle 回合不納入目前閘門。 **v9.0.0 工時補充**：工時與完成事件須依 `account_session_id × task_id × run_id × membership_id × work_kind × report_date` 分組；相同 task 的不同 session、cycle、run 不得合併。工時速度逐類顯示，標記 assignment、審核單位與爭議項不得相加；同一審核 submission head 的多筆 outKey 決策與修訂只計一次。

#### Scenario: 五個頁籤的計數同源且不混入其他任務或回合

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導，數值彼此一致，且不同 cycle 的同名 R1 不混算
- **AND** 畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄
- **AND** 該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料

#### Scenario: 三種計數單位分列呈現且不相加

- **GIVEN** 一個任務之標記 assignment、審核單位與爭議項三者數量互不相等
- **WHEN** `project_leader` 檢視進度與結果頁籤
- **THEN** 提交進度與定案進度分別命名呈現，各自的分子分母可辨識其單位
- **AND** 畫面不存在將標記 assignment 數、審核單位數與爭議項數相加後的單一數字
- **AND** 歷史回合與當前回合的計數分列呈現，未交叉累計

#### Scenario: FR-010u 對應 AC-1.26

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。（FR-010u；AC-1.26）

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

### Requirement: FR-002 授權契約

- **FR-002**：僅持有目標任務 active `project_leader` 或 `reviewer` membership、且其 active task role 的 `task.detail.view` 格允許者可進入 `/task-detail`；同一人在同一任務有多個 active role 時，非 workspace 詳情頁可用允許權限聯集，但仍須通過 task_id、任務狀態與各項資源條件（ADR-037）。

#### Scenario: FR-002 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 目標任務 active leader 或 reviewer 的 view 格允許才進入詳情（FR-002）

### Requirement: FR-005 授權契約

- **FR-005**：持有目標任務 active `project_leader` membership 且 `task.members.manage` 格允許者，必須可於 `member-management` 執行成員新增、移除/停用；新加入時可指派角色。此格不免除對目標成員、任務狀態與未完成作業的檢查。

#### Scenario: FR-005 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** active leader 與 members.manage 格同時允許才管理所選角色（FR-005）

### Requirement: FR-005d 授權契約

- **FR-005d**：搜尋結果僅排除已持有當前任務中「本次選定 task role」membership 的人；同一人仍可被加入另一個 task role，加入後才從該角色的候選結果消失。membership 的邏輯唯一鍵為 `(task_id,user_id,task_role)`，停用／移除只作用於所選角色列，不得連帶改變此人的其他任務角色。

#### Scenario: FR-005d 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 候選人只因已持有選定 task role 排除；其他角色不受影響（FR-005d）

### Requirement: FR-005e 授權契約

- **FR-005e**：Email 邀請必須驗證 email 格式並阻擋同一任務、同一 email 與本次選定 task role 的重複邀請；既有其他 task role 不構成重複。寄送成功後該角色 membership 需以 `invited` 狀態出現在目前成員清單，不得覆寫另一角色的狀態。

#### Scenario: FR-005e 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 同任務同 email 同角色邀請被拒，其他角色仍可邀請（FR-005e）

### Requirement: FR-005f 授權契約

- **FR-005f**：移除仍有未完成作業的**選定角色 membership** 時，系統必須顯示二次確認；確認後保留該角色已完成提交與歷史統計。移除 annotator membership 時只把該角色未完成標記作業改為未指派，等待 `project_leader` 手動重新指派或處理；移除 reviewer membership 的 pending 審核依 FR-005j 退回分派池。此人其他仍有效的 task role、提交與指派不得被連帶停用或清空。 **V1 草稿退回**：未提交標記草稿於 slot 退回時同交易轉 `abandoned`，保留原作者與內容供受限追溯；繼任者不得讀取或繼承，須從自己的空白紀錄開始。已提交紀錄不得轉 `abandoned`。

#### Scenario: 移除後重派不繼承草稿

- **GIVEN** 原標記員有未提交草稿
- **WHEN** PL 移除 membership 並重派同一 slot
- **THEN** 舊草稿私下保留為 `abandoned`，繼任者從空白紀錄開始（AC-3.47）

#### Scenario: FR-005f 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 移除只作用於選定角色；annotator 與 reviewer 的 pending 處置各循原有規則（FR-005f）

### Requirement: FR-006 授權契約

- **FR-006**：只有 `reviewer` membership、沒有通過 `task.members.manage` 的 active `project_leader` membership 者，不可見 `member-management` tab；若以直連方式進入，系統必須導回 `overview` 並提示無權限。同時有兩種角色者只能經由實際有效的 leader membership 與矩陣格取得管理能力，不能由 reviewer role 本身推導。

#### Scenario: FR-006 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 單獨 reviewer 不能管理成員；多角色者須有效 leader 與格（FR-006）

### Requirement: FR-024 授權契約

正式服務端 MUST 依下列授權契約檢查每次請求。

正式服務端須依 ADR-037 以當前 active membership 與已啟用矩陣格判斷：詳情讀取用 `task.detail.view`，Overview 的 `OVERVIEW_EDITABLE_FIELDS` 儲存用 `task.detail.edit`，成員操作用 `task.members.manage`，資料匯出用 `dataset.export`，並保留各自任務狀態、資料範圍、blind review 與答案隔離限制。reviewer 有 view 而無 edit；一人多角色時非 workspace 可用 active 角色權限聯集，狀態與移除只作用於選定 membership。發布、結案、仲裁與其他生命週期命令尚無完整 V1 專用鍵，不得借用上述鍵或只憑矩陣放行，須在 runtime 轉換前另行核准操作鍵、種子資料與安全測試。標記者不得透過匯出檔、條件快照或歷史列取得私有答案、測試集答案或未提交審核草稿；公開回應亦不得暴露受限物件參照。Prototype 的 URL `task_role` 僅保留檢視上下文，不可當作正式授權身分。

#### Scenario: FR-024 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 詳情檢視、儲存、成員管理與匯出各用專屬鍵，其他命令不得借鍵（FR-024）

#### Scenario: 標記者無法透過匯出歷史取得隱藏資料

- **GIVEN** 標記者知道一筆歷史 ID，但沒有當前任務的匯出權限或資料範圍
- **WHEN** 其讀取歷史列、快照或原檔
- **THEN** 授權拒絕，回應不含私有答案、測試集答案、審核草稿或受限物件參照

### Requirement: SC-052 授權契約

- **SC-052**：同一人在同一任務可同時有 reviewer 與 project_leader membership，但不得有重複 `(task_id,user_id,task_role)`；成員搜尋與 Email 邀請只對同角色判重，移除其中一個角色不影響另一個。reviewer 單獨可讀詳情、不能編輯或管理成員；其矩陣格或 membership 失效後下一請求立即拒絕，且無法以 URL 角色參數升權。

#### Scenario: SC-052 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 三元組不重複；同角色判重，移除互不影響，URL 不能升權（SC-052）

### Requirement: FR-005h task/run 身分契約

- **FR-005h**：`project_leader` 明確排除未指派標記作業時，系統必須保存排除者、排除時間、排除原因、run stage 與原作業識別資訊；被排除作業不得計入完成率或標記分布統計，Dry Run 排除作業亦不得計入 IAA。 V1 排除為穩定 `assignment_id` 的終局事件，每個 slot 最多一筆不可刪除／撤回的證據；退回 draft 不清除此證據，未指派不等於排除。日後修正須另訂補償流程。

#### Scenario: FR-005h 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-005h；AC-3.44）

### Requirement: FR-010b task/run 身分契約

- **FR-010b**（**v8.0.1 釐清**，issue #1160）：系統必須提供「資料隔離」開關，預設為啟用；啟用時 Dry/Official 資料與結果不得混用。同一次匯出可明確選取 Dry Run 與 Official Run 並同檔封裝，即使 `isolation_enabled = true` 也不需關閉隔離；每個 run 的資料與結果不得混入其他 run，不得跨 run 合併、聚合或去重，每筆結果保留來源 `run_id` 與 `run_stage`。不論 `isolation_enabled` 為何，同一 cycle 的任兩個已發布 Dry／Official run 之 item ID 清單皆不得重疊；關聯成員資料須以 `(cycle_id, dataset_item_id)` 唯一性約束保障，不得僅依 UI 或查詢篩選。

#### Scenario: FR-010b 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010b；AC-3.41）

#### Scenario: 隔離開啟時的明確混合匯出

- **GIVEN** `isolation_enabled = true` 且同一任務已有 Dry Run 與 Official Run
- **WHEN** 有權限者明確選取兩個 run 建立同一次匯出
- **THEN** 同一原檔可依選取順序封裝兩個 run，但每個 run 的結果不得混入其他 run
- **AND** 每列保留 `run_id` 與 `run_stage`，不得跨 run 合併、聚合或去重

### Requirement: FR-010c task/run 身分契約

- **FR-010c**（**v8.0.1 釐清**，issue #1160）：當使用者停用資料隔離時，系統必須顯示高風險警告、要求二次確認，並記錄審計資訊（操作者、時間、設定值）。停用僅改變跨階段結果隔離保證及其 metadata，不放寬 FR-010b 的 item 不重疊限制，也不自動建立混合結果查詢或匯出動作；既有按階段選取的操作維持原語意。使用者依 FR-009a 的同一次匯出可明確選取 Dry Run 與 Official Run，並在 `isolation_enabled` 為 `true` 時封裝兩階段，每個 run 的結果仍分開且保留來源身分，無須停用隔離或啟動其他混合結果查詢。

#### Scenario: FR-010c 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010c；AC-3.41）

#### Scenario: 混合封裝不要求關閉隔離

- **GIVEN** `isolation_enabled = true` 且使用者選取 Dry Run 與 Official Run
- **WHEN** 建立 FR-009a 所定的同一次匯出
- **THEN** 不需停用隔離；兩階段只共用原檔容器，逐 run 結果和身分仍分離
- **AND** 若使用者另行停用隔離，仍須高風險警告、二次確認與審計，不得因此自動建立混合查詢

### Requirement: FR-010d task/run 身分契約

- **FR-010d**：試標抽樣輸入必須為整數且 `1 <= sampling_value < dataset_total`；`dataset_total` 為所綁定 sealed dataset version 中已接受 `dataset_item` 數，由 `dataset_item → dataset_import_batch → dataset_version` 追溯（dataset-021 FR-004／FR-008／FR-010），不得使用可變資料集、來源列數或其他版本總數。cycle 開啟後固定使用該 cycle 版本。每次 Dry 發布還必須驗證 `1 <= requested_sampling_value <= dataset_total - sum(本 cycle 已發布 Dry run 的實際 item_count) - 1`；不符時整次拒絕並提示剩餘可用筆數，不得縮減要求筆數後發布。

#### Scenario: FR-010d 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010d；AC-3.41）

### Requirement: FR-010e task/run 身分契約

- **FR-010e**：每次試標發布均須依 FR-010d 的累計上限保留 Official Run 至少 1 筆；R1 無既有回合時等價於 `sampling_value < dataset_total`，Rn 不得耗盡正式池最後一項。assignment 排除不會把已發布 Dry item 退回正式池。

#### Scenario: FR-010e 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010e；AC-3.41）

### Requirement: FR-010f task/run 身分契約

- **FR-010f**（**v6.0.0 修訂，BREAKING**，issue #1160）：首次 Dry 發布開啟不可變身分的 `RunCycle`，釘住同任務 sealed `dataset_version_id`、不可變 `config_version_id`（含 schema）、資格池、seed 與演算法版本。資格池為該版本全部已接受 item；抽樣只讀公開 item 身分與 payload，不讀 `dataset_item_private`、`declared_split`、hidden answer 或受限 `source_ref`，亦不得在 run item／manifest 中加入 gold/test 標記。每次 Dry 或 Official 發布各自建立一份不可變 `sample_snapshot_id`，只凍結該次 run 的有序 item 清單、seed／演算法與 digest；R1 不預先封存 Official 清單，發布前的剩餘池只是推導值。關聯 run-item 清單為成員身分正典，外部 `selection_manifest_ref` 為相同清單的審計回執，digest 必須一致。
  - **v10.0.0 規範回執位元組**：公開清單按 `task_run_item.list_position` 排序，規範格式為 UTF-8；第一行固定為 `label-suite-run-items-v1\n`，其後每個 item 的小寫帶連字號 UUID 各佔一行、各以 `\n` 結尾，無額外空白或欄位。`selected_item_digest` 為這份完整位元組的 SHA-256 十六進位字串。`selection_manifest_ref` 是私有、不可覆寫的 content-addressed（內容定址）物件鍵，不是客戶端可取得的 URL。manifest／清單不得包含 hidden answer／答案、`declared_split`／split 或受限 `source_ref`，亦不得從私有欄位推導 gold/test 標記。

#### Scenario: FR-010f 對應 AC-3.45

- **GIVEN** item 的 private row 含 hidden answer 或 declared_split
- **WHEN** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料
- **THEN** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。（FR-010f；AC-3.45）

#### Scenario: AC-3.48 規範位元組與私有資料隔離

- **GIVEN** 同一 sealed version 和 seed 選出一組公開 item ID
- **WHEN** 發布 Dry 或 Official run
- **THEN** 規範位元組、SHA-256、私有回執及 SQL 清單逐位元一致，且不暴露答案、split、受限來源或 gold/test 標記

### Requirement: FR-010f-2 task/run 身分契約

- **FR-010f-2**：每次 `新增試標回合 R{n}` 成功時，系統必須建立該回合獨立的試標清單，筆數等於 `sampling_value`，且不得重用前一回合已建立的清單資料；系統必須同時建立對應 `TrialRound` 紀錄並寫入建立當下的 `TaskGuidelineConfig.guideline_version`。`n >= 2` 時，建立前必須先通過 FR-017 之修訂紀錄必填檢查（`prior_round_findings`、`guideline_change_summary`，含 `no_change` 選項與其必填 `no_change_reason`）；`n = 1` 兩欄皆非必填。清單建立完成後，`TrialRound.sampling_value` 必須等於本回合實際建立的 `AnnotationListMaterialization.item_count`——`sampling_value` 之百分比或既有預設值換算僅作為建立前輸入框的預填建議，一經建立即以實際建立筆數為準，系統不得於畫面回退顯示與實際清單筆數脫節的衍生值（issue #491／#489）。 每輪具有穩定 `trial_round_id`，`(cycle_id, round_no)` 唯一且只發布一次；Dry run 必須有同 cycle round，以複合參照釘住與 round 相同的非空同任務 `guideline_version_id`。抽樣排除本 cycle 全部先前 Dry item，依 FR-010d 累計上限精確建立要求筆數；新 cycle R1 可選中舊 cycle item，但不能共用 run／snapshot。

#### Scenario: FR-010f-2 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010f-2；AC-3.41）

### Requirement: FR-010f-3 task/run 身分契約

- **FR-010f-3**：`開始正式標記` 成功時，以本 cycle 的 sealed version 扣除本 cycle 全部已發布 Dry run item 清單後的剩餘樣本，建立 Official run 及其專屬不可變 snapshot；筆數等於 `dataset_total - sum(本 cycle 已發布 Dry run 的實際 item_count)` 且必須大於 0，不扣除舊 cycle 的 item。Official 的 `trial_round_id` 必須為空，並在發布交易中釘住當下同任務的非空 `guideline_version_id`；該版本可不同於最後一輪 Dry 指引。每個 task 生命週期最多一筆 Official run，不能因 cycle 改變而再發布；重試依 FR-010f-6 回傳原發布。

#### Scenario: FR-010f-3 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（FR-010f-3；AC-3.41）

### Requirement: FR-010f-4 task/run 身分契約

- **FR-010f-4**：`開始正式標記` 建立正式標記清單時，系統必須同時以輪流分派（round-robin）建立樣本-標記員 assignment：每筆正式標記樣本恰指派給一位 `membership_status = active` 且 `task_role = annotator` 的標記員，依成員清單固定順序輪流分配直到全部樣本指派完畢；樣本數不可整除時，任兩位標記員的分派筆數差距不得超過 1。`min_annotators` 僅約束試標回合的重疊標記人數與 FR-010t 的發布前人數檢查，不改變正式標記「每筆單一標記員」的分派語意；發布後的成員異動不得自動重算既有 assignment，其處置依成員管理規則（FR-005f 系列）。 assignment 為穩定工作 slot，以 `assignment_id` 識別、`(run_id, dataset_item_id, slot_no)` 唯一，`slot_no` 為正整數；同 run item 不得重複指派相同非空 membership。item 必須屬於 run，membership 必須為同 task 的 active annotator。停用／移除／重指派保留 slot ID，已提交歷史保留；Official 每 item 僅一個 slot。

#### Scenario: FR-010f-4 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（FR-010f-4；AC-3.44）

### Requirement: FR-010f-5 task/run 身分契約

- **FR-010f-5**（**v6.0.0 新增**，issue #1160）：依 [ADR-022](../../../docs/adr/022-task-state-machine-location.md) 的 `waiting_iaa_confirmation → draft` 退回動作，關閉目前 cycle、記錄拒絕原因並清除 current cycle 指標；不得刪除或重寫其 round、run、snapshot、assignment 或排除證據。下一次 Dry 發布建立下一個 `(task_id, cycle_no)` 並自 R1 起算；同一 task 同時最多一個未關閉 cycle，完成 Official 時關閉該 cycle。current run／snapshot 由 current cycle 推導，不是可覆寫歷史的 task 級單一 snapshot。

#### Scenario: FR-010f-5 對應 AC-3.40

- **GIVEN** cycle 1 的 R1 已發布後退回 draft
- **WHEN** 重綁版本並再次發布 R1
- **THEN** cycle 2／run／snapshot 身分皆不同，cycle 1 的 assignment 與排除證據保留；切換兩個 R1 的計數與完成閘門互不混入（FR-010f-5／FR-010u）。（FR-010f-5；AC-3.40）

### Requirement: FR-010f-6 task/run 身分契約

- **FR-010f-6**（**v10.0.0 修訂，BREAKING**，issue #1160）：發布服務須先驗證身分與權限、鎖定任務，按固定發布目標查已提交重試；若尚未提交，才驗證目前版本、狀態、sealed version、每個來源批次的公開／受保護欄位對映、成員與回合前置條件。每個選中 item 須經 batch 確認屬於 cycle 版本；任一跨版本 item 即整次拒絕。新發布先依 FR-010f 規範位元組寫入私有、不可覆寫的內容定址回執物件，讀回驗證完整位元組、`selected_item_digest` 摘要與持久性，之後才在**同一資料庫交易**提交 cycle（R1）、round（Dry）、snapshot 的 `selection_manifest_ref` 與 digest、run、run items、候選審核名冊、assignment、狀態轉換及稽核事件；提交前驗證 `item_count` 等於實際 run-item 數。外部物件寫入與資料庫提交不是同一 ACID 交易；回執寫入或讀回驗證失敗時 DB 不提交，DB 回滾可留下無引用物件，但不得留下可見的部分發布。資料庫提交後才可宣稱發布成功。
  - 發布 idempotency key 以 task、發布目標與 key 定址，另保存正規化請求內容摘要。發布命令須在首次嘗試前固定可跨重試辨識的目標：Dry 用同任務 `(cycle_no,round_no)` 唯一定位其 `trial_round_id`，Official 用 task 的單一正式發布定位；提交結果不明時沿用同一目標，不得新配回合身分。須先查已提交目標與 key，再執行會因首次發布而改變的狀態門檻或重新抽樣。Dry 以 `(task_id,trial_round_id,key)`、Official 以 `(task_id,key)` 分別約束冪等鍵，允許不同 Dry 回合重用同一 key。相同 key 與摘要的重試或並行重送回傳原 run／snapshot，不重新抽樣、不增加 assignment 或事件；同 key 異摘要／異內容拒絕為衝突，異 key 對同 round 重複發布或第二次 Official 亦拒絕。提交結果不明時先以資料庫冪等鍵查已提交 run，不重抽；既存回執缺失或摘要不符時拒絕讀取並告警，只能由 run-item SQL 正典重建相同位元組作受控修復，不能靜默換清單。清理無引用回執須超過交易／重試保護期、確認無活躍寫入租約且 DB 無引用；已引用物件不得刪除。並行請求須由資料庫交易與唯一性約束保證相同結果，SQLite 與 PostgreSQL 語意一致。

#### Scenario: FR-010f-6 對應 AC-3.42

- **GIVEN** 合法 Dry 或 Official 發布請求
- **WHEN** 相同 key／內容重送或並行重送
- **THEN** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。（FR-010f-6；AC-3.42）

#### Scenario: AC-3.49 失敗與重試不產生第二份發布

- **GIVEN** 合法發布命令與固定冪等鍵
- **WHEN** 同 key／摘要重送、回執驗證失敗、DB 回滾、提交結果不明或既存回執損壞
- **THEN** 同命令只回原 run，失敗不產生可見半套資料，不明提交先查 DB，壞回執拒絕讀取並告警

### Requirement: FR-010i-1 task/run 身分契約

- **FR-010i-1**（**v8.0.1 釐清**，issue #1160）：所有匯出檔的 `manifest` 必須包含 `export_format`、`export_format_version`、`exported_at`、`exported_by`、`applied_filters`，以及有序的 `manifest.runs[]`。`exported_at` 為首次成功原檔實際採用的結果讀取快照時間，須與原始檔名中的匯出時間一致，不得投影為請求接受時間 `requested_at`；零筆結果亦依同一讀取快照決定。每個 run 項目須記錄其 `run_stage`、`run_id`、`cycle_id`、`dataset_version_id`、`config_version_id`、`schema_version`（由該 run 的 cycle 所釘住 config 版本的 `schema_version_no` 取得）、`guideline_version_id`、`sample_snapshot_id`，並保留 FR-010i 的階段、隔離、抽樣、IAA 與排除摘要。跨 run 匯出須逐 run 記錄，不能用單一版本欄或任務目前版本取代；零筆結果仍須提供完整 manifest；每筆一般匯出結果亦須保留來源 `run_id` 與 `run_stage`，不可只有頂層階段標籤。

#### Scenario: AC-1.15 多 run 與零筆結果仍可追溯

- **GIVEN** 一次匯出納入兩個版本不同的 run
- **WHEN** 原始檔案生成，即使結果列為零筆
- **THEN** `manifest.runs[]` 依順序列出各 run 七項釘住的身分，並有格式版本與請求人

#### Scenario: FR-010i-1 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-010i-1；AC-3.43）

#### Scenario: manifest 與檔名使用實際讀取快照時間

- **GIVEN** 匯出請求已接受，worker 稍後才讀取結果
- **WHEN** 產生可下載的原始檔案與檔名
- **THEN** `manifest.exported_at` 與檔名均使用該原檔實際採用的結果讀取快照時間，不以 `requested_at` 冒充

### Requirement: FR-010i-2 task/run 身分契約

- **FR-010i-2**（**v8.0.1 釐清**，issue #1160）：每筆匯出歷史代表一次請求與一份不可變原始檔案。`requested_at` 在請求獲接受時固定為完整精度 UTC 時間；已驗證且版本化的 `conditions_snapshot` 於接受請求時保存並保持不可變，供審計與重製驗證，不含稍後才決定的 `exported_at`，也不能作為重新下載時查詢目前結果的指令。`conditions_snapshot` 的共通條件包含 `export_format`、`export_format_version`、`submission_status`、`annotator_scope`、審核員／審核狀態及其他已驗證的共享 filters、請求指定的語言與序列／tokenizer 選項、原請求人 `exported_by`；另以有序 `selected_runs[]` 逐項保存 `run_id`、`selected_runs[].run_stage`、`cycle_id`、`dataset_version_id`、`config_version_id`、`schema_version`、`guideline_version_id`、`sample_snapshot_id`。混合試標與正式標記的快照頂層 `run_stage` 僅可為 `all`，不可冒稱單一階段；單階段可記其階段值。每個 run 的納入關聯及輸出順序須獨立保存，對應 FR-010i-1 的 `manifest.runs[]`；每筆結果亦須有來源 `run_id` 與 `run_stage`，不能從頂層階段倒推。`task_export.exported_at` 為獨立可空欄位；`exported_at` 在結果讀取快照產生時記錄該快照的完整精度 UTC 時間，於 `ready` 前可為 null，並須與原始位元組、原檔名及校驗資訊在原子 `ready` 轉換中一同固定；manifest 與檔名均使用實際 `exported_at`。尚未 `ready` 的 worker 重試可讀取較晚的結果快照並重新產生原檔，但不得改寫已接受的 `conditions_snapshot` 或 `requested_at`；`ready` 後的冪等重試只回傳原始產物與同一歷史列，不得重新讀取結果。`scope_label` 與 `export_type` 僅為歷史列顯示 metadata，另存且不參與產物完整性校驗；重新下載不得套用當前畫面 filter，也不得以目前版本冒充歷史內容（FR-021）。

#### Scenario: 混合階段快照沒有假單一階段

- **GIVEN** 同一匯出選取 Dry R2 與 Official Run，兩者釘住不同版本及快照
- **WHEN** 首次請求保存條件快照並產出結果
- **THEN** `selected_runs[]` 逐項保存階段與釘住身分，頂層 `run_stage` 為 `all`，每筆結果標明來源 run
- **AND** 共享篩選條件只保存一份，輸出順序與 `manifest.runs[]` 一致

#### Scenario: 變更目前任務版本不改寫歷史匯出

- **GIVEN** 匯出後任務發布新版本且頁面篩選改變
- **WHEN** 使用者查閱歷史與下載
- **THEN** 逐 run 快照仍指向原版本，下載也不查詢目前結果

#### Scenario: FR-010i-2 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-010i-2；AC-3.43）

#### Scenario: 接受條件與結果時間分開固定

- **GIVEN** 請求已接受並記下 `requested_at`、不可變 `conditions_snapshot`，此時 `exported_at` 為 null
- **WHEN** worker 取得一致的結果讀取快照並完成原始位元組與校驗
- **THEN** `exported_at` 記為該結果快照時間，與檔名及產物資訊在原子 `ready` 轉換固定
- **AND** 接受時的 `conditions_snapshot` 不含 `exported_at`，重試不得改寫它或 `requested_at`

#### Scenario: 未完成與已完成匯出的重試分界

- **GIVEN** 同一已授權請求因 worker 失敗或冪等重送而重試
- **WHEN** 原列尚未 `ready`
- **THEN** worker 可讀取較晚的結果快照並重新產檔，仍只使用同一歷史列
- **AND** 原列已 `ready` 時只回傳既有原始位元組、檔名與 `exported_at`，不得重新查詢結果

### Requirement: FR-014 task/run 身分契約

- **FR-014**（**v6.0.0 修訂**，issue #1160）：Overview 必須支援 `OVERVIEW_EDITABLE_FIELDS` 的編輯能力；通過既有權限檢查的 active `project_leader` 可於 `draft` 儲存一般變更。唯一等待階段例外：在 `waiting_iaa_confirmation` 只可儲存 `GUIDELINE_CONTENT_FIELDS` 四個內容欄位並依 FR-017a 建立新版本；其餘欄位（含 dataset、config/schema、抽樣、名冊及 `force_guideline`）仍為 draft-only。其他執行階段不得修改指引內容。draft 重綁 dataset 或另存 config 只影響未來 cycle，歷史 cycle 的版本參照不變。

#### Scenario: FR-014 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-014；AC-3.43）

### Requirement: FR-017a task/run 身分契約

- **FR-017a**：任務建立時初始化同任務不可變指引版本；`GUIDELINE_CONTENT_FIELDS`（`annotator_guideline_text`、`annotator_guideline_assets`、`reviewer_guideline_text`、`reviewer_guideline_assets`）任一實際修改並依 FR-014 成功儲存，建立下一個正整數版本，保留舊內容及資產參照。`force_guideline` 為顯示政策，其單獨異動不建立內容版本。每個 run 必須釘住非空且同任務的 `guideline_version_id`；Dry run 必須與其 TrialRound 的版本相同並由複合參照約束保證，Official 依 FR-010f-3 於發布交易選定目前版本。既有 run／round 不因指引更新而回填；annotation-015 FR-066 第 4 點依所選 run 的版本解析，不可追隨可變目前指標。

#### Scenario: FR-017a 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-017a；AC-3.43）

### Requirement: AC-1.26 驗收情境

26. **AC-1.26**（**v5.0.0 新增**，issue #1120）：**Given** 一個任務同時存在已結束的試標回合與一個進行中的回合，**When** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤，**Then** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。

#### Scenario: AC-1.26 對應 AC-1.26

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。（AC-1.26；AC-1.26）

### Requirement: AC-3.40 驗收情境

40. **AC-3.40**（v6.0.0，issue #1160）：**Given** cycle 1 的 R1 已發布後退回 draft，**When** 重綁版本並再次發布 R1，**Then** cycle 2／run／snapshot 身分皆不同，cycle 1 的 assignment 與排除證據保留；切換兩個 R1 的計數與完成閘門互不混入（FR-010f-5／FR-010u）。

#### Scenario: AC-3.40 對應 AC-3.40

- **GIVEN** cycle 1 的 R1 已發布後退回 draft
- **WHEN** 重綁版本並再次發布 R1
- **THEN** cycle 2／run／snapshot 身分皆不同，cycle 1 的 assignment 與排除證據保留；切換兩個 R1 的計數與完成閘門互不混入（FR-010f-5／FR-010u）。（AC-3.40；AC-3.40）

### Requirement: AC-3.41 驗收情境

41. **AC-3.41**（v6.0.0，issue #1160）：**Given** sealed version 有 10 個已接受 item、R1 已用 3 個，**When** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2，**Then** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。

#### Scenario: AC-3.41 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（AC-3.41；AC-3.41）

### Requirement: AC-3.42 驗收情境

42. **AC-3.42**（v6.0.0，issue #1160）：**Given** 合法 Dry 或 Official 發布請求，**When** 相同 key／內容重送或並行重送，**Then** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。

#### Scenario: AC-3.42 對應 AC-3.42

- **GIVEN** 合法 Dry 或 Official 發布請求
- **WHEN** 相同 key／內容重送或並行重送
- **THEN** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。（AC-3.42；AC-3.42）

### Requirement: AC-3.43 驗收情境

43. **AC-3.43**（v6.0.0，issue #1160）：**Given** Dry R1 釘住指引 v1 且已進入等待階段，**When** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official，**Then** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。

#### Scenario: AC-3.43 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（AC-3.43；AC-3.43）

### Requirement: AC-3.44 驗收情境

44. **AC-3.44**（v6.0.0，issue #1160）：**Given** run 已凍結 reviewer 候選並建立 annotator 工作 slot，**When** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除，**Then** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。

#### Scenario: AC-3.44 對應 AC-3.44

- **GIVEN** run 已凍結 reviewer 候選並建立 annotator 工作 slot
- **WHEN** reviewer membership 停用，或 annotator membership 停用使未提交 slot 退回後由 PL 重指派／終局排除
- **THEN** 候選歷史不變但停用者即時失權，slot ID 不變，排除保留唯一不可撤回證據並從提交分子分母移除；審核黏著只依 015 FR-093(5) 推導（FR-005h／FR-010t）。（AC-3.44；AC-3.44）

### Requirement: AC-3.45 驗收情境

45. **AC-3.45**（v6.0.0，issue #1160）：**Given** item 的 private row 含 hidden answer 或 declared_split，**When** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料，**Then** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。

#### Scenario: AC-3.45 對應 AC-3.45

- **GIVEN** item 的 private row 含 hidden answer 或 declared_split
- **WHEN** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料
- **THEN** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。（AC-3.45；AC-3.45）

### Requirement: AC-3.46 驗收情境

46. **AC-3.46**（v6.0.0，issue #1160）：**Given** 同一 cycle 綁定的 sealed dataset version 有 12 個已接受 item，已發布 R1 實際使用 3 個、R2 實際使用 4 個，其中一筆 R1 assignment 後來被終局排除，**When** 發布要求 4 個的 R3，**Then** R3 精確取得 4 個不屬於 R1／R2 的新 item ID，已排除 assignment 對應的 item ID 不得重新出現在 R3，並保留 1 個 item 供 Official 發布時凍結；若改為要求 5 個的 R3，則整次拒絕且不建立 run／snapshot／assignment，不得因 R1 assignment 排除而回補可用池（FR-010d／FR-010e／FR-010f-2）。

#### Scenario: AC-3.46 排除 assignment 不回補已用 item

- **GIVEN** 同一 cycle 綁定的 sealed dataset version 有 12 個已接受 item，已發布 R1 實際使用 3 個、R2 實際使用 4 個，其中一筆 R1 assignment 後來被終局排除
- **WHEN** 發布要求 4 個的 R3
- **THEN** R3 精確取得 4 個不屬於 R1／R2 的新 item ID，已排除 assignment 對應的 item ID 不得重新出現在 R3，並保留 1 個 item 供 Official 發布時凍結；若改為要求 5 個的 R3，則整次拒絕且不建立 run／snapshot／assignment，不得因 R1 assignment 排除而回補可用池（FR-010d／FR-010e／FR-010f-2）。

### Requirement: SC-005 成功標準

- **SC-005**（**v8.0.1 釐清**，issue #1160）：`isolation_enabled = true` 時每個 run 的查詢與匯出結果不得混入其他 run；同一次匯出可明確選取 Dry Run 與 Official Run 並同檔封裝，逐 run 保留身分 `run_id`、階段 `run_stage` 與獨立結果，不跨 run 合併、聚合或去重。`false` 時揭露風險並保存確認與審計證據，但不自動產生混合結果動作。兩種值皆須拒絕同 cycle 任何 Dry／Official item ID 重疊；只允許 draft 退回後的新 cycle 再使用舊 cycle item（AC-3.40／AC-3.41）。

#### Scenario: SC-005 對應 AC-3.41

- **GIVEN** sealed version 有 10 個已接受 item、R1 已用 3 個
- **WHEN** 在隔離開啟或關閉兩種設定下發布要求 6 個的 R2
- **THEN** R2 精確取得不同的 6 個、Official 發布時才凍結剩餘 1 個；要求 7 個的 R2 整次被拒絕，不能縮減或耗盡正式池（FR-010b～FR-010f-3）。（SC-005；AC-3.41）

#### Scenario: 隔離開啟時的明確混合匯出

- **GIVEN** 資料隔離開啟，使用者明確選取一個 Dry Run 與一個 Official Run 匯出
- **WHEN** 系統建立同一份匯出檔
- **THEN** 兩個 run 的結果分別保留來源 `run_id`、`run_stage` 與各自版本，不跨 run 合併、聚合或去重；隔離開關維持啟用

### Requirement: SC-011 成功標準

- **SC-011**：僅 reviewer 或不符 FR-014 狀態／欄位範圍時，Overview 編輯入口不可用且顯示唯讀原因；active PL 在等待階段只可儲存四個指引內容欄位（AC-3.43）。

#### Scenario: SC-011 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（SC-011；AC-3.43）

### Requirement: SC-050 成功標準

- **SC-050**（**v5.0.0 新增**，issue #1120）：對同一任務依序檢視五個頁籤時，由同一 `task_id × cycle_id × run_type × round_no` 推導之計數在各頁籤間完全一致，且無任一數字由標記 assignment、審核單位、爭議項三種單位相加而得；該任務無工時或匯出紀錄時兩區塊皆呈現空狀態，不出現其他任務的通用資料（FR-010u）。

#### Scenario: SC-050 對應 AC-1.26

- **GIVEN** 一個任務同時存在已結束的試標回合與一個進行中的回合
- **WHEN** `project_leader` 依序檢視概覽、成員、進度、結果、工時五個頁籤
- **THEN** 各頁籤呈現的計數皆由同一組 `task_id × cycle_id × run_type × round_no` 推導、數值彼此一致，畫面不出現其他任務的回合、樣本數、工時或匯出歷史紀錄；該任務無工時或匯出紀錄時，對應區塊呈現空狀態而非其他任務的示範資料（FR-010u）。（SC-050；AC-1.26）

### Requirement: SC-053 成功標準

- **SC-053**：通過 AC-3.40／AC-3.41／AC-3.46：新舊 cycle R1 可同時追溯且互不計數，兩種隔離值下 item 集合皆不重疊；即使先前 Dry assignment 被排除，sealed-version 累計上限仍依已發布 Dry run 的實際 item_count 計算，每輪保留至少一筆 Official。

#### Scenario: SC-053 對應 AC-3.40

- **GIVEN** cycle 1 的 R1 已發布後退回 draft
- **WHEN** 重綁版本並再次發布 R1
- **THEN** cycle 2／run／snapshot 身分皆不同，cycle 1 的 assignment 與排除證據保留；切換兩個 R1 的計數與完成閘門互不混入（FR-010f-5／FR-010u）。（SC-053；AC-3.40）

#### Scenario: SC-053 對應 AC-3.46

- **GIVEN** 同一 cycle 綁定的 sealed dataset version 有 12 個已接受 item，已發布 R1 實際使用 3 個、R2 實際使用 4 個，其中一筆 R1 assignment 後來被終局排除
- **WHEN** 發布要求 4 個的 R3
- **THEN** R3 精確取得 4 個不屬於 R1／R2 的新 item ID，已排除 assignment 對應的 item ID 不得重新出現在 R3，並保留 1 個 item 供 Official 發布時凍結；若改為要求 5 個的 R3，則整次拒絕且不建立 run／snapshot／assignment，不得因 R1 assignment 排除而回補可用池（FR-010d／FR-010e／FR-010f-2）。

### Requirement: SC-054 成功標準

- **SC-054**：通過 AC-3.42：SQLite／PostgreSQL 後續實作驗證須涵蓋並行冪等、同 task Official 生命週期唯一、跨版本拒絕及交易失敗零部分寫入。

#### Scenario: SC-054 對應 AC-3.42

- **GIVEN** 合法 Dry 或 Official 發布請求
- **WHEN** 相同 key／內容重送或並行重送
- **THEN** 只回傳原 run／snapshot，無額外 assignment／transition；異內容同 key、同 round 異 key 或第二筆 Official 被拒絕。注入跨版本 item 或交易中途失敗時所有發布寫入回滾（FR-010f-6）。（SC-054；AC-3.42）

### Requirement: SC-055 成功標準

- **SC-055**：通過 AC-3.43：run／round 指引 equality、等待階段四欄位界線、config/schema 同步版本與歷史匯出版本皆可追溯，無任何歷史記錄改讀目前版本。

#### Scenario: SC-055 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（SC-055；AC-3.43）

### Requirement: SC-056 成功標準

- **SC-056**：通過 AC-3.44／AC-3.45：候選快照不授予已停用 membership 權限，終局排除不計分母，無第二份持久化 ReviewAssignment，抽樣／manifest／標記者路徑不讀或暴露私有答案。

#### Scenario: SC-056 對應 AC-3.45

- **GIVEN** item 的 private row 含 hidden answer 或 declared_split
- **WHEN** 重播同 cycle seed／演算法與版本的抽樣並取得標記者資料
- **THEN** run 清單由公開資格池可重現，與私有 split 無關，回應與 manifest 均無答案、gold/test 標記或受限來源（FR-010f）。（SC-056；AC-3.45）

### Requirement: FR-005l 停用成員與草稿隔離

- **FR-005l**：停用 `task_role = annotator` 的成員時：(1) 其已提交之標記（試標與正式皆然）必須全數保留，繼續計入歷史統計與 IAA，既有 review unit 不受影響；(2) 其尚未提交的已指派標記作業（含草稿）必須改為未指派狀態退回未指派池，等待 `project_leader` 依 FR-005g 重新指派或依 FR-005h 排除（比照 FR-005j 對審核員 `pending` 退回的規則）；(3) 停用期間該成員不得成為新指派對象，亦不得提交任何標記；(4) 重新啟用僅恢復可被指派資格，不自動取回先前退回的作業。停用操作本身不受 FR-010t 阻擋，但若停用後 active 標記員人數 `< min_annotators`，二次確認 modal 必須加註後續發布將被 FR-010t 阻擋的警告。 **V1 草稿隔離**：第 (2) 點退回時，舊未提交草稿同交易轉 `abandoned`；重派者看不到前任答案，原成員重新啟用不自動恢復舊草稿或 slot 寫權。

#### Scenario: 重新啟用不還原舊草稿

- **GIVEN** 原標記員有未提交草稿及已提交紀錄
- **WHEN** PL 停用、重派，稍後重新啟用
- **THEN** 舊草稿保持 `abandoned`，已提交紀錄保留，原成員不自動取回 slot（AC-3.47）

### Requirement: AC-3.47 未提交草稿重派隔離

同一穩定 assignment ID 的受派者異動不改寫前任草稿或責任鏈。

#### Scenario: AC-3.47 未提交草稿重派隔離

- **GIVEN** 一個已儲存未提交草稿的 assignment
- **WHEN** membership 停用、移除或 PL 明確重派
- **THEN** 前任草稿標記 `abandoned` 且受限保存；繼任者無法讀取，原受派者失去寫權，已提交紀錄保持不變

### Requirement: FR-021 歷史重新下載原始位元組

- **FR-021**（**v8.0.1 釐清**，對應 AC-1.14～AC-1.16、SC-046，issue #1160）：匯出歷史列的「下載」須提供首次匯出原子保存的不可變原始檔案位元組與原始檔名，不得以該列條件快照重新查詢或重算目前結果，也不得重新呼叫切詞引擎。(1) **建立與保存**：首次匯出通過資料完整性及答案隔離驗證後，保存原始產物、檔名、SHA-256、位元組數及受限物件參照；歷史列記錄原請求人、請求接受時間 `requested_at`，以及首次成功原檔的結果讀取快照時間 `exported_at`；兩個時間各有不同用途。原檔 manifest 與檔名均使用實際 `exported_at`，其與原檔資料在原子 `ready` 轉換中固定。條件快照用於審計／重製驗證，不作為重新下載資料來源；後續標記或審核變更不影響既有原檔。(2) **目前授權**：每次下載都重新檢查 `dataset.export` 的當前 active membership 與當前 task 範圍，並遵守 FR-024 的角色、資料可見性與答案隔離；歷史請求人身分不構成授權。不得讀取或覆寫目前頁面篩選及對話框選項，也不得開啟對話框。(3) **可下載條件**：產物完成並處於 `ready`、來源及任務有效、未到期且未撤銷、受限物件存在並通過 SHA-256 驗證時才提供原始位元組；到期須拒絕下載，撤銷須拒絕下載，來源刪除或 SHA-256 不符亦須拒絕下載。拒絕時提供可理解的繁體中文原因，內部物件儲存路徑不得回傳，私有答案亦不得暴露。(4) **同一歷史列**：尚未 `ready` 的 worker 重試可對較晚的結果快照重新產檔，並依 FR-010i-2 固定該次的 `exported_at`；`ready` 後重試只回傳原始產物與同一歷史列。重新下載不得新增匯出記錄，不改變歷史列內容或排序，不產生新檔案、不重新序列化，也不顯示當次匯出對話框的對齊擴張摘要。原始檔名與首次下載相同；對所有任務類型和 `EXPORT_FORMATS` 適用，即使標記或審核後續修改、畫面語言改變或原切詞引擎停用，仍交付相同位元組。(5) **保留與舊版**：原始產物保存 30 日，匯出歷史 metadata 保存一年；期限屆滿或撤銷立即停止下載，歷史列可顯示「已過期」但不得延長原產物期限。只有條件快照、缺少有效原始產物的舊版列不得由目前結果重建，須停用下載並說明原因；有效的舊版原檔仍按其原格式位元組下載，不升版改寫。(6) **切詞邊界**：新建 `word` 匯出仍須由 FR-020 驗證 `tokenizer.engine`／`tokenizer.version`；有效的原始產物重新下載不需切詞引擎，不因引擎之後不可用而失敗。

#### Scenario: AC-1.14 `sequence_tagging` 重新下載不受當前篩選與對話框選項影響且不新增紀錄

- **GIVEN** 原始檔案有效，後續標記、審核、畫面條件、語言或切詞器狀態已改變
- **WHEN** 有權限使用者重新下載
- **THEN** 位元組和檔名與首次下載完全相同，不重算結果、不開對話框、不新增歷史列
- **AND** 原始方案、詞元單位及切詞器 metadata 保持不變；目前篩選與對話框選項保持原值，不顯示對齊擴張摘要

#### Scenario: AC-1.15 跨階段與零筆匯出的原檔重新下載保持一致

- **GIVEN** 一次匯出同時選取 Dry Run 與 Official Run，`JSON-MIN` v2 的結果為零筆且原始檔案有效
- **WHEN** 有權限使用者首次下載，切換介面語言後再按歷史列「下載」
- **THEN** `{manifest,rows[]}` 的 `rows[]` 仍為空，`manifest.runs[]` 依原順序保存每個 run 的精確版本、快照與請求人
- **AND** 重新下載的原檔位元組與檔名完全相同，不讀任務目前版本，頁面條件保持原值且歷史列數不變

#### Scenario: AC-1.16 原檔失效或失權時拒絕，仍允許有效詞級原檔

- **GIVEN** 舊歷史列只有條件快照而沒有有效原檔，或產物到期、撤銷、來源刪除、SHA-256 不符，或使用者失去目前 `dataset.export` 與任務範圍權限
- **WHEN** 使用者檢視或按下載
- **THEN** 停用或拒絕並以不洩露內部物件路徑的繁體中文說明，不能以快照補算檔案或新增歷史列
- **AND** 已保存且有效的 `word` 詞級原檔即使切詞引擎後來不可用，仍按原位元組下載且不重新切詞；新的詞級匯出缺引擎或版本時依 FR-020 阻擋

#### Scenario: 失權或失效時拒絕

- **GIVEN** 使用者失權，或原檔缺失、到期、撤銷、來源刪除、SHA-256 不符
- **WHEN** 使用者檢視或按下載
- **THEN** 停用或拒絕，說明原因，不重建檔案或新增歷史列
- **AND** 不洩露內部物件路徑、私有答案或未提交審核草稿

#### Scenario: SC-046 重新下載可重現性

- **GIVEN** 跨 run、空結果 `json-min` v2 和上述後續變化與失效情形
- **WHEN** 自動化檢查首次與歷史下載
- **THEN** 有效原檔的位元組與檔名相同比率為 100%，新增歷史列為 0
- **AND** 失權、刪除、到期、撤銷、缺檔及校驗不符的下載成功次數皆為 0

#### Scenario: FR-021 對應 AC-3.43

- **GIVEN** Dry R1 釘住指引 v1 且已進入等待階段
- **WHEN** PL 修改四個指引內容欄位之一為 v2 並發布 R2 或 Official
- **THEN** 新 run 釘住 v2，Dry 同 round 版本；舊 run 仍讀 v1。等待階段修改 dataset／config／force_guideline 被拒絕；draft 另存 config 同步增加 config／schema 版本，歷史匯出仍引用原精確版本（FR-014／FR-017a／FR-010i-1）。（FR-021；AC-3.43）

#### Scenario: 背景重試與歷史下載保持原檔時間

- **GIVEN** 請求接受時間與 worker 的結果讀取快照時間不同
- **WHEN** worker 首次將完整產物設為 `ready`，其後使用者重新下載或同鍵重試
- **THEN** 原始位元組、檔名與 `exported_at` 共同固定，歷史下載及 `ready` 重試交付完全相同的原檔
- **AND** 不以 `requested_at` 重建檔案、查詢目前結果或延長既有產物期限

### Requirement: FR-009a 首次匯出保存不可變原始產物

首次匯出 MUST 明確選取同任務一個或多個 run；同一次匯出可同時選取 Dry Run 與 Official Run，並凍結所選 run 的順序與各自階段，不得從目前頁面階段推定或合併 run。依 `EXPORT_SYNC_MAX_ROWS` 選同步回應或背景工作。內容與答案隔離驗證通過後 MUST 原子保存不可變原始位元組、原檔名、格式版本及 SHA-256，才將歷史列設為可下載；失敗不可留下可下載的部分產物。服務端 MUST 在身分、`dataset.export` 和任務範圍授權後才查詢冪等鍵。冪等鍵作用範圍是 `(task_id, requested_by_user_id, client_idempotency_key)`；服務端計算正規化命令摘要，輸入包括任務、請求人、格式及格式版本、有序 run ID、已驗證的共享篩選、語言、序列方案／單位與切詞器引擎／版本。摘要 MUST 排除生成時間及產物資料（包括 bytes、檔名、原檔 SHA-256）。同鍵同摘要重送或工作重試回傳／續用原歷史列；同鍵不同摘要拒絕為衝突，MUST NOT 覆寫或建立第二筆。生命週期為 `pending → processing → ready | failed`；到期、撤銷另由時間記錄判定。

#### Scenario: 首次匯出和重試只產生一份完整原檔

- **GIVEN** 使用者有目前任務的匯出權限且匯出內容通過驗證
- **WHEN** 匯出成功或背景工作對同一請求重試
- **THEN** 只有一筆歷史列及一份不可變原檔，含檔名、格式版本、SHA-256
- **AND** 驗證失敗時沒有可下載的部分檔案

#### Scenario: 冪等鍵作用範圍與內容衝突

- **GIVEN** 任務 A 的請求人 U 已用鍵 K 建立匯出，命令摘要已保存
- **WHEN** U 在任務 A 以鍵 K 重送相同命令，或以鍵 K 送出不同 run 順序／篩選／格式／語言／序列選項
- **THEN** 相同命令續用原歷史列；不同命令回傳衝突且不改寫原列
- **AND** 任務 B 或另一請求人不能藉 K 探測 A／U 的請求，因為查鍵前須先通過目前授權

#### Scenario: 同次匯出選取 Dry 與 Official

- **GIVEN** 同一任務已有 Dry Run R1、R2 及 Official Run
- **WHEN** 使用者明確選取 Dry R2 與 Official Run 建立一次匯出
- **THEN** 只建立一筆歷史列，所選 run 的身分、階段與選取順序固定，manifest 不含未選取的 Dry R1

### Requirement: FR-010i 每個 run 的匯出 metadata

匯出結果檔 metadata MUST 逐 run 記錄 `run_stage`、`isolation_enabled`、`sampling_value`、`applied_iaa_metrics`、`sample_snapshot_id` 和該 run 範圍內已排除標記作業的摘要。跨 run 不能以單一 snapshot 或版本值覆蓋各 run 的值，細目依 FR-010i-1。

#### Scenario: 不同 run 的抽樣快照分開呈現

- **GIVEN** 同一匯出納入兩個各有不可變 snapshot 的 run
- **WHEN** 使用者查閱原始匯出檔
- **THEN** 每個 run 的抽樣及排除摘要各自對應原快照，互不覆寫

### Requirement: FR-015e 匯出入口支援明確的跨階段選取

`annotation-results` MUST 提供 `EXPORT_FORMATS` 所列格式及同任務 run 選取。同一次匯出可同時選取 Dry Run 與 Official Run；選取後的固定順序與每個 run 的階段、結果身分須分別顯示及保存，跨階段呈現在同一原檔不代表解除資料隔離。結果列數不超過 `EXPORT_SYNC_MAX_ROWS` 同步回應，超過門檻改為背景工作與通知；metadata 依 FR-010i／FR-010i-1。

#### Scenario: 結果介面顯示跨階段匯出範圍

- **GIVEN** 同任務有可選的 Dry Run 和 Official Run
- **WHEN** 使用者在 `annotation-results` 明確選取兩階段的 run 匯出
- **THEN** 介面與原檔按固定順序呈現各 run，結果仍標明所屬 run 和階段且互不混用

### Requirement: FR-015h JSON-MIN v2 envelope

`JSON-MIN` MUST 採 `EXPORT_JSON_MIN_SHAPE = {manifest,rows[]}`，格式版本 2；`rows[]` 每列仍是含共通欄、標記最小欄及任務結果摘要的 flat row。零筆時 `rows[]` 為空陣列，`manifest` 仍含格式版本、請求人及逐 run 身分。有效舊版原始檔案照原位元組交付，不以 v2 序列化器改寫。

#### Scenario: AC-1.15 空結果仍有版本 metadata

- **GIVEN** 篩選沒有任何可輸出的結果列
- **WHEN** 建立 `json-min` 匯出
- **THEN** 檔案為格式版本 2 的 `{manifest,rows[]}`，`rows[]` 為空且 manifest 含請求人與逐 run 身分

### Requirement: FR-007b 各類工作速度與完成單位

- **FR-007b**（**v9.0.0 修訂，BREAKING**，issue #1160）：`工時明細表` 的完成筆數必須拆分為 `標記筆數`、`審核筆數`、`仲裁筆數` 三欄；角色不適用的欄位顯示 `—`（標記員僅有標記筆數；審核員僅有審核筆數與仲裁筆數）。匯總卡片為 `總工時`、`總標記筆數`、`總審核筆數`、`各類工作速度` 四張。速度只逐類顯示 `標記件/時`、`審核單位/時`、`仲裁項/時`，各以對應種類之完成筆數及可信工作時長計算；無可信時長或分母為零時顯示 `—`。審核送出按 `annotation_review_submission.id` 去重，逐 outKey 決策及後續修訂不增加審核單位；標記按 run 內完成 assignment 去重，仲裁按終局爭議鍵去重。異常提醒亦須按同種類與同單位比較，不得混合三類完成筆數。

#### Scenario: 各類速度不混單位

- **WHEN** 標記、審核與仲裁完成筆數同時存在
- **THEN** 三類速度以各自筆數與可信工作時長計算，不能相加；無分母顯示未知

### Requirement: FR-007d 可觀測工作區間與日報表

- **FR-007d**（v9.0.0 新增，issue #1160）：工時原始來源為未部署候選 `task_work_interval`，每列限定同一 `account_session_id`、`task_id`、`run_id`、`membership_id`、`work_kind` 的一段可觀測前景工作；`work_kind = annotation | review | arbitration`，後端依有效身分及 membership 角色驗證。服務端以 UTC 記錄 `started_at`、`last_seen_at`、可空 `ended_at`，工作區可見且聚焦時開始，候選心跳每 30 秒；10 分鐘無互動視為閒置，失焦、背景、切換任務/run/種類、登出或安全撤銷皆結束區間。失聯 90 秒時只以最後有效 `last_seen_at` 關閉，不以等待時間或客戶端時鐘補工時；同一使用者至多一筆未結束區間，跨裝置競爭須由交易與部分唯一約束防重。原始 UTC 區間不拆列；報表固定 `Asia/Taipei`，跨日於查詢時計算當地午夜裁切，按 session × task × run × membership × work kind × 報表日期分組。同一 session 可跨任務/run，登入不等於工作；`annotation_history_event.lead_time_ms` 亦不得當工時。合法完成事件即使沒有可信區間仍可計數，該列工作時長與速度顯示「未知」；僅有可信區間但無完成事件時筆數可為 0。`login_at` 只取 `account_session.started_at`；`logout_at` 只取可驗證明確登出的 `logged_out_at`，無值及上線時長顯示「未知」，不得由 `revoked_at` 推估。上線時長僅代表該 session 登入到明確登出的當日切片，非網路連線證據；同 session 跨多列展示不得相加。標記完成按 run × assignment 去重，審核完成按 submission head 去重，仲裁完成按終局爭議鍵去重；無可驗證 session 的舊事件不猜測歸屬。`WorkLogEntry` 為唯讀查詢投影，不建立同名表。

#### Scenario: 失聯與跨日報表

- **WHEN** 可觀測區間跨台北午夜且後續失聯
- **THEN** 原始 UTC 區間不拆列，只按當地日界投影，失聯以最後有效 `last_seen_at` 關閉

### Requirement: AC-1.28 同日兩次登入與跨 run 隔離

28. **AC-1.28**（v9.0.0，issue #1160）：**Given** 同一成員同日在同一任務登入兩次，且第一次登入含兩個不同 run 的工作區間，**When** 負責人檢視工時紀錄，**Then** `account_session_id × task_id × run_id × membership_id × work_kind × report_date` 各自成列，同日兩次登入與不同 run 均不合併；只有可信區間才提供工作時長（FR-007d、FR-010u）。

#### Scenario: 同日登入分列

- **WHEN** 同一成員同日兩次登入並在不同 run 開工
- **THEN** session 與 run 分列，不重複或跨列合併

### Requirement: AC-1.29 跨日與登出未知

29. **AC-1.29**（v9.0.0，issue #1160）：**Given** 一段可觀測工作區間跨日且登入工作階段未能明確登出，**When** 以 `Asia/Taipei` 日期篩選工時，**Then** 原始 UTC 區間不拆列，報表於當地午夜裁切至兩日；登出及上線時長顯示「未知」，不得由 `revoked_at` 推估（FR-007d）。

#### Scenario: 無明確登出與跨日

- **WHEN** 工作區間跨日而 session 無 `logged_out_at`
- **THEN** 報表按台北午夜裁切，登出與上線時長未知

### Requirement: AC-1.30 失聯關閉與時間未知

30. **AC-1.30**（v9.0.0，issue #1160）：**Given** 工作頁面失焦或心跳失聯，**When** 服務結束工作區間，**Then** 失聯段以最後有效 `last_seen_at` 關閉，未觀測等待時間不計入工時；有合法完成事件但無可信區間時筆數保留、工作時長與速度顯示「未知」（FR-007d、FR-007b）。

#### Scenario: 失聯及合法完成事件

- **WHEN** 心跳失聯或頁面失焦，但已有合法完成事件
- **THEN** 工時只算可信區間，完成筆數保留，無可信時長則速度未知

### Requirement: AC-1.31 完成事件按來源去重

31. **AC-1.31**（v9.0.0，issue #1160）：**Given** 一次審核送出產生多個 outKey 決策與後續修訂，**When** 計算該 session/run 的完成筆數，**Then** 同一審核 submission head 只算一個審核單位，仲裁依終局爭議鍵去重，標記 assignment 另算；三類數量不得相加為單一速度（FR-007b、FR-010u）。

#### Scenario: 多 outKey 審核去重

- **WHEN** 同次審核多個 outKey 並有後續改判
- **THEN** 審核 submission head 只計一個審核單位

### Requirement: SC-057 雙庫開啟區間唯一性

- **SC-057**（v9.0.0，issue #1160）：SQLite 與 PostgreSQL 的候選約束驗證均須證實同一 user 雙裝置同時開工時至多一筆未結束 open 區間；失聯只以最後有效 `last_seen_at` 關閉，UTC 區間按台北日期裁切後同日多次登入與不同 run 不合併。規劃圖通過文件驗證不等於雙庫 migration 已通過，正式實作階段須補兩庫交易測試。

#### Scenario: SQLite 與 PostgreSQL 開段競爭

- **WHEN** 同一 user 雙裝置同時開工
- **THEN** SQLite 與 PostgreSQL 均須由候選部分唯一約束及服務交易保證至多一筆 open 區間

### Requirement: SC-058 完成筆數隔離與答案保護

- **SC-058**（v9.0.0，issue #1160）：同 run 的標記 assignment、審核 submission head、終局爭議鍵各自去重；多 outKey 審核決策及後續修訂不重複算審核單位。缺可信時間仍保留合法筆數但速度未知；標記員回應不得包含他人的 session、私有答案或 gold/test 答案。

#### Scenario: 完成數與答案隔離

- **WHEN** 同 run 有多 outKey 決策與仲裁事件
- **THEN** 各類完成筆數依不同單位去重，標記員回應不含他人 session 或私有答案

### Requirement: FR-010f-7 工作位唯讀狀態投影

- **FR-010f-7**（**v10.0.0 新增**，issue #1160）：`task_annotation_assignment` 僅保存穩定 slot、run/item 與可空的目前 `assignee_membership_id`，不得保存第二份 `status`。唯讀顯示狀態按此優先順序由同 run 的事實推導：存在終局排除證據 → 已排除；存在目前有效已提交 `annotation_record` → 已完成；受派者空值 → 未指派；存在目前受派者已儲存但未提交的草稿 → 草稿中；其餘 → 已指派待處理。`annotation_record` 自身生命週期仍為 `saved | submitted | abandoned`；舊草稿在停用、移除或重派的同一資料庫交易轉 `abandoned`，已提交紀錄保留，排除證據終局且不以空受派者代替。API／前端只接收此查詢投影，寫入與授權仍按即時 membership、run 和 slot 判定。

#### Scenario: AC-3.50 狀態優先序與草稿隔離

- **GIVEN** 同一 assignment 存在草稿、已提交紀錄、空受派者或終局排除的組合
- **WHEN** 查詢工作位顯示狀態或重派 slot
- **THEN** 依排除、提交、未指派、目前草稿與待處理的順序推導唯一狀態，舊草稿成為 abandoned，已提交與排除證據保留

### Requirement: AC-3.48 回執逐位元一致

48. **AC-3.48**（v10.0.0，issue #1160）：**Given** 同一 sealed version 和 seed 選出一組公開 item ID，**When** 發布 Dry 或 Official run，**Then** `task_run_item.list_position` 的有序 UUID 清單形成 `label-suite-run-items-v1` UTF-8 規範位元組，`selected_item_digest` 為完整位元組的 SHA-256 十六進位，私有不可覆寫 `selection_manifest_ref` 回執讀回與 SQL 清單逐位元一致；回執與標記者資料均無 hidden answer、`declared_split`、受限 `source_ref` 或 gold/test 標記（FR-010f）。

#### Scenario: AC-3.48 逐位元回執

- **GIVEN** 已知公開 item 清單與順序
- **WHEN** 發布並讀回回執
- **THEN** 位元組和 SHA-256 與 SQL 清單一致，私有資料不存在於回執

### Requirement: AC-3.49 重試與失敗恢復

49. **AC-3.49**（v10.0.0，issue #1160）：**Given** 合法發布命令與固定冪等鍵，**When** 同 key／同摘要重送、物件寫入或讀回驗證失敗、DB 回滾、提交結果不明，或已提交回執後來缺失／摘要不符，**Then** 已提交重送只回原 run／snapshot 且不重新抽樣，異摘要拒絕；物件失敗不提交 DB，回滾不留下可見的部分發布；不明提交先查 DB 冪等鍵，壞回執拒絕讀取並告警，無引用殘留物只在租約與引用檢查後清理（FR-010f-6）。

#### Scenario: AC-3.49 安全重試

- **GIVEN** 發布命令可能重送或在提交附近故障
- **WHEN** 同 key 重送、外部物件失敗或提交結果不明
- **THEN** 依正典冪等鍵回原 run 或拒絕，無可見半套資料或靜默回執替換

### Requirement: AC-3.50 唯讀狀態優先序

50. **AC-3.50**（v10.0.0，issue #1160）：**Given** 同一 assignment 曾有已儲存草稿、已提交紀錄、空受派者或終局排除的不同組合，**When** 查詢工作位顯示狀態，**Then** 依排除 → 已提交 → 未指派 → 目前受派者草稿 → 已指派待處理的順序得出唯一狀態，assignment 無獨立 `status`；重派會將舊未提交草稿轉 `abandoned`，不改已提交或排除證據（FR-010f-7）。

#### Scenario: AC-3.50 終局排除優先

- **GIVEN** 工作位有終局排除且受派者為空
- **WHEN** 查詢顯示狀態
- **THEN** 顯示已排除而非未指派，且沒有持久化 assignment status

### Requirement: SC-059 清單一致與資料隔離

- **SC-059**（v10.0.0，issue #1160）：通過 AC-3.48：同一有序公開 item 清單的 `label-suite-run-items-v1` 規範位元組、`selected_item_digest` 與私有回執讀回 100% 相同；抽樣、回執與標記者回應的 hidden answer／split／受限來源洩漏數為 0。

#### Scenario: SC-059 驗證回執與隱私

- **GIVEN** 一組公開 item 清單
- **WHEN** 比對 SQL、回執與標記者回應
- **THEN** 規範位元組一致且私有資料洩漏數為零

### Requirement: SC-060 發布失敗與冪等

- **SC-060**（v10.0.0，issue #1160）：通過 AC-3.49：相同 key／摘要的重送新增 run、snapshot、assignment、transition 數皆為 0；物件失敗、跨版本或 DB 回滾後可見部分發布數為 0；不明提交不重抽，壞回執拒絕讀取並告警，清理不刪除已引用物件。SQLite／PostgreSQL 與物件儲存實作須另以失敗注入驗證，本次文件檢查不等於實測通過。

#### Scenario: SC-060 故障不宣稱成功

- **GIVEN** 並行重試、回執失敗或資料庫故障
- **WHEN** 執行發布與恢復
- **THEN** 不建立重複或部分發布，壞回執拒絕讀取

### Requirement: SC-061 工作位狀態正典

- **SC-061**（v10.0.0，issue #1160）：通過 AC-3.50：排除、已提交、未指派、已儲存草稿、已指派待處理五類交錯輸入皆得到唯一且按優先序一致的顯示狀態；assignment 持久化 `status` 欄數為 0，已提交／排除證據於重派後遺失數為 0。

#### Scenario: SC-061 狀態只由事實推導

- **GIVEN** 五類交錯工作位事實
- **WHEN** 查詢狀態並重派受派者
- **THEN** 每個 slot 只有唯一正確狀態，且無獨立持久化 status

### Requirement: FR-010o-5 試標 IAA 完成證據

- **FR-010o-5**（**v11.0.0 新增**，issue #1160）：每個 `TrialRound` 的 IAA 結果須有單一、可持久驗證的來源。候選 `task_trial_iaa_result` 以 `trial_round_id` 一對一保存結果格式版本、演算法版本、釘住的輸入摘要、經驗證的逐輸出結果及計算時間；結果不得包含 hidden answer、來源 split、原始私有內容或可讓標記者推知 test 身分的欄位。`result_payload` 對回合釘住的 task config 每個非 `IAA_GATE_EXCLUDED_TYPES` 輸出恰有一個確定結果：數值，或 dataset-017 FR-039 第 4 點的 `De = 0`「無法計算」。在同一資料庫交易驗完完整性、保存結果並把該回合 `iaa_computation_status` 轉為 `done`；狀態為 `pending`／`failed` 或結果缺失／不完整時，不得視為完成；「開始正式標記」與「新增試標回合」兩個轉換都須核對完整結果，不能只看狀態字串。失敗重試只讓同一回合 `failed → pending`，不產生新回合或舊版成功結果；`done` 的結果不可原地覆寫。指標與門檻計算仍僅依 dataset-017 FR-039。

#### Scenario: AC-3.51 完整結果與狀態同交易

- **GIVEN** 最新試標回合有多個需計算輸出，其中一個可能是 `De = 0`
- **WHEN** 非同步計算完成或部分輸出缺失
- **THEN** 只有逐輸出完整且結果列與狀態同交易提交時才為 `done`；缺列、缺輸出或回滾保持不可發布，`De = 0` 不誤標為 `failed`

### Requirement: FR-025 任務稽核事件唯一落點

- **FR-025**（**v11.0.0 新增，BREAKING**，issue #1160）：`RunStateTransition` 與 `IsolationAuditLog` 是受授權讀取 `audit_events` 的邏輯投影，不建立同義持久化表。每一次成功的 task 狀態變化在相同資料庫交易寫恰一筆 `task.status_changed`，其受控摘要保存 `from_status`、`to_status`、觸發來源與必要的原因碼；每一次 `isolation_enabled` 實際變化在相同交易寫恰一筆 `task.isolation_changed`，受控摘要保存前後布林值與原因碼；關閉隔離須驗證二次確認並記其受控原因碼，重新啟用隔離採獨立固定原因碼，不需二次確認。`audit_events` 本身保存事件 ID、非空 task 作用域、驗證過的人員 actor 或受信系統 actor、UTC 時間及 request 關聯；非空 `task_id` 為候選 FK 指向 `task.id`。對 `task.status_changed` 與 `task.isolation_changed`，`target_type` 必須為 `task`，`target_id` 正規化為小寫連字號 UUID 後必須相等於 `task_id`；即使兩個 ID 分別指向有效任務，錯配也須拒絕。值未變時不得建立稽核事件；交易失敗或冪等重送也不得多建事件。讀權、敏感摘要 allowlist、最低保留期與多型 target 驗證依 Accepted ADR-032。不得從用戶端接收自稱 system actor，也不得在摘要寫入答案、token、原始標記或未受控理由文字。

#### Scenario: AC-3.52 同交易且無重複的任務稽核

- **GIVEN** 狀態或隔離設定的合法變更與相同命令重送
- **WHEN** 變更成功、資料庫回滾或重送
- **THEN** 成功變更各有一筆可按 task 查詢的相應 typed audit event；回滾沒有事件，重送不重複，邏輯歷程不依賴第二張表

#### Scenario: AC-3.52 任務目標與作用域錯配

- **GIVEN** 兩個分別存在的任務 A 與 B
- **WHEN** `task.status_changed` 或 `task.isolation_changed` 的 `task_id` 指向 A，而 `target_id` 指向 B，或 `target_type` 不是 `task`
- **THEN** 拒絕整個交易，不變更任務狀態或隔離值，也不寫入稽核事件；兩個 ID 各自有效不能取代兩者相等的驗證

#### Scenario: AC-3.52 隔離關閉與重新啟用的確認條件

- **GIVEN** 有權變更隔離設定的操作者與已存在的任務
- **WHEN** 關閉隔離但未通過二次確認，或重新啟用隔離
- **THEN** 未確認的關閉遭拒且不產生事件；重新啟用不要求二次確認，使用獨立固定原因碼，成功的實際變更在同一交易恰寫一筆 `task.isolation_changed`

### Requirement: AC-3.51 IAA 結果證據

51. **AC-3.51**（v11.0.0，issue #1160）：**Given** 最新試標回合須計算的每個輸出有數值或 `De = 0` 結果，**When** 計算服務提交結果，**Then** 單一版本化結果來源與 `done` 同交易保存；缺任一輸出、結果缺失或回滾時仍不可開始 Official 或下一回合，`De = 0` 不算計算失敗（FR-010o-5）。

#### Scenario: AC-3.51 缺失結果不通過閘門

- **GIVEN** round 標示 `done` 但結果列缺失或不完整
- **WHEN** 請求開始 Official 或下一試標回合
- **THEN** 服務拒絕，不能以狀態字串代替完整結果證據

### Requirement: AC-3.52 任務稽核單一事實來源

52. **AC-3.52**（v11.0.0，issue #1160）：**Given** 任務狀態或隔離開關實際改變，**When** 變更與稽核交易提交，**Then** `audit_events` 各新增恰一筆相應 typed action，保存可驗證的前後值、actor、task、UTC 時間與必要原因碼；回滾或冪等重送不重複，`RunStateTransition`／`IsolationAuditLog` 由此投影而不另建表（FR-025）。

#### Scenario: AC-3.52 變更與事件不可分離

- **GIVEN** 任務變更交易中途失敗
- **WHEN** 交易回滾
- **THEN** 狀態或隔離值及相應事件均不提交

### Requirement: SC-062 IAA 完成證據一致性

- **SC-062**（v11.0.0，issue #1160）：最新試標回合的 `done` 與完整、版本化逐輸出結果不一致之已提交狀態數為 0；`De = 0` 誤記為計算失敗數為 0。

#### Scenario: SC-062 結果與狀態一致

- **GIVEN** 完成、失敗與回滾的合成試標計算
- **WHEN** 核對每回合狀態與結果來源
- **THEN** 不存在 `done` 無完整結果或 `pending`／`failed` 被當作已完成

### Requirement: SC-063 任務稽核與狀態一致性

- **SC-063**（v11.0.0，issue #1160）：成功的任務狀態／隔離設定異動缺少或重複 typed `audit_events` 的數量為 0；交易失敗與冪等重送新增事件數為 0。

#### Scenario: SC-063 稽核唯一

- **GIVEN** 成功、失敗與重送的任務變更
- **WHEN** 依 task、action 和變更身分核對稽核歷程
- **THEN** 每個成功變更恰有一筆事件，失敗與重送沒有額外事件
