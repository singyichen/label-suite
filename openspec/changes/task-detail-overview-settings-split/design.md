# 設計：task-detail-overview-settings-split

## D1. 標頭與分頁列（G1）

- 標頭置於分頁列上方，由單一函式依任務資料渲染：麵包屑 `任務管理 / {task_id}`、H1 任務名稱（Crimson Pro 700／26px）、H1 右側一般文字狀態（13px、`--color-text-soft`）。取代現有固定的「任務詳情」H1 與副標。
- 狀態文字由既有任務狀態與目前回合推導（例：「試標階段 · 第 2 回合」），與概覽判定列共用同一份推導，不另建第二份階段判定（FR-025）。找不到任務時沿用既有找不到任務畫面（issue #200）。
- 分頁列由五個改為六個，順序 概覽／設定／成員管理／標記進度／標記結果／工時紀錄；`#tabOverview` 文字「任務概覽」改為「概覽」，新增設定分頁按鈕。間距 22px，active 為 2px `--color-ink` 底線加 600 字重（此為底線而非 CTA 填色，維護者裁定 2 僅限制 CTA）。沿用既有 `role="tablist"`／`tab`，補齊方向鍵。
- G1 同時建立 `task-detail.panels/settings.html` 空殼，讓設定分頁可被選取而不報錯；內容於 G2 搬入。
- `reviewer` 的分頁列：看得到「設定」、看不到「成員管理」（FR-006）。

## D2. 設定分頁（G2）

- 版面：grid `140px minmax(0,1fr)`、gap 28px。左側純文字導覽（14px、水平置中；active 底色 `--color-white`、600、radius 4px）。原定 active 底色 `--color-slate-50`（淺色 `#F8FAFC`）落在頁面背景 `--color-surface`（`#F5F3FF`）上幾乎無法辨識，2026-10-08 維護者看過模擬圖後裁定改採方案 B：區塊改為白色卡片、active 底色改為 `--color-white`（深色 `#16161F`，可自動翻轉）。
- 右側一次一個區塊，呈現於白色卡片（沿用 `.panel` 的 `--color-white` 底、1px `--color-border`、`--radius-lg`，不加陰影），檢視與編輯狀態外觀一致：標題列（16px／600）加右側「編輯」文字連結；內容為 label／值定義清單，每列 `160px 1fr`、上下 10px、1px `--color-border-muted` 分隔。
- 搬移來源為 `overview.html` 前五個 panel，保留所有 element id、編輯／取消／儲存行為與編輯表單，因此既有以 id 為鍵的測試只需更新導覽步驟（先切到設定分頁與對應區塊）。
- `section` 合法值：`basic`／`labeling`／`guideline`／`sampling`／`review`，預設 `basic` 不寫入網址。slug 為 propose 階段的命名決定（維護者只指定了 `sampling` 一例）。合法值集合必須由區塊清單推導，不另寫第二份清單（FR-019 (4)）。
- 未儲存確認：區塊在編輯且有變更時，切換區塊或分頁先開 `modal-focus.js` 確認；取消則留在原區塊且網址不變。`modal-focus.js` 路徑：`design/prototype/pages/shared/modal-focus.js`。
- reviewer 唯讀：以現有的進入編輯條件為基礎，`reviewer` 一律渲染檢視狀態且不輸出「編輯」連結（不是隱藏，是不渲染）。
- 窄螢幕：< 768px 導覽改為內容上方水平捲動列，不得水平溢出（issue #406）。

## D3. 概覽分頁（G3）

- 判定列：左標題（`trialDecisionTitle`）與說明、右側 `publishActionRow`；CTA 使用 `btn-primary`。理由：深色模式 `--color-ink` 為 `#E2E8F0`（`design/prototype/assets/tokens.css:162`），配白字對比約 1.2:1，且與 `MASTER.md` 的 Primary `#6366F1` 不一致。分隔線 1px，無彩色背景框。
- 數字列：4 欄，移除「已完成試標回合」（`overview.html` 現有 `trialRoundsUsedLabel`）。這是刻意移除，在 FR-027 (2) 明寫；該資訊由標頭狀態文字（回合序）與回合表（列數）承擔，無資訊遺失。
- 樣本分配：沿用 `dataSplitBar`，FR-010p 配色規則不變。
- 試標回合表：七欄；`draft` 無回合列。結果欄僅用文字色。
- stepper：保留但去裝飾，並依新版 SC-019 僅作流程示意。#1126 的無障礙修法須據此調整（stepper 不再是階段權威）。
- 抽樣設定檢視移除三列在 G3 完成（與概覽重排同組，因這三項資訊此時才在概覽完整顯示）。

## D4. Code「套用」按鈕（G4）

- 現況：Code 面板有 `saveCodeBtn`，與區塊標題列的 `settingsSaveBtn` 形成兩個「儲存」。
- 裁定 3：按鈕保留、改名「套用」，只做 Code→Visual；送出只走標題列「儲存」。這與 `task-new` 的 Code 回填行為一致（`specs/task-management/013-task-new/spec.md` FR-003k 之 Code 回填驗證；AC-2.25 之保留最後一份有效 config）。issue 原文「移除 `saveCodeBtn`」改讀為「按鈕改為『套用』，不再承擔儲存」。
- 解析錯誤沿用 `codeErrorBar`、停用「套用」、保留最後有效設定。
- 判斷：013 `task-new` 的同名按鈕標籤目前仍為「儲存」，本 change 不修改 013；兩頁標籤差異是否統一另案處理（見 Open Questions）。

## D5. FR-019 URL 契約

- 新增 `settings` 頁籤值與 `section` 參數：查詢參數由 15 個增為 16 個。`section` 不帶頁籤前綴，是 FR-019 前綴規則的明文例外（與 `tab` 同屬頁籤層級參數）。
- 寫回仍用 `history.replaceState()`；`tab` 非 `settings` 時移除 `section`；`reviewer` 直連 `tab=settings` 合法不導回。

## D6. 受影響的既有測試

既有 `design/prototype/tests/task-management/` 中與概覽結構耦合者需隨所屬群組更新導覽步驟，例如 `task-detail-settings-edit.spec.ts`、`task-detail-overview-edit.spec.ts`、`task-detail-sampling-edit.spec.ts`、`task-detail-review-settings.spec.ts`、`task-detail-stage-flow.spec.ts`、`task-detail-tabs-partials.spec.ts`、`task-detail-run-control-i18n.spec.ts`、`task-detail-mobile-layout.spec.ts`。不得弱化或刪除既有斷言；若斷言因「任務概覽」改名或區塊搬家而失效，在對應 Red 測試中以新位置重寫並在 commit message 說明取代關係。

## D7. 拆分理由（Principle X）

四組依序：G1 標頭與分頁列、G2 設定分頁搬移、G3 概覽重排、G4 Code 套用與回寫。每組的產品檔案 ≤ 3 個，且每組 prototype 都可獨立通過既有測試。`task-detail.html` 為共用熱點檔，不平行開工。G4 才承載 Source-Verify、`/opsx:archive`、正典回寫（版本號與 Changelog）與 `specs/STATUS.md`。

## Open Questions

1. `section` 的 slug 命名（`labeling`、`guideline` 等）為 propose 階段決定，維護者若偏好其他命名，於 G2 Red 前修訂本 change。
2. 013 `task-new` 的 Code 按鈕標籤是否一併改為「套用」，不在本 change 範圍。
