# Spec Delta

## MODIFIED Requirements

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

#### Scenario: project_leader 任務角色下讀作例外處置，與麵包屑首層一致（issue #1018 新增）
- **GIVEN** 使用者以 `role=project_leader` 進入 `annotation-workspace`（如 `task_id=T016`、`sample_id=ofm-05-final-exception`、`run_type=official_run`、`annotator_id=kioleemg12`）
- **WHEN** 頁面完成掛載側欄
- **THEN** `#navAnnotation` 文字必須為「例外處置」（en: `Exception Disposition`）
- **AND** 該文字必須與同頁入口麵包屑第一層連結文字（`crumbWorkAreaProjectLeader`）一致
- **AND** 若停用或移除 `annotation-workspace.config.js` 內任何消費端覆寫邏輯，上述結果不得改變——即解析結果來自 `sidebar.js` 本身，而非頁面事後補寫
- **AND** 同一 worktree 內其他 10 個未傳入 `opts.taskRole` 之 `mountSidebar()` 呼叫點，其 `#navAnnotation` 文字不得因本條修訂而改變
