> 正典：`specs/task-management/014-task-detail/spec.md`（v3.0.1 → v3.1.0，**MINOR**）。本 delta 新增 FR-019，並對應新增 AC-1.8、AC-1.9、AC-2.5 與 SC-044；既有需求全部不變。issue #726。

## ADDED Requirements

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
