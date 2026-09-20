---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #620。FR-096 第 4 點規定「理由中引用之標註指南段落 MUST 可點擊跳轉至該段落」，但 issue #596 群組 7 落實 7.3 時發現**沒有可跳轉的目標**，只能退而把連結指向該樣本的工作區，並於 `openspec/changes/archive/2026-09-01-single-owner-review-relay/tasks.md:162` 誠實標註為部分達成。現行程式碼仍是那個狀態：`design/prototype/pages/annotation/annotation-list.html` 的 `buildDryRunFeedbackRowEl()` 產出的連結 `href` 是 `buildWorkspaceUrl(profile.id, row.sampleId, context)`，注解逐字寫著「no guideline file exposes per-heading anchors」。

**但 issue #620 對現況的描述只對了一半，其診斷因此需要修正。** issue 寫「標註指南目前是一整段換行分隔的純字串」並指向 `design/prototype/pages/task-management/task-detail.data.js:20` 的 `REVIEWER_GUIDELINE_SENTIMENT_BOUNDARY_ZH`——那是**審核員指南**（`reviewerGuidelineText`，呈現於 task-detail 的審核說明摘要）。標記員在工作區看到的指南不是它，而是 `TaskProfile.guidelineFiles` 之 markdown 條目，經 `renderMarkdown()`（`design/prototype/pages/annotation/annotation-workspace.config.js:5107`）渲染為 HTML；該渲染器**早已支援 `#`～`###` 標題並產生 `<h1>`～`<h3>`**（FR-020D 明文列舉）。而 FR-096 的回饋對象是標記員，要跳轉的自然是標記員自己的指南。

**因此段落結構並不缺，缺的只是標題沒有 `id`。** 這把問題從「另造一套段落資料模型」降為「渲染器補錨點」：

- issue 提議的「段落陣列 + 穩定 id 取代單一字串常數」會連帶改寫 `task-management/013` 新增任務精靈的指南 textarea、task-detail 的指南編輯表單與兩處種子，且**以陣列表示 Markdown 是比 Markdown 本身更差的表示法**——作者原本就是用 Markdown 標題在分段。
- 以標題文字推導 slug 當錨點，是 HTML fragment anchor 的原生用法，不新增任何授權面或編輯面資料模型。

**引用側同理，不需要新欄位。** FR-096 第 4 點寫的是「**理由中引用**之標註指南段落」——引用本來就住在理由字串裡。理由是審核員／仲裁者自由填寫的文字，既有提交已持久化該字串；本變更只需定義一個可解析的引用記號（`[[段落標題]]`），不必為提交新增欄位、也不必在審核表單加一個段落選擇器。

## What Changes

- **指南 Markdown 標題取得穩定錨點**：`renderMarkdown()` 為每個 `<h1>`～`<h3>` 產生由標題文字推導之 `id`；同名標題以序號後綴去重，使同一份指南內每個錨點唯一。渲染器的既有輸出（標籤、跳脫規則、URL 白名單）一律不變。
- **示範資料具備可跳轉的段落**：T014–T016 三個審核流示範任務的 `guidelineFiles` 追加一份帶段落標題的標記判準 Markdown，使「跳到該段落」在示範資料上真的有目標；其餘任務沿用共用預設清單。
- **理由中的段落引用可解析並跳轉**：試標歷史回饋列將理由中的 `[[段落標題]]` 記號渲染為連結，`href` 為該樣本工作區網址加上該段落之錨點；工作區載入時若網址帶該錨點，開啟指南並定位、標示該段落。示範種子的審核／仲裁理由改為帶引用記號。
- **FR-096 第 4 點自「部分達成」轉為完整達成**，並移除 `annotation-list.html` 中記錄該缺口的注解。
- **非目標**：不動 `REVIEWER_GUIDELINE_SENTIMENT_BOUNDARY_ZH` 與 `reviewerGuidelineText`（審核員指南是另一個呈現面，且 `design/prototype/tests/task-management/issue-811-bypass-wording-task-surfaces.spec.ts` 對其摘要文字有既有斷言）；不動新增任務精靈與 task-detail 的指南編輯介面；不新增提交欄位；不改 FR-096 的揭露閘門（Data Fairness 逐回合判定不受本變更影響）。

**已知天花板**：錨點 id 由標題文字推導，因此改寫標題會使既有理由中的引用失效。本變更接受此上限並在條文中明寫推導規則——標題改名是真實的內容變更，引用隨之失效是正確行為而非缺陷；若日後需要跨改名存活的引用，才需要作者端顯式 id，屆時再升級。
