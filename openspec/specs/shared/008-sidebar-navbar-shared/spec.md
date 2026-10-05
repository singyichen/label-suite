# shared/008-sidebar-navbar-shared Specification

## Purpose
`shared/008-sidebar-navbar-shared` 的 derived capability delta；正典為 `specs/shared/008-sidebar-navbar-shared/spec.md` v1.4.4。本變更（issue #725）新增正典使用者故事 8、FR-019 群與 SC-012 群，讓 `super_admin` 可直接由側欄「系統管理」次選單到達 `role-settings`，不需先落地 `user-management`；不修改既有 FR-002／FR-003A／FR-006／FR-007／SC-003 之 L0 導覽項清單、順序、計數與 active 映射契約。

## Requirements

### Requirement: FR-019 系統管理次選單快速直達

本需求對應正典 FR-019 群（issue #725）。Desktop（`> MOBILE_BP`）且 Sidebar 未收合（未套用 `SIDEBAR_COLLAPSED_WIDTH`）時，L0「系統管理」項目 MUST 提供可展開次選單，內容恰為「使用者管理」（→ `user-management`）與「角色設定」（→ `role-settings`）兩個子項連結；次選單子項不計入既有 FR-002／FR-003A 之 L0 導覽項清單與計數，`.navbar-center .nav-link` 選擇器命中數維持 `user`=5／`super_admin`=6 不變。

#### Scenario: SC-012 次選單開關與直達導頁
- **GIVEN** `system_role = super_admin`，viewport `1440x900`（`> MOBILE_BP`）且 Sidebar 未收合，位於任一 `SUPPORTED_PAGES`
- **WHEN** 點擊 L0「系統管理」
- **THEN** 觸發項 `aria-expanded` 由 `false` 變為 `true`，顯示次選單，內容包含「使用者管理」與「角色設定」兩個子項連結，且 `.navbar-center .nav-link` 命中數維持 `6`
- **AND** 點擊「角色設定」子項後，直接導向 `role-settings.html`，不經過 `user-management.html`

### Requirement: FR-019A 次選單觸發與關閉語意

觸發方式為點擊「系統管理」；再次點擊觸發項、點擊選單外任一處，或按 `Esc`，MUST 關閉次選單。

#### Scenario: FR-019A 點擊外部與 Esc 關閉次選單
- **GIVEN** 次選單已開啟
- **WHEN** 點擊次選單以外的頁面區域，或按 `Esc`
- **THEN** 次選單關閉，觸發項 `aria-expanded` 回到 `false`

### Requirement: FR-019B 次選單可存取屬性

觸發項 MUST 帶 `aria-haspopup="true"` 與正確同步的 `aria-expanded` 狀態；次選單容器 MUST 使用 `role="menu"`，子項 MUST 使用 `role="menuitem"`。

#### Scenario: FR-019B 觸發項與容器帶正確 ARIA 語意
- **GIVEN** 次選單存在於任一 `SUPPORTED_PAGES` 的 Sidebar
- **WHEN** 檢視觸發項與次選單 DOM
- **THEN** 觸發項恰帶 `aria-haspopup="true"` 與同步的 `aria-expanded`；次選單容器 `role="menu"`；兩個子項各自 `role="menuitem"`

### Requirement: FR-019C 目前子項標示

次選單子項 MUST 依目前頁面（`user-management` 或 `role-settings`）標示恰一個「目前項」（`aria-current="page"` 與對應樣式）；此標示與既有 L0「系統管理」active 狀態（FR-006）為互補關係，不互斥、不重複渲染兩種語意。

#### Scenario: FR-019C 目前子項標示與 L0 active 互補
- **GIVEN** `super_admin` 位於 `role-settings.html`
- **WHEN** 展開「系統管理」次選單
- **THEN** 「角色設定」子項帶 `aria-current="page"` 且「使用者管理」子項不帶；L0「系統管理」觸發項仍依既有 FR-006／FR-007 顯示 active 樣式與 `aria-current="page"`
- **AND** 改為位於 `user-management.html` 並展開次選單時，「使用者管理」子項帶 `aria-current="page"` 且「角色設定」子項不帶

### Requirement: FR-019D 受限版面 fallback

Mobile（`<= MOBILE_BP`）或 Desktop Sidebar 收合（`SIDEBAR_COLLAPSED_WIDTH`）狀態下，「系統管理」MUST 維持既有行為——點擊直接導向 `user-management`，不開啟次選單，與本次變更前互動路徑完全一致。

#### Scenario: FR-019D／SC-012B Mobile 與 Desktop 收合狀態維持既有單一連結行為
- **GIVEN** viewport `<= MOBILE_BP`，或 Desktop Sidebar 已收合為 `SIDEBAR_COLLAPSED_WIDTH`
- **WHEN** 點擊「系統管理」
- **THEN** 直接導向 `user-management.html`，不開啟次選單，與本次變更前行為一致

### Requirement: FR-019E 既有 admin-tabs 入口不變

本次新增為 `user-management.html` 既有 admin-tabs（使用者管理／角色設定，spec 006 FR-010、spec 007 FR-006）導覽之外的**額外**直達入口；MUST NOT 移除或改變 admin-tabs 既有行為與導頁契約。

#### Scenario: FR-019E user-management.html 既有 admin-tabs 入口不受影響
- **GIVEN** `super_admin` 位於 `user-management.html`
- **WHEN** 不透過側欄次選單、直接點擊頁內既有 admin-tabs 的「角色設定」
- **THEN** 導向 `role-settings.html`，既有 tabs 導頁契約（spec 006 FR-010、spec 007 FR-006）不變

### Requirement: L0 群組與目標頁（IA Contract）— Admin 條目補註

本需求為 derived view 首次收錄本條目說明（canonical `specs/shared/008-sidebar-navbar-shared/spec.md` 既有「L0 群組與目標頁（IA Contract）」小節之既有 FR-002／FR-003A／FR-006／FR-007／SC-003 文字 MUST 逐字不變，本條目只在該小節新增一句備註，不重寫既有內容）：Admin 群組（`系統管理` → `user-management`，僅 `super_admin` 可見）在 Desktop 未收合狀態下另提供次選單直達 `role-settings`（見 FR-019 群），次選單子項 MUST NOT 計入既有 L0 清單與計數。

#### Scenario: SC-012A 新增次選單不改變既有 L0 計數與清單
- **GIVEN** `system_role = super_admin`，Desktop 未收合
- **WHEN** 依既有 FR-003A 檢查 L0 可見項目數
- **THEN** 可見數仍為 `6`（`儀表板 / 任務管理 / 標記作業 / 資料集分析 / 系統管理 / 個人設定`），次選單展開與否皆不改變此計數

### Requirement: FR-020 `navAnnotation` 標籤依任務角色解析

Shared Sidebar 之 `navItems`（`design/prototype/pages/shared/sidebar.js`）的 `annotation` 項目（DOM id `navAnnotation`），其顯示文字 MUST 依呼叫端傳入的任務角色（`opts.taskRole`，值域對齊既有「任務角色」定義：`project_leader / reviewer / annotator`）於 `renderSidebar()` 掛載當下解析：

1. `opts.taskRole === 'reviewer'` 時，MUST 顯示「審核作業」（en: `Review`）——與 specs/annotation/015-annotation-workspace/spec.md 的 **FR-080** 入口麵包屑第一層之 `crumbWorkAreaReviewer` 文字一致。
2. `opts.taskRole === 'project_leader'` 時，MUST 顯示「例外處置」（en: `Exception Disposition`）——與同一畫面入口麵包屑第一層之 `crumbWorkAreaProjectLeader` 文字一致（issue #994／PR #1017）。**本項為 issue #1018 修訂**：原判定（維持「標記作業」）之依據——與 `crumbWorkAreaAnnotator` 文字一致——已因 #994／PR #1017 讓同一畫面之麵包屑首層改用 `crumbWorkAreaProjectLeader` 而失效。
3. `opts.taskRole` 為 `annotator`，或未提供時，MUST 維持既有預設「標記作業」——與 specs/annotation/015-annotation-workspace/spec.md 的 FR-080 之 `crumbWorkAreaAnnotator` 文字一致。
4. 此解析 MUST 於 `sidebar.js` 內部完成（`renderSidebar()`／`mountSidebar()` 掛載當下），呼叫端頁面 MUST NOT 於掛載完成後另行以 `document.getElementById('navAnnotation').textContent = ...` 等 DOM 操作覆寫該節點之顯示文字。
5. 本條不改變 FR-002／FR-008／FR-008A 既有之 L0 項目清單、順序、導頁與 `task_type` query 契約，僅新增／調整顯示文字之角色解析規則。

#### Scenario: AC-020.1 reviewer 任務角色下側欄與麵包屑首層一致讀作審核作業
- **GIVEN** 使用者以 `role=reviewer` 進入 `annotation-workspace`（如 `task_id=T001`、`sample_id=sent-001`、`run_type=dry_run`）
- **WHEN** 頁面完成掛載側欄
- **THEN** `#navAnnotation` 文字必須為「審核作業」
- **AND** 該文字必須與同頁入口麵包屑（specs/annotation/015-annotation-workspace/spec.md 的 FR-080）第一層連結文字一致
- **AND** 若停用或移除 `annotation-workspace.config.js` 內任何消費端覆寫邏輯，上述結果不得改變——即解析結果來自 `sidebar.js` 本身，而非頁面事後補寫

#### Scenario: AC-020.2 annotator 任務角色下維持既有預設標記作業
- **GIVEN** 使用者以 `role=annotator` 進入 `annotation-workspace`
- **WHEN** 頁面完成掛載側欄
- **THEN** `#navAnnotation` 文字必須為「標記作業」，與掛載前既有預設行為一致

#### Scenario: AC-020.3 project_leader 任務角色下讀作例外處置，與麵包屑首層一致（issue #1018 新增）
- **GIVEN** 使用者以 `role=project_leader` 進入 `annotation-workspace`（如 `task_id=T016`、`sample_id=ofm-05-final-exception`、`run_type=official_run`、`annotator_id=kioleemg12`）
- **WHEN** 頁面完成掛載側欄
- **THEN** `#navAnnotation` 文字必須為「例外處置」（en: `Exception Disposition`）
- **AND** 該文字必須與同頁入口麵包屑第一層連結文字（`crumbWorkAreaProjectLeader`）一致
- **AND** 若停用或移除 `annotation-workspace.config.js` 內任何消費端覆寫邏輯，上述結果不得改變——即解析結果來自 `sidebar.js` 本身，而非頁面事後補寫
- **AND** 其餘未傳入 `opts.taskRole` 的 `mountSidebar()` 呼叫點，其 `#navAnnotation` 文字不得因本條修訂而改變

### Requirement: FR-020A `roleIndicator` 角色標示依任務角色解析

Shared Sidebar 使用者晶片之角色標示（DOM id `roleIndicator`），於呼叫端未透過既有 `opts.roleIndicator` 顯式覆寫時（例如系統管理頁固定顯示「系統管理員」等既有頁面專屬用途，不受本條影響、行為不變），其預設顯示文字 MUST 依 `opts.taskRole`（定義同 FR-020）於掛載當下解析：

1. `opts.taskRole === 'reviewer'` 時，MUST 顯示「審核員」（en: `Reviewer`）。
2. `opts.taskRole === 'project_leader'` 時，MUST 顯示「專案負責人」（en: `Project leader`）。
3. `opts.taskRole` 為 `annotator` 或未提供時，MUST 維持既有預設「一般使用者」。
4. 此解析 MUST 於 `sidebar.js` 內部完成，呼叫端頁面 MUST NOT 於掛載完成後另行以 DOM 操作覆寫該節點之顯示文字；既有 `opts.roleIndicator`／`updateUserChip({ roleLabel })` 顯式覆寫管道之優先序與既有行為 MUST NOT 改變。

#### Scenario: AC-020A.1 reviewer 任務角色下角色標示讀作審核員
- **GIVEN** 使用者以 `role=reviewer` 進入 `annotation-workspace`（未帶任何 `opts.roleIndicator` 顯式覆寫）
- **WHEN** 頁面完成掛載側欄
- **THEN** `[data-testid="role-indicator"]` 文字必須為「審核員」
- **AND** 若停用或移除 `annotation-workspace.config.js` 內任何消費端覆寫邏輯，上述結果不得改變

#### Scenario: AC-020A.2 annotator 任務角色下維持既有預設一般使用者
- **GIVEN** 使用者以 `role=annotator` 進入 `annotation-workspace`
- **WHEN** 頁面完成掛載側欄
- **THEN** `[data-testid="role-indicator"]` 文字必須為「一般使用者」，與掛載前既有預設行為一致

### Requirement: FR-021 六個 L0 導覽標籤全面語言感知並隨語言切換重新解析

Shared Sidebar 之 `navItems`（`design/prototype/pages/shared/sidebar.js`）六個 L0 項目（DOM id `navDashboard`／`navTaskManagement`／`navAnnotation`／`navDataset`／`navAdmin`／`navProfile`）之顯示文字：

1. MUST 於元件內部依語言（`readStoredLang()`／`applyGlobalLanguage()` 傳入之 `lang`）解析對應之雙語字面值：`navDashboard` → 「儀表板」/`Dashboard`；`navTaskManagement` → 「任務管理」/`Task Management`；`navDataset` → 「資料集分析」/`Dataset Analytics`；`navAdmin` → 「系統管理」/`System Administration`；`navProfile` → 「個人設定」/`Profile`。
2. `navAnnotation` 項之既有角色分流（FR-020）三個分支 MUST 各有對應英文字串：`reviewer` → 「審核作業」/`Review`；`project_leader` → 「例外處置」/`Exception Disposition`（皆為既有值，逐字不變）；`annotator` 或未提供 → 維持既有預設「標記作業」，並新增對應英文 `Annotation`。
3. 上述解析 MUST 不只於掛載當下（`mountSidebar()`／`renderSidebar()`）執行一次；每次呼叫 `applyGlobalLanguage(lang, options)` MUST 重新解析全部六個節點並更新其顯示文字，語言切換後立即反映新語系，不需重新掛載或重新整理頁面。
4. `navAnnotation` 之角色分流於語言切換時的重新解析，MUST 使用最近一次 `mountSidebar()` 呼叫傳入之 `opts.taskRole`（未呼叫過 `mountSidebar()` 傳入 `taskRole` 之頁面，維持既有預設「標記作業」/`Annotation`分支）。
5. 此解析 MUST 於 Shared Sidebar 元件內部完成；消費頁面 MUST NOT 於掛載完成後另行以 DOM 操作覆寫本條所列六個節點之顯示文字（重申 FR-020 既有覆寫禁令，明確適用範圍擴及全部六個 L0 標籤，不僅 `navAnnotation`）。
6. 本條不改變 FR-002／FR-003A／FR-008／FR-008A／FR-019 群既有之 L0 項目清單、順序、計數、導頁與 `task_type` query 契約，僅新增顯示文字之語言解析規則與重新解析時機。

#### Scenario: AC-021.1 annotation-list.html 之 annotator 角色於英文語系讀作 Annotation
- **GIVEN** 使用者以 `role=annotator`（或未帶 `role` 參數）進入 `annotation-list.html`，且語言設定為 `en`
- **WHEN** 頁面完成掛載側欄
- **THEN** `#navAnnotation` 文字必須為 `Annotation`，不得為未翻譯之「標記作業」

#### Scenario: AC-021.2 annotation-workspace.html 於 deep-link 英文語系下六個標籤全部為英文
- **GIVEN** 使用者已於其他頁面將語言設為 `en`（`localStorage.labelsuite.lang = 'en'`），且未曾在 `annotation-workspace.html` 上操作語言切換
- **WHEN** 使用者以該語言狀態 deep-link 進入 `annotation-workspace.html`
- **THEN** 六個 L0 標籤（`navDashboard`／`navTaskManagement`／`navAnnotation`／`navDataset`／`navAdmin`／`navProfile`）之渲染文字必須全部為英文（`Dashboard`／`Task Management`／依角色分流之英文值／`Dataset Analytics`／`System Administration`／`Profile`），不得出現任一中文標籤

#### Scenario: AC-021.3 語言切換後六個標籤立即重新解析，不需重新掛載
- **GIVEN** 使用者於任一已掛載 Shared Sidebar 之頁面，且六個標籤已依當前語言渲染完成
- **WHEN** 使用者點擊語言切換按鈕，觸發 `applyGlobalLanguage()`
- **THEN** 六個標籤之顯示文字必須立即更新為新語系之對應字面值，且不需重新整理頁面或重新呼叫 `mountSidebar()`

#### Scenario: AC-021.4 三個任務角色 × 兩種語言之 navAnnotation 組合逐一正確
- **GIVEN** 直接呼叫 Shared Sidebar 掛載函式，`opts.taskRole` 分別為 `reviewer`／`project_leader`／`annotator`（或未提供）
- **WHEN** 語言分別設為 `zh`／`en`
- **THEN** `#navAnnotation` 之渲染文字須逐一對應：`reviewer`→「審核作業」/`Review`；`project_leader`→「例外處置」/`Exception Disposition`；`annotator`或未提供→「標記作業」/`Annotation`

### Requirement: FR-022 關閉作用中頁籤焦點移動規則

共用 Sidebar 殼層掛載之工作頁籤列（行為定義見 `specs/shared/019-workspace-tabs/spec.md`），關閉作用中頁籤後，焦點 MUST 依下列規則移動：

1. 若被關閉之作用中頁籤並非最右側頁籤，焦點 MUST 移至其右鄰頁籤。
2. 若被關閉之作用中頁籤為最右側頁籤，焦點 MUST 移至其左鄰頁籤。
3. 若關閉後已無任何頁籤，則無頁籤可移焦，頁籤列呈現空狀態。
4. 此規則僅適用於**作用中**頁籤之關閉；關閉非作用中頁籤 MUST NOT 觸發任何焦點或導頁變化，僅更新頁籤列自身渲染（定義見 `specs/shared/019-workspace-tabs/spec.md` 既有行為，本條不重複）。

#### Scenario: AC-022.1 關閉中間或最左側作用中頁籤時焦點移至右鄰
- **GIVEN** 已開啟 3 個以上頁籤，目前作用中頁籤非最右側
- **WHEN** 使用者關閉該作用中頁籤
- **THEN** 焦點（系統導頁至該頁籤之網址）必須移至原本緊鄰其右側的頁籤

#### Scenario: AC-022.2 關閉最右側作用中頁籤時焦點移至左鄰
- **GIVEN** 已開啟 2 個以上頁籤，目前作用中頁籤為最右側
- **WHEN** 使用者關閉該作用中頁籤
- **THEN** 焦點必須移至原本緊鄰其左側的頁籤

### Requirement: FR-016H 快捷鍵總覽新增頁籤 section

Desktop 快捷鍵總覽 modal（本規格 `specs/shared/008-sidebar-navbar-shared/spec.md` 既有 FR-016 群入口與顯示規則）MUST 提供一個獨立的「頁籤」section，列出下列三個快捷鍵，各自獨立成列（依既有 FR-016E 不合併列規則）、各按鍵以獨立 keycap 呈現（依既有 FR-016C）、採既有緊湊視覺密度（依既有 FR-016F）：

1. `Alt+1…8`（切換至對應位置頁籤）。
2. `Alt+W`（關閉作用中頁籤）。
3. `Alt+Shift+T`（重開剛關閉的頁籤）。

前兩項快捷鍵之實際觸發行為、按鍵位置判斷方式（`event.code`），以及焦點位於可輸入元素時之抑制規則，MUST 由 `specs/shared/019-workspace-tabs/spec.md` FR-013／AC-5.1 至 AC-5.4 定義；第三項（重開剛關閉的頁籤）之觸發行為、按鍵位置判斷方式與輸入元素抑制規則，MUST 由 `specs/shared/019-workspace-tabs/spec.md` FR-024A／AC-024A.1／AC-024A.2 定義。本條僅規範快捷鍵總覽之顯示內容與格式，不重複定義任一快捷鍵之觸發行為。

#### Scenario: AC-016H.1 快捷鍵總覽顯示頁籤 section 兩列
- **GIVEN** viewport `> MOBILE_BP`，使用者開啟快捷鍵總覽（點擊 keyboard icon 或按 `?`）
- **WHEN** 檢視 modal 內容
- **THEN** 必須存在一個「頁籤」section，其中包含以下兩列：「切換至對應位置頁籤」（鍵位標示含 `ALT` 與代表 1 至 8 之鍵位）與「關閉作用中頁籤」（`ALT`＋`W` 兩個獨立 keycap）——本情境不斷言 section 列數上限，列數上限與第三列由 `AC-016H.3` 定義

#### Scenario: AC-016H.2 頁籤 section 隨語言切換同步翻譯
- **GIVEN** 快捷鍵總覽已開啟
- **WHEN** 使用者切換 zh/en
- **THEN** 「頁籤」section 標題與三列動作文字必須同步切換為對應語系，與既有「全域」「標記作業」「審核」三個 section 之既有語言切換行為一致

#### Scenario: AC-016H.3 頁籤 section 恰三列且重開快捷鍵列以三個獨立 keycap 呈現
- **GIVEN** 快捷鍵總覽之「頁籤」section 已顯示
- **WHEN** 計算該 section 之列數，並檢視「重開剛關閉的頁籤」該列
- **THEN** section 內恰三列（不多不少）；「重開剛關閉的頁籤」列之 `ALT`、`SHIFT`、`T` 三個按鍵標籤各自為獨立 DOM 元素，不得合併為單一文字字串，複合按鍵間距依既有 FR-016F 規則
