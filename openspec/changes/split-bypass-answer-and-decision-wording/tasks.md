# 任務清單：split-bypass-answer-and-decision-wording

> **Apply 前硬閘**：先執行 `openspec validate split-bypass-answer-and-decision-wording --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者通過後必須停止，取得使用者對 design.md 待裁定問題 Q1–Q4 的確認後，才可進入 Stage 1 `/opsx:apply`。主 session／team lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。

> **群組間序列**：1 → 2，不並行，每一群組為一條堆疊 PR。
>
> **規模拆分 `[Principle: X]`**：本變更共 10 個 prototype 產品檔，超過單一 PR 5 檔上限，因此拆成兩個各 5 檔的群組。群組 1 在 `shared/sidebar.js` 建立兩套語彙的唯一來源，並完成審核面全部標籤；群組 2 處理任務設定面的答案值與提到決策的敘述句，最後收尾正典回寫與 archive。群組 2 讀取群組 1 建立的來源，因此必須疊在群組 1 之上。
>
> **各群組共同規則**：每個動到 `design/prototype/pages/` 的群組，都必須在 rebase 之後、推送之前重生 `design/system/screen-inventory.md`（產生檔，內嵌 pages 最後一次變更的 commit，rebase 一次就過期）。

---

## 1. PR-811-A — 審核面：建立兩套語彙的唯一來源並改寫全部標籤

> **相依與平行性**：本群組嚴格序列 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8；不使用 parallel markers。1.1 與 1.2 的 committed Red 必須先於 1.3。本群組只改顯示文案，不改 `REVIEW_DECISIONS`、`HISTORY_ACTIONS`、送出驗證、狀態推導或版面；FR-014P(2) 不動。

**故事目標**：SC-004D — 審核員要能正確完成 `通過 / 修正 / 無法裁決` 三向決策，前提是自己的決策名稱不會與標記員「無法作答」的答案值同字；兩者同字時，審核卡與仲裁 B 選項都會讓人誤讀是誰做了什麼。

- [ ] 1.1 撰寫 `design/prototype/tests/annotation/issue-811-bypass-answer-decision-wording.spec.ts` 作為 Red 契約，zh／en 兩種語言各釘住五件事：審核卡決策按鈕、仲裁版面 B 選項（須為 `B・審核員：無法裁決`、不含 `Bypass` 字樣）、歷程頁籤 `bypassed` 徽章、共用側欄快捷鍵總覽 `B` 列、task-detail 仲裁歷程之 bypass 文案，皆等於共用側欄匯出之決策值來源且為 `無法裁決`／`Cannot adjudicate`；審核卡上標記員原答案之 bypass 顯示與清單 pill 皆等於答案值來源且為 `無法判定 (Bypass)`／`Unable to determine (Bypass)`（精確比對，不用 contains）；缺理由 toast 之 zh 文案為 `請填寫以下輸出類型的審核理由：{list}` 代入後之字串。型別宣告必須使用 local cast，不得新增第二份 `declare global`（重複宣告會撞 TS2717）。先提交此單檔再跑測試，expected failure 必須是上述標籤仍為舊字串（或來源尚不存在），並保存 command、exit 與失敗訊息。 [@senior-qa]
- [ ] 1.2 同步既有回歸斷言至裁定後語彙，只改字串期望值、不改測試結構：`tests/shared/` 之側欄快捷鍵測試、`tests/dashboard/` 兩支審核步驟說明測試（其 dashboard 期望值於群組 2 才會轉綠，本群組內先標註為群組 2 範圍、不在此改），以及 `tests/annotation/` 下斷言決策值、仲裁 B 選項、狀態軌分支標籤或審核說明之各支（issue-525、annotation-review-status-track、issue-596 unit-context／history-chain／finalized-card／arbitration、issue-550、issue-520、issue-399、issue-453、issue-753、issue-810、issue-750）；`issue-809` 兩處 contains 比對改為精確比對答案值。先提交再跑，保存「舊實作下這些斷言失敗」的證據。 [@senior-qa]
- [ ] 1.3 Green：修改 `design/prototype/pages/shared/sidebar.js`，新增兩套語彙（答案值、決策值，zh／en）之唯一定義並經 `window.LabelSuiteSharedSidebar` 匯出；快捷鍵 `B` 說明（兩種語言的字典值與靜態 fallback HTML）改讀決策值，不得放寬或改寫 Red 契約。 [@senior-frontend]
- [ ] 1.4 修改 `design/prototype/pages/shared/annotation-history.js`，`ACTION_LABEL.bypassed` 改讀決策值來源（此表現況僅中文，不在本單擴充英文）。 [@senior-frontend]
- [ ] 1.5 修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：`reviewBypassLabel` 改讀決策值來源；刪除 `arbitrationChoiceBBypass`，`arbitrationBChoiceText()` 之 bypass 分支改以 `arbitrationChoiceB` 加冒號加決策值組字（與 modify 分支同一規則）；`BYPASS_LABEL_ZH`／`BYPASS_LABEL_EN` 與 `reviewOriginalAnswerBypass` 改讀答案值來源；`reviewNote` 與 `trackBranchDiffering` 兩種語言之敘述句把決策名改為 `無法裁決`／`cannot adjudicate`；`toastReasonRequired` 鍵名不變，zh 文案改為 `請填寫以下輸出類型的審核理由：{list}`、en 對應補上 `review`。 [@senior-frontend]
- [ ] 1.6 修改 `design/prototype/pages/annotation/annotation-list.html`，`reviewBypassPill` 兩種語言改讀答案值來源（英文因而由 `Bypassed (cannot determine)` 改為 `Unable to determine (Bypass)`）。 [@senior-frontend]
- [ ] 1.7 修改 `design/prototype/pages/task-management/task-detail.html`，`arHistoryBypass` 兩種語言改讀決策值來源。 [@senior-frontend]
- [ ] 1.8 執行 code/test gate：於 `design/prototype/` 帶本 worktree 專屬 `PW_PORT` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（全量，不得只跑子目錄），兩者預期 exit `0` 且分開記錄——它們是兩道獨立閘門；rebase 後再執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交。 [@main]

---

## 2. PR-811-B — 任務設定面與敘述句，並收尾正典回寫

> **相依與平行性**：本群組疊在群組 1 之上，嚴格序列 2.1 → 2.2 → … → 2.9；不使用 parallel markers。2.1 的 committed Red 必須先於 2.2。2.8 的正典回寫必須在 2.1–2.7 全數完成、code review 與使用者確認通過後才執行。

**故事目標**：SC-004D — 決策名改為 `無法裁決` 之後，任務設定面的答案值與提到審核決策的說明句也必須同步，否則負責人設定 `allow_bypass` 時看到的名稱、儀表板與示範指引描述的決策名，會與審核員實際按下的按鈕不一致。

- [ ] 2.1 撰寫 `design/prototype/tests/task-management/issue-811-bypass-wording-task-surfaces.spec.ts` 作為 Red 契約，釘住四件事：task-new 輸出類型設定之 `allow_bypass` toggle 兩種語言文案（zh 維持 `允許無法判定 (Bypass)`，en 依 design.md Q2 裁定值）、task-new 預覽 chip 兩種語言皆等於共用側欄匯出之答案值來源、儀表板審核步驟說明兩種語言皆不含 `無法判定`／`unable to determine` 且含 `無法裁決`／`cannot adjudicate`、task-detail 三份示範指引文字不含 `無法判定` 而含 `無法裁決`。型別宣告必須使用 local cast。先提交此單檔再跑測試，expected failure 必須是上述文案仍為舊字串，並保存 command、exit 與失敗訊息。 [@senior-qa]
- [ ] 2.2 Green：修改 `design/prototype/pages/task-management/task-config.data.js`，`BYPASS_FIELD` 之 zh／en 文案改由 `允許`（`Allow`）加答案值來源組成，en 依 design.md Q2 裁定值；不得放寬或改寫 Red 契約。 [@senior-frontend]
- [ ] 2.3 修改 `design/prototype/pages/task-management/task-config.engine.js`，兩處預覽 chip 之行內字面值改讀答案值來源。 [@senior-frontend]
- [ ] 2.4 修改 `design/prototype/pages/task-management/task-detail.data.js`，三份示範指引敘述句中的決策名由 `無法判定` 改為 `無法裁決`。 [@senior-frontend]
- [ ] 2.5 修改 `design/prototype/pages/dashboard/dashboard.i18n.js`，`stepReviewer2Desc` 兩種語言之決策名改為 `無法裁決`／`cannot adjudicate`。 [@senior-frontend]
- [ ] 2.6 修改 `design/prototype/pages/dashboard/dashboard.html`，`stepReviewer2Desc` 之靜態 fallback 文字與 2.5 之 zh 值一致。 [@senior-frontend]
- [ ] 2.7 執行 code/test gate：於 `design/prototype/` 帶本 worktree 專屬 `PW_PORT` 執行 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs typecheck` 與 `node ~/.cache/node/corepack/v1/pnpm/12.3.4/bin/pnpm.mjs playwright test`（全量），兩者預期 exit `0` 且分開記錄；rebase 後再執行 `node scripts/gen-screen-inventory.mjs` 重生盤點並提交。 [@main]
- [ ] 2.8 更新 `specs/annotation/015-annotation-workspace/spec.md` 完成 gate 4 回寫：版號 bump（建議 MINOR 6.7.0 → 6.8.0，以當下最新版號接續）與 Changelog 補一列；FR-092 補 v6.8.0 修訂段（兩套語彙與唯一來源約束）並新增一則 AC（編號接續第 3 章現行最大者）釘住「答案值與決策值各自同源且互不混用」；FR-083 與 AC-3.47 之現行鍵名改為 `toastReasonRequired`，以 v6.8.0 修訂段寫入；其餘活條文中作為決策標籤的 `無法判定` 改為 `無法裁決`，範圍以 `/usr/bin/grep -n '無法判定'` 逐條盤點，至少涵蓋流程圖說明、AC-3.8、AC-3.51、AC-3.53、AC-3.54、元件表、AC-6.3、AC-4.52、AC-4.54、AC-4.55、FR-014、FR-014B、FR-044、FR-053、FR-054、FR-061、FR-064、FR-070、FR-016A、FR-089、FR-092、SC-004D；描述定案結果之「無法判定」依 design.md Q1 裁定處理；已被取代的條文（如 AC-3.37）、條文內記錄舊版的修訂段與 Changelog 舊列逐字保留。 [@main]
- [ ] 2.9 更新 `specs/task-management/013-task-new/spec.md`：FR-003j 之英文 toggle 引文改為 design.md Q2 裁定值，版號 PATCH bump（8.1.0 → 8.1.1，以當下最新版號接續）並於 Changelog 補一列；僅在 Q2 裁定改變英文文案時執行，否則於本項記錄「不適用」。 [@main]
- [ ] 2.10 執行 `/opsx:archive split-bypass-answer-and-decision-wording`，產生衍生檢視後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入的 canonical citation（FR-086、FR-014B、FR-051、FR-054、FR-061、FR-016A、FR-064、FR-070、FR-083、FR-092、FR-094、AC-3.47、新 AC、SC-004D、issue／PR 編號），確認每一條都可被個別定位；archive 指令需使用者明確授權後才執行。final merge 後才更新 `specs/STATUS.md`。 [@main]
