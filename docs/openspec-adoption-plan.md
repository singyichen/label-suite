# OpenSpec 導入計畫（分階段）

> **狀態：ADR-033 已 Accepted，Open Questions 已裁示；Phase 1 治理條文改寫 PR 進行中。** 本文件是 [ADR-033](adr/033-openspec-change-workflow.md) 的落地路線圖。Phase 2 之後每一階段各自開 PR。
> **來源**：issue #294。

## 階段總覽

| Phase | 內容 | 產出 | 完成條件 |
|-------|------|------|----------|
| 1 | ADR 定案 + 治理文件修訂 | ADR-033、本計畫、CLAUDE.md／rules／STATUS.md 條文改寫 | ADR-033 Status 由 `Proposed` 改 `Accepted`；治理條文改寫 PR 合併 |
| 2 | OpenSpec 初始化與 config | `openspec/` 目錄、`openspec/config.yaml` | `openspec validate` 通過；`config.yaml` 的 `context`／`rules` 完整 |
| 3 | Spec Kit 分工收斂 | speckit 指令留任／退役落地、DoD 改寫 | 退役指令不再被任何治理文件或 skill 引用 |
| 4 | Pilot 驗證 | 一件完整 propose → apply → archive 迴圈 | 見下方「Pilot 驗收條件」 |

---

## Phase 1 — ADR 定案 + 治理文件修訂

**本 PR 涵蓋**：ADR-033（決策本體）與本計畫（路線圖）。

**本 PR 不涵蓋**：任何治理條文的實際改寫。下方「附錄：導入所需的條文改寫清單」只列出**將要**改什麼，不套用。

### 完成條件

1. ~~維護者核准 ADR-033，Status 由 `Proposed` 改為 `Accepted`。~~ 已完成（2026-08-24）。
2. 附錄清單逐項套用，作為一個獨立的 governance PR（憲章修訂類 PR 依 Principle X 免除檔案數上限，但仍須單一目的）。**進行中，見後續 PR。**
3. ~~未決問題（ADR-033 `Open Questions` 四項）全部有明確裁示。~~ 已完成（2026-08-24，裁示內容見 ADR-033 `Open Questions — Resolved`）。

---

## Phase 2 — OpenSpec 初始化與 config

**前置**：Phase 1 完成；Node.js ≥ 20.19.0（OpenSpec README 要求）。

### 步驟

1. 全域安裝 CLI（`pnpm add -g`，不動 repo lockfile，避免觸犯 `npm install` 禁令；此安裝路徑待 ADR-033 `Open Questions` 第 2 點裁示後確認）。
2. 執行 `openspec init`，產生 `openspec/` 與 `openspec/config.yaml`。
3. 填寫 `config.yaml`：
   - **`context`**：明示 propose 時的現況基準為 `specs/[module]/NNN-feature/spec.md`；`openspec/specs/` 為衍生視圖，衝突一律以 `specs/` 為準。
   - **`rules`**：
     - delta 必須引用穩定 FR/AC ID（`MODIFIED Requirement: FR-NNN` 形式）。
     - `proposal.md` frontmatter 必須寫明「對應 Spec: `specs/[module]/NNN-feature/spec.md`」。
     - 衍生視圖 capability 檔頭必須標注正典路徑與對應 FR/AC ID。
     - change 觸及 API contract 或 DB schema 時，`design.md` 轉必填並含契約定義（端點／schema／migration 影響）。
     - proposal／design 必須含憲章檢查段落（承接 plan-template 的 design-time principles 逐條檢查）。
     - 既有硬關卡：TDD 先寫失敗測試、PR ≤ 5 檔／≤ 300 行（測試除外）、驗證指令全綠。

**完成條件**：`openspec validate` 通過；`config.yaml` 的 `context` 與 `rules` 覆蓋上述全部條目；`openspec/specs/` 此時應為空（只有 archive 合併才能寫入）。

---

## Phase 3 — Spec Kit 分工收斂

**留任**：`/speckit.specify`、`/speckit.clarify`（作用對象為正典 `spec.md`）。

**退役**：`/speckit.plan`、`/speckit.tasks`、`/speckit.implement`。

**重新定位**：`/speckit.analyze`、`/speckit.checklist`（change 層由 OpenSpec 驗證接手、回寫層由 Source-Verify gate 接手）。

### 四項配套

1. **foundation-000 plan.md 例外保留**：`specs/foundation/000-foundation/plan.md` 為全案工程基準，保留為常設架構文件（或內容升格進 ADR／CLAUDE.md，取決於 ADR-033 `Open Questions` 第 3 點裁示），供所有 change 的 `design.md` 引用。`specs/account/001-login-email-password/plan.md` 於首個 login change 作為 `design.md` 參考素材，之後歸檔。
2. **憲章檢查閘門搬家**：`.specify/templates/plan-template.md` 的 design-time principles 檢查改由 `config.yaml` `rules` 要求，寫入 proposal／design。
3. **Definition of Done 改寫**：由「驗證指令全綠 + `/speckit.analyze` 零 findings」改為「OpenSpec change 驗證通過 + 回寫 Source-Verify 通過 + 驗證指令全綠」。
4. **STATUS.md 狀態機簡化**：移除 `plan-ready`、`tasks-ready` 兩態，新增 change 進行中的表示法。

**完成條件**：退役指令不再被 CLAUDE.md、`.claude/rules/`、`.claude/skills/sdd-workflow/SKILL.md`、`AGENTS.md`、`.claude/agents/team-lead.md` 或任何 `.specify/templates/` 引用為必經階段。

---

## Phase 4 — Pilot

**對象**：foundation-000，或一件小型規格細調（二選一，見 ADR-033 `Open Questions` 第 4 點）。

**流程**：完整跑一輪 propose → apply → archive，含衍生視圖自動合併與回寫 `specs/`。

### Pilot 驗收條件

- [ ] change 資料夾產出完整（`proposal.md` 含對應 Spec frontmatter、`tasks.md`、必要時 `design.md`、`specs/` delta）。
- [ ] delta 全部引用既有 FR/AC ID，且每個 ID 都能在正典 `spec.md` 中被 `grep` 找到（Source-Verify gate）。
- [ ] apply 階段遵守 TDD：先有失敗測試，實作後全部驗證指令 exit 0。
- [ ] archive 後 `specs/[module]/NNN-feature/spec.md` 已 bump 版本並新增 Changelog 條目。
- [ ] archive 後 `openspec/specs/` 產出的 capability 檔頭已標注正典路徑與 FR/AC ID。
- [ ] **漂移抽查**：衍生視圖 capability 與正典 `spec.md` 逐 FR ID 對照無矛盾，且衍生視圖中不殘留 `## ADDED Requirements` 之類的 delta 標題（duty-mate 觀察到的失敗模式）。
- [ ] PR 規模仍在 ≤ 5 檔／≤ 300 行（測試除外）之內，或有正當拆分。

### Pilot 後檢討

依上述結果決定：全面採用 · 調整規則 · 或退回 ADR-033 的 Option D（不啟用 `openspec/specs/` 衍生視圖）。無論何者，`specs/` 的真值皆不受影響。

---

## 附錄：導入所需的條文改寫清單（**本 PR 不套用**）

以下為 Phase 1 第 2 步要送出的 governance PR 內容清單。每列指出檔案、區段、以及改寫方向。

### CLAUDE.md

| 區段 | 現況 | 改寫方向 |
|------|------|----------|
| `## Spec-Driven Development (SDD)` 的 pipeline 圖 | 含 `/speckit.plan → /speckit.tasks → /speckit.implement → /speckit.analyze → /speckit.checklist` | 改為 `/speckit.specify → /speckit.clarify` 之後轉入 OpenSpec propose → apply → archive → `/pr-flow` |
| `**Pre-PR gate (REQUIRED)**: /speckit.analyze must report zero findings before every PR.` | Spec Kit 專屬閘門 | 改為 change 層 OpenSpec 驗證 + 回寫 Source-Verify gate |
| `**Modify Existing Feature**` 五步流程 | archive 撈回 → 開分支 → bump 版本 → 從 `/speckit.clarify` 重跑 → 再封存 | 改為：以 OpenSpec change 承載細調；正典 spec 留在 `specs/`（或依需要撈回），archive 時回寫 bump + Changelog |
| `**Lightweight Path**` | 定義輕量路徑與其條件 | 檢視是否被 OpenSpec 迴圈取代；若保留，須說明與 change 流程的分界（建議：無需求變更的純 bug fix 仍走 Lightweight） |
| `Definition of Done: all commands above exit 0 + /speckit.analyze reports zero findings.` | 引用退役指令 | 改為「驗證指令全綠 + OpenSpec change 驗證通過 + 回寫 Source-Verify 通過」 |
| `## Three-Layer Sprint Architecture` 末尾的 `> SDD mapping:` | Planner ≈ specify→plan→tasks · Generator ≈ implement · Evaluator ≈ analyze→checklist | 重新對應：Planner ≈ specify／clarify + OpenSpec propose · Generator ≈ OpenSpec apply · Evaluator ≈ 驗證指令 + 回寫 Source-Verify |
| `## Prohibitions` 的 `❌ pip install 或 npm install` | 針對 lockfile 分歧 | 視 `Open Questions` 第 2 點裁示，補注全域安裝（`pnpm add -g`）不在禁令範圍 |
| 新增 | — | 於 SDD 段落加入 ADR-033 連結與「回寫是硬關卡」一句 |

### `.claude/rules/`

| 檔案 | 改寫方向 |
|------|----------|
| `git-workflow.md` | 於「What counts as one purpose」補一列：一個 OpenSpec change = 一個目的；並在 PR 檢查點加入「requirement 有變動則正典 `spec.md` 必須同 PR 更新」 |
| `general.md` | 無需改寫（不涉及 SDD 階段）；僅在確認無衝突後留原樣 |

### `specs/STATUS.md`

| 區段 | 改寫方向 |
|------|----------|
| `## 狀態說明` 表 | 移除 `plan-ready`、`tasks-ready` 兩列；新增 change 進行中的狀態（例如 `change-open`）並定義其進入／離開條件 |
| 表頭說明的「更新規則」 | 補上 change 開啟與 archive 回寫時的更新時機 |
| 現有 `plan-ready` 資料列 | `foundation-000` 與 `account-001` 目前為 `plan-ready`，須隨狀態機簡化改標 |

### 其他受影響檔案（需一併檢查，非全部需改）

- `specs/_governance/constitution.md`：Principle I 提及 `plan.md` 的 `## 功能目標` 與 `tasks.md` 的 `**故事目標**`；Governance 段的 **Feature Goal Alignment Gate** 與 **Compliance Review** 均引用 `/speckit.analyze`。憲章修訂須依其 Amendment Procedure 同步 `.specify/memory/constitution.md` 快取。
- `specs/_governance/testing-constitution.md` 及其 `.specify/memory/` 快取：同樣引用 `/speckit.analyze`。
- `.claude/skills/sdd-workflow/SKILL.md`：完整 pipeline 描述需改寫。
- `AGENTS.md`、`.claude/agents/team-lead.md`、`.claude/commands/agent-team.md`、`.claude/templates/claude-progress.md`：引用退役階段。
- `.specify/templates/plan-template.md`、`tasks-template.md`、`checklist-template.md`：plan／tasks 退役後的處置（保留為 foundation 例外用，或標為 deprecated）。

> 這批檔案數量遠超 5 檔上限，屬憲章 Principle X 明列的 governance PR 例外（「Governance PRs that propagate a constitution amendment (source + caches + templates + commands) are exempt from the file count limit」）；但仍須維持單一目的，且所有傳播檔案放在同一個 PR 內以避免暫時性不一致。
