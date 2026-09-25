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
2. `opts.taskRole` 為 `project_leader`、`annotator`，或未提供時，MUST 維持既有預設「標記作業」——與 specs/annotation/015-annotation-workspace/spec.md 的 FR-080 之 `crumbWorkAreaAnnotator` 文字一致。
3. 此解析 MUST 於 `sidebar.js` 內部完成（`renderSidebar()`／`mountSidebar()` 掛載當下），呼叫端頁面 MUST NOT 於掛載完成後另行以 `document.getElementById('navAnnotation').textContent = ...` 等 DOM 操作覆寫該節點之顯示文字。
4. 本條不改變 FR-002／FR-008／FR-008A 既有之 L0 項目清單、順序、導頁與 `task_type` query 契約，僅新增顯示文字之角色解析規則。

#### Scenario: AC-020.1 reviewer 任務角色下側欄與麵包屑首層一致讀作審核作業
- **GIVEN** 使用者以 `role=reviewer` 進入 `annotation-workspace`（如 `task_id=T001`、`sample_id=sent-001`、`run_type=dry_run`）
- **WHEN** 頁面完成掛載側欄
- **THEN** `#navAnnotation` 文字必須為「審核作業」
- **AND** 該文字必須與同頁入口麵包紙（specs/annotation/015-annotation-workspace/spec.md 的 FR-080）第一層連結文字一致
- **AND** 若停用或移除 `annotation-workspace.config.js` 內任何消費端覆寫邏輯，上述結果不得改變——即解析結果來自 `sidebar.js` 本身，而非頁面事後補寫

#### Scenario: AC-020.2 annotator 任務角色下維持既有預設標記作業
- **GIVEN** 使用者以 `role=annotator` 進入 `annotation-workspace`
- **WHEN** 頁面完成掛載側欄
- **THEN** `#navAnnotation` 文字必須為「標記作業」，與掛載前既有預設行為一致

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
