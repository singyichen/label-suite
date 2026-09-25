# Spec Delta

## ADDED Requirements

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
