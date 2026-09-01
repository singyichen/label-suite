對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #600
基準版本: 4.61.0
目標版本: 4.62.0

## Why

工作區「歷程」頁籤的動作徽章與 `annotation-list` 的「最後動作」欄，目前直接把 `HISTORY_ACTIONS`（FR-086）常數值當畫面文案輸出，導致使用者在介面上看到 `submitted`、`adjudicated` 等英文代碼。依 CLAUDE.md「Communication」規則，使用者可見文案必須是繁體中文；但 FR-086 的資料契約（`action` 常數集合）本身必須維持英文、穩定不變，供事件產生與測試斷言使用。兩者目前耦合在同一個值上，因此需要新增一層與常數脫鉤的顯示標籤，讓資料契約與畫面文案各自獨立演進。

## What Changes

- 於 `annotation-history.js` 新增顯示標籤對照表 `ACTION_LABEL` 與查表函式 `actionLabelFor(action)`，與既有的 `BADGE_CLASS` 同一資料來源、同一模式（單一來源、無渲染端逐值硬編分支）；集合外舊值（如 `consensus`）由 `actionLabelFor()` 原樣回傳英文原值，不臆測中文譯名。
- 工作區「歷程」頁籤徽章（`annotation-workspace.config.js`）：可見文字改由 `actionLabelFor(event.action)` 產生；新增 `data-action` 屬性承載原始英文 `action` 值（此屬性目前不存在）。
- `annotation-list`「最後動作」摘要列（`annotation-list.html`）：可見文字改由 `actionLabelFor(s.action)` 產生；`data-action` 屬性維持原始英文值不變（既有契約）。
- 修訂 FR-016B、FR-086、FR-091 補充顯示層規定，修訂 AC-2.15、AC-2.16、AC-1.25 之判定基準（由「可見文字等於英文值」改為「`data-action` 屬性等於英文值、可見文字為對應中文標籤」），並修訂關鍵實體 `AnnotationHistoryItem` 之附註，說明顯示標籤不屬儲存欄位。
- 修正既有測試中以可見文字斷言 `action` 值的斷言，改為以 `data-action` 屬性斷言，避免斷言隨顯示文案語言變動而失效（詳見 `tasks.md`）。

不涉及 API 契約或資料庫 schema 變更；`HISTORY_ACTIONS` 常數集合本身不變、不新增、不移除。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `annotation/015-annotation-workspace`: FR-016B、FR-086、FR-091 新增顯示層規定（畫面可見文字改為繁體中文標籤，`data-action` 屬性維持英文原值）；AC-2.15、AC-2.16、AC-1.25 判定基準隨之修訂。

## Impact

- 正典：`specs/annotation/015-annotation-workspace/spec.md`（4.61.0 → 4.62.0，MINOR）
- 衍生檢視：`openspec/specs/annotation/015-annotation-workspace/spec.md`（僅於最終 PR 之 `/opsx:archive` 階段合併，本次 propose 不動）
- 原型程式（生產檔，3 個）：
  - `design/prototype/pages/shared/annotation-history.js`
  - `design/prototype/pages/annotation/annotation-workspace.config.js`
  - `design/prototype/pages/annotation/annotation-list.html`
- 測試（Playwright，`design/prototype/tests/annotation/`）：
  - `issue-578-history-actions.spec.ts`（既有斷言由可見文字改為 `data-action` 屬性）
  - `issue-578-history-snapshot-masking.spec.ts`（既有 `hasText` locator 改為 `data-action` 屬性 selector）
  - `issue-578-list-summary.spec.ts`（新增一則中文標籤可見文字斷言，鎖住新契約）
  - `issue-552-reject-reason-required.spec.ts`（僅確認不受影響，class selector 不涉及文字，無需修改）
- 不涉及後端、資料庫、API 契約。

## Constitution Check

- **II. Generalization-First（NON-NEGOTIABLE）**：`ACTION_LABEL` 與 `actionLabelFor()` 比照既有 `BADGE_CLASS`/`badgeClassFor()` 的單一資料來源模式，兩個顯示點（工作區徽章、清單摘要列）共用同一張表，不在各自渲染邏輯內硬編中文字串或逐值分支，符合「config-driven、無硬編任務邏輯」原則。
- **III. Data Fairness（NON-NEGOTIABLE）**：本次變動僅影響歷程動作的畫面呈現，不涉及測試集答案或標記資料，與資料公平性無關聯。
- **I（任務顆粒度）／X（PR 規模紀律）**：本次異動之生產檔為 3 個（`annotation-history.js`、`annotation-workspace.config.js`、`annotation-list.html`），超過 Lightweight Path 的 ≤2 檔門檻，故走完整 OpenSpec change flow；但遠低於 Principle X 的 5 檔／300 行上限（不計測試檔、`specs/**`、`openspec/**`），故不需拆成 stacked PR，單一 PR 即可交付。詳細判定與依據見 `tasks.md`。
- **XX（Code Comment Policy）**：新增之 `ACTION_LABEL` 對照表為自解釋資料結構，比照 `BADGE_CLASS` 現行寫法不額外加註解。
