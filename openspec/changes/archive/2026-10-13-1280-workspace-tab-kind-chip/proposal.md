---
對應 Spec: specs/shared/019-workspace-tabs/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1280
基準版本: 1.2.0
目標版本: 1.3.0
---

## Why

工作頁籤目前只能看出「頁面種類」，看不出「對象」。同時開兩個標記作業時，兩顆頁籤都顯示「標記作業」，只能靠滑過去看 tooltip 才知道是哪個任務；任務詳情雖然帶任務名稱，但「試標 R1」接在名稱前面，在 180px 固定寬度下名稱只剩 5～6 個字就被省略號吃掉。維護者（2026-10-12）以 NoteCraft 分頁為參照，要求字級小一點、一眼就能分辨每個頁籤是什麼，並在三個畫面方案中裁定採方案 B「單行・內容優先」。

正典 `specs/shared/019-workspace-tabs/spec.md` v1.2.0 的 `FR-010` 已要求「頁籤標題必須能分辨頁面種類與對象（如任務名稱）」，但只對 `task-detail` 規定階段標示，沒有定義其他頁面種類的標題組成；現行 `computeWorkspaceTabLabel()` 對 `annotation-workspace` 只回傳「標記作業／審核作業」，實際上沒有達到 `FR-010` 的字面要求。本次把標題組成規則補齊（種類小標籤＋對象名稱），並一併調整字級與寬度。

**範圍判定**：全部屬 `FR-010` 的修訂與補齊，未新增、移除或推翻任何 FR／AC，分級 MINOR（1.2.0 → 1.3.0）。`AC-1.6` 只調整「警示色／主色」的作用對象（整顆頁籤文字 → 種類小標籤），階段與任務名稱可辨識的意圖不變。字級、寬度區間、關閉鈕顯示時機屬純視覺規格，比照 `1099-workspace-tabs-overview-menu` G1 的前例，不新增 FR，token 與尺寸定案於 `design/system/MASTER.md` §Workspace Tabs。issue 中「頁籤寬度由固定 180px 改為隨內容伸縮」所推翻的是 `workspace-tabs-visual.spec.ts` 的測試契約與 MASTER.md 的 token，正典 `spec.md` 內沒有任何固定寬度條文（已以 `grep` 確認 `固定寬度` 僅出現在 Changelog 敘述）；該測試契約由 `senior-qa` 於 Red 階段改寫，不由實作 agent 繞過。

不走 Lightweight Path：`FR-010` 條文改寫屬需求修改，且生產檔超過 2 個。

**Frontend Ready Gate（九項）**：

1. 通過：正典已有功能目標、FR／AC／SC 與依賴。
2. 通過：Prototype Traceability 已連到 `sidebar.js`／`sidebar.css` 與 `design/prototype/tests/shared/`。
3. `N/A`：共用殼層元件，不是獨立 route，沒有角色 allowlist；顯示對象名稱沿用既有頁籤列的可見範圍。
4. `N/A`：本次不新增 loading／empty／error 狀態；名稱解析失敗時沿用既有三段回退（即時查詢 → 快照 → 原始 `taskId`）。
5. 通過：沿用既有 `data-testid="workspace-tab"`、`role="tab"`；新增 `.workspace-tab-kind` 選擇器，由本 change 的 Red 規格鎖定。
6. 通過：標題組成表（種類小標籤 zh／en、對象名稱來源）已寫入 `FR-010` delta；名稱由殼層經 `task-list.data.js` 既有 `nameZh`／`nameEn` 解析（與 `dataset-analysis-list.data.js` 同源 id 一致）。
7. 通過：zh／en 兩語系（驗收項 9 對應情境）、`aria-label`／`title` 完整文字、375px 以下沿用總覽選單、色彩只用語意 token（兩主題）。
8. 通過：屬 `shared` 模組，`frontend/**` 實作為後續階段（spec 019 已註明原型先行）；Storybook scope 不在本次。
9. `N/A`：頁籤列是導覽殼層，沒有「完成後去向」型目標；`design/system/user-path-map.html` 不涵蓋此元件，無 F3／F4 命中。

**排程與依賴**：issue #1280（2026-10-13 維護者恢復排程）與 #1305（改 014）、#1317（改 spec 模板）同一波，三張碰的檔案互不重疊。

## What Changes

- **修訂 `FR-010`**：頁籤標題 MUST 由「種類小標籤（kind chip，獨立 DOM 節點 `.workspace-tab-kind`）＋對象名稱（既有 `.workspace-tab-label`）」組成；各頁面種類的小標籤與名稱來源依 delta 之組成表。無對象的頁面種類（`dashboard`、`profile`、`task-list`、`task-new`、`annotation-list`、`dataset-analysis-list`、`user-management`、`role-settings`）不顯示小標籤，名稱沿用既有頁面種類名。任務名稱解析沿用既有三段回退，名稱快照寫入條件由「只有 `task-detail`」擴大為「所有帶 `taskId` 的頁面種類」。
- **純文字版標題**：`title` 屬性、關閉鈕 `aria-label`、總覽選單列、行動版選單一律使用「小標籤＋空格＋名稱」純文字，不渲染小標籤 DOM；`FR-023` 的篩選比對純文字版，因此輸入任務名稱也能篩到標記作業頁籤。
- **`TAB_STAGE_BADGE` 作用對象**：語意色不變（試標＝警示色、正式＝主色），但從整顆頁籤文字改為小標籤；審核模式用資訊色，其餘種類用中性色；頁籤本文一律回到 `--color-ink-muted`（非作用中）／`--color-ink`（作用中）。
- **`AC-1.6` 同步修訂**：階段色作用於小標籤。
- **視覺尺寸（不新增 FR）**：`.workspace-tab` 字級 13px → 12px，內距 8×16 → 6×10、gap 4px → 6px；圖示 16px → 14px；關閉鈕 18px → 16px 且只在作用中與 `:hover`／`:focus-within` 時可見（`visibility`）；寬度由固定 `--workspace-tab-width: 180px` 改為 `flex: 1 1 0` 搭配 `--workspace-tab-min-width: 104px`／`--workspace-tab-max-width: 220px`（兩主題共用）。
- **檔案**：`design/prototype/assets/tokens.css`、`design/prototype/pages/shared/sidebar.css`、`design/prototype/pages/shared/sidebar.js`（必要時含 `dataset-analysis-detail.html` 載入名稱資料）、`design/system/MASTER.md`；測試位於 `design/prototype/tests/shared/`。
- **正典回寫（最終群組）**：`FR-010` 組成規則、`AC-1.6` 修訂、新增對應情境與 `SC`、`TAB_STAGE_BADGE` 常數註明作用於小標籤、關鍵實體 `title` 欄位說明、Prototype Traceability；版號 1.2.0 → 1.3.0、Changelog 一列、`specs/STATUS.md` shared-019 列更新。
- **PR 拆分（兩個堆疊群組）**：G1 尺寸與寬度（`tokens.css`、`sidebar.css`、`MASTER.md`）；G2 標題組成（`sidebar.js`、`sidebar.css` 小標籤樣式、`MASTER.md` 小標籤列）與最終 archive／正典回寫。各群組皆在 5 檔／300 行門檻內。

**非目標**：

- 不改去重鍵對照表（`FR-006`）、`TAB_CAP`／淘汰規則、重開堆疊、快捷鍵、以 `title` 做 tooltip 的機制、hover／active 背景 token、`--color-tab-*` token。
- 不做 `frontend/**` React 實作。
- 不重排總覽選單與行動版選單的版面，只換文字來源。
- 不做雙行頁籤（方案 C）。
- 不統一 `task-list.data.js` 與 `dataset-analysis-list.data.js` 的任務名稱資料來源，本次只查詢。

## Capabilities

`shared` — 工作頁籤標題組成（種類小標籤＋對象名稱）與頁籤尺寸視覺規格。

## Constitution Check

- **Generalization-First**：小標籤文字來自頁面種類與模式的對照表、名稱來自既有任務資料全域，不含任何任務 ID 或任務類型專屬分支。
- **Data Fairness**：不涉及測試集答案或 ground-truth 顯示；顯示的只有任務名稱與頁面種類。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則為非必要項，不另附。
