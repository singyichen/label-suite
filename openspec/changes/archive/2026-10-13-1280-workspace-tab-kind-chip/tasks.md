# 任務清單：1280-workspace-tab-kind-chip

> 主 session／per-issue lead 是唯一可驗證 Red／Green evidence 與更新 checkbox 的角色。Apply 前先執行 `openspec validate --changes --no-interactive` 與 `scripts/check-sdd.sh`。
>
> 兩個堆疊 PR 群組：G1 尺寸（分支 `feat/1280-tab-sizing`，基底 `main`）→ G2 標題組成＋archive（分支 `feat/1280-workspace-tab-kind-chip`，堆疊於 G1）。Archive／正典回寫只在 G2。issue 驗收項 1～12 是 issue 層編號，與正典情境編號無關；正典新情境於 gate 4 編號。

## 1. PR-1280-G1-TAB-SIZING — 頁籤字級、寬度與關閉鈕顯示

> **相依與平行性**：本群組嚴格序列，不使用 parallel markers；committed Red 必須先於 Green。

**故事目標**：SC-015 — 頁籤寬度隨內容伸縮、字級與圖示縮小、關閉鈕只在作用中與 hover／focus 時可見（issue 驗收項 6～8）。

- [x] 1.1 Red：改寫 `design/prototype/tests/shared/workspace-tabs-visual.spec.ts` 第一個 describe 的「every open tab has equal computed width」案例（本次刻意推翻的固定寬度契約）為：每顆頁籤 computed width 落在 104px～220px 內、短標題窄於長標題、長標題 .workspace-tab-label 仍 ellipsis；先提交，再執行並記錄預期失敗 [@senior-qa]
- [x] 1.2 Red：新增 `design/prototype/tests/shared/workspace-tabs-sizing.spec.ts`：TAB_CAP（8）個頁籤同排且各自寬度不小於 min、.workspace-tab 12px／500、.workspace-tab-icon 14px、關閉鈕 16px、非作用中關閉鈕 visibility: hidden 而 hover 與 :focus-within 時 visible、作用中永遠可見、.workspace-tab-bar 維持 gap: 0／padding: 0／1px 右分隔線；先提交，再執行並記錄預期失敗 [@senior-qa]
- [x] 1.3 調整共用 helper `design/prototype/tests/shared/_workspace-tabs-helpers.ts`：新增點擊關閉鈕前先 hover 該頁籤的輔助函式，供既有規格使用 [@senior-qa]
- [x] 1.4 調整既有規格 `design/prototype/tests/shared/workspace-tabs-a11y.spec.ts`：非作用中頁籤的關閉鈕改為 visibility: hidden 後，點擊前先 hover 該頁籤；實測仍通過則為 no-op 並於 evidence 註明，不放寬任何斷言 [@senior-qa]
- [x] 1.5 調整既有規格 `design/prototype/tests/shared/workspace-tabs-active-visible.spec.ts`：非作用中頁籤的關閉鈕改為 visibility: hidden 後，點擊前先 hover 該頁籤；實測仍通過則為 no-op 並於 evidence 註明，不放寬任何斷言 [@senior-qa]
- [x] 1.6 調整既有規格 `design/prototype/tests/shared/workspace-tabs-close-badge.spec.ts`：非作用中頁籤的關閉鈕改為 visibility: hidden 後，點擊前先 hover 該頁籤；實測仍通過則為 no-op 並於 evidence 註明，不放寬任何斷言 [@senior-qa]
- [x] 1.7 調整既有規格 `design/prototype/tests/shared/workspace-tabs-error-panes.spec.ts`：非作用中頁籤的關閉鈕改為 visibility: hidden 後，點擊前先 hover 該頁籤；實測仍通過則為 no-op 並於 evidence 註明，不放寬任何斷言 [@senior-qa]
- [x] 1.8 調整既有規格 `design/prototype/tests/shared/workspace-tabs-overview-reopen-close-all.spec.ts`：非作用中頁籤的關閉鈕改為 visibility: hidden 後，點擊前先 hover 該頁籤；實測仍通過則為 no-op 並於 evidence 註明，不放寬任何斷言 [@senior-qa]
- [x] 1.9 調整既有規格 `design/prototype/tests/shared/workspace-tabs-unsaved.spec.ts`：非作用中頁籤的關閉鈕改為 visibility: hidden 後，點擊前先 hover 該頁籤；實測仍通過則為 no-op 並於 evidence 註明，不放寬任何斷言 [@senior-qa]
- [x] 1.10 於 `design/prototype/tests/inventory.csv` 為新規格補列，LF only [@senior-qa]
- [x] 1.11 Green：修改 `design/prototype/assets/tokens.css`，以 --workspace-tab-min-width: 104px 與 --workspace-tab-max-width: 220px 取代 --workspace-tab-width，同步改寫註解（兩主題共用） [@senior-frontend]
- [x] 1.12 Green：修改 `design/prototype/pages/shared/sidebar.css` §Workspace Tabs：.workspace-tab 12px／500、內距 6×10、gap 6px、flex: 1 1 0 搭配 min／max 寬度 token；.workspace-tab-icon 14px；.workspace-tab-close 16px 並以 visibility 控制只在 .active、:hover、:focus-within 時可見；不得動 .workspace-tab-bar 的 gap／padding／右分隔線；不得改寫 committed 的測試契約 [@senior-frontend]
- [x] 1.13 更新 `design/system/MASTER.md` §Workspace Tabs：Tab width、Page-kind icon 兩列改寫，新增關閉鈕顯示與字級內距列，Changelog 加一列 [@senior-frontend]
- [x] 1.14 執行 code/test gate：於 `design/prototype/` 執行 typecheck、test:node，以及帶 `PW_PORT=8980` 的受影響 Playwright 規格（新規格與全部 `workspace-tabs-*.spec.ts` 及引用頁籤／側欄的規格），並執行 `scripts/check-sdd.sh`、`scripts/inventory-tests.sh`、`node scripts/gen-screen-inventory.mjs --check`，皆預期 exit 0 [@main]

## 2. PR-1280-G2-TITLE-COMPOSITION — 標題組成與正典回寫

> **相依與平行性**：本群組堆疊於 G1，嚴格序列，不使用 parallel markers。

**故事目標**：SC-015 — 頁籤標題由種類小標籤與對象名稱組成，階段色作用於小標籤（`FR-010`；issue 驗收項 1～5、9、10）。

- [x] 2.1 Red：新增 `design/prototype/tests/shared/workspace-tabs-kind-chip.spec.ts`，以 .workspace-tab-kind 與 .workspace-tab-label 釘住：不同任務的標記頁籤名稱各異；同任務標記與審核小標籤為「標記」「審核」且去重不變；task-detail 三種階段小標籤文字與兩主題 token 色、頁籤本文色一致；dataset-analysis-detail 顯示「分析」加任務名稱；title 與關閉鈕 aria-label 為純文字完整標題；en 介面小標籤與 nameEn 回退；總覽選單與行動版為純文字標題、篩選框可用任務名稱篩到標記頁籤；先提交，再執行並記錄預期失敗 [@senior-qa]
- [x] 2.2 Red：改寫 `design/prototype/tests/shared/workspace-tabs-task-name.spec.ts` 中編碼舊標題字串的斷言為小標籤加名稱的新契約；先提交，再執行並記錄預期失敗 [@senior-qa]
- [x] 2.3 Red：改寫 `design/prototype/tests/shared/workspace-tabs-close-badge.spec.ts` 中編碼舊標題或階段色對象的斷言為新契約；先提交，再執行並記錄預期失敗 [@senior-qa]
- [x] 2.4 調整既有規格 `design/prototype/tests/shared/workspace-tabs-visual.spec.ts` 的階段徽章案例：階段色改斷言於 .workspace-tab-kind 而非整顆頁籤文字色 [@senior-qa]
- [x] 2.5 於 `design/prototype/tests/inventory.csv` 為新規格補列，LF only [@senior-qa]
- [x] 2.6 Green：修改 `design/prototype/pages/shared/sidebar.js`：computeWorkspaceTabLabel() 拆為結構化回傳與純文字組合；名稱快照擴大為所有帶 taskId 的頁面種類；dataset-analysis-detail 名稱經 task-list.data.js 解析；renderWorkspaceTabBar() 插入 .workspace-tab-kind 並移除整顆頁籤的 data-stage-badge 文字色作用；title、aria-label、總覽選單與行動版改用純文字版；不得動去重鍵、TAB_CAP、重開堆疊、快捷鍵 [@senior-frontend]
- [x] 2.7 Green：修改 `design/prototype/pages/shared/sidebar.css`：新增 .workspace-tab-kind（10.5px／600、padding: 1px 5px、border-radius: var(--radius-sm)）與警示、主色、資訊、中性四組語意 token 色，移除 .workspace-tab[data-stage-badge] 整顆頁籤文字色規則，頁籤本文回到 --color-ink-muted／--color-ink [@senior-frontend]
- [x] 2.8 Green：若 `design/prototype/pages/dataset/dataset-analysis-detail.html` 未載入 dataset-analysis-list.data.js，補上該 <script>（先 /usr/bin/grep 確認，已載入則為 no-op 並於 evidence 註明） [@senior-frontend]
- [x] 2.9 更新 `design/system/MASTER.md` §Workspace Tabs：Stage badge 列改寫為作用於小標籤、新增 Kind chip 列，Changelog 補述 [@senior-frontend]
- [x] 2.10 執行 code/test gate：於 `design/prototype/` 執行 typecheck、test:node 與帶 `PW_PORT=8980` 的受影響 Playwright 規格；於專案根目錄執行 `scripts/check-sdd.sh`、`scripts/speckit-tests.sh`、`openspec validate --changes --no-interactive`、`node scripts/check-user-path-map-freshness.mjs`、`scripts/check-spec-artifacts.sh`、`scripts/inventory-tests.sh`、`node scripts/gen-screen-inventory.mjs --check`，皆預期 exit 0 [@main]
- [x] 2.11 更新 `specs/shared/019-workspace-tabs/spec.md` 完成 gate 4 回寫：FR-010 組成規則、AC-1.6 修訂、新情境接續編號、TAB_STAGE_BADGE 註明作用於小標籤；版號 1.2.0 → 1.3.0 與 Changelog 一列（既有列不改寫）；specs/STATUS.md 同步 [@main]

- [x] 2.12 更新 `specs/STATUS.md` shared-019 列至 1.3.0 [@main]

## Pre-merge finalization（在 /opsx:apply 外，NON-CHECKBOX）

所有 apply checkbox 完成、code review 通過後，G2（最終群組）才執行 Source-Verify 與 `/opsx:archive 1280-workspace-tab-kind-chip`。Archive 後依 `docs/sdd-workflow.md` §6.2 逐條 grep 本 change 寫入衍生檢視的 canonical citation（FR／AC 編號、檔案路徑、issue 編號），確認皆可個別定位。final merge 後才將正典移至 `specs/_archive/` 並更新 `specs/STATUS.md` 為 archived。
