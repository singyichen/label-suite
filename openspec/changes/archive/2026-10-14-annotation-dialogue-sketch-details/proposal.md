---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1378
基準版本: 015 v12.8.0
目標版本: 015 v12.9.0
---

## Why

issue #1378 把草圖 artifact（https://claude.ai/artifact/B3fsqSYVQR2odnS987zGgE）裡對話串的細節補進正典。013 v8.6.0（PR-A，已 archive）已讓建立者能宣告 `dialogue_fields.reply_to`；本 change 是第二段，把 015 工作區「整合預覽」的顯示補上：頭像與標頭行版面、回覆縮排與「跨發言 · 回應 #n」標記、「顯示已標實體／純文字」切換，以及 T013 種子的 `reply_to`。

維護者已裁定（2026-10-14）：標記與縮排只在該則發言的 `reply_to` 對應到同一樣本內**另一則**發言的發言編號時出現；`reply_to` 指向自己視為無效；不由實體、關係或 `@名字` 推測；T013 種子宣告 `reply_to`，且至少一則回覆前一則。

#1378 原本是單一 PR，但產品檔案超過 5 個，經維護者裁定拆為兩個堆疊 PR：本 change（PR-B1）做 FR-107 的顯示與切換；FR-106 左欄清單的發言者前綴與筆數小標籤（草圖第 4 項）延後至 #1378 PR-B2，PR-B2 另開 change 堆疊其上。

**是否需要存在（YAGNI 檢查）**：需要。維護者已明確裁定要做，且缺少顯示端時，PR-A 新增的 `reply_to` 設定沒有任何可觀察效果。

**Generalization-First（NON-NEGOTIABLE）**：欄位名稱一律取自 `dialogue_fields`；頭像顏色由發言者文字雜湊決定，不依發言者名稱或任務編號硬編。

**Data Fairness（NON-NEGOTIABLE）**：只渲染角色為 Input 的欄位，不新增任何讀取 Output／Evidence 欄位的路徑；回覆關係只看 `reply_to` 子欄位。

**Frontend Ready Gate 九項紀錄**

1. 通過：015 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：015 Prototype Traceability 已連到 `annotation-workspace.html`、`task-config.engine.js` 與對應測試。
3. `N/A`：不新增 route，沿用工作區既有 route 與角色白名單。
4. 通過：無 `reply_to`、無效 `reply_to`、`speaker` 為 `null` 的退化行為見 delta 第 11、12 點與 AC-2.41。
5. 通過：新增 `data-testid` 於 `design.md` D3 列出，Red 與實作共用。
6. 通過：`reply_to` 有效性規則見 `design.md` D1；無新增錯誤情境（無效即不縮排）。
7. 通過：切換為 `role="button"`、`tabindex="0"` 的元素並以 `aria-pressed` 表示狀態，Enter／Space 可操作（工作區預覽區會改寫區內原生 `<button>` 的 testid，故不用原生按鈕）；字串進 `TASK_CONFIG_I18N` zh／en。
8. 通過：屬 `task-config.engine.js` 共用引擎，無新增 shared 元件；Storybook 不適用（prototype 階段）。
9. 通過：切換只改變顯示，不改變頁面去向；`design/system/user-path-map.html` 無 F3／F4 命中新增。

## What Changes

- **修訂 FR-107**：`dialogue_fields` 形狀由 `{text, speaker, utt_id}` 擴為 `{text, speaker, utt_id, reply_to}`（對齊 013 v8.6.0）；新增第 11 點（發言版面：頭像、標頭行、文字另起一行）、第 12 點（回覆縮排與「跨發言 · 回應 #n」標記，含無效 `reply_to` 的退化）、第 13 點（顯示已標實體／純文字切換）。
- **新增 AC-2.39 ~ AC-2.43**：版面、有效 `reply_to`、無效 `reply_to`（缺漏、找不到、指向自己）、切換、T013 種子。新增 AC 與所屬條文同置於 FR-107 的修訂區塊，沿用 #1358 的做法。
- **T013 種子**：`dialogue_fields` 補 `reply_to`，`absa-001` 的發言補 `reply_to` 值（至少一則回覆前一則）。
- **延後**：FR-106 左欄清單的發言者前綴與筆數小標籤、移除 FR-106 末句「本條不規範發言者前綴…（另案）」，延後至 #1378 PR-B2。

## 草圖元素對照表

| # | 草圖元素 | 維護者裁定 | 本 change 的對應 |
|---|---|---|---|
| 1 | 對話串版面：頭像、「發言者＋`#n`」標頭行、發言文字另起一行 | 做 | FR-107 第 11 點、AC-2.39 |
| 2 | 回覆縮排：回覆發言縮排接在被回覆者下方 | 做 | FR-107 第 12 點、AC-2.40、AC-2.41（`reply_to` 設定來源為 013 v8.6.0 FR-002c-10） |
| 3 | 「跨發言 · 回應 #n」標記 | 做 | FR-107 第 12 點、AC-2.40、AC-2.41；T013 種子 AC-2.43 |
| 4 | 左欄清單發言者前綴與筆數小標籤 | 做 | 延後至 #1378 PR-B2（FR-106，另開 change） |
| 5 | 「顯示已標實體／純文字」切換（`aria-pressed`） | 做 | FR-107 第 13 點、AC-2.42 |

## Capabilities

- 修改：`annotation/015-annotation-workspace`（修訂 FR-107；新增 AC-2.39 ~ AC-2.43）。

## Impact

- 產品檔案（4 個）：`task-config.engine.js`（對話串版面、回覆判定、切換）、`task-config.css`（頭像、縮排、標記、切換樣式）、`task-config.data.js`（zh／en 字串）、`task-detail.data.js`（T013 種子）。
- 正典 015 於 archive 時寫回 v12.8.0 → v12.9.0（MINOR：新增顯示規則與 AC）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：欄位名稱取自 `dialogue_fields`，顏色由文字雜湊決定。
- **Data Fairness（NON-NEGOTIABLE）**：只渲染 Input；回覆關係只看 `reply_to`。
- **Simplicity First / YAGNI**：沿用既有 `renderDialogueThread`，以選項啟用新版面，task-new 預覽不受影響。
- **PR 規模（Principle X）**：產品檔案 4 個，預估 ≤ 150 行；單一 PR。
