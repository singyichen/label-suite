# 任務清單：guideline-section-anchors

> **Apply 前硬閘**：先執行 `openspec validate guideline-section-anchors --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證證據並更新 checkbox 的角色。

> **三個堆疊 PR 群組**：群組 1（錨點存在）與群組 2（引用解析與跳轉）各自是一個可獨立審閱的目的，各動 2–3 個生產檔，皆低於單一 PR 5 檔上限；群組 3 只做正典回寫與 archive。群組 1 合併後群組 2 才 rebase 上去，群組 3 為最終 PR 群組，gate 4 僅於該群組收集。
>
> **TDD 角色分工**：`senior-qa` 擁有每個 Red 任務，必須先提交並跑出預期失敗，才可開始配對的 Green；實作者不得為了讓測試變綠而弱化或改寫 Red 契約。主 session 驗證 Red 證據與 Green exit-0 證據，並且是唯一更新本檔 checkbox 的角色。
>
> **序列前提**：本變更寫正典 015 的 Changelog，接續 issue #864（v6.13.0）之後。本次會改動 `design/prototype/pages/`，因此群組 1 與群組 2 於 rebase 之後都必須自行重生 `design/system/screen-inventory.md`。本 worktree 專屬 `PW_PORT=8984`。
>
> **不在範圍**：審核員指南 `REVIEWER_GUIDELINE_SENTIMENT_BOUNDARY_ZH` 與 `reviewerGuidelineText`（另一個呈現面，且既有測試對其摘要文字有斷言）、新增任務精靈與 task-detail 的指南編輯介面、提交資料的新欄位、FR-096 的揭露閘門。

---

## 1. PR-620-A — 指南 Markdown 標題取得穩定錨點

> **相依與平行性**：嚴格依序 1.1 → 1.2 → 1.3 → 1.4 → 1.5，不使用 parallel markers。本群組只讓錨點**存在**，不處理理由中的引用與跳轉後的定位（群組 2）。

**故事目標**：SC-005D — 點擊右欄 Markdown 檔後於頁面內開啟預覽 modal、內文以 HTML 呈現（`# ` 標題成為 `<h1>`）。該渲染結果目前的標題不帶任何錨點，使任何「跳到某一段」的需求都沒有著力點。

- [x] 1.1 執行 `openspec validate guideline-section-anchors --type change` 與 `scripts/check-sdd.sh`，分別記錄 OpenSpec schema validation 與 Project SDD lint 之 exit code。兩者皆 exit 0 才可進入 1.2。 [@main]
  - 閘門 1 → exit **0**（`Change 'guideline-section-anchors' is valid`）。
  - 閘門 2 → exit **0**，0 error／15 warning（皆為既有 legacy 與 review 類：`LEGACY_SPEC_HEADING`、`STATUS_EXTERNAL_STATE`、`GOAL_SEMANTIC_REVIEW`、`TASK_RED_EVIDENCE_REVIEW`，非本變更引入之缺陷）。
  - 首跑為 3 個 `TASK_RED_OWNER` error：lint 的 Red／Green 配對是一對一消耗，一組寫了 2–3 條「Green：」卻只有 1 條 Red。依既有先例改為一組僅一條掛 `Green` 字樣、其餘實作行寫成「修改 `path`」，配對即成立。
- [ ] 1.2 Red：新增 `design/prototype/tests/annotation/issue-620-guideline-anchors.spec.ts`，斷言開啟指南 Markdown 預覽後每個標題帶有由標題文字推導之 `id`、重複渲染得到相同 `id`、兩個文字相同之標題取得互不相同的 `id`，並提交跑出預期失敗。 [@senior-qa]
- [ ] 1.3 Green：於 `design/prototype/pages/annotation/annotation-workspace.config.js` 的 `renderMarkdown()` 為 `<h1>`～`<h3>` 產生由標題文字推導之錨點 `id`，同名標題以序號後綴去重；既有輸出標籤、跳脫規則與 URL 白名單一律不變。不得放寬或改寫 Red 契約。 [@senior-frontend]
- [ ] 1.4 修改 `design/prototype/pages/task-management/task-detail.data.js`，為 T014–T016 追加一份帶段落標題的標記判準 Markdown 指南，使示範資料存在可跳轉的目標；其餘任務沿用共用預設清單。 [@senior-frontend]
- [ ] 1.5 執行群組 1 的 gate 3：於 `design/prototype/` 帶 `PW_PORT=8984` 跑 `pnpm typecheck` 與全量 `pnpm playwright test` 兩道獨立閘門，並於 rebase 之後重生螢幕盤點。 [@main]

---

## 2. PR-620-B — 理由中的段落引用可解析並跳轉定位

> **相依與平行性**：嚴格依序 2.1 → 2.2 → 2.3 → 2.4 → 2.5，不使用 parallel markers。本群組以群組 1 已合併為前提——沒有錨點就沒有可指向的目標。

**故事目標**：SC-006 — 關鍵操作皆有歷程可追溯。審核員填寫的理由是責任鏈上的關鍵紀錄，但理由所援引的判準目前無法從回饋回溯到指南原文，標記員讀到「依上述判準」卻找不到那一段，追溯在最後一哩斷掉。

- [ ] 2.1 Red：新增 `design/prototype/tests/annotation/issue-620-guideline-citation-jump.spec.ts`，斷言回饋列的 `[[段落標題]]` 引用渲染為連結且其 `href` 帶對應錨點、點擊後進入工作區會開啟指南並標示該段落、引用不存在之標題時退化為純文字且該筆理由仍完整呈現，並提交跑出預期失敗。 [@senior-qa]
- [ ] 2.2 Green：於 `design/prototype/pages/annotation/annotation-list.html` 將試標歷史回饋列理由中的 `[[段落標題]]` 記號渲染為連結（目標為該樣本工作區網址加錨點），找不到對應標題時退化為純文字，並移除記錄本缺口的既有注解。不得放寬或改寫 Red 契約。 [@senior-frontend]
- [ ] 2.3 修改 `design/prototype/pages/annotation/annotation-workspace.data.js`，將審核流示範種子的審核與仲裁理由改為帶 `[[段落標題]]` 引用記號，使示範資料真的示範得出該行為。 [@senior-frontend]
- [ ] 2.4 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`，處理載入時帶段落錨點的網址——開啟指南、定位至該段落並以可見方式標示之。 [@senior-frontend]
- [ ] 2.5 執行群組 2 的 gate 3：於 `design/prototype/` 帶 `PW_PORT=8984` 跑 `pnpm typecheck` 與全量 `pnpm playwright test` 兩道獨立閘門，並於 rebase 之後重生螢幕盤點。 [@main]

---

## 3. PR-620-C — 正典回寫與 archive

> **相依與平行性**：嚴格依序 3.1 → 3.2，不使用 parallel markers。本群組是最終 PR 群組，gate 4 僅在此收集。

**故事目標**：SC-006 — 關鍵操作皆有歷程可追溯；正典自己若停留在「FR-096 第 4 點部分達成」的狀態，追溯鏈的起點就是錯的。

- [ ] 3.1 更新 `specs/annotation/015-annotation-workspace/spec.md`：FR-096 第 4 點補上錨點推導、引用記號解析與跳轉定位三條規則與其已知上限，FR-020D 補上渲染器層級的標題錨點規則並與 FR-096 互相交叉引用，新增對應之驗收條件，版本升版並補 Changelog 一列。 [@main]
- [ ] 3.2 執行 gate 4：先逐條 grep 複驗本次新增的全部正典引用（FR／AC 編號、章節引用、檔案路徑、issue 編號、逐字引述之條文），再執行 `openspec archive guideline-section-anchors --yes`，並確認衍生檢視 diff 的移除行中 `#### Scenario` 計數為 0。 [@main]
