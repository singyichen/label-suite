# Label Suite SDD Workflow

> 本文件為 Label Suite 專案 SDD（Spec-Driven Development）流程的**繁體中文權威說明**，涵蓋從需求進入到封存的完整階段，以及實作階段（`/opsx:apply`）的微觀交付迴圈與各階段提示詞範例。
>
> 機器導向的操作細節（TDD 規則全文、prototype Playwright 測試規範、Lightweight Path 觸發條件、Skip SDD 判準）以 [.claude/skills/sdd-workflow/SKILL.md](../.claude/skills/sdd-workflow/SKILL.md) 為準；本文件不重複那些細節，只做流程編排與派工的權威說明。兩者若有衝突，架構決策以 [ADR-033](adr/033-openspec-change-workflow.md) 為準。
>
> 圖例：
> 🗣️ **手動**：需要使用者主動下提示詞觸發
> ⚙️ **自動**：由上一步自動串接，使用者不用動手
>
> 參考來源：本流程參考 duty-mate 專案 `docs/sdd-workflow.md` 的七階段架構調整而來，並依本專案既有規範裁示三項差異（2026-08-25）：**不新增獨立 sa/sd 設計階段**（分析歸 `spec.md`、技術設計歸 `design.md`）、**審查採 PR 群組層**（非 per-task）、**打勾權責在主 agent**。

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
└ Subagents — 品質層（PR 群組層審查）
    senior-code-reviewer   Code Review（架構／命名／憲章／design.md 符合度）
    senior-qa              Scenario 驗收（對照 spec 的 WHEN/THEN 與 AC）
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
🗣️ [3] /label-suite-design（prototype）
        產出 design/prototype/pages/[module]/[page].html
        ⚠ 產出前必讀 design/system/MASTER.md
            ├─ 🗣️ /pencil-wireframe（選用）→ design/wireframes/pages/[module]/[page].pen
            ├─ 🗣️ senior-uiux review（選用）→ prototype QA
            └─ ⚙️ prototype Playwright 測試（Red → Green，建立 data-testid 契約）
            │
            ↓
🗣️ [4] /speckit.clarify（選用）
        對正典 spec.md 做 Q/P 釐清（prototype 已先暴露多數模糊點）
            │
            ↓
🗣️ [5] /opsx:propose
        產出 openspec/changes/<change>/{proposal.md, specs/ delta, design.md, tasks.md}
        - 全部以繁體中文撰寫（硬性規範，僅專業用語保留英文）
        - proposal.md frontmatter 載明「對應 Spec: specs/[module]/NNN-feature/spec.md」
        - tasks.md 每個任務尾綴唯一 [@agent-name] 派工標籤 + 依賴／平行標記
        ⚙️ openspec validate <change> --type change 須 exit 0
        ⚙️ 更新 specs/STATUS.md → change-open
            │
            ↓  使用者確認 artifacts 後明示觸發
🗣️ [6] /opsx:apply
        主 agent 依 tasks.md 逐列派工 → 微觀交付迴圈（見 §3）→ 全 task [x]
            │
            ↓
🗣️ [7] /opsx:archive
        雙寫：合併 derived view（openspec/specs/）＋ 回寫正典 spec.md
        （版本升級 + Changelog 條目 —— 硬閘，ADR-033 Rule 1）
            │
            ↓
🗣️ [8] /pr-flow
        commit → review → test → push → PR → merge
        ⚙️ 更新 specs/STATUS.md → review → done → archived
        ⚙️ merge 後：mv specs/[module]/NNN-feature specs/_archive/
```

**超小型調整**（≤ 2 個生產檔、不動 API 契約、只釐清不增刪 FR/AC）走 Lightweight Path：TDD → 實作 → spec 一致性檢查 → `/pr-flow`，跳過 OpenSpec change 容器——完整觸發條件見 SKILL.md § Lightweight Path。

---

## 3. 微觀交付迴圈（[6] /opsx:apply 內部）

```
        主 agent 依 tasks.md [@agent-name] 逐列派工
        （預設全序列；<!-- parallel:start/end --> 群組可並行；
          平行群組觸及同檔時才用 worktree 隔離）
                        │
    ┌───────────────────▼────────────────────┐
    │ 實作 agent                              │
    │   senior-backend / senior-dba /         │
    │   senior-frontend / senior-devops       │
    │   - TDD：失敗測試先行（紅 → 綠 → 重構）│
    │   - 長任務必須增量 commit               │
    │   - 完成後回報 diff／測試結果           │
    └───────────────────┬────────────────────┘
                        ▼
    ① 主 agent 執行該 task 標明的驗證指令
        （backend: uv run pytest/mypy/ruff；frontend: corepack pnpm tsc/lint/test）
        ├─ 非 exit 0 → 退回實作 agent 修正 ↺（同 task 失敗 ≥ 3 次 → 升級回報使用者）
        └─ exit 0 → 主 agent 將該 task 標 [x] ▼
    ② 同一 PR 群組（tasks.md 的 ## N. 群組＝一個 stacked PR）全數 [x] 後、開 PR 前：
        a. senior-code-reviewer Code Review（架構分層、SOLID、命名、
           憲章遵循、是否符合 design.md 契約）
        b. senior-qa Scenario 驗收（逐一對照 change specs delta 的
           WHEN/THEN 與正典 spec.md 的 AC；不做 Code Review）
        ├─ 退回 → 回實作 agent 修正 → 重走 ①②（同群組退回 ≥ 2 次 → 停下回報使用者）
        └─ 通過 ▼
    ③ /pr-flow 開 PR（bots／Codex review 為第二道防線）
        PR 須 ≤ 5 檔／≤ 300 行（測試除外），CI 全綠後依 stacked 順序 merge
```

### 3.1 與 duty-mate 迴圈的刻意差異

| 面向 | duty-mate | Label Suite（本專案） | 理由 |
|------|-----------|----------------------|------|
| 審查時點 | 每個 task 過 Code Review + QA 才打勾 | task 過**外部驗證指令**即打勾；審查集中在 **PR 群組層**（開 PR 前一輪） | Evaluator 只認外部工具（pytest/mypy/ruff/tsc/Playwright），單人論文專案 per-task 雙審成本過高；stacked PR 節奏天然形成審查批次 |
| 打勾權責 | tech-lead 打勾 | **主 agent** 驗證 exit 0 後親自打勾 | 已定於 `openspec/config.yaml` operations.apply.guidance；qa 與 reviewer 不打勾 |
| 驗收準繩 | OpenSpec spec Scenario | change specs delta 的 WHEN/THEN ＋ 正典 `spec.md` 的 FR/AC | 本專案正典在 `specs/`，delta 只是變更視圖 |

---

## 4. 階段產物與守門表

| 階段 | 觸發 | 角色 | 產物 | 過閘條件 |
|------|------|------|------|----------|
| [1] brainstorm | 🗣️ | 主 agent | 需求共識 | 2–3 方案已比較、YAGNI 已套用 |
| [2] specify | 🗣️ | 主 agent | `specs/[module]/NNN-feature/spec.md` | Process/User Flow 齊備；FR/AC 有穩定 ID；STATUS.md → spec-ready |
| [3] prototype | 🗣️ | 主 agent（+ senior-uiux 選用） | prototype HTML + Playwright 測試 | 測試全綠；data-testid 契約建立；MASTER.md 遵循 |
| [4] clarify | 🗣️ | 主 agent | 釐清問答 + spec 回修 | 所有 Q 有答（選用階段） |
| [5] propose | 🗣️ | 主 agent | change 四件套（繁中） | `openspec validate` exit 0；派工標籤齊備；憲章檢查段落存在 |
| [6] apply | 🗣️ | 主 agent 派工 + 實作/品質 subagents | 程式 + 測試 + `[x]` | 每 task 驗證指令 exit 0；每 PR 群組過 ②a/②b 審查 |
| [7] archive | 🗣️ | 主 agent | derived view + 正典回寫 | 版本升級 + Changelog（硬閘）；Source-Verify 通過 |
| [8] pr-flow | 🗣️ | 主 agent | PR → merge | CI 全綠；unresolved threads 歸零；spec 移 `_archive/` |

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
| **外部驗證**（打勾前提） | 主 agent 執行 | pytest／mypy／ruff／tsc／lint／Playwright，全 exit 0 |
| **Code Review**（架構層） | senior-code-reviewer | 分層、SOLID、命名、憲章、design.md 契約符合度 |
| **驗收審查**（review） | senior-qa | 逐一對照 WHEN/THEN 與 FR/AC；不做 Code Review |
| **白箱測試** | 實作 agent | 單元＋整合，與實作同 task 以 TDD 完成 |
| **第二道防線** | PR bots／Codex | PR 層自動 review；unresolved threads 歸零才 merge |

順序：先 Code Review、後 QA 驗收，互補不取代；senior-qa **不**做 Code Review，senior-code-reviewer **不**做 Scenario 驗收；兩者皆**不**打勾。

---

## 7. 與既有規範的對應

- **派工機制**：`[@agent-name]` 標籤、`[@main]` 保留字、序列預設、parallel 標記、worktree 時機——規範全文在 `openspec/config.yaml`（`rules.tasks` + `operations.apply.guidance`）。
- **語言硬規**：OpenSpec 產出的所有文件除專業用語外一律繁體中文（CLAUDE.md § Communication）。
- **TDD**：失敗測試先行，無例外——全文與不接受的藉口清單見 SKILL.md § TDD Rule。
- **PR 範圍**：單一目的、≤ 5 檔／≤ 300 行（測試除外）——`.claude/rules/git-workflow.md`。
- **驗證指令**：CLAUDE.md § Verification Commands 為唯一清單；每個 CI job 有對應本機指令。
- **回寫硬閘**：archive 必須回寫正典 spec（版本升級 + Changelog），否則 PR 不得 merge——ADR-033 Rule 1。
- **憲章**：`specs/_governance/constitution.md` 八原則；Generalization-First 與 Data Fairness 為 NON-NEGOTIABLE。

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
完成後補 prototype Playwright 測試（Red → Green，建立 data-testid 契約）。
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
- 每個 PR 群組全數 [x] 後、開 PR 前：senior-code-reviewer Code Review
  + senior-qa Scenario 驗收（對照 change specs delta 的 WHEN/THEN）
- 同 task 失敗 ≥ 3 次或同群組審查退回 ≥ 2 次，停下回報給我
```

（其餘派工規則——`[@agent-name]` 逐列派工、序列預設、parallel 標記、worktree 時機、增量 commit、主 agent 驗證後打勾——由 config.yaml 的 apply guidance 自動注入，不必寫進提示詞。）

### [7] Archive — 固定範本

```text
tasks.md 全部 [x]、驗證指令全綠。/opsx:archive <change>：
回寫正典 spec（版本升級 + Changelog）、合併 derived view、openspec validate 過。
```

### [8] PR — 固定範本

```text
/pr-flow
```

（stacked PR 的 change：每個 PR 群組完成 [6] 的審查後各跑一次 `/pr-flow`；archive 隨最後一個 PR 進版。）

### 通用提醒

- **不要跳階段**：propose 完成後停下等使用者確認，才進 apply（opsx:propose 的 planning boundary）。
- **不要省略「必讀」**：派工提示詞明列前置文件路徑（proposal／design／specs delta／正典 spec），避免 subagent 只看對話 context。
- **打勾只有主 agent 做**：實作 agent、senior-qa、senior-code-reviewer 皆不動 `tasks.md` 的 checkbox。
