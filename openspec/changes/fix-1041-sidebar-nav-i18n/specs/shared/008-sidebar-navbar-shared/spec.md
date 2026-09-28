# Spec Delta

## ADDED Requirements

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

### Requirement: SC-014 六個 L0 標籤語言感知驗收門檻

任一語系（zh/en）、任一 `taskRole`（`reviewer` / `project_leader` / `annotator` / 未提供）組合下，直接呼叫 Shared Sidebar 掛載函式並切換語言，六個 L0 標籤之渲染文字 MUST 與 FR-021 定義之雙語對照表逐字一致，且語言切換後 MUST 立即反映新語系，不需重新掛載或重新整理頁面；消費頁面之自有覆寫程式碼（若尚未移除）MUST NOT 導致該頁渲染結果偏離本條門檻。

#### Scenario: AC-014.1 尚未移除覆寫之消費頁面渲染結果仍符合門檻
- **GIVEN** 一個尚保留自有 `applyLang` 覆寫邏輯的消費頁面（例如本 PR 群組範圍外、待後續 PR 群組移除覆寫之頁面）
- **WHEN** 該頁完成掛載並切換語言
- **THEN** 其六個標籤最終渲染文字仍必須與 FR-021 定義之雙語對照表逐字一致（覆寫值與元件解析值相同，不產生偏離）
