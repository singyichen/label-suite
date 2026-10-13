# shared/019-workspace-tabs Specification

## Purpose
TBD - created by archiving change 1099-workspace-tabs-overview-menu. Update Purpose after archive.

## Requirements

### Requirement: FR-023 頁籤總覽選單（結構與觸發）

共用頁籤殼層 MUST 提供一個總覽選單元件，桌面版（`> MOBILE_BP`）與行動版（`<= MOBILE_BP`）共用同一個元件（D2）：

1. 觸發按鈕 MUST 顯示目前頁籤數 N；桌面版 MUST 位於頁籤列最右端，且不得隨頁籤列（`.workspace-tab-bar`）橫向捲動而移動。
2. 選單內容由上至下 MUST 依序為：篩選輸入框（placeholder 顯示目前頁籤數 N）、頁籤清單（每列含頁面種類圖示、標題、關閉按鈕（單行，無第二行次要說明）；作用中頁籤 MUST 有視覺標示）、底部「重開剛關閉的」與「全部關閉」兩個操作項。
3. 篩選輸入框之比對範圍 MUST 為頁籤標題與頁面種類名稱，不比對網址參數；比對 MUST 不分大小寫。
4. 選單開啟時，焦點 MUST 移至篩選輸入框；方向鍵上／下 MUST 在頁籤清單項目間移動反白／焦點（不觸發切換）；`Enter` MUST 切換至目前反白之頁籤並關閉選單；`Esc` MUST 關閉選單並將焦點還給觸發按鈕（`FR-020` 無障礙延伸）。

#### Scenario: AC-023.1 總覽選單顯示目前頁籤數並列出所有頁籤
- **GIVEN** 已開啟 N（1 ≤ N ≤ 8）個頁籤
- **WHEN** 使用者開啟總覽選單
- **THEN** 觸發按鈕與選單皆可觀察到數字 N，清單項目數等於 N，且作用中頁籤有獨立於其餘項目的視覺標示

#### Scenario: AC-023.2 桌面版觸發按鈕不隨頁籤列捲動
- **GIVEN** 桌面 viewport（`> MOBILE_BP`）且已開啟足夠多頁籤使頁籤列可橫向捲動
- **WHEN** 使用者捲動頁籤列
- **THEN** 總覽選單觸發按鈕之畫面位置不變，恆位於頁籤列最右端

#### Scenario: AC-023.3 篩選僅比對標題與頁面種類，不分大小寫
- **GIVEN** 選單已開啟，清單中有一個頁籤標題包含「Task」字樣、另一個頁籤之頁面種類名稱為「資料集分析」
- **WHEN** 使用者於篩選輸入框輸入「task」（小寫）
- **THEN** 僅標題或頁面種類名稱比對命中「task」（不分大小寫）的頁籤列保留顯示，其餘隱藏；比對不包含網址參數

#### Scenario: AC-023.4 選單開啟時焦點移至篩選輸入框
- **GIVEN** 總覽選單觸發按鈕已取得焦點
- **WHEN** 使用者開啟選單
- **THEN** 焦點立即移至篩選輸入框

#### Scenario: AC-023.5 方向鍵在清單項目間移動反白
- **GIVEN** 選單已開啟，清單含 2 個以上項目
- **WHEN** 使用者按下方向鍵下（或上）
- **THEN** 反白／焦點移至下一個（或上一個）清單項目，不觸發頁籤切換

#### Scenario: AC-023.6 Enter 切換至反白頁籤並關閉選單
- **GIVEN** 選單已開啟且某清單項目目前反白
- **WHEN** 使用者按下 `Enter`
- **THEN** 系統切換至該反白項目對應之頁籤，選單隨之關閉

#### Scenario: AC-023.7 Esc 關閉選單並還焦點給觸發按鈕
- **GIVEN** 選單已開啟
- **WHEN** 使用者按下 `Esc`
- **THEN** 選單關閉，焦點回到總覽選單觸發按鈕

### Requirement: FR-023A 總覽選單清單列點擊切換頁籤

點擊總覽選單清單中的任一列 MUST 依既有 `FR-017` 之 `history.replaceState()` 切換路徑切換至該頁籤，行為必須與點擊桌面頁籤列本身的對應頁籤一致；切換後選單 MUST 關閉。

#### Scenario: AC-023A.1 點擊清單列切換頁籤並關閉選單
- **GIVEN** 總覽選單已開啟且清單中含有一個非作用中頁籤項目
- **WHEN** 使用者點擊該項目
- **THEN** 系統切換至該頁籤（不產生瀏覽歷程記錄），且選單隨之關閉

### Requirement: FR-024 重開剛關閉的頁籤堆疊

共用頁籤殼層 MUST 維護一個重開堆疊（D3／D5）：

1. 手動關閉單一頁籤、執行「全部關閉」（`FR-025`）、`FR-011` 自動淘汰，三種情況皆 MUST 將被關閉／淘汰的頁籤資訊推入堆疊。
2. 堆疊 MUST 為後進先出（LIFO），上限 `TAB_REOPEN_CAP`（10）；超過上限時 MUST 丟棄最舊的一筆。
3. 總覽選單「重開剛關閉的」操作 MUST 彈出堆疊最新一筆並嘗試重開；依 `FR-006` 去重鍵對照表判定，若命中既有頁籤則僅切換至該頁籤並將該筆從堆疊移除，不得產生重複頁籤。
4. 重開動作本身 MUST 仍受 `TAB_CAP` 與 `FR-011` 淘汰／阻擋規則約束。
5. 堆疊為空時，「重開剛關閉的」操作項 MUST 停用。

#### Scenario: AC-024.1 手動關閉的頁籤可重開
- **GIVEN** 使用者手動關閉一個頁籤
- **WHEN** 使用者接著點擊總覽選單的「重開剛關閉的」
- **THEN** 該頁籤重新開啟，且其去重鍵與關閉前一致

#### Scenario: AC-024.2 連續重開依序還原（LIFO）
- **GIVEN** 使用者依序關閉頁籤 A、頁籤 B（B 後關閉）
- **WHEN** 使用者連續點擊「重開剛關閉的」兩次
- **THEN** 第一次重開頁籤 B，第二次重開頁籤 A

#### Scenario: AC-024.3 堆疊上限丟棄最舊一筆
- **GIVEN** 已累積 `TAB_REOPEN_CAP`（10）筆關閉紀錄
- **WHEN** 再關閉第 11 個頁籤
- **THEN** 堆疊中最舊的一筆（第 1 筆）被丟棄，其餘 10 筆（含新關閉者）保留

#### Scenario: AC-024.4 重開命中既有頁籤不產生重複
- **GIVEN** 堆疊中某筆對應之去重鍵，目前已有另一個開啟中的頁籤命中同一去重鍵
- **WHEN** 使用者執行重開
- **THEN** 系統切換至該既有頁籤，不新開頁籤，且該筆從堆疊移除

#### Scenario: AC-024.5 堆疊為空時重開操作停用
- **GIVEN** 重開堆疊目前為空
- **WHEN** 使用者開啟總覽選單
- **THEN** 「重開剛關閉的」操作項呈停用狀態，不可點擊

### Requirement: FR-024A 重開快捷鍵

Desktop 頁籤殼層 MUST 支援 `Alt+Shift+T` 快捷鍵觸發「重開剛關閉的」（`FR-024`）：

1. 判斷 MUST 使用 `event.code`（`KeyT`，搭配 `altKey`／`shiftKey`），且焦點位於可輸入元素（input、textarea、`contenteditable`）時不得攔截此按鍵。
2. 本快捷鍵 MUST NOT 攔截或覆寫瀏覽器原生 `Ctrl/⌘+Shift+T`（不同按鍵組合，功能互不相關，本條不要求、也不得嘗試攔截瀏覽器原生開新分頁快捷鍵）。
3. 觸發後行為 MUST 與點擊總覽選單的「重開剛關閉的」完全一致，包含堆疊為空時不動作。

#### Scenario: AC-024A.1 快捷鍵觸發重開
- **GIVEN** 重開堆疊非空，焦點不在任何可輸入元素
- **WHEN** 使用者按下 `Alt+Shift+T`
- **THEN** 系統執行與點擊「重開剛關閉的」相同的重開行為

#### Scenario: AC-024A.2 輸入框聚焦時不攔截
- **GIVEN** 焦點位於輸入框、文字區或 `contenteditable` 元素
- **WHEN** 使用者按下 `Alt+Shift+T`
- **THEN** 系統不執行重開，該元素原生輸入行為不受影響

### Requirement: FR-024B 重開快捷鍵列入快捷鍵總覽

`FR-024A` 定義之重開快捷鍵 MUST 列入 `shared-008` 之快捷鍵總覽（比照既有 `FR-013`／`FR-014` 分工模式：本規格僅宣告此事實存在，總覽本身之顯示格式、section 歸屬與語言切換由 `shared-008` MODIFIED 條文定義，本條不重複定義）。

#### Scenario: AC-024B.1 快捷鍵總覽包含重開快捷鍵列
- **GIVEN** Desktop 使用者開啟快捷鍵總覽（`shared-008` 既有入口）
- **WHEN** 檢視「頁籤」section
- **THEN** 必須存在對應重開快捷鍵的獨立一列，顯示 `Alt+Shift+T` 之獨立 keycap

### Requirement: FR-025 全部關閉

總覽選單 MUST 提供「全部關閉」操作（D4）：

1. 執行時 MUST 關閉所有目前無未儲存變更的頁籤，並跳過有未儲存變更的頁籤。
2. 若有頁籤被跳過，MUST 顯示提示訊息告知跳過的頁籤數量。
3. 不得另立第二套確認機制；此行為與既有 `FR-012` 之未儲存保護語意一致（全部關閉本身不彈出確認對話，僅跳過並提示，區別於使用者個別點擊單一頁籤關閉鈕時既有的未儲存確認對話）。
4. 所有被關閉的頁籤 MUST 依 `FR-024` 推入重開堆疊。
5. 若作用中頁籤被本操作關閉，焦點移動規則比照 `shared-008` `FR-022`（優先右鄰、否則左鄰）；若關閉後仍有被跳過（未儲存）的頁籤存在，焦點 MUST 落在其中一個被跳過的頁籤；若關閉後無任何頁籤殘留，頁籤列呈現空狀態。

#### Scenario: AC-025.1 全部關閉跳過有未儲存變更的頁籤並提示
- **GIVEN** 已開啟 5 個頁籤，其中 2 個有未儲存變更
- **WHEN** 使用者點擊「全部關閉」
- **THEN** 3 個無未儲存變更的頁籤被關閉，2 個有未儲存變更的頁籤保留，且畫面顯示提示「2 個頁籤有未儲存變更，未關閉」

#### Scenario: AC-025.2 全部關閉後被跳過的頁籤取得焦點
- **GIVEN** 承上一情境，作用中頁籤為被關閉的 3 個之一
- **WHEN** 全部關閉執行完成
- **THEN** 焦點（作用中頁籤）落在其中一個被跳過（仍保留）的頁籤，而非落在已不存在的頁籤上

#### Scenario: AC-025.3 全部關閉的頁籤皆可重開
- **GIVEN** 全部關閉已執行且有 N 個頁籤被關閉
- **WHEN** 使用者連續點擊「重開剛關閉的」N 次（N ≤ `TAB_REOPEN_CAP`）
- **THEN** N 個被關閉的頁籤依關閉順序的反序逐一重開

### Requirement: FR-002 行動版頁籤呈現

viewport `> MOBILE_BP` 時顯示桌面版頁籤列；`<= MOBILE_BP` 時頁籤列 MUST 由 `FR-023` 定義之共用總覽選單元件（行動版樣式）取代，而非舊版專屬之「已開啟 N 頁」下拉選單（Q11；本條與 `FR-023` 共同生效後，舊版行動下拉選單元件即廢止）。既有 AC-6.1～AC-6.3 之核心行為 MUST 保留：點擊清單項目切換頁籤並關閉選單、`375px` viewport 下頁面與選單皆不得出現水平捲動（`FR-015`）。

#### Scenario: AC-6.1-updated 行動版以共用總覽選單取代頁籤列
- **GIVEN** viewport `<= MOBILE_BP`
- **WHEN** 頁面載入完成
- **THEN** 頁籤列（`.workspace-tab-bar`）不顯示，改在頂部顯示 `FR-023` 定義之總覽選單觸發按鈕，顯示目前頁籤數 N

#### Scenario: AC-6.3-updated 375px 下總覽選單與整頁皆無水平捲動
- **GIVEN** viewport 為 375px，已開啟 8 個頁籤
- **WHEN** 展開行動版總覽選單
- **THEN** 頁面與選單皆不出現水平捲動（沿用既有 `FR-015`／`SC-012`）

### Requirement: FR-011 上限淘汰與未儲存保護

開啟頁籤已達 `TAB_CAP`（8）時，開啟第 9 個頁籤 MUST 先自動淘汰「最久未使用且無未儲存變更」的既有頁籤；若全部 8 個頁籤皆有未儲存變更，MUST 擋下開啟並提示使用者（Q4）。被自動淘汰的頁籤 MUST 依 `FR-024` 推入重開堆疊（D5），使其可透過總覽選單重開。

#### Scenario: AC-4.1-updated 自動淘汰的頁籤推入重開堆疊
- **GIVEN** 已開啟 `TAB_CAP`（8）個頁籤，且至少一個頁籤最久未使用且無未儲存變更
- **WHEN** 開啟第 9 個頁籤觸發自動淘汰
- **THEN** 被淘汰的頁籤出現在重開堆疊中，可透過總覽選單的「重開剛關閉的」重新開啟

### Requirement: FR-018 登出清空範圍

使用者登出時，系統 MUST 清空 `TAB_STORAGE_KEY`、`TAB_SCROLL_STORAGE_KEY` 與 `TAB_REOPEN_STORAGE_KEY` 的內容；下一位登入者的頁籤列與重開堆疊皆 MUST 從空白開始，不得顯示前一位使用者開過或關閉過的頁籤內容（Q22，範圍擴大納入重開堆疊）。

#### Scenario: AC-2.4-updated 登出清空重開堆疊
- **GIVEN** 使用者登出前重開堆疊中有未使用的紀錄
- **WHEN** 下一位使用者登入
- **THEN** 該使用者的總覽選單「重開剛關閉的」操作項呈停用狀態（堆疊為空），不顯示前一位使用者的任何頁籤紀錄

### Requirement: FR-010 頁籤標題組成（種類小標籤＋對象名稱）

頁籤標題 MUST 能分辨頁面種類與對象（如任務名稱），並 MUST 由「種類小標籤（kind chip）」與「對象名稱」兩部分組成：

1. **組成規則**：種類小標籤為獨立 DOM 節點（`.workspace-tab-kind`），名稱放在既有 `.workspace-tab-label`。各頁面種類的組成 MUST 如下表：

   | 頁面種類 | 種類小標籤（zh／en） | 對象名稱 |
   |---|---|---|
   | `dashboard`、`profile`、`task-list`、`task-new`、`annotation-list`、`dataset-analysis-list`、`user-management`、`role-settings` | 無 | 既有頁面種類名（不變） |
   | `annotation-workspace`（`annotate`） | 標記／Annotate | 任務名稱 |
   | `annotation-workspace`（`review`） | 審核／Review | 任務名稱 |
   | `task-detail`（無 `ap_stage`） | 詳情／Detail | 任務名稱 |
   | `task-detail`（`ap_stage=rN`） | 試標 RN／Dry Run RN | 任務名稱 |
   | `task-detail`（`ap_stage=official`） | 正式／Official | 任務名稱 |
   | `dataset-analysis-detail` | 分析／Analysis | 任務名稱（資料集以 `task_id` 定位，名稱經殼層以 `LabelSuiteTaskListData`（`task-list.data.js`）的 `nameZh`／`nameEn` 解析，與 `dataset-analysis-list.data.js` 同源 id 之名稱一致） |

2. **名稱解析**：任務名稱 MUST 依序回退——即時查詢（目前頁面的任務資料）→ 頁籤上的名稱快照 → 原始 `taskId`；英文介面取 `nameEn`，缺漏時回退 `nameZh`。名稱快照 MUST 對所有帶 `taskId` 的頁面種類寫入（不再僅限 `task-detail`）。去重鍵對照表（`FR-006`）MUST NOT 因本條改變，本條只影響顯示。
3. **純文字版標題**：`title` 屬性、關閉按鈕的 `aria-label`、總覽選單列（`FR-023`）與行動版選單 MUST 使用純文字版標題「小標籤＋空格＋名稱」（無小標籤的頁面種類即為頁面種類名），且 MUST NOT 渲染小標籤 DOM；總覽選單的篩選（`FR-023`）MUST 比對純文字版標題，因此輸入任務名稱亦能篩到對應的標記作業頁籤。名稱過長時 `.workspace-tab-label` MUST 以 `text-overflow: ellipsis` 截斷。
4. **階段與模式色彩（`TAB_STAGE_BADGE`）**：階段色 MUST 作用於種類小標籤而非整顆頁籤文字——試標（`dry_run`）小標籤用警示色語意 token、正式（`official_run`）用主色語意 token；`annotation-workspace` 的 `review` 模式用資訊色語意 token；其餘種類用中性色語意 token。頁籤本文 MUST 一律使用既有的非作用中／作用中文字色。色彩 MUST 取自語意 token，兩主題皆然，不得出現硬編碼色碼。

#### Scenario: AC-1.6-updated 試標與正式頁籤以小標籤色分辨階段
- **GIVEN** 一個 `task-detail` 頁籤處於 `ap_stage=r1`（試標）、另一個處於 `ap_stage=official`（正式）
- **WHEN** 檢視兩個頁籤的標題
- **THEN** 試標頁籤的種類小標籤顯示「試標 R1」並以警示色語意 token 著色，正式頁籤的小標籤顯示「正式」並以主色語意 token 著色，兩顆頁籤的名稱欄皆顯示任務名稱
- **AND** 兩顆頁籤的本文文字色一致，不隨階段改變

#### Scenario: 不同任務的標記作業頁籤可由名稱分辨
- **GIVEN** 同時開啟任務 T001 與 T002 的標記作業頁籤（`annotate` 模式）
- **WHEN** 檢視頁籤列
- **THEN** 兩顆頁籤分別顯示「標記」小標籤與各自的任務名稱，不再顯示同名

#### Scenario: 同一任務的標記與審核頁籤以小標籤分辨模式
- **GIVEN** 同一任務同時開啟 `annotate` 與 `review` 兩個標記作業頁籤
- **WHEN** 檢視頁籤列
- **THEN** 小標籤分別為「標記」與「審核」，名稱欄相同，且兩顆頁籤的去重行為仍符合 `FR-006`

#### Scenario: 任務詳情依階段顯示三種小標籤並使用語意 token 色
- **GIVEN** 三個 `task-detail` 頁籤，分別為 `ap_stage=r1`、`ap_stage=official` 與無 `ap_stage`
- **WHEN** 於淺色與深色兩種主題檢視小標籤的 computed style
- **THEN** 小標籤文字依序為「試標 R1」「正式」「詳情」，背景與文字色分別取自警示色、主色與中性色語意 token，不出現硬編碼色碼

#### Scenario: 資料集分析詳情頁籤與清單頁籤可區別
- **GIVEN** 已開啟資料集分析清單頁籤與某任務的資料集分析詳情頁籤
- **WHEN** 檢視頁籤列
- **THEN** 詳情頁籤顯示「分析」小標籤與任務名稱，清單頁籤只顯示「資料集分析」且無小標籤

#### Scenario: 純文字版標題用於 title、aria-label、總覽選單與篩選
- **GIVEN** 已開啟「標記」小標籤加任務名稱的標記作業頁籤
- **WHEN** 檢視該頁籤的 `title` 屬性與關閉按鈕 `aria-label`、開啟總覽選單並於篩選框輸入該任務名稱
- **THEN** `title` 與 `aria-label` 皆為「小標籤＋空格＋名稱」完整文字；總覽選單列與行動版選單顯示同一段純文字且不含小標籤 DOM；該頁籤被篩出
- **AND** 名稱超長時 `.workspace-tab-label` 以省略號截斷

#### Scenario: 英文介面的小標籤與名稱
- **GIVEN** 介面語言為 en
- **WHEN** 檢視各頁面種類的頁籤
- **THEN** 小標籤為 Annotate、Review、Detail、Dry Run RN、Official、Analysis，名稱取 `nameEn`，回退順序與 zh 相同
