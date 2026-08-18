# Issue #180 — 階段二正典決策清單

彙整自 W1（`w1-spec-arch.md` §3–§4）、W2（`w2-ux-journey.md`）、W3（`w3-playwright-qa.md`），由主 agent 交叉驗證後提交使用者裁決。
狀態標記：`⏳ 待決策`／`✅ 已決策`。

## 需使用者裁決（阻擋階段三）

### D1. 正式 E2E 測試目錄 — ⏳ 待決策

- **衝突**：ADR-009:98／ADR-012:28 用 `frontend/tests/`；testing-constitution:56 用 `e2e/[module]/`。testing-constitution 開頭聲明其 source of truth 是 ADR-009/012/014，卻與來源直接矛盾（治理缺口，W1 §3.4／§3.11）。
- **佐證**：`.claude/rules/testing-e2e.md` 亦明定 `e2e/[module]/[page].spec.ts` 且要求 `storageState` fixtures。
- **附帶要求**：無論選哪邊，都需要一份新 ADR 或治理 changelog 記錄決策理由，不能只改路徑字串。

### D2. `completed` 狀態前置條件 — ⏳ 待決策

- **缺口**：ADR-022:89 與 014 spec:464 都只要求「正式標記全數提交＋分數計算」；未涵蓋 review/dispute/arbitration 完成度（W1 §3.5／§4.1，本輪最關鍵 gap，直接阻擋「完成」節點的驗收設計）。
- **issue #180 期望**：正式標記完成＋必要審核完成＋無未解決歧異＋必要仲裁完成＋品質指標可用。
- **落地方式**：修訂 ADR-022 轉換表＋014 spec 新增 FR。

### D3. 成員不足時的發布阻擋規則 — ⏳ 待決策

- **缺口**：ADR-022:85 的「≥ 2 annotators assigned」與 014 FR-010q 的 `min_annotators >= 2` 是兩個互不引用的「2」；沒有任何 FR 定義「active annotator 數 < `min_annotators` 時阻擋啟動試標並顯示原因」（W1 §3.9／§4.3）。
- **W2 佐證**：F-06 — prototype 發布前檢查實際上不驗證成員人數。
- **W3 佐證**：覆蓋缺口 — 無任何測試斷言成員不足阻擋。

### D4. 過時產品全景文件的處理 — ⏳ 待決策

- **現況**：PRD／IA／story map／impact map／baseline summary 五份全早於 2026-08-18 完成的審核員模型重構，仍含舊「通過/退回」語意、三步驟建立流程、dry_run 產 gold 等過期描述（W1 §3.1–§3.3）。
- **選項**：(a) 驗收文件明文聲明「以 013/014/015/reviewer-model-redesign 為準」＋另開 docs issue 批次同步；(b) 先同步完五份文件再寫驗收文件；(c) 只聲明過期不開同步 issue。

## 低爭議項（主 agent 建議處置，隨階段四 triage 執行）

| 項目 | 來源 | 建議處置 |
|---|---|---|
| story-map 三步驟 → 四步驟 | W1 §3.2 | 併入 D4 的 docs 同步 issue |
| `specs/STATUS.md` 5 份 spec 版本漂移 | W1 §3.6 | 獨立 `[Docs]` issue，輕量修正 |
| 6 份 spec 檔頭重複 frontmatter 殘留 | W1 §1.4 | 獨立 `[Docs]` issue 統一清理 |
| 使用者操作 audit trail 整合來源未確認 | W1 §4.4 | `[Spike]` issue，不阻擋本輪 |
| PL Dashboard 逐列待辦入口（spec 012 未定義） | W1 §4.2 ＋ W2 F-03 交叉證實 | `[Enhancement]` issue（spec 需調整） |
| IA dataset-analysis 章節舊 `TASK_TYPE_ENUM` | W1 §3.7 | 依 issue #180 邊界，留待 dataset 模組盤點，本輪不處置 |

## 決策紀錄（2026-08-18 使用者裁決）

| # | 決策 | 結果 |
|---|---|---|
| D1 | 正式 E2E 目錄 | **延後**。使用者指出本輪僅針對 prototype 檢查；本輪測試一律留在 `design/prototype/tests/`（ADR-014 正典，無衝突）。`frontend/tests/` vs `e2e/[module]/` 之爭僅影響未來正式全端 E2E，改立獨立 `[Task]` issue 於正式實作前決議（主 agent 建議傾向 `e2e/[module]/`，與 testing-constitution 及 `.claude/rules/testing-e2e.md` 一致），並需新 ADR 記錄理由 |
| D2 | `completed` 前置條件 | **採 issue #180 完整條件**：正式標記全提交＋必要 review unit finalized＋無未解決 dispute＋必要仲裁完成＋品質指標可用。落地：修訂 ADR-022＋014 spec 新增 FR（階段四建對應 issue） |
| D3 | 成員不足發布阻擋 | **阻擋＋顯示缺口原因**：新增 FR「active annotator 數 < `min_annotators` 時 disable 啟動試標，顯示還差 N 位」；ADR-022 與 014 建立交叉引用（階段四建對應 issue） |
| D4 | 過時產品全景文件 | **聲明為準＋開同步 issue**：驗收文件明文以 013/014/015/reviewer-model-redesign 為準；另開 `[Docs]` issue 批次同步五份文件（含 story-map 三步→四步）；階段三不被阻擋 |

D2～D4 即日起為驗收文件的正典依據；對應 spec／ADR 修訂由階段四的 issue 追蹤，不在本 issue 內直接改 spec。
