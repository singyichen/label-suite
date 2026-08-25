# Label Suite SDD Workflow

> 本文件為 Label Suite 專案 SDD（Spec-Driven Development）流程的**繁體中文權威說明**，涵蓋從需求進入到封存的完整階段，以及實作階段（`/opsx:apply`）的微觀交付迴圈與各階段提示詞範例。
>
> 機器導向的操作細節（TDD 規則全文、prototype Playwright 測試規範、Lightweight Path 觸發條件、Skip SDD 判準）由 [.claude/skills/sdd-workflow/SKILL.md](../.claude/skills/sdd-workflow/SKILL.md) 提供；本文件是 SDD 階段編排、角色與交付時序的正典說明。兩者有衝突時，依下列權威矩陣裁決。
>
> 圖例：
> 🗣️ **手動**：需要使用者主動下提示詞觸發
> ⚙️ **自動**：由上一步自動串接，使用者不用動手
>
> 參考來源：本流程參考 duty-mate 專案 `docs/sdd-workflow.md` 的七階段架構調整而來，並依本專案既有規範裁示三項差異（2026-08-25）：**不新增獨立 sa/sd 設計階段**（分析歸 `spec.md`、技術設計歸 `design.md`）、**審查採 PR 群組層**（非 per-task）、**打勾權責在主 agent**。

---

## 0. 權威矩陣與衝突裁決

| 領域 | Canonical authority | Derived/consumer responsibility |
|------|---------------------|---------------------------------|
| 專案級原則、衝突裁決、修憲流程 | `specs/_governance/constitution.md` | `.specify/memory/constitution.md` 是完整同步的 tool cache；`AGENTS.md`、`CLAUDE.md` 只摘要並連回 source |
| Frontend/testing 細則 | `specs/_governance/frontend-constitution.md`、`specs/_governance/testing-constitution.md` | 對應 `.specify/memory/` 檔案是 agent-loading cache，不得改寫語意 |
| 功能需求、FR/AC/SC、功能目標 | `specs/[module]/NNN-feature/spec.md` | OpenSpec change specs 是 delta；`openspec/specs/` 是 archive 產生的 derived view |
| SDD 階段、角色、交付時序 | `docs/sdd-workflow.md` | `.claude/skills/sdd-workflow/SKILL.md` 提供機器操作導覽；`openspec/config.yaml` 只注入可執行規則 |
| TDD 與 task decomposition | `specs/_governance/testing-constitution.md` | workflow、templates、agent rules 與 OpenSpec config 必須引用並收斂到相同語意 |
| 已接受架構決策 | `docs/adr/*.md` 中 `Status: Accepted` 的 ADR | Proposed ADR 不改變現行規則；consumer 不得提前宣稱 supersession 已生效 |
| SDD 階段狀態 | `specs/STATUS.md` | branch、OpenSpec change 與 task progress 是 lint 的佐證，不是第二套狀態來源 |
| 設計元件規格 | `design/system/MASTER.md`，加上適用的 `design/system/pages/*.md` override | inventory、canvas 與 prototype 導覽是索引或 derived artifact，不得反向定義規格 |

衝突裁決只依此順序：main constitution → applicable domain constitution → Accepted ADR → canonical feature spec → `docs/sdd-workflow.md` for SDD orchestration → machine guidance and derived views。較低層的機器導向或 derived/cache 文件若發現衝突，必須**失敗並指向其正典來源**，不得自行覆蓋上游規則；Proposed ADR 不改變現行規則。

---

## 1. 角色總覽

```
┌ Commands / Skills（流程編排／品質閘，由使用者觸發）
│   /superpowers:brainstorm · /speckit.specify · /speckit.clarify
│   /label-suite-design（prototype）· /pencil-wireframe
│   /opsx:propose · /opsx:apply · /opsx:archive · /pr-flow
│
├ Subagents — 治理層
│   team-lead            多 agent sprint 協調、進度回報
│   senior-tech-lead     憲章遵循審查、跨切面技術決策
│
├ Subagents — 分析／設計層（非必經，大型 change 臨時支援）
│   senior-sa / senior-sd   系統分析／技術設計支援
│   senior-uiux             prototype QA（spec 還原度、design system、a11y）
│
├ Subagents — 實作層（tasks.md `[@agent-name]` 派工對象）
│   senior-backend · senior-dba · senior-frontend · senior-devops
│
└ Subagents — 品質層（Red task 與 PR 群組層審查）
    senior-code-reviewer   Code Review（架構／命名／憲章／design.md 符合度）
    senior-qa              獨立 Red test task；Scenario 驗收（對照 spec 的 WHEN/THEN 與 AC）
```

> **執行原則**：subagent 不能自行呼叫其他 subagent；所有跨 agent 的銜接皆由**主 agent**（與使用者對話的 Claude 主 session）依據 `tasks.md` 的派工標記驅動（規範落點：`openspec/config.yaml` 的 `rules.tasks` 與 `operations.apply.guidance`）。

---

## 2. 巨觀主流程

分析與設計**不另設獨立階段**：業務分析（Process Flow / User Flow）寫進正典 `spec.md`；技術設計（System Flow、API 契約、DB schema）寫進 change 的 `design.md`；UI 設計以可執行 prototype 取代文件式藍圖。

```
🗣️ [1] /superpowers:brainstorm
        需求釐清、2–3 個設計方案取捨、YAGNI
            │
            ↓
🗣️ [2] /speckit.specify <功能描述>
        產出 specs/[module]/NNN-feature/spec.md（唯一正典）
        含 § Process Flow（跨角色業務流程）與 § User Flow（畫面導覽）
        ⚙️ 更新 specs/STATUS.md → spec-ready
            │
            ↓
⚙️ [2a] Spec Lint
        檢查正典的目標、heading、ID、依賴與 STATUS 關聯；未來由 Project SDD lint
        實作可機械判斷的子集合，未通過不進入頁面設計
            │
            ↓
🗣️ [3] /label-suite-design（prototype）
        先產出可載入、不含目標互動的 static prototype shell
        ⚠ 產出前必讀 design/system/MASTER.md
            │
            ↓
⚙️ [3a] prototype Playwright Red tests
        `senior-qa` 先建立並提交預期失敗的測試證據；此時不得先加入目標 selector 或 behavior
            │
            ↓
⚙️ [3b] prototype Green behavior
        實作 agent 依 Red contract 加入 data-testid 與目標 behavior，測試轉綠後才重構
            │
            ↓
🗣️ [3c] page design
        完成 page design；可選用 /pencil-wireframe 與 senior-uiux prototype QA
        如暴露規格模糊點，可選用 /speckit.clarify 回寫正典 spec 後重走受影響的 Gate
            │
            ↓
⚙️ [3d] Frontend Ready Gate
        page-scoped feature 通過前不得進入 /opsx:propose（見下方 checklist）
            │
            ↓
🗣️ [5] /opsx:propose
        產出 openspec/changes/<change>/{proposal.md, specs/ delta, design.md, tasks.md}
        - 全部以繁體中文撰寫（硬性規範，僅專業用語保留英文）
        - proposal.md frontmatter 載明「對應 Spec: specs/[module]/NNN-feature/spec.md」
        - tasks.md 每個任務尾綴唯一 [@agent-name] 派工標籤 + 依賴／平行標記
        ⚙️ OpenSpec schema validation：openspec validate <change> --type change 須 exit 0
        ⚙️ Project SDD lint：檢查專案 headings、goal/status/ownership/retired-path 規則
        ⚙️ 更新 specs/STATUS.md → change-open
            │
            ↓  使用者確認 artifacts 後明示觸發
🗣️ [6] /opsx:apply
        主 agent 依 tasks.md 逐列派工 → 微觀交付迴圈（見 §3）→ 全 task [x]
            │
            ↓
🗣️ [7] /opsx:archive（只在 final PR group）
        第 1–3 層完成且已有 Source-Verify evidence 後，在 final PR 內執行 archive/write-back：
        合併 derived view（openspec/specs）＋回寫正典 spec（版本升級 + Changelog 條目），
        成功完成後才算通過第 4 層 Source-Verify + write-back/archive gate
            │
            ↓
🗣️ [8] /pr-flow
        intermediate PR group：review → test → PR → merge，OpenSpec change 保持 open
        final PR group：archive/write-back 已在 final PR 內完成 → final PR → merge
        ⚙️ final PR merge 後：更新 STATUS → archived，再將正典 spec 移至 specs/_archive/
```

### Frontend Ready Gate

Page-scoped feature 在進入 `/opsx:propose` 前必須逐項通過下列檢查；不適用項目必須明示 `N/A` 與理由：

1. canonical spec 已有 `## 功能目標`、FR/AC/SC 與依賴。
2. spec 直接連到 page-scoped design、prototype 與 prototype tests。
3. route 與 exact role allowlist 已定義。
4. loading、empty、error/retry、disabled、read-only、permission-denied states 已覆蓋。
5. prototype test 與 React implementation 共用穩定 `data-testid` selector contract。
6. API/OpenAPI、enum 與 request/response shape 足以支援畫面。
7. RWD、WCAG 2.1 AA 與 zh-TW/en i18n 要求已列出。
8. feature/shared ownership 與 Storybook scope 已決定。

**超小型調整**（≤ 2 個生產檔、不動 API 契約、只釐清不增刪 FR/AC）走 Lightweight Path：TDD → 實作 → spec 一致性檢查 → `/pr-flow`，跳過 OpenSpec change 容器——完整觸發條件見 SKILL.md § Lightweight Path。

---

## 3. 微觀交付迴圈（[6] /opsx:apply 內部）

```
        主 agent 依 tasks.md [@agent-name] 逐列派工
        （預設全序列；<!-- parallel:start/end --> 群組可並行；
          平行群組觸及同檔時才用 worktree 隔離）
                        │
    ┌───────────────────▼────────────────────┐
    │ Red test task：senior-qa                │
    │   - 依 SC/FR/AC 寫出獨立的 Red contract │
    │   - commit 後執行，記錄預期失敗原因     │
    └───────────────────┬────────────────────┘
                        ▼
    ① 主 agent 驗證 Red commit 與預期失敗證據，將 Red task 標 [x]
        ├─ 證據不足或失敗原因不符 → 退回 senior-qa 修正 ↺
        └─ 證據成立 ▼
    ┌───────────────────▼────────────────────┐
    │ Green implementation task               │
    │   senior-backend / senior-dba /         │
    │   senior-frontend / senior-devops       │
    │   - 依已提交的 Red contract 實作；不得  │
    │     為求通過而修改 Red contract          │
    │   - Green → refactor；長任務增量 commit │
    │   - 回報 diff 與 Green 測試結果         │
    └───────────────────┬────────────────────┘
                        ▼
    ② 主 agent 執行 Green task 標明的驗證指令
        （backend: uv run pytest/mypy/ruff；frontend: pnpm tsc/lint/test）
        ├─ 非 exit 0 → 退回實作 agent 修正 ↺（同 task 失敗 ≥ 3 次 → 升級回報使用者）
        └─ exit 0 → 主 agent 將 Green task 標 [x] ▼
    ③ 同一 PR 群組（tasks.md 的 ## N. 群組＝一個 stacked PR）全數 [x] 後、開 PR 前：
        a. senior-code-reviewer Code Review（架構分層、SOLID、命名、
           憲章遵循、是否符合 design.md 契約）
        b. senior-qa Scenario 驗收（逐一對照 change specs delta 的
           WHEN/THEN 與正典 spec.md 的 AC；不做 Code Review）
        ├─ 退回 → 回實作 agent 修正 → 重走 ②③（同群組退回 ≥ 2 次 → 停下回報使用者）
        └─ 通過 ▼
    ④ intermediate PR group：/pr-flow 開 PR 後依 stacked 順序 merge；change 保持 open
       final PR group：完整驗證 → Source-Verify → /opsx:archive/write-back 置入 final PR
       → /pr-flow → final PR merge；merge 後才移動正典 spec
```

### 3.1 與 duty-mate 迴圈的刻意差異

| 面向 | duty-mate | Label Suite（本專案） | 理由 |
|------|-----------|----------------------|------|
| 審查時點 | 每個 task 過 Code Review + QA 才打勾 | task 過**外部驗證指令**即打勾；審查集中在 **PR 群組層**（開 PR 前一輪） | Evaluator 只認外部工具（pytest/mypy/ruff/tsc/Playwright），單人論文專案 per-task 雙審成本過高；stacked PR 節奏天然形成審查批次 |
| 打勾權責 | tech-lead 打勾 | **主 agent** 驗證 exit 0 後親自打勾 | 已定於 `openspec/config.yaml` operations.apply.guidance；qa 與 reviewer 不打勾 |
| TDD ownership | 實作 task 內自行完成 Red/Green | `senior-qa` 先提交獨立 Red task；implementation agent 消費 contract 完成 Green task | 可稽核的預期失敗證據先於實作，且保護 Red contract 不被為求通過而改寫 |
| 驗收準繩 | OpenSpec spec Scenario | change specs delta 的 WHEN/THEN ＋ 正典 `spec.md` 的 FR/AC | 本專案正典在 `specs/`，delta 只是變更視圖 |

---

## 4. 階段產物與守門表

| 階段 | 觸發 | 角色 | 產物 | 過閘條件 |
|------|------|------|------|----------|
| [1] brainstorm | 🗣️ | 主 agent | 需求共識 | 2–3 方案已比較、YAGNI 已套用 |
| [2] specify | 🗣️ | 主 agent | `specs/[module]/NNN-feature/spec.md` | Process/User Flow 齊備；FR/AC 有穩定 ID；STATUS.md → spec-ready |
| [3] prototype | 🗣️ | 主 agent + `senior-qa` Red／實作 agent Green（+ senior-uiux 選用） | static shell + Red/Green Playwright 證據 + page design | shell 後先有已提交的預期 Red；Green 全綠；data-testid 契約建立；MASTER.md 遵循 |
| [4] clarify（選用） | 🗣️ | 主 agent | 釐清問答 + spec 回修 | prototype/page design 暴露模糊點時回寫正典 spec，並重走受影響的 Gate |
| [3d] Frontend Ready Gate | ⚙️ | 主 agent | page readiness evidence | [4] clarify 已完成或不適用後，八項 page-scoped 檢查均通過，或明示 N/A 與理由 |
| [5] propose | 🗣️ | 主 agent | change 四件套（繁中） | OpenSpec schema validation 與 Project SDD lint 分別通過；派工標籤齊備；憲章檢查段落存在 |
| [6] apply | 🗣️ | 主 agent 派工 + 實作/品質 subagents | 分離的 Red/Green task、程式、測試與 `[x]` | Red 預期失敗與 Green 驗證均有證據；每 PR 群組過 ③a/③b 審查 |
| [7] archive | 🗣️ | 主 agent（final PR group） | derived view + 正典回寫 | 第 1–3 層與 Source-Verify evidence 先完成；僅 final PR 內成功 write-back 後才完成第 4 層 |
| [8] pr-flow | 🗣️ | 主 agent | intermediate 或 final PR → merge | intermediate PR 不 archive；final PR merge 後更新 STATUS 並將 spec 移至 `_archive/` |

---

## 5. 文件流向

```
spec.md（正典）──→ 被 prototype 必讀（AC → data-testid 契約）
                ──→ 被 /opsx:propose 必讀（現況基準；delta 引用其 FR/AC ID）
                ──→ 被 senior-qa 必讀（驗收準繩）

design/prototype/ ──→ 被實作階段前端 task 必讀（data-testid 逐字沿用）

change 四件套 ──→ proposal.md／design.md 被實作 agent 必讀
             ──→ tasks.md 被主 agent 讀取派工（[@agent-name]）
             ──→ specs/ delta 被 senior-qa 必讀（WHEN/THEN 驗收）

archive 回寫 ──→ specs/[module]/NNN-feature/spec.md（版本升級 + Changelog）
            ──→ openspec/specs/（derived view，永不手改、永不權威）
```

---

## 6. 審查／驗收職責分工

| 範疇 | 負責 | 範圍 |
|------|------|------|
| **Red test task** | senior-qa | 依 SC/FR/AC 建立、提交並執行獨立 Red contract；記錄預期失敗原因 |
| **Green implementation task** | implementation agent | 消費已提交的 Red contract，實作最小行為並提供 Green 測試證據；不得為求通過而修改 Red contract |
| **Red/Green 證據與 checkbox** | 主 agent | 驗證 Red 預期失敗與 Green 指令 exit 0；唯一可更新 `tasks.md` checkbox 的角色 |
| **外部驗證**（Green 打勾前提） | 主 agent 執行 | pytest／mypy／ruff／tsc／lint／Playwright，全 exit 0 |
| **Code Review**（架構層） | senior-code-reviewer | 分層、SOLID、命名、憲章、design.md 契約符合度 |
| **驗收審查**（review） | senior-qa | 逐一對照 WHEN/THEN 與 FR/AC；不做 Code Review |
| **第二道防線** | PR bots／Codex | PR 層自動 review；unresolved threads 歸零才 merge |

順序：每個可觀察行為先由 `senior-qa` 產出已提交的 Red evidence，再由 implementation agent 交付 Green；PR 群組內則先 Code Review、後 QA Scenario 驗收，互補不取代。senior-qa **不**做 Code Review，senior-code-reviewer **不**做 Scenario 驗收；兩者皆**不**打勾。

---

## 6.1 四層驗證閘

每層只對其責任範圍負責，不以單一「verify」名稱掩蓋差異：

| 層級 | 唯一責任 | 指令類別 |
|------|----------|----------|
| 1. OpenSpec schema validation | OpenSpec schema、delta 與 scenario 結構 | `openspec validate <change> --type change` 或 `openspec validate --changes --no-interactive`；採 non-strict schema gate |
| 2. Project SDD lint | 專案 headings、goal/status/ownership/retired-path 規則 | Project SDD lint 指令（後續工具落地前，依 workflow checklist 與 review evidence 執行） |
| 3. Code/test gates | 受影響實作的 Red/Green evidence、type、unit、integration、E2E、security 與 lint | `uv run ...`、`pnpm ...`、prototype Playwright 與 CI 對應指令 |
| 4. Source-Verify + write-back/archive gate | archive-time 正典 ID、version 與 Changelog 完整性 | 第 1–3 層與 Source-Verify evidence 是 `/opsx:archive` 的前提；final PR group 成功 write-back 才完成本層 |

---

## 7. 與既有規範的對應

- **派工機制**：`[@agent-name]` 標籤、`[@main]` 保留字、序列預設、parallel 標記、worktree 時機——規範全文在 `openspec/config.yaml`（`rules.tasks` + `operations.apply.guidance`）。
- **語言硬規**：OpenSpec 產出的所有文件除專業用語外一律繁體中文（CLAUDE.md § Communication）。
- **TDD**：失敗測試先行，無例外——全文與不接受的藉口清單見 SKILL.md § TDD Rule。
- **PR 範圍**：單一目的、≤ 5 檔／≤ 300 行（測試除外）——`.claude/rules/git-workflow.md`。
- **驗證指令**：CLAUDE.md § Verification Commands 為唯一清單；每個 CI job 有對應本機指令。
- **回寫硬閘**：archive 必須回寫正典 spec（版本升級 + Changelog），否則 PR 不得 merge——ADR-033 Rule 1。
- **憲章**：`specs/_governance/constitution.md` 的所有適用原則；Generalization-First 與 Data Fairness 為 NON-NEGOTIABLE。

---

## 8. 各階段提示詞範例

> **參數約定**：`<spec>` ＝ 正典 spec 路徑（如 `specs/foundation/000-foundation/spec.md`）、`<change>` ＝ change 名稱（kebab-case，如 `implement-foundation-core`）。
>
> **[5]–[8] 是固定範本**：逐字沿用、只代入上述兩個參數，不必每次檢查調整——語言硬規（全繁中）、`[@agent-name]` 派工標籤、TDD、PR 上限等規則已寫在 `openspec/config.yaml`，`/opsx:propose`／`/opsx:apply` 執行時由 CLI 自動注入（`openspec instructions` 的 rules 與 operationGuidance），提示詞不必重複。
>
> **從既有 spec 開始實作**（spec 已 spec-ready，[1]–[4] 已完成或不適用）時，直接從 [5] 進場——`specs/foundation/000-foundation/spec.md` 即為此例。

### [1]–[2] 需求 → 規格（新功能才需要）

```text
/superpowers:brainstorm 我想做<功能描述>…
```

```text
/speckit.specify <功能描述>。模組：<module>。
```

### [3] Prototype（新頁面才需要）

```text
/label-suite-design 依 <spec> 產出 <page> 頁面 prototype。先讀 design/system/MASTER.md。
先建立可載入、不含目標互動的 static shell；再由 senior-qa 建立、提交並執行預期失敗的
prototype Playwright Red tests。只有 Red evidence 成立後，才加入 data-testid selector contract 與
目標 behavior，使測試 Green；最後才重構與完成 page design。
```

### [4] Clarify（選用）

```text
/speckit.clarify <spec>
```

### [5] Propose — 固定範本

```text
/opsx:propose 依 <spec> 建立 change <change>。範圍：<一句話；有既定計畫文件時附路徑>。
```

實例（foundation-000）：

```text
/opsx:propose 依 specs/foundation/000-foundation/spec.md（v1.12.2）建立 change
implement-foundation-core。範圍依 plan.md v2.0.0 的 Foundation-Core。
```

### [6] Apply — 固定範本（含 config.yaml 未涵蓋的補充規則，逐字沿用）

```text
/opsx:apply <change>

補充規則：
- 每個可觀察行為先派 `[@senior-qa]` Red task，提交並回報預期失敗原因；主 agent 驗證後才派 paired Green implementation task
- implementation agent 不得修改 Red contract 以使其通過；主 agent 是唯一更新 checkbox 的角色
- 每個 PR 群組全數 [x] 後、開 PR 前：senior-code-reviewer Code Review
  + senior-qa Scenario 驗收（對照 change specs delta 的 WHEN/THEN）
- intermediate PR group 合併後 OpenSpec change 保持 open；只有 final PR group 在第 1–3 層與 Source-Verify evidence 完成後執行 archive/write-back，以完成第 4 層
- 同 task 失敗 ≥ 3 次或同群組審查退回 ≥ 2 次，停下回報給我
```

（其餘派工規則——`[@agent-name]` 逐列派工、序列預設、parallel 標記、worktree 時機、增量 commit、主 agent 驗證後打勾——由 config.yaml 的 apply guidance 自動注入，不必寫進提示詞。）

### [7] Archive — 固定範本

```text
這是 final PR group，tasks.md 全部 [x]、第 1–3 層完成且已有 Source-Verify evidence。/opsx:archive <change>：
在 final PR 內回寫正典 spec（版本升級 + Changelog）、合併 derived view；成功 write-back 才完成第 4 層，
並保留 post-merge 才將 canonical spec 移至 `specs/_archive/` 的時序。
```

### [8] PR — 固定範本

```text
/pr-flow
```

（stacked PR 的 change：每個 intermediate PR group 完成 [6] 審查後各跑一次 `/pr-flow` 並保持 change open；final PR group 將 archive/write-back 放入 final PR，final PR merge 後才移動 canonical spec。）

### 通用提醒

- **不要跳階段**：propose 完成後停下等使用者確認，才進 apply（opsx:propose 的 planning boundary）。
- **不要省略「必讀」**：派工提示詞明列前置文件路徑（proposal／design／specs delta／正典 spec），避免 subagent 只看對話 context。
- **打勾只有主 agent 做**：實作 agent、senior-qa、senior-code-reviewer 皆不動 `tasks.md` 的 checkbox。
