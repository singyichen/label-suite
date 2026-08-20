# 跨角色任務生命週期 Playwright 驗收計畫（issue #180 · v1.0）

> 性質：**規劃文件**——本輪不實作 `.spec.ts`、不執行測試、不改產品程式碼（issue #180 planning-only 邊界）。
> 範圍：`account`／`dashboard`／`task-management`／`annotation`；`dataset` 分析模組排除，IAA 僅驗最小 gate。
> 本文件為整合層；四份工作流草稿為規範性附件（annex），細節以附件為準：
>
> - [w4-canonical-journey.md](issue-180/phase3-drafts/w4-canonical-journey.md) — 正典旅程 GWT ＋ 25 個原子測試
> - [w5-fixtures-infra.md](issue-180/phase3-drafts/w5-fixtures-infra.md) — fixture／隔離／基礎設施
> - [w6-resilience-a11y.md](issue-180/phase3-drafts/w6-resilience-a11y.md) — 錯誤邊界 32 情境 ＋ a11y/i18n/responsive
> - [w7-iaa-research-review.md](issue-180/phase3-drafts/w7-iaa-research-review.md) — IAA／抽樣／仲裁方法論審查
>
> **交付狀態（2026-08-20）**：實作輪（#212）已完成——PR #247（fixture）／#265（XROLE-01~09）／#273（XROLE-10~25）／#277（w6 情境）全 merge。原子測試結算（🟢 22／🟡 3 以 `test.fail()` 標注待 #189/#190）、w6 落點與實作期新發現見 [finding-register.md §F](issue-180/finding-register.md)；本文以下內容維持規劃時點原貌，狀態以 §F 為準。

## 1. 正典依據與決策約束

- **D4**：以 `013`／`014`／`015`／`docs/product/reviewer-model-redesign.md` 為準；PRD／IA／story-map／impact-map／baseline 相關章節視為已知過期（[phase2-decision-list.md](issue-180/phase2-decision-list.md)）。
- **D1**：本輪一切 Playwright 情境落在 `design/prototype/tests/`；正式 `e2e/` 目錄另立 `[Task]` issue 決議。
- **D2**：「完成」節點採 issue #180 完整條件（正式標記全提交＋必要 review unit finalized＋無未解決 dispute＋必要仲裁完成＋品質指標可用）；ADR-022／014 修訂落地前，對應情境一律標注 **「Spec-defined (pending revision)」**。
- **D3**：active 標記員數 < `min_annotators` 時阻擋啟動試標並顯示「還差 N 位」；同上標注方式。
- 追溯依據：[traceability-matrix.md](issue-180/traceability-matrix.md)（16 節點）；主 agent 裁決 #1（F-08 拆分 a/b）、#2（BrowserContext 分層）、#3（F-09 = Requirement gap）沿用不變。

## 2. 測試分層與 BrowserContext 策略

本輪採 **單一共享 `BrowserContext` ＋ 每角色一個 `Page` ＋ query params 切換身分**（矩陣裁決 #2）。理由：prototype 無後端，角色間資料交接完全依賴同 origin 的 localStorage bucket（`submissionBucketKey = taskId::role::runType::annotatorId::reviewerId`，`annotation-workspace.data.js:162-167`）；獨立 context 會使 bucket 互不可見，旅程在第一個交接點即斷裂。

**分層聲明（驗收文件與測試註解皆須保留）**：issue #180 原文「各角色獨立 BrowserContext／storage state」的隔離語意，屬於未來**正式全端 E2E**（真 JWT session，`.claude/rules/testing-e2e.md` 的 `storageState` fixtures）的正確做法；prototype 層若照做反而製造假斷裂。本輪 `storageState` 僅允許用於情境開始前一次性植入 fixture，不用於角色隔離。「重新登入」在原型層只能以「相同身分參數重新導覽」近似（w6 §1 CONT-04 限制標注）。

角色配置（w4 §1）：PL01（dashboard scenario 切換）、A01–A03（`annotator_id`）、R01/R02（`role=reviewer` + `reviewer_id`）、R03 仲裁者（`role=reviewer` + 獨立 `reviewer_id` + `can_arbitrate`，015 FR-060 兩條件）。**不存在 `role=arbiter`**（`_workspace-helpers.ts:11` 的 `Role` 僅 `annotator | reviewer`）。

## 3. 正典旅程（12 步主線）

完整 GWT 見 w4 §2；主線單一測試檔規劃為 `design/prototype/tests/cross-role/xrole-canonical-journey.spec.ts`（依 D1；dispute／仲裁屬主線步驟 9–10，不拆獨立檔）。

```mermaid
flowchart LR
  S1[1 建立任務] --> S2[2 上傳/對應/預覽] --> S3[3 標籤/指引] --> S4[4 抽樣/審核設定]
  S4 --> S5[5 成員管理] --> S6[6 試標啟動+標記] --> S7[7 IAA gate]
  S7 --> S8[8 正式標記] --> S9[9 審核] --> S10[10 Dispute/仲裁] --> S11[11 完成] --> S12[12 匯出]
```

- Fixture 主參數（w4 §1.1／w5 §2）：`task_id = XROLE-{run_id}`、`single_label`（positive/negative/neutral）、5 筆記錄 `xrole-001..005`、`sampling_value=2`（試標 = `xrole-001/002` × 3 標記員）、`min_annotators=3`、`min_reviewers=2`、`arbitration_enabled=true` + 仲裁者 R03。
- 分歧構造：`xrole-003`（A01 標 `positive`）→ R01 核准、R02 修正 `negative` → FR-051 判定 `disputed`，N=2 平手不收斂 → R03 仲裁選 B（`negative`）→ `finalized`。
- 對照組：`xrole-004` 全數核准 → `finalized`；`xrole-005` R01/R02 一致修正 → 多數收斂自動 `finalized`（不經仲裁）。
- 終點斷言：匯出 JSON 中 `xrole-003` 的值必須是**仲裁後定案值** `negative`，非 A01 原始答案（w4 步驟 12）。
- 角色交接點 A–E 的跨頁數字對帳斷言見 w4 §3（矩陣節點 16 的具體落地）。

### 3.1 原子測試清單與狀態

25 個原子測試 `XROLE-01`～`XROLE-25`（完整表見 w4 §4）。狀態分佈：

- 🟢 **20 項**：可立即撰寫且預期 Green。
- 🟡 **5 項**：可立即撰寫但**目前必然 FAIL**，屬 documents-the-gap 的前置迴歸測試，不得誤判為 regression：
  - `XROLE-04`（D3 成員不足阻擋；現況 `canPublish()` 只驗設定值，`task-detail.html:8822-8831`）
  - `XROLE-13`（dry_run 不可退回；`config.js:2650` 無 run_type 防護，F-08-b）
  - `XROLE-20`／`XROLE-21`（D2 完成前置條件；`publishComplete()` 無檢查無確認，`task-detail.html:8870-8876`）
  - `XROLE-24`（重複提交防抖）——**主 agent 整合裁決**：w6 DUP-01 已核實提交按鈕無 debounce／忙碌旗標（`config.js:2949`）且 `appendHistoryEvent` 無去重，「僅 1 筆 history 事件」的斷言現況必 Red，由 w4 原判「🟢 可能 Red」改列 🟡，隨階段四 DUP-01 finding 的處置定案。

## 4. Fixture、隔離與基礎設施（w5 摘要＋裁決）

- **新目錄**：`design/prototype/tests/cross-role/`，含 `fixtures/xrole-lifecycle-seed.json`（2 dry + 3 official 記錄，`xr-off-002` 為強制分歧樣本）與 `fixtures/build-xrole-patch.ts`（`buildXRoleSeedPatch(taskId)` 餵給既有 `patchDataFile()`，`_workspace-helpers.ts:66-75`）。
- **Scenario ID**：`XROLE-{slug}-{run_id}`，`run_id = ${workerIndex}-${Date.now()}`。`task_id` 是 bucket key 最左元件，唯一 task_id 即天然命名空間隔離——**不需寫清理程式碼**；共享 context 下仍須 `beforeEach` 主動 `localStorage.clear()`（w4 §2 Given）。
- **伺服器**：沿用 Node `serve.mjs`（`playwright.config.ts:24-29`；Python http.server flake 史見 `serve.mjs:4-11`、ADR-014），baseURL `http://127.0.0.1:8888`，不得硬編其他 port。
- **Dashboard 卡片斷言——主 agent 裁決採 w5 選項 (b)**：`dashboard.assignments.js:33-51` 為靜態陣列，新建 XROLE 任務不會自動出現在 Dashboard 卡片；主線**跳過** Dashboard 卡片斷言（節點 2 的待辦一致性由既有 F-03/F-10 finding 追蹤），避免以修改 seed 資料換取斷言而污染其他 96 個測試。
- **仲裁者身分 URL 進入方式**：列為 **Generator 階段前置驗證**——實作前先對照 `annotation-workspace-arbitration.spec.ts` 全文確認 R03 的 query params 組合，不在本規劃文件假定。
- **`min_reviewers=2` 的推導依據**（w7 §5.3，記錄於 fixture 章節以防日後設定漂移）：N=2 時嚴格多數需 `>1`，1:1 必平手不收斂，保證 `disputed` 停留至仲裁；若日後改為奇數 ≥3，須刻意構造全數分歧或未過半分佈，否則多數收斂會讓仲裁情境失效。

## 5. 每個關鍵動作的四類斷言

| 斷言類別 | 原型層做法 | 限制 |
|---|---|---|
| UI | `data-testid`／`id` 狀態斷言；a11y 面向補 `getByRole` 可及名稱（w6 A11Y-04/05） | — |
| URL | `page.url()` query string 契約 | — |
| 資料狀態 | `page.evaluate` 呼叫 `LabelSuiteAnnotationWorkspaceData` 匯出函式（`getSampleStatus`／`getReviewUnitStatus`／`getArbitrationState`／`getDisputeItems`／`getSampleHistory`） | 是「無網路層的本地 API」，不得宣稱驗證了後端 API 或 DB 狀態 |
| Audit log | **一律 N/A** | prototype 全庫無 audit 概念（矩陣節點 15 = Requirement gap → `[Spike]`）；`work-log`／`review-history` 僅為顯示層佐證，不得誤讀為稽核驗收 |

## 6. 錯誤與邊界情境（w6 摘要）

32 個編號情境，分佈：操作連續性 CONT-01～05／重複提交與不可逆 DUP-01～08／失敗復原 FAIL-01～05／並發近似 CONC-01～03／無障礙 A11Y-01～05／i18n+responsive I18N-01～03、RESP-01～03。

- **28 項原型層可驗**（含 3 項「近似並發」——localStorage 無 `storage` 事件監聽，跨 Page 變化須手動 reload 對帳，w6 §4）。
- **4 項待缺陷修正後啟用**：DUP-08（F-07 完成無確認）、A11Y-01/02（F-11 modal focus trap）、I18N-03（F-08-a 文案）——修正 PR 合併前不可標為可執行任務。
- **6 項正式 E2E 才可驗**（FAIL-D01～D06：API 逾時／網路錯誤／5xx／JWT 過期／Celery 失敗／樂觀鎖），原型層不設計斷言。
- 範疇提醒（w6 §8-4 保留）：`#deleteTaskModal` 在功能面「有二次確認」（DUP-07 正向對照）與無障礙面「缺 focus trap」（A11Y-02）是兩個獨立判定，不得簡化為單一結論。

## 7. 證據保存規則

- 現況：`playwright.config.ts` 僅 `trace: 'retain-on-failure'`，無 screenshot/video。
- **採 w5 提案**：跨角色長流程於 `cross-role/` 範圍局部覆蓋 `test.use({ screenshot: 'only-on-failure', video: 'retain-on-failure' })`（或獨立 `cross-role` project），**不改全域設定**，不影響既有 96 個原子測試。
- 證據公開紀律：附入 issue／報告前須確認畫面不含敏感欄位內容；Critical/High 安全發現一律走私下 escalation，不進公開 artifact。

## 8. IAA gate 與研究方法論聲明（w7 採納）

1. **統計限制聲明（必須逐字保留於實作註解與任何對外報告）**：試標 2 筆 × 3 標記員的合成資料**僅驗證 gate 機制**（指標可讀、徽章格式合法、可退回或進正式）；n=2 下 Krippendorff's Alpha／ICC(2,1)／pairwise F1 方差過大，**不構成也不得被引用為統計有效性驗證**。Demo Paper 呈現 IAA 需 ≥20–30 筆，非本輪範圍（w7 §1.3 全文）。
2. **最小 gate 三層斷言**（w7 §2.2）：數值存在性 → 徽章格式合法（`{x}/{y} 達標`；無資料顯示 `—/{y}` 不得為 `0/{y}`；`free_text` 不入分母）→ PL 可據此確認進正式或退回 `draft`（ADR-022 transition table）。不驗 `017` registry 各公式計算正確性。
3. **Dispute 構造規則**（w7 §3，主線為 `single_label`，逐型擴充時必讀）：判定基準是「審核員 vs 標記員原答案」；`single_dim`/`multi_dim` 嚴格相等無容差；**`entity_recognition` 僅改 span 邊界不觸發差異**（prototype 以 `text+type` 為鍵，015 spec:642 自述已知落差），須改文字或型別。
4. **Gold 規則**：dry_run 情境**不得**斷言任何 gold 產出（015 spec:64 v4.0.0 廢止）；official_run `finalized` 即產 gold 的依據目前僅在 `reviewer-model-redesign.md:75,256`（決策文件層級，015 無獨立 FR）→ 階段四 spec 補完候選。
5. **措辭紀律（anchoring bias）**：審核員是看過標記員答案後判斷（FR-053 seed），驗收文件與論文不得以「reviewer 與 annotator 一致率」暗示雙盲獨立標記一致性（`reviewer-model-redesign.md:289`）。
6. **Data Fairness 邊界**：原型層只能驗 DOM 渲染層防洩漏（`annotation-workspace-data-fairness.spec.ts` 既有模式）；後端 API 層與存取控制層屬正式 E2E；「未映射欄位承載真實正解內容」的強負向測資是既有已知缺口 → 階段四 triage。

## 9. 追溯覆蓋對照（16 節點）

| 節點 | 覆蓋 | 節點 | 覆蓋 |
|---|---|---|---|
| 1 登入 | 原型層以身分參數模擬（§2 分層聲明） | 9 IAA gate | XROLE-09（最小 gate） |
| 2 Dashboard | FAIL-04/05；卡片斷言依裁決跳過（§4） | 10 正式標記 | XROLE-10/11（含隔離斷言） |
| 3 建立 | XROLE-01；CONT-05（新發現） | 11 審核 | XROLE-12～16；CONT-03；DUP-02 |
| 4 上傳三方一致 | XROLE-02 | 12 仲裁 | XROLE-17/18；DUP-05 |
| 5 指引 | XROLE-03；I18N-02 | 13 完成 | XROLE-20/21 🟡；DUP-08 |
| 6 抽樣/審核設定 | XROLE-04 🟡；FAIL-03；DUP-03/04/06 | 14 匯出 | XROLE-22 |
| 7 成員 | XROLE-05/06；CONC-02；RESP-03 | 15 audit | N/A（`[Spike]` 待決） |
| 8 試標 | XROLE-07/08；CONT-01/02；DUP-01 | 16 跨頁一致 | 交接點 A–E；XROLE-23/25；CONC-01/03 |

F-11（modal focus trap）已補登追溯矩陣（回溯節點 #3/#6/#8，見矩陣裁決 #4）。

## 10. 主 agent 整合裁決紀錄

| # | 事項 | 裁決 |
|---|---|---|
| 1 | XROLE-24 狀態 | 由 🟢 改 🟡（w6 DUP-01 證據，見 §3.1） |
| 2 | Dashboard 卡片斷言 | 採 w5 選項 (b) 跳過，理由見 §4 |
| 3 | 仲裁者 URL 身分 | Generator 階段前置驗證，不在規劃層假定 |
| 4 | dispute/仲裁檔案佈局 | 併入主線 spec，不拆檔 |
| 5 | F-09 × XROLE-12 | XROLE-12 只驗正向規則；F-09 洩漏負向情境與矩陣裁決 #3 **合併為單一階段四項目**（定案為 Bug 時再加 XROLE-12b），避免重複建單 |
| 6 | CONT-05（task-new 無草稿持久化） | 不入主線；列階段四 `[Enhancement]` 候選 |
| 7 | w6 六項本輪新發現（CONT-03/CONT-05/DUP-03/DUP-04/DUP-05/FAIL-05） | 階段四建 finding register 時統一編 F-12+ 並逐項查重建單；本輪不預先定 Bug/Enhancement 分類 |
| 8 | w7 建議事項 1–3（最低抽樣提示文案／gold FR 補完／data-fairness 強負向測資） | 全數列入階段四 triage 候選，不阻擋本文件 |
| 9 | w4 §7-1 正式標記分派演算法、§7-2 停用標記員對已指派樣本 | 均為 Requirement gap，列階段四（分派演算法建議 `[Task]` 向 senior-ba 確認；停用行為可併 D2/D3 落地 issue 群） |
| 10 | w4 §7-5 多筆/人的分頁情境 | 刻意的最小資料集設計限制，記錄即可，不擴充本輪 fixture |

## 11. 統一檢查結果（主 agent，2026-08-19）

- **Traceability coverage**：16/16 節點皆有對應處置（§9；節點 15 為明文 N/A + `[Spike]`）。
- **關鍵證據抽查**：`data.js:162-167`（bucket key）、`config.js:2650`（F-08-b）、`task-detail.html:8822-8876`（canPublish/publishComplete）、`:4346-4357`（FAIL-05 靜默 fallback）、`data.js:1581-1599`（DUP-05 votes 累加）、015 spec:64/641-642、017 spec:91-95、redesign:27/256——全部與 repo 現況相符。
- **Placeholder**：本文件與四份附件無 TODO/TBD 佔位殘留。
- **內部連結**：附件與決策文件連結均為相對路徑且檔案存在。
- **Mermaid**：§3 流程圖為合法 `flowchart LR` 語法。
- **二元可測性**：25 個原子測試各自有單一可判定斷言；🟡 項目明確標注現況必 FAIL 的原因與轉 Green 條件。

## 12. 驗收完成定義（本規劃的下游）

實作輪（另案）完成的判準：🟢 20 項全綠；🟡 5 項在對應缺陷修正／FR 落地 PR 合併後轉綠；w6 的 28 項原型層情境依「沿用／擴充／新增」關係落入既有或新 spec 檔；全程 `assertNoPageErrors` 無未預期 JS 例外。
