---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1371
基準版本: 015 v12.10.0
目標版本: 015 v12.11.0
---

## Why

整合預覽 `initPreviewState()` 在資料的 `entities` 為空時，會把角色為 Output 的欄位解析結果當作實體預填，且沒有 `getObjectArrayInput()` 守門。Input 為物件陣列（對話，例如 T013）時，這會把 Output 答案外露到預覽，違反 Data Fairness（NON-NEGOTIABLE）。#1358 已對關係三元組補上同一守門，實體預填是當時列為範圍外的遺漏項目，維護者於 #1371 checkpoint 裁定一併補上。

同批併入兩項小修：

1. 反白定位失敗的提示目前借用 `dialogueLocateFailHint` 並硬塞 `{n}`＝1，語意是「N 個標記無法定位」，不是「這次反白有歧義」；應有專屬 i18n key（zh／en）。
2. 反白 fallback（DOM 位置與發言文字不符時，僅在唯一出現才採用）尚無 Playwright 驗收。

**是否需要存在（YAGNI 檢查）**：需要。Output 外露是 Data Fairness 違規；新增 AC 不符合 Lightweight Path，須走完整 OpenSpec change。

**範圍外**：非對話路徑既有的預填行為（不變，另有回歸測試）；`task-config.engine.js` 含端點寫法（母單 #1337 已記錄另案）。

## What Changes

- **修訂 FR-107**：新增第 14 點（物件陣列 Input 不從 Output 預填實體，沿用 `getObjectArrayInput()`，非對話行為不變）、第 15 點（反白歧義專屬提示，唯一出現才採 fallback）。
- **新增 AC-2.44 ~ AC-2.47**：驗收上述兩點與非對話回歸。
- **實作**：`initPreviewState()` 加守門；反白歧義改用新 i18n key（`task-config.data.js` zh／en）。
- **版本**：正典 015 於 archive 時由 v12.10.0 升為 v12.11.0（MINOR），新增 Changelog。

## Capabilities

- 修改：`annotation/015-annotation-workspace`（修訂 FR-107；新增 AC-2.44 ~ AC-2.47）。

## Impact

- 產品檔案（2 個）：`task-config.engine.js`、`task-config.data.js`。
- 正典 015 v12.10.0 → v12.11.0。

## Constitution Check

- **Data Fairness（NON-NEGOTIABLE）**：對話 Input 不從 Output 預填實體。
- **Generalization-First（NON-NEGOTIABLE）**：沿用既有物件陣列判斷，不依任務編號硬編。
- **Fail Loudly**：反白歧義有可見且不含佔位符的提示。
- **PR 規模（Principle X）**：產品檔案 2 個，預估 ≤ 30 行；單一 PR。
