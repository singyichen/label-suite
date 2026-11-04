---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1378
基準版本: 015 v12.9.0
目標版本: 015 v12.10.0
---

## Why

issue #1378 把草圖 artifact（https://claude.ai/artifact/B3fsqSYVQR2odnS987zGgE）裡對話串的細節補進正典。013 v8.6.0（PR-A）與 015 v12.9.0（PR-B1，change `annotation-dialogue-sketch-details`）已完成設定與整合預覽；本 change 是第三段（PR-B2），處理草圖第 4 項：左欄清單摘要的發言者前綴與筆數小標籤，並移除 FR-106 末句「本條不規範發言者前綴、對話串渲染與中央整合預覽（另案）」。

維護者已裁定（2026-10-14）：發言者前綴與「N 則發言」「N 位發言者」小標籤只在 `dialogue_fields` 非 `null` 的樣本出現；`dialogue_fields.speaker` 為 `null` 時不加前綴、也不顯示發言者數；不由實體、關係或 `@名字` 推測；非對話串的物件陣列維持「N 筆資料」。

**是否需要存在（YAGNI 檢查）**：需要。維護者已明確裁定草圖第 4 項要做，且 FR-106 目前以明文排除，必須先改條文才能實作。

**Generalization-First（NON-NEGOTIABLE）**：發言者與文字的子欄位名稱一律取自 `dialogue_fields`，不硬編 `speaker`、`text` 或任務編號。

**Data Fairness（NON-NEGOTIABLE）**：只讀角色為 Input 的欄位；前綴與標籤不新增任何讀取 Output／Evidence 欄位的路徑。

**Frontend Ready Gate 九項紀錄**

1. 通過：015 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：015 Prototype Traceability 已連到 `annotation-workspace.html` 與 `annotation-workspace.data.js`。
3. `N/A`：不新增 route。
4. 通過：`dialogue_fields` 為 `null`、`speaker` 為 `null`、發言者為空字串的退化見 delta 第 6 點與 AC-1.40。
5. 通過：新增 `data-testid` 於 `design.md` D3 列出，Red 與實作共用。
6. 通過：無新增錯誤情境（條件不成立即不顯示）。
7. 通過：標籤字串由資料層依介面語言產生（zh／en），小標籤為純文字 span。
8. 通過：屬 `annotation-workspace` 專屬清單，無新增 shared 元件。
9. 通過：不改變頁面去向；`design/system/user-path-map.html` 無 F3／F4 命中新增。

## What Changes

- **修訂 FR-106**：新增第 6 點（對話串摘要加發言者前綴；左欄清單顯示「N 則發言」「N 位發言者」小標籤），移除末句「本條不規範發言者前綴、對話串渲染與中央整合預覽（另案）」。
- **修訂 AC-1.35**：T013 摘要由「第 1 筆 `text`」改為「第 1 筆 `text` 加發言者前綴」。
- **新增 AC-1.39 ~ AC-1.41**：前綴與標籤、退化情況、`annotation-list` 與左欄摘要仍同一份 helper。
- **不變**：`annotation-list` 搜尋字串（AC-1.38）、中央整合預覽、`dialogue_fields` 設定。

## 草圖元素對照表

| # | 草圖元素 | 維護者裁定 | 本 change 的對應 |
|---|---|---|---|
| 1 | 對話串版面：頭像、標頭行、文字另起一行 | 做 | 已由 015 v12.9.0 FR-107 第 11 點、AC-2.39 承接（#1378 PR-B1） |
| 2 | 回覆縮排 | 做 | 已由 015 v12.9.0 FR-107 第 12 點、AC-2.40、AC-2.41 承接（#1378 PR-B1） |
| 3 | 「跨發言 · 回應 #n」標記 | 做 | 已由 015 v12.9.0 FR-107 第 12 點、AC-2.40 承接（#1378 PR-B1） |
| 4 | 左欄清單發言者前綴與筆數小標籤 | 做 | FR-106 第 6 點、AC-1.39、AC-1.40、AC-1.41 |
| 5 | 「顯示已標實體／純文字」切換 | 做 | 已由 015 v12.9.0 FR-107 第 13 點、AC-2.42 承接（#1378 PR-B1） |

## Capabilities

- 修改：`annotation/015-annotation-workspace`（修訂 FR-106、AC-1.35；新增 AC-1.39 ~ AC-1.41）。

## Impact

- 產品檔案（3 個）：`annotation-workspace.data.js`（前綴與標籤 helper）、`annotation-workspace.config.js`（左欄三處顯示標籤）、`annotation-workspace.html`（標籤樣式）。
- 正典 015 於 archive 時寫回 v12.9.0 → v12.10.0（MINOR：新增顯示規則與 AC）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：欄位名稱取自 `dialogue_fields`。
- **Data Fairness（NON-NEGOTIABLE）**：只讀 Input。
- **Simplicity First / YAGNI**：沿用既有摘要 helper，只加一個回傳標籤的 helper。
- **PR 規模（Principle X）**：產品檔案 3 個，預估 ≤ 100 行；單一 PR。
