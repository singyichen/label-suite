# Issue #180 — 跨角色 Playwright 生命週期驗收規劃（分階段執行進度）

Issue: <https://github.com/singyichen/label-suite/issues/180>
本輪範圍：`account` · `dashboard` · `task-management` · `annotation`（排除 dataset 分析模組）
本階段只產出規劃與驗收文件，不跑 Playwright 測試、不實作產品功能。

工作流報告（完成後提交至本目錄）：

- W1 規格與架構盤點 → `docs/product/e2e/issue-180/w1-spec-arch.md`
- W2 角色旅程與 UX 走查 → `docs/product/e2e/issue-180/w2-ux-journey.md`
- W3 Playwright 測試資產盤點 → `docs/product/e2e/issue-180/w3-playwright-qa.md`

## 階段一：三條平行盤點工作流（read-only）

- [x] W1 規格與架構盤點（senior-ba 視角）— `DONE_WITH_CONCERNS`，報告：`issue-180/w1-spec-arch.md`。11 項 spec conflict（12.8 全數核實＋3 項新發現，含 testing-constitution 推翻自述 source-of-truth ADR 的治理缺口）、4 項 requirement gap；最關鍵：ADR-022 `completed` 前置條件未含 review/dispute/arbitration 完成度
- [x] W2 角色旅程與 UX 走查（senior-uiux 視角，以 prototype 程式碼閱讀方式走查三條角色旅程）— `DONE_WITH_CONCERNS`，報告：`issue-180/w2-ux-journey.md`。11 筆發現（Blocking 2／High 6／Medium 3）；issue 第 8 節 10 項已知風險核實 9 項屬實，敏感欄位防洩漏未發現違規（無需 security escalation）
- [x] W3 Playwright 測試資產與驗收設計盤點（senior-qa 視角）：既有測試覆蓋地圖、多身份模擬機制、跨角色 E2E 設計骨架 — `DONE_WITH_CONCERNS`，報告：`issue-180/w3-playwright-qa.md`，8 項覆蓋缺口；關鍵發現：既有測試無 `storageState`/`newContext` 角色隔離（靠 localStorage bucket key），與 issue「角色獨立 BrowserContext」要求架構衝突
- [x] 主 agent 重新驗證各工作流關鍵證據（抽查引用的檔案與行號）：W1 = ADR-022 completed 條件、E2E 目錄衝突；W2 = F-01 指引 modal 無內容主體、F-08 新舊審核模型並存；W3 = storageState 零使用、trace-only 設定 — 全部與 repo 實況相符
- [x] 階段一檢查點報告：三條工作流皆 `DONE_WITH_CONCERNS`，合計 11 項 spec conflict、4 項 requirement gap、11 筆 UX 發現、8 項測試覆蓋缺口

## 階段二：整合與正典決策（需使用者 checkpoint）

- [x] 整合三條工作流 → 需求追溯矩陣草稿：`issue-180/traceability-matrix.md`（16 節點 × 角色 × Spec 來源 × Prototype 證據 × 判定 × Playwright 處理）
- [x] 彙整所有 Spec conflict（11 項，見 `issue-180/phase2-decision-list.md` 與 W1 §3）：
  - [x] reviewer model：015 已內化 redesign；退回機制為正典（AC-3.15 限 official_run）——主 agent 複核後將 W2 F-08 重分類為「dry_run 未設防護的 Implementation mismatch＋文案過時」
  - [x] 三步／四步：四步為正典（013:53），story-map 過期 → D4 同步 issue
  - [x] 試標 gold：015 v4.0.0 已統一「official_run 才產 gold」，僅產品全景文件未同步 → D4
  - [x] 正式 E2E 目錄 → D1：本輪留在 `design/prototype/tests/`，正式目錄延後為 `[Task]` issue
  - [x] `completed` 前置條件 → D2：採 issue 完整條件，修訂 ADR-022＋014
- [x] 使用者決策清單 → 2026-08-18 已裁決 D1–D4（見 `phase2-decision-list.md` 決策紀錄）
- [x] 依決策更新追溯矩陣與驗收條件（matrix「驗收條件更新」節）

## 階段三：Playwright 驗收文件

四條平行工作流（W4 正典旅程／W5 fixture 基礎設施／W6 錯誤邊界+a11y／W7 方法論審查）草稿收於 `issue-180/phase3-drafts/`；整合層文件為正式產出。

- [x] 撰寫 `docs/product/e2e/cross-role-task-lifecycle-playwright-plan.md`（v1.0，整合層＋四份 annex）
- [x] 正典旅程 Given/When/Then（w4：12 步主線＋25 原子測試，🟢20／🟡5）＋ BrowserContext 分層聲明（共享 context＋每角色一 Page；storageState 留正式 E2E，矩陣裁決 #2）
- [x] deterministic fixture、scenario ID、清理與平行隔離策略（w5：`cross-role/` 目錄、`XROLE-{slug}-{run_id}`、唯一 task_id 天然隔離＋`beforeEach` clear）
- [x] 每個關鍵動作的 UI/URL/資料狀態/audit log 斷言（audit 原型層一律 N/A → 節點 15 `[Spike]`）
- [x] 錯誤情境（w6：32 情境——重新整理/重複提交/失敗復原/近似並發；6 項全端-only 明文排除）
- [x] 證據保存規則（trace 現況＋`cross-role` 局部 screenshot/video 覆蓋提案）＋鍵盤/a11y/i18n/responsive 驗收（A11Y/I18N/RESP 系列；F-11 補登矩陣裁決 #4）
- [x] 主 agent 統一檢查：traceability 16/16、關鍵證據抽查相符、無 placeholder、內部連結有效、Mermaid 合法、二元可測性（plan doc §11）
- [x] nlp-research-advisor 補充 IAA/試標抽樣/仲裁規則檢查（w7：n=2 僅驗 gate 統計聲明、dispute 逐型構造規則、gold 規則、anchoring bias 措辭紀律）

## 階段四：Finding triage 與建立 issues

- [x] 建立 finding register（`issue-180/finding-register.md`：F-01～F-18＋11 項治理面＋10 類不建單處置）
- [x] 逐項查重 open/closed issues（#1–#183 無重疊；#154 作為 F-17 修法先例引用）
- [x] 依 issue #180 第 11 節對應表逐張建立 GitHub issue：#184–#212 共 29 張（bug 6／enhancement 12／task 6／docs 4／spike 1）；無 Critical/High 安全發現，未觸發私下 escalation
- [x] 每張已回報 `ISSUE OPENED: <url> — <summary>`
- [x] issue register 回填 #180（issue comment），每項發現皆有「新 issue／併單／非問題／記錄」處置

---
最後更新：2026-08-19 — 階段四完成（finding register＋29 張 issue #184–#212）；issue #180 全部階段交付完畢
