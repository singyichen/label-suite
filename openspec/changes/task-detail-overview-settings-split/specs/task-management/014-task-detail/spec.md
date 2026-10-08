> 正典：`specs/task-management/014-task-detail/spec.md`（v7.0.0 → v8.0.0，**MAJOR**，版本判定理由見 proposal.md Impact 節）。issue #1199：`task-detail` 拆為共用任務標頭、概覽與設定兩個分頁。2026-10-08 維護者裁定（issue #1199 留言）為本 delta 的約束來源，與 issue 內文衝突處以裁定為準。
>
> **delta 形式**：衍生檢視 `openspec/specs/task-management/014-task-detail/spec.md` 僅收錄 FR-019、FR-006 等少數條文，**尚未收錄** FR-003 與 SC-019。依 archive 的標題比對規則，這兩條與全新的 FR-025、FR-026、FR-027 置於 `## ADDED Requirements`（回寫正典時 FR-003、SC-019 仍為原地改寫）；已收錄於衍生檢視的 FR-019、FR-006 置於 `## MODIFIED Requirements`，標題與衍生檢視逐字一致，並完整保留既有 scenario。
>
> **AC 編號**：本 delta 新增的驗收情境一律不預先編號，AC 編號於 gate 4 回寫正典時依使用者故事現有序號續編；MODIFIED 區塊內既有的 AC-1.8、AC-1.9、SC-044、AC-2.5 scenario 標題原樣保留。
>
> **非 FR 錨點同步**（回寫正典時處理，不屬 delta 條文）：標題「5 Tabs」改為 6 Tabs；介面定義 Tab A 節（約 `:183`～`:225`）改為概覽分頁並新增設定分頁介面；`:190` 標籤「設定檔版本」改為「設定檔」；`:400` 抽樣設定檢視不再重複列出試標回合等資訊。

## ADDED Requirements

### Requirement: FR-003 頁面提供六個 tabs 且預設為概覽

頁面 MUST 提供六個 tabs，顯示順序固定為：`概覽`（`overview`）、`設定`（`settings`）、`成員管理`（`member-management`）、`標記進度`（`annotation-progress`）、`標記結果`（`annotation-results`）、`工時紀錄`（`work-log`），且預設為 `overview`。原分頁名稱「任務概覽」MUST 改為「概覽」。分頁列 MUST 使用 `role="tablist"` 與 `role="tab"`，並支援方向鍵在分頁間移動。`成員管理` 的可見性仍依 FR-006。

#### Scenario: 六個分頁依固定順序顯示

- **GIVEN** `project_leader` 開啟 `task-detail`
- **WHEN** 檢視分頁列
- **THEN** 分頁依序為 概覽／設定／成員管理／標記進度／標記結果／工時紀錄，預設選取「概覽」
- **AND** 畫面不再出現名為「任務概覽」的分頁

#### Scenario: 分頁列支援方向鍵

- **GIVEN** 焦點位於分頁列的某個 `role="tab"` 元素
- **WHEN** 使用者按下左右方向鍵
- **THEN** 焦點與選取依顯示順序移動到相鄰分頁，到達端點時循環

### Requirement: SC-019 任務階段文字標示由標頭狀態承載，stepper 僅作流程示意

任務標頭的狀態文字（FR-025，例如「試標階段 · 第 2 回合」）MUST 是畫面上唯一的任務階段文字標示。概覽分頁的任務層級 stage flow MUST 維持 `draft → 試標階段 → 正式標記中 → 已完成`，但 stepper 僅作流程示意（沿用原圓點加連接線樣式），MUST NOT 被視為目前階段的權威標示。

單一執行判定區塊 MUST 僅顯示最近回合或正式標記的判定標題與下一步說明，MUST NOT 顯示額外的「目前任務階段」標題或描述，也 MUST NOT 再出現獨立的「正式標記判定」卡。`試標階段` 內需逐步呈現例如 `R1 未通過 → R2 通過 → 開始正式標記` 的回合歷程（判定標題為顧問性警示標籤，不代表狀態轉換被阻擋，見 FR-010o-3）。樣本池分配需隨回合動態調整且不同回合以不同顏色區隔（FR-010p）；執行控制區 MUST NOT 顯示額外狀態 badge 或 stage meta pills。stepper 的無障礙處理（issue #1126）MUST 以本條「stepper 僅作流程示意」為前提設計。

#### Scenario: 階段只由標頭狀態文字標示

- **GIVEN** 任務處於試標階段第 2 回合
- **WHEN** `project_leader` 開啟概覽分頁
- **THEN** 標頭狀態文字顯示「試標階段 · 第 2 回合」
- **AND** 概覽內除 stepper 之外沒有其他「目前任務階段」標題或描述

#### Scenario: stepper 不承擔目前階段的權威標示

- **GIVEN** 概覽分頁顯示 stage flow
- **WHEN** 檢視 stepper
- **THEN** 其以原圓點加連接線樣式呈現 `draft → 試標階段 → 正式標記中 → 已完成` 的流程，不另加狀態徽章
- **AND** 標頭狀態文字與 stepper 的階段若需對照，以標頭狀態文字為準

### Requirement: FR-025 任務標頭為六個分頁共用且不放主要動作

`task-detail` MUST 在分頁列上方提供六個分頁共用的任務標頭：(1) **麵包屑**顯示 `任務管理 / {task_id}`；(2) **H1** 顯示任務名稱，取代固定的「任務詳情」標題與副標；(3) **狀態文字**在 H1 右側以一般文字顯示當前任務階段（例如「試標階段 · 第 2 回合」），MUST NOT 使用 pill 徽章；(4) 標頭 MUST NOT 放置任何主要動作（CTA）。標頭狀態文字 MUST 與概覽的判定資料同源推導，MUST NOT 另建第二份階段判定。任務不存在時沿用既有的找不到任務呈現（issue #200），標頭不顯示不存在任務的名稱。

#### Scenario: 標頭顯示任務名稱與文字狀態

- **GIVEN** 任務名稱為「PTT 情緒標記」、處於試標階段第 2 回合
- **WHEN** 使用者開啟任一分頁
- **THEN** 麵包屑為 `任務管理 / {task_id}`，H1 為「PTT 情緒標記」，H1 右側以一般文字顯示「試標階段 · 第 2 回合」
- **AND** 標頭內沒有任何按鈕作為主要動作

#### Scenario: 切換分頁時標頭維持不變

- **GIVEN** 使用者位於概覽分頁
- **WHEN** 依序切換到其餘五個分頁
- **THEN** 每個分頁上方皆顯示相同的麵包屑、H1 與狀態文字

### Requirement: FR-026 設定分頁以五個區塊承載任務設定

`設定` 分頁 MUST 承載由概覽搬移而來的五個區塊：`基本資料`、`標記設定`、`標記說明`、`抽樣設定`、`審核設定`；各區塊的欄位、編輯表單、儲存／取消行為與既有 element id MUST 維持原樣，唯下列各點為規定的變更。

**(1) 版面與導覽**。左側為純文字區塊導覽，右側一次只顯示一個區塊；導覽 MUST 使用 `role="tablist"`／`tab` 並支援方向鍵，導覽項目文字 MUST 為 14px 並水平置中，active 項目以 token `--color-white` 為底並加粗字重。區塊 MUST 以標題列（區塊名稱＋右側「編輯」文字連結）加 label／值定義清單呈現。viewport 寬度小於 768px 時，導覽 MUST 改為頂部水平捲動列，頁面 MUST NOT 水平溢出。

**(2) URL 與未儲存確認**。目前區塊 MUST 依 FR-019 同步至網址 `section` 參數並於重新整理後還原。區塊處於有未儲存變更的編輯狀態時，切換區塊或切換分頁 MUST 先經確認對話框（`modal-focus.js`）；使用者取消時 MUST 留在原區塊且網址不變。

**(3) 標記設定**。Code 模式 MUST 保留明確的套用動作：按鈕標籤為「套用」，僅負責將 Code 解析結果回填至 Visual 設定（Code→Visual），其行為與 `task-new` 的 Code 回填一致（`task-management/013-task-new` FR-003k 之 Code 回填驗證與 AC-2.25 之「保留最後一份有效 config」）；唯一的送出入口 MUST 是區塊標題列的「儲存」，Code 面板 MUST NOT 再提供自己的儲存按鈕。解析錯誤時 MUST 沿用 `codeErrorBar` 顯示錯誤、停用「套用」，並保留最後一份有效設定。檢視狀態標籤「設定檔版本」MUST 改為「設定檔」，值仍為使用者上傳的 config 檔名（未上傳時為空字串）。

**(4) 抽樣設定**。檢視狀態 MUST NOT 再顯示「試標回合」「目前判定」「已用試標 / 可進正式」三列（已於概覽顯示）；仍須顯示每回合抽樣筆數、逐輸出類型 IAA 指標清單（含目標門檻）、最少標記者數、資料隔離狀態與隔離異動資訊；編輯表單與驗證規則不變。

**(5) 權限**。`project_leader` 在 `task_status = draft` 時可編輯各區塊（沿用既有進入編輯條件）。`reviewer` 可檢視設定分頁但為唯讀：所有區塊 MUST NOT 出現「編輯」連結，也 MUST NOT 能進入編輯狀態（承 FR-006 的精神）。

**(6) 視覺規則**。區塊 MUST 呈現於白色卡片（`--color-white` 底、1px `--color-border` 外框、`--radius-lg` 圓角），檢視與編輯狀態外觀一致；區塊 MUST NOT 使用 pill 徽章、彩色提示框、eyebrow 小標、emoji 或陰影；僅使用 `tokens.css` token，深色模式 MUST 正常。

#### Scenario: 五個區塊可切換且網址同步

- **GIVEN** `project_leader` 開啟設定分頁
- **WHEN** 依序點選左側導覽的五個區塊
- **THEN** 右側一次只顯示被選取的區塊，網址 `section` 參數隨之更新
- **AND** 重新整理後停留在同一區塊

#### Scenario: 未儲存變更時切換區塊需確認

- **GIVEN** `project_leader` 正在編輯「基本資料」並有未儲存變更
- **WHEN** 點選導覽的「抽樣設定」
- **THEN** 出現確認對話框；取消後仍停留在「基本資料」且網址 `section` 不變
- **AND** 確認放棄後才切換區塊

#### Scenario: Code 套用只回填 Visual 而不送出

- **GIVEN** `project_leader` 在「標記設定」編輯狀態切換到 Code 模式並修改合法的 YAML
- **WHEN** 點擊「套用」
- **THEN** Visual 設定更新為 Code 的解析結果，但尚未寫入任務設定
- **AND** 只有點擊區塊標題列的「儲存」才送出，Code 面板內沒有另一個儲存按鈕

#### Scenario: Code 解析錯誤時停用套用並保留有效設定

- **GIVEN** Code 模式的內容含有語法或 schema 錯誤
- **WHEN** 檢視 Code 面板
- **THEN** `codeErrorBar` 顯示錯誤，「套用」為停用
- **AND** Visual 設定維持最後一份有效 config

#### Scenario: 設定檔標籤改名

- **GIVEN** 使用者檢視「標記設定」區塊的檢視狀態
- **WHEN** 閱讀固定欄位
- **THEN** 欄位標籤為「設定檔」而非「設定檔版本」，值為上傳的 config 檔名

#### Scenario: 抽樣設定檢視不再重複概覽資訊

- **GIVEN** 使用者檢視「抽樣設定」區塊的檢視狀態
- **WHEN** 閱讀欄位列表
- **THEN** 不存在「試標回合」「目前判定」「已用試標 / 可進正式」三列
- **AND** 仍顯示抽樣筆數、IAA 指標與門檻、最少標記者數、資料隔離狀態與隔離異動

#### Scenario: reviewer 檢視設定分頁為唯讀

- **GIVEN** `task_role = reviewer`
- **WHEN** 開啟設定分頁並逐一切換五個區塊
- **THEN** 內容可見，但任何區塊都沒有「編輯」連結
- **AND** 無法進入編輯狀態

#### Scenario: 窄螢幕設定導覽改為水平捲動列

- **GIVEN** viewport 寬度為 375px
- **WHEN** 開啟設定分頁
- **THEN** 區塊導覽位於內容上方並可水平捲動，頁面本身沒有水平溢出

### Requirement: FR-027 概覽分頁沿用原區塊樣式並精簡內容

`概覽` 分頁 MUST 沿用原「任務狀態與執行控制」區塊的視覺樣式，使其與其他頁面一致（2026-10-08 維護者裁定：外觀還原、內容留新版），由上而下依序呈現：流程 stepper（SC-019）、判定框、數字卡、樣本池分配、達標條件與主要 CTA、試標回合表；MUST NOT 再包含已移至設定分頁的五個設定區塊。

**(1) 視覺樣式**。區塊外層為白色卡片容器；判定標題與說明置於原判定框；數字以原摘要卡樣式呈現；樣本池分配沿用原分配條與圖例 chip；達標條件沿用原 pill 呈現。所有顏色 MUST 取自 design token。

**(2) 數字卡**。四張：目前回合、最新 IAA、已用試標、正式標記池，值使用等寬數字（`tabular-nums`）。「已用試標」的值為「已用試標筆數 / 資料總筆數」（例如 `20 / 100`）。**刻意移除**原摘要卡中的「已完成試標回合」；其資訊由標頭狀態文字與試標回合表承擔。

**(3) 樣本池分配**。沿用 `dataSplitBar` 資料；配色規則沿用 FR-010p，MUST NOT 變更。

**(4) 達標條件與主要 CTA**。達標條件 pill 與主要 CTA 位於同一橫列，CTA 在右側（desktop 右對齊，mobile 可換行但仍屬同一區塊），沿用 `publishActionRow` 與既有防連點機制（issue #198）。主要 CTA MUST 使用全站 `btn-primary` 樣式（`--color-cta`，與 `MASTER.md` 一致）；同一狀態有多個執行按鈕時 MUST 只有一個主要 CTA：`waiting_iaa_confirmation` 時為「開始正式標記」（`publishOfficialRunBtn`），其餘按鈕使用次要樣式。

**(5) 試標回合表**。試標回合歷程以表格呈現，欄位依序為回合、筆數、標記者、IAA、Std、結果、完成時間，每個回合一列；結果欄以文字色區分（通過 `--color-success`、未通過 `--color-error`）。每回合備註不在表格中顯示。`draft` 狀態 MUST NOT 顯示任何回合列。

**(6) 權限與狀態**。執行控制的狀態對應與權限（FR-013、`reviewer` 顯示 disabled 並附 tooltip「僅 project leader 可操作」）MUST 維持不變。

#### Scenario: 主要 CTA 與達標條件同列且為全站主要按鈕樣式

- **GIVEN** 任務處於 `waiting_iaa_confirmation`
- **WHEN** `project_leader` 開啟概覽分頁
- **THEN** 達標條件 pill 與執行按鈕位於同一橫列，按鈕在右側
- **AND** 只有「開始正式標記」使用 `--color-cta` 背景，其餘執行按鈕為次要樣式

#### Scenario: 數字卡四張且不含已完成試標回合

- **GIVEN** 任務已完成兩個試標回合
- **WHEN** 檢視數字卡
- **THEN** 僅有目前回合、最新 IAA、已用試標、正式標記池四張
- **AND** 「已用試標」顯示為「已用筆數 / 總筆數」
- **AND** 畫面上沒有「已完成試標回合」

#### Scenario: 試標回合以七欄表格呈現

- **GIVEN** 任務已有兩個試標回合
- **WHEN** 檢視試標回合表
- **THEN** 表頭為 回合／筆數／標記者／IAA／Std／結果／完成時間，每個回合一列
- **AND** 通過回合的結果文字為 `--color-success`，未通過為 `--color-error`

#### Scenario: reviewer 概覽的執行按鈕維持停用

- **GIVEN** `task_role = reviewer`
- **WHEN** 開啟概覽分頁
- **THEN** 執行按鈕為 disabled 並附 tooltip「僅 project leader 可操作」

## MODIFIED Requirements

### Requirement: FR-019 頁籤與清單檢視狀態的網址同步

`task-detail` MUST 讓「目前頁籤」與四個頁籤的清單控制項狀態在網址與畫面之間雙向同步，使任一畫面座標可經由複製網址被重現與分享（UX 慣例 `UXC-11`）。

**(1) 同步範圍**。MUST 納入下列檢視狀態，共 16 個查詢參數，每一項各對應一個網址查詢參數：

| 頁籤 | 檢視狀態 | 查詢參數 |
|------|---------|---------|
| （全頁） | 目前頁籤 | `tab` |
| `settings` | 目前設定區塊 | `section` |
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

`tab` 的合法值為六個頁籤 `overview`、`settings`、`member-management`、`annotation-progress`、`annotation-results`、`work-log`，預設 `overview`。`section` 的合法值為 `basic`、`labeling`、`guideline`、`sampling`、`review`（依序對應基本資料、標記設定、標記說明、抽樣設定、審核設定），預設 `basic`；`section` 為設定分頁專屬，與 `tab` 同屬頁籤層級參數，不套用 `ap_` / `ar_` / `mm_` / `wl_` 前綴規則，且 MUST NOT 與 `status` 爭用。

不在同步範圍內的頁內狀態（`overview` 的「執行控制」次級頁籤、匯出記錄對話框分頁、成員標記細項下鑽分頁）MUST NOT 寫入網址。

**(2) 寫回**。使用者變更上述任一狀態後，系統 MUST 以 `history.replaceState()` 更新網址，MUST NOT 使用 `pushState()`——篩選調整屬頁內行為，不得產生瀏覽歷史紀錄（既有條款：tab 切換為頁內行為，不觸發路由跳轉）。

寫回 MUST 在既有查詢參數之上增刪，MUST NOT 重建空白參數集：`task_id`、`task_role`／`role` 等既有路由參數 MUST 原樣保留。處於預設值的檢視狀態 MUST 自網址移除，使未經操作的頁面維持簡潔網址。設定分頁因未儲存變更確認而被使用者取消切換時，網址 MUST 維持原值（FR-026）。

**(3) 還原**。頁面載入時，系統 MUST 在首次渲染前讀取上述參數並套用；套用結果 MUST 與使用者親自操作到該狀態時的畫面完全一致，包含篩選控制項的選取值、清單內容與分頁列的目前頁。

**(4) 無效值回退**。每個參數 MUST 在套用前對照其合法值集合驗證——篩選值對照該篩選器目前提供的選項、頁碼須為正整數且不得超出該清單的總頁數。不合法者 MUST 靜默回退為該狀態的預設值並繼續渲染，MUST NOT 使清單呈現空白、拋出錯誤或阻斷頁面載入。合法值集合 MUST 由既有選項來源推導，MUST NOT 於網址解析處硬編第二份清單。

**(5) 角色邊界**。網址檢視狀態 MUST NOT 成為角色守門的旁路：`reviewer` 以任何參數組合直連 `member-management` 時，仍 MUST 依 FR-006 導回 `overview` 並提示無權限；導回後網址 MUST 一併改寫為實際呈現的頁籤，MUST NOT 留下與畫面不符的 `tab=member-management`。同理，被導回後不適用的頁籤參數 MUST 自網址移除，`tab` 不為 `settings` 時 `section` 亦 MUST 自網址移除。`reviewer` 直連 `tab=settings` 為合法，MUST NOT 被導回，但畫面 MUST 維持唯讀（FR-026）。

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

#### Scenario: 設定分頁區塊寫回並還原
- **GIVEN** `project_leader` 開啟 `/task-detail?task_id=T001`
- **WHEN** 切換至 `settings` 並選取「抽樣設定」區塊
- **THEN** 網址更新為含 `tab=settings` 與 `section=sampling`，`task_id=T001` 仍保留，瀏覽歷史未新增紀錄
- **AND** 重新整理或於新分頁開啟該網址後，畫面停在設定分頁的「抽樣設定」區塊

#### Scenario: 無效 section 靜默回退為基本資料
- **GIVEN** 網址帶有 `tab=settings&section=unknown`
- **WHEN** 使用者開啟該網址
- **THEN** 設定分頁正常渲染並顯示「基本資料」區塊，`section` 自網址移除

#### Scenario: 離開設定分頁時移除 section
- **GIVEN** 網址為 `tab=settings&section=review`
- **WHEN** 使用者切換到 `work-log`
- **THEN** 網址含 `tab=work-log` 且不再含 `section`

#### Scenario: AC-2.5 reviewer 直連受限頁籤時網址一併導正
- **GIVEN** `task_role = reviewer`
- **WHEN** 直接開啟帶 `tab=member-management&mm_page=2` 的 `task-detail` 網址
- **THEN** 系統依 FR-006 導回 `overview` 並提示無權限
- **AND** 網址改寫為對應 `overview` 的參數，不再含 `tab=member-management` 或 `mm_page`

### Requirement: FR-006 授權契約

- **FR-006**：只有 `reviewer` membership、沒有通過 `task.members.manage` 的 active `project_leader` membership 者，不可見 `member-management` tab；若以直連方式進入，系統必須導回 `overview` 並提示無權限。同時有兩種角色者只能經由實際有效的 leader membership 與矩陣格取得管理能力，不能由 reviewer role 本身推導。`reviewer` 可見 `settings` tab，但內容為唯讀，不出現「編輯」連結且無法進入編輯狀態（FR-026）。

#### Scenario: FR-006 主要驗收

- **GIVEN** 正式服務端收到本需求作用域內的請求
- **WHEN** 使用者執行本需求描述的操作
- **THEN** 單獨 reviewer 不能管理成員；多角色者須有效 leader 與格（FR-006）

#### Scenario: reviewer 可見設定分頁但無編輯入口

- **GIVEN** 使用者只有 `reviewer` membership
- **WHEN** 檢視分頁列並開啟 `settings`
- **THEN** 分頁列顯示 `settings` 而不顯示 `member-management`
- **AND** 設定分頁各區塊皆無「編輯」連結
