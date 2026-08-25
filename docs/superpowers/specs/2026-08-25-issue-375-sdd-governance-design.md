# Issue #375 SDD Governance Alignment Design

## 背景

GitHub issue [#375](https://github.com/singyichen/label-suite/issues/375) 記錄了三類互相牽動的問題：SDD 治理文件彼此衝突、spec/design/prototype 的前端追溯鏈不完整，以及 design inventory 無法由來源重建。本設計只處理第一個可獨立交付的工作流：先固定治理語意，讓後續 SDD lint、inventory generator 與 spec cleanup 有穩定規則可實作。

本工作從 `main` 的 `f3e2cee638c77a2438f8077de492b0f9af290c3e` 建立，分支為 `feat/issue-375-sdd-governance`。使用者已明確授權修改 `AGENTS.md`、`CLAUDE.md` 與 constitution source/cache。

## 目標

建立單一、可引用且不互相矛盾的 SDD 治理契約，明確定義：

1. 每類資訊的 canonical authority。
2. Red/Green task ownership、one-task/one-file 例外與 checkbox 責任。
3. Frontend Ready Gate。
4. OpenSpec schema validation、project lint、code/test 與 Source-Verify 的邊界。
5. stacked PR、OpenSpec archive/write-back 與 canonical spec 搬移的時序。

## 非目標

- 本分支不實作 SDD lint CLI 或 CI job。
- 本分支不建立 inventory manifest/generator，也不重生三份 inventory derived views。
- 本分支不批次修改 17 份 canonical specs 或 `specs/STATUS.md`。
- 本分支不接受 ADR-034，也不建立正式 `e2e/` 目錄。
- 本分支不修改產品 API、DB schema、frontend 或 backend runtime behavior。

上述項目將分別由 issue #375 的後續單一目的分支處理。

## 方案比較

### 方案 A：單一 umbrella branch 完成 issue #375

優點是表面上只需一次整合。缺點是同時包含 governance、tooling、CI、generated artifacts 與 spec cleanup，違反 single-purpose PR 與差異大小限制，也會讓 lint 在規則尚未固定前自行決定治理語意。

### 方案 B：治理優先的分支序列（採用）

先完成治理 source/cache 與 consumer propagation；之後依序建立 SDD lint、inventory generator、spec traceability/status cleanup 分支。每個分支有單一目的，前一分支的輸出成為下一分支的明確輸入。

### 方案 C：tooling-first

先寫 scanner/lint，再回頭調整治理文件。此方案最快看到程式輸出，但會把目前矛盾的 test ownership、E2E path 與 OpenSpec strict 策略硬編碼，因此不採用。

## Authority Matrix

| 領域 | Canonical authority | Derived/consumer responsibility |
|---|---|---|
| 專案級原則、衝突裁決、修憲流程 | `specs/_governance/constitution.md` | `.specify/memory/constitution.md` 是完整同步的 tool cache；`AGENTS.md`、`CLAUDE.md` 只摘要並連回 source |
| Frontend/testing 細則 | `specs/_governance/frontend-constitution.md`、`specs/_governance/testing-constitution.md` | 對應 `.specify/memory/` 檔案是 agent-loading cache，不得改寫語意 |
| 功能需求、FR/AC/SC、功能目標 | `specs/[module]/NNN-feature/spec.md` | OpenSpec change specs 是 delta；`openspec/specs/` 是 archive 產生的 derived view |
| SDD 階段、角色、交付時序 | `docs/sdd-workflow.md` | `.claude/skills/sdd-workflow/SKILL.md` 提供機器操作導覽；`openspec/config.yaml` 只注入可執行規則 |
| TDD 與 task decomposition | `specs/_governance/testing-constitution.md` | workflow、templates、agent rules 與 OpenSpec config 必須引用並收斂到相同語意 |
| 已接受架構決策 | `docs/adr/*.md` 中 `Status: Accepted` 的 ADR | Proposed ADR 不改變現行規則；consumer 不得提前宣稱 supersession 已生效 |
| SDD 階段狀態 | `specs/STATUS.md` | branch、OpenSpec change 與 task progress 是 lint 的佐證，不是第二套狀態來源 |
| 設計元件規格 | `design/system/MASTER.md`，加上適用的 `design/system/pages/*.md` override | inventory、canvas 與 prototype 導覽是索引或 derived artifact，不得反向定義規格 |

衝突裁決順序為：main constitution → applicable domain constitution → Accepted ADR → canonical feature spec → canonical workflow → machine guidance/derived views。較低層文件若發現衝突，必須失敗並指出上游，不得自行覆蓋。

## 核心決策

### 1. Red/Green ownership

- `senior-qa` 擁有獨立的 Red test task。
- Red task 必須先 commit，且驗證命令必須以預期原因失敗。
- implementation agent 只在 Red evidence 完成後執行 Green task。
- 主 agent/team lead 執行驗證並更新 `tasks.md` checkbox；worker、reviewer 與 QA 不自行打勾。
- Refactor 可留在 Green task，前提是 covering tests 持續為綠；若改變可觀察行為，必須回到新的 Red task。

### 2. Task granularity

- Artifact-producing task 預設只碰一個檔案。
- package-manager、scaffold 與 governance propagation 可例外，但 task 必須列出每個檔案、例外類型與理由。
- 一個 PR 可包含多個單檔 task；「一 task 一檔」不等於「一 PR 一檔」。
- command-only verification task 不產生檔案，必須列出完整命令與成功/失敗預期。

### 3. Prototype TDD

允許先建立不含目標互動的靜態 shell，讓 Playwright 有可載入頁面；但 selector contract 與目標 behavior 必須遵循：

```text
shell exists
→ Red Playwright test
→ confirm expected failure
→ add data-testid / behavior
→ Green
→ refactor
```

因此「prototype HTML 完成後才寫測試」會改成「shell 後、目標行為前寫測試」。

### 4. Prototype command 與 package manager

- Canonical prototype command 為 `/label-suite-design`。
- `/ui-ux-pro-max` 只能描述底層能力，不得出現在 canonical pipeline 中冒充階段命令。
- 所有 repository-local frontend/prototype commands 使用 `pnpm`；不得使用 `npm test` 或 `npm run`。

### 5. ADR-034 與 E2E path

ADR-034 目前仍為 Proposed。本分支不接受它、不新增 root `e2e/`，也不將 Proposed ADR 當作 superseding authority。涉及 `frontend/tests/` 與 `e2e/[module]/` 的全面遷移與 retired-path lint，延後到 maintainer 正式接受或拒絕 ADR-034 後的獨立工作流。

本分支只會移除明確不依賴 ADR-034 的 stale command/wording；歷史 ADR 內的舊路徑不做全域搜尋取代。

### 6. OpenSpec validation 策略

- `openspec validate ... --no-interactive` 負責 OpenSpec schema、delta 與 scenario 結構。
- `--strict` 暫不列為 required gate，因其英文 RFC 2119 檢查與繁中 artifact hard rule 尚不相容。
- 後續 project SDD lint 會檢查繁中規範詞彙、必要章節、Source-Verify、task ownership、status drift 與 retired paths。
- 文件不得再把 `/opsx:verify` 與 vanilla `openspec validate` 寫成可互換且涵蓋所有 project rules 的同一 gate。

## Frontend Ready Gate

Page-scoped feature 在進入 `/opsx:propose` 前必須通過以下 checklist；不適用項目要明確標示 N/A 與理由：

- canonical spec 已有 `## 功能目標`、FR/AC/SC 與依賴。
- spec 直接連到 page-scoped design、prototype 與 prototype tests。
- route 與 exact role allowlist 已定義。
- loading、empty、error/retry、disabled、read-only、permission-denied states 已覆蓋。
- prototype test 與 React implementation 共用穩定 `data-testid` contract。
- API/OpenAPI、enum 與 request/response shape 足以支援畫面。
- RWD、WCAG 2.1 AA 與 zh-TW/en i18n 要求已列出。
- feature/shared ownership 與 Storybook scope 已決定。

Gate 的規則會寫在 canonical workflow；後續 SDD lint 才負責將可機械判斷的子集合變成 blocking check。

## 四層驗證模型

```text
1. OpenSpec schema validation
2. Project SDD lint
3. Code / type / unit / integration / E2E gates
4. Source-Verify + write-back / archive gate
```

每層有獨立命令、錯誤訊息與責任，不以單一「verify」字樣隱藏差異。第一層不能宣稱檢查 STATUS、ownership 或 inventory freshness；第四層只在 archive/write-back 發生時要求 canonical spec 的版本、Changelog 與 ID 完整性。

## Stacked PR 與 archive 時序

```text
每個中間 PR group：
Red → Green → task verification → group review → PR → merge
OpenSpec change 保持 open

最後 PR group：
full verification → Source-Verify → OpenSpec archive/write-back
→ final PR → merge

final PR merge 後：
canonical spec 移至 specs/_archive/ → STATUS 更新為 archived
```

「OpenSpec archive/write-back」與「merge 後搬移 canonical spec」是不同事件，文件必須使用不同名稱，避免把未合併的 canonical spec 提前移出 active module。

## 文件傳播邊界

治理修正必須 source-first，consumer 隨後同步：

1. `specs/_governance/constitution.md` 與 `specs/_governance/testing-constitution.md`。
2. 對應 `.specify/memory/` tool caches，正文語意不得漂移。
3. `docs/sdd-workflow.md`。
4. `.claude/skills/sdd-workflow/SKILL.md` 與 `openspec/config.yaml`。
5. `AGENTS.md`、`CLAUDE.md`、team-lead/agent-team guidance 與 task template。

Main constitution 採 PATCH amendment：補充 authority/validation 邊界，不新增產品原則。Testing constitution 採文件修正，將已存在的 TDD 要求補上 ownership 與 exception record format。所有 version/changelog 更新依 source 文件既有格式完成。

## Sub-agent 執行設計

主 agent 持有語意裁決、受保護檔案授權、checkbox 與整合驗證。Sub-agent 不再派生其他 agent。

| 工作包 | Ownership | 依賴 |
|---|---|---|
| Constitution source/cache propagation | main + governance implementer | 本設計的 authority 與 TDD 決策 |
| Workflow/skill/OpenSpec guidance | documentation implementer | Constitution wording 已固定 |
| Agent execution contract/template | agent-guidance implementer | Red/Green ownership wording已固定 |
| Task review | fresh reviewer | 每個工作包的 brief、report 與 diff package |
| Whole-branch review | fresh senior reviewer | 所有工作包完成且驗證通過 |

唯讀研究、證據收集與互不相依的 review 可並行。產生修改的 implementer 依 task gate 推進，避免多個 agent 同時修改相同 source/cache 或用不同字句定義同一規則。

## 錯誤處理

- Source/cache diff：停止該 task，修正同步後才能進入 consumer propagation。
- Consumer 出現互斥 wording：以 authority matrix 判定 source，將 consumer 退回修正。
- OpenSpec non-strict validation 失敗：視為 schema gate 失敗，不以 custom lint 取代。
- `--strict` 只產生 RFC 2119 warning：記錄為已知策略差異，不誤報 schema 成功或失敗。
- ADR-034 相關需求出現時：停止 E2E path mutation，另開 acceptance decision；不得在本分支暗中裁決。
- 任一 verification command 非零：不標記 task complete，不繼續下游 task。

## 驗證策略

本治理分支至少執行：

```bash
scripts/check-spec-artifacts.sh
bash scripts/speckit-tests.sh
openspec validate --changes --no-interactive
```

另以精確搜尋驗證 consumer cleanup，並對歷史 ADR/archive 使用 allowlist，而非全 repo 零命中：

```bash
rg -n 'npm (test|run)|eight principles|8 principles|/ui-ux-pro-max' \
  AGENTS.md CLAUDE.md docs/sdd-workflow.md .claude/skills/sdd-workflow \
  openspec/config.yaml specs/_governance .specify/memory
```

完成前必須確認：

- source/cache body 沒有語意差異。
- Red/Green ownership、checkbox owner、task exception format 在所有 consumers 一致。
- Frontend Ready Gate、四層驗證與 stacked PR 時序能從 canonical workflow 直接找到。
- 沒有修改 inventory、canonical feature specs、STATUS、API/DB 或 runtime code。

## 後續分支

1. `feat/issue-375-sdd-lint`：Bash `check-sdd`、fixture tests、CI required job。
2. `feat/issue-375-design-inventory`：JSON manifest、deterministic generator、`--check` 與 Playwright smoke test。
3. `docs/issue-375-spec-traceability`：canonical spec headings/links、explicit exceptions、STATUS cleanup。

每個後續分支都以已合併的 governance 規則為輸入，不在 implementation 時重新定義規則。
