---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1358
基準版本: 015 v12.7.0
目標版本: 015 v12.8.0
---

## Why

#1341 加入整合預覽對話串（FR-107）時，lead 把五項收尾列為延後處理，彙整於 #1358。維護者已於 #1358 checkpoint 留言逐項裁定，本變更把其中會改變可觀察行為的部分寫入正典：

1. **ner／gold 預填**：Input 為物件陣列（對話）時，關係三元組仍會從 Output 欄位預填，與 #1341 對 ABSA 三元組不預填的處理不一致，也有 Output 外露風險（Data Fairness）。
2. **定位失敗**：沒有座標時以 `indexOf` 取第一次出現的位置，同一段文字在發言中出現多次就會默默綁錯位置。
3. **重疊實體**：同一則發言內重疊的實體被默默略過，畫面沒有任何提示。
4. **測試標題**：`relation-compact-answer`、`offsets-engine` 兩支測試標題與 T013 扁平種子不一致（只改測試，不涉正典）。
5. **摘要欄位寫死**：標記清單摘要與 dashboard 用來比對的 Input 摘要寫死取物件的 `text`，沒有讀 `dialogue_fields.text`，違反 Generalization-First。

第 1–3 項在 FR-107 下新增驗收條件，不符合 Lightweight Path（有 AC 被新增）；第 5 項需修訂 FR-106 第 3 點措辭（無新增 AC）；第 4 項為測試調整。

**是否需要存在（YAGNI 檢查）**：需要。第 1–3 項是維護者已裁定的行為，不寫入正典就無法驗收；第 5 項不修訂 FR-106 第 3 點，正典會與實作矛盾。

**Data Fairness（NON-NEGOTIABLE）**：第 1 項即為 Output 預填的封閉；第 2 項不默默猜位置。

**範圍外**：不改實體儲存格式；`task-config.engine.js` 非對話路徑的含端點寫法（母單 #1337 已記錄另案）；task-new 的 Step 2 預覽之外的 Output 實體預填。

## What Changes

- **修訂 FR-107**：新增第 8 點（物件陣列 Input 不從 Output 預填關係三元組）、第 9 點（定位規則：有座標照座標；無座標且文字在發言中恰出現一次才定位；多次出現不猜，顯示「無法定位」提示）、第 10 點（重疊實體不默默略過，顯示因重疊而未標示的實體數）。
- **新增 AC-2.36 ~ AC-2.38**：驗收上述三點。
- **修訂 FR-106 第 3 點**：物件陣列的摘要文字改讀任務設定 `dialogue_fields.text`；`dialogue_fields` 為 `null` 時不硬取 `text`，視為無文字欄位而以「`{n} 筆資料`」呈現（比照 AC-2.34 不硬編欄位名稱）。不新增 AC。
- **測試**：兩支 issue-590 測試標題對齊 T013 扁平種子，斷言不變。
- **版本**：正典 015 於 archive 時由 v12.7.0 升為 v12.8.0（MINOR），新增 Changelog。

## Capabilities

- 修改：`annotation/015-annotation-workspace`（修訂 FR-106、FR-107；新增 AC-2.36 ~ AC-2.38）。

## Impact

- 產品檔案（預估 5 個）：`task-config.engine.js`（第 1、2、3 項）、`task-config.data.js`（提示文案）、`annotation-workspace.config.js`（無座標定位）、`annotation-workspace.data.js`（摘要 helper）、`annotation-list.html`（傳入 `dialogue_fields`）。
- 正典 015 v12.7.0 → v12.8.0。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：摘要欄位依 `dialogue_fields`，不硬編 `text`。
- **Data Fairness（NON-NEGOTIABLE）**：不從 Output 預填對話 Input 的三元組；不默默猜定位。
- **Fail Loudly**：定位失敗、重疊略過皆須有可見提示。
- **PR 規模（Principle X）**：產品檔案 5 個，預估 ≤ 150 行；單一 PR。
