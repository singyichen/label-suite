# Issue #180 — 需求追溯矩陣（草稿 v1.0）

整合來源：W1（`w1-spec-arch.md`）、W2（`w2-ux-journey.md`）、W3（`w3-playwright-qa.md`）＋主 agent 複核；正典依據含 2026-08-18 使用者決策 D1–D4（`phase2-decision-list.md`）。
判定值域：`一致`／`Spec-defined / Not implemented`／`Prototype-only`／`Implementation mismatch`／`Spec conflict`／`UX finding`／`Requirement gap`。

## 主 agent 裁決紀錄（依 issue 12.1 由主 agent 統一處理的跨文件裁決）

1. **F-08 重新分類**（推翻 W2 原判「新舊審核模型並存衝突」）：015 spec AC-3.15／AC-6.4 明文保留「退回」機制且「僅適用 `official_run`；`dry_run` 無退回個人重標通道」（`specs/annotation/015-annotation-workspace/spec.md:334,443`）。`markSampleRejected` 與 `REVIEW_UNIT_STATUS` 並存是**正典設計**，非衝突。實際缺陷拆為兩項：
   - **F-08-b（Implementation mismatch／Bug）**：`annotation-workspace.config.js:2650` 呼叫 `markSampleRejected(..., currentRunType, ...)` 無 run_type 防護，`dry_run` 亦可退回——違反 015 AC-3.15。
   - **F-08-a（文案過時／Enhancement）**：`dashboard.html:163,180`、`sidebar.js:48,512` 文案僅呈現「通過/退回」二元模型，未反映「獨立審核＋直接修正＋仲裁」全貌。
2. **BrowserContext 策略**（採 W3 建議）：prototype 層驗收採「單一共享 BrowserContext＋每角色一個 Page」＋query params 切換身分（prototype 無後端，獨立 context 會使跨角色狀態斷裂，`w3-playwright-qa.md` §2.3）；issue 原文「角色獨立 BrowserContext／storage state」保留給未來正式全端 E2E（真 JWT session）。驗收文件將明文標注此分層差異。
3. **F-09 補充對照**：015 AC-2.11 定義歷程頁籤含 saved 事件，但**未規範跨審核員可見性**；issue AC 要求「提交前不可看到其他審核員尚未提交的判斷」。`getSampleHistory`（`annotation-workspace.data.js:269-296`）不過濾 `entryStatus` → 判定為 **Requirement gap（spec 未定義）＋實作風險**，列入階段四建單。
4. **F-11 補登**（2026-08-19，階段三 W6 核實）：F-11（`w2-ux-journey.md:196-207`，關鍵 modal 缺 focus trap／初始焦點／焦點歸還）在階段二整合時未被指派矩陣節點，本輪補登——回溯對應節點 #3（`#deleteTaskModal`）、#6（`#riskModal`）、#8（`#wsGuidelineModal`）；驗收情境為 `w6-resilience-a11y.md` A11Y-01／A11Y-02（待缺陷修正後啟用）。
5. **階段三新發現 pointer**（2026-08-19）：W6 核實出 6 項 W1/W2/W3 未涵蓋的邊界情況（CONT-03、CONT-05、DUP-03、DUP-04、DUP-05、FAIL-05，證據見 `phase3-drafts/w6-resilience-a11y.md` §8-2），階段四建立 finding register 時統一編 F-12+ 並逐項查重建單。

## 追溯矩陣

| # | 流程節點 | 角色 | Spec／FR 來源 | Prototype 證據 | 判定 | 缺口／矛盾 | Playwright 處理方式 |
|---|---|---|---|---|---|---|---|
| 1 | 登入／角色入口 | 全角色 | 001 spec；ADR-021（task role 即時查 `task_membership`，不進 JWT） | `login.html:687-736` 任意帳密皆成功；角色靠 Dashboard scenario 切換 | 一致（prototype 已知模擬限制，issue 12.8 已載明） | JWT/RBAC 不可在原型層宣稱已驗證 | 原型層：query param／scenario 切換；正式 E2E：per-role `storageState` |
| 2 | Dashboard 入口／待辦 | PL／A／R | 012 spec:226-241（PL 僅聚合入口）、:273（A 快速繼續）、:315（R 快速審核） | F-03（`dashboard.html:253,318` IAA 數字純文字不可點、與卡片不對帳）；F-04（無排序/篩選）；F-10（task-list seed 全 `draft` vs assignments 進度） | PL 逐列 CTA＝**Requirement gap**（W1 §4.2）；F-03/F-04＝UX finding；F-10＝**Implementation mismatch 候選**（014 v2.7.2 要求同源） | F-03、F-04、F-10 | E2E 各關鍵動作後做跨頁數字對帳 assertion；PL CTA 待 enhancement 落地後補 |
| 3 | 建立專案（四步驟精靈） | PL | 013 spec:53 `TASK_CREATION_STEPS`；PRD FR-T01 | task-new 系列測試 ✅（W3 §1.1） | 一致（story-map 三步驟過期 → D4 同步 issue） | story-map:43；F-11（`#deleteTaskModal` focus trap，裁決 #4 補登） | 既有原子測試＋跨角色 E2E Step 1 |
| 4 | 上傳資料／欄位對應／預覽 | PL | 013 Step 1；014 FR-014h/k（`spec.md:552,555`） | preview 測試 ✅ 但無「上傳筆數＝預覽筆數＝任務筆數」三方一致測試（W3 §1.2） | 一致（spec）；測試缺口 | W3 覆蓋缺口 #1 | 新增三方一致 assertion（E2E 主線必含） |
| 5 | 設定：標籤／規則／指引 | PL | 013 Step 2；014 FR-014l 系列（`spec.md:556-558`） | 設定測試 ✅；F-02：13 種任務共用 VA 示意圖＋`annotation-guideline.pdf` 死連結（`task-detail.data.js:1016-1027`） | F-02＝UX finding＋資產缺失（`assets/guidelines/` 不存在，issue 12.8 已知） | F-02 | 指引檔案存在性 assertion；附件對應任務類型待修正後補 |
| 6 | 試標抽樣／最低人數／審核設定 | PL | 014 FR-010/010d/010q/010s；ADR-022:85 | 設定端測試 ✅；F-06：`canPublish()` 只驗設定值不驗實際成員數（`task-detail.html:8822-8831,5011-5030`） | **Requirement gap → 已決策 D3**（新增阻擋 FR） | F-06；W1 §3.9/§4.3；F-11（`#riskModal` focus trap，裁決 #4 補登） | D3 落地後新增「成員不足→阻擋＋顯示缺 N 位」測試；E2E 含負向情境 |
| 7 | 成員管理 | PL | 014 FR-005~005k；reviewer-model-redesign §7 | 加入/審核指派測試 ✅；「停用標記員」無測試（W3 §1.4） | 一致；測試缺口 | W3 覆蓋缺口 | 補停用標記員原子測試 |
| 8 | 試標啟動＋標記 | A01-A03 | 014 FR-013；015 AC-1.x | 標記流程測試 ✅ 含 `task-detail-dry-run-status-sync`；F-01：強制指引 modal 無內容且全域旗標（`annotation-workspace.html:755-762`、`config.js:2812-2836`） | F-01＝**UX finding（Blocking）**；modal 應任務別＋呈現內容 | F-01；F-11（`#wsGuidelineModal` focus trap，裁決 #4 補登） | E2E：3 標記員 × 2 共同樣本試標；modal 修正後補「強制顯示逐任務」assertion |
| 9 | IAA gate | PL | ADR-022:83-91；014 FR-008a（`spec.md:513`）；017 `OUTPUT_TYPE_IAA_REGISTRY`（最小 contract） | stage-flow 測試涵蓋狀態機層 gate（W3 §1.6）；F-03 待辦入口缺失 | 一致（最小 gate）；完整呈現屬 dataset 邊界 | dataset 016/017 邊界（issue 0 節） | 只驗「指標可用、可判讀、可退回或進正式」最小 gate |
| 10 | 正式標記 | A01-A03 | 014 FR-010f-3（`spec.md:525`）；015 official_run 流程 | 測試 ✅ 深度高；「標記員 A 不可見 B 的結果」無顯式安全 assertion（W3 §1.7） | 一致；測試缺口（隔離斷言） | W3 覆蓋缺口 | 新增跨標記員隔離 assertion（data-fairness 延伸） |
| 11 | 審核（獨立＋直接修正＋official_run 退回） | R01-R02 | 015 FR-051~053（`spec.md:641,643`）、AC-3.15／AC-6.4（退回限 official_run） | review-unit／reviewer／identity 測試 ✅；F-08-b：退回無 run_type 防護（`config.js:2650`）；F-09：歷程不過濾未提交草稿（`data.js:269-296`） | **F-08-b＝Implementation mismatch（Bug）**；F-08-a＝文案過時；F-09＝Requirement gap＋實作風險 | F-08-a/b、F-09 | E2E 以 015 新模型斷言；加「dry_run 不可退回」負向測試（F-08-b 修正後）；R01/R02 盲審隔離 assertion |
| 12 | Dispute／仲裁 | R03 | 015 FR-059~061（`spec.md:664-681`）；014 FR-005k | dispute／arbitration 測試 ✅（W3 §1.9）；爭議池／分派 UI 存在（W2 §3 正向） | 一致 | — | E2E：R01/R02 刻意分歧 → dispute 自動生成 → R03 仲裁 → 狀態同步 assertion |
| 13 | 完成（`completed`） | PL／系統 | ADR-022:89（現行僅標記提交）→ **D2 決策採 issue 完整條件** | F-07：`publishComplete()` 無確認、無前置檢查（`task-detail.html:8870-8876,9199-9202`）；無阻擋測試（W3 §1.10） | **Requirement gap → 已決策 D2**（修訂 ADR-022＋014 新 FR） | F-07；ADR-022/014 修訂 issue | D2 落地後：E2E 斷言「有未解決 dispute／未完成 review unit 時不可完成」＋二次確認 |
| 14 | 匯出 | PL | 014 FR-009/FR-015e~l（`spec.md:514,582-595`） | 匯出測試 ✅（manifest／metadata／toast） | 一致 | — | E2E 終點：匯出成功＋metadata 斷言 |
| 15 | audit log 重建歷程 | 全角色 | ADR-019 僅涵蓋 AI 工作流；使用者操作 audit **無整合正典**（W1 §4.4） | prototype 全庫無 audit 概念（W3 §4.2-2）；work-log 為效能統計非稽核 | **Requirement gap → Spike** | W1 §4.4 | 原型層標記 N/A；正式 E2E 待 Spike 決議後設計 |
| 16 | 跨頁狀態一致性 | 全角色 | 014 v2.7.2（同源要求）；015 FR-055/056（`spec.md:653` 兩處筆數必須相同） | annotation-list 與 Dashboard 共用 seed ✅（W2 §3）；task-list/task-detail 未同步（F-10） | annotation 側一致；task 側＝Implementation mismatch 候選 | F-10 | E2E 每個角色交接點做跨頁對帳 assertion |

## 驗收條件更新（依 D1–D4）

- 本輪一切 Playwright 產出落在 `design/prototype/tests/`（D1）；正式 E2E 目錄另立 `[Task]` issue 於實作前決議。
- 「完成」節點驗收條件採 issue #180 完整條件（D2）；在 ADR-022／014 修訂完成前，對應 E2E 情境標記「Spec-defined（pending revision）」。
- 「試標啟動」節點新增成員不足負向驗收（D3）。
- 驗收文件明文聲明以 013/014/015/reviewer-model-redesign 為準（D4）；PRD/IA/story-map/impact-map/baseline 對應段落視為已知過期。
