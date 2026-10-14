---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1413
基準版本: 015 v12.11.2
目標版本: 015 v12.12.0
---

## Why

整合預覽 `initPreviewState()` 以寫死的鍵名 `rawRow.entities` 載入預填實體，沒有依 `fieldRoleMap` 檢查該欄位的角色。資料集中名為 `entities` 的欄位若被設為 Output，整合預覽仍會把它當成已標實體顯示，等同把答案預填給標記員，違反 Data Fairness（NON-NEGOTIABLE）。#1371（PR #1411）只補了「從 Output 欄位解析預填」那條路徑對物件陣列 Input 的守門，`rawRow.entities` 這條路徑未處理，字串與對話 Input 都受影響。維護者於 #1413 裁定：角色不是 Output 才可載入，Output 或角色未知一律不預填（fail-closed）。

**是否需要存在（YAGNI 檢查）**：需要。Output 外露是 Data Fairness 違規；字串 Input 的預填行為會改變，且新增 AC，不符合 Lightweight Path，須走完整 OpenSpec change。

**範圍外**：以寫死鍵名 `entities` 讀取預填來源屬 Generalization-First 問題，改由設定宣告預填來源欄位屬新設定項，延後至 #1430；非物件陣列 Input 由 Output 欄位解析預填的既有路徑（FR-107 第 14 點、AC-2.45）不變。

## What Changes

- **修訂 FR-107**：新增第 16 點（資料自帶 `entities` 欄位載入前依 `fieldRoleMap` 查角色，Output 或角色未知不預填），第 14 點與 AC-2.45 補上與第 16 點的銜接；鍵名寫死的後續需求延後至 #1430。
- **新增 AC-2.48、AC-2.49**：驗收 Output 角色與角色未知兩種情形不預填，非 Output 的已知角色照常載入。
- **實作**：`design/prototype/pages/task-management/task-config.engine.js` 的 `initPreviewState()` 加角色守門。
- **版本**：正典 015 於 archive 時由 v12.11.2 升為 v12.12.0（MINOR），新增 Changelog。

## Capabilities

- 修改：`annotation/015-annotation-workspace`（修訂 FR-107、AC-2.45；新增 AC-2.48、AC-2.49）。

## Impact

- 產品檔案（1 個）：`task-config.engine.js`。
- 正典 015 v12.11.2 → v12.12.0。

## Constitution Check

- **Data Fairness（NON-NEGOTIABLE）**：Output 或角色未知的欄位不得作為預填來源。
- **Generalization-First（NON-NEGOTIABLE）**：守門依 `fieldRoleMap` 的角色判斷，不依任務編號；鍵名寫死的部分已延後至 #1430，未惡化。
- **PR 規模（Principle X）**：產品檔案 1 個，預估 ≤ 15 行；單一 PR。
