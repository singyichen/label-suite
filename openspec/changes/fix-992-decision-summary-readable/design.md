# Design

## Context

見 `proposal.md` — Why。技術上需先釐清一個關鍵事實（已用 `grep -n` 複驗，非推測）：`.history-summary` 之文字並非由 `handleReviewSubmit()` 內 `decisionLines`／`reviewHistoryLines` 直接寫入畫面，而是由 `renderHistoryPanel()`（`annotation-workspace.config.js:2025` 起）呼叫 `historySummaryForDisplay(event, structuredReasons)`（:2016-2023）、以持久化之 `event.summary` 為輸入所計算。`event.summary` 由 `decisionLines`（經 `handleReviewSubmit()` 組出的 `summary` 變數）透過 `markSampleSubmitted()` → `appendReviewDecisionEvents()` → `appendHistoryEvent()` 寫入 localStorage；而 `reviewHistoryLines`（含理由）實際餵給的是 `#wsReviewHistory`——一個逐樣本切換即清空、從未持久化的工作區內確認卡片（issue #924），且既有綠燈測試 `issue-924-review-history-clear.spec.ts:161` 斷言其內容含英文原值 `approve`。

## Goals / Non-Goals

**Goals:**
- `.history-summary` 對 `accepted`／`modified`（fallback 分支）／`bypassed` 事件顯示繁體中文／英文可讀文案。
- `event.summary`（持久化字串）逐字元不變，含既有 localStorage 舊資料。
- 不牽動 `#wsReviewHistory`／`handleReviewSubmit()` 內任何變數，維持 `issue-924-review-history-clear.spec.ts:161` 綠燈。

**Non-Goals:**
- 不處理 `actor_id` → 顯示名稱之對照（維護者已明示排除，見 issue #992 裁定之方案 A 討論）。
- 不處理 `buildHistorySummary()` 產生的 `outKey: describedAnswer` 這一行（annotator `submitted`／`draft_saved` 事件的既有摘要格式），該格式與本次「決策摘要」無關，不在 issue #992 範圍內。
- 不新增任何跨模組人名對照表。

## Decisions

**D1：轉換點放在 `historySummaryForDisplay()`，不動 `handleReviewSubmit()`。**
理由：`event.summary` 的產生點（`decisionLines`）與畫面顯示點（`historySummaryForDisplay()`）是兩個不同函式；只要轉換發生在讀取之後、渲染之前，就能同時滿足「畫面中文化」與「持久化格式不變」兩個裁定要求，且不需要如 issue 原文所擔心的「拆開共用變數」——因為 `handleReviewSubmit()` 內完全不需要修改。
替代方案（在 `handleReviewSubmit()` 內把 `decisionLines` 也中文化）已否決：那會直接改寫 `event.summary`，違反方案 D，且會讓 `issue-881-history-reason-dedup.spec.ts:180`（斷言 `event.summary` 含內部格式字串）與既有 `issue-901-history-summary-fallback.spec.ts` 多處 fixture 斷言失敗。

**D2：以逐行正則比對 `<outKey> · <name>: <decision>`，只轉換比對成功的那一行，其餘內容原樣保留。**
理由：`event.summary` 對 `modified`／`bypassed`／`accepted` 事件可能與其他既有文字共用同一字串（例如既有理由清理邏輯已對 `— {reason}` 片段做過字串處理）；逐行比對、只轉換辨識出的決策行，能確保不影響 `historySummaryForDisplay()` 既有的理由去重（`structuredReasons.forEach`）與 arbitration fallback（`adjudicated` 開頭 `arbitration finalized:` 判斷）等既有邏輯。
替代方案（整段字串一次性 `String.replace` 硬編三個決策詞）已否決：無法正確處理 `outKey` 為任意輸出類型（違反 Generalization-First），且無法排除巧合命中其他非決策行文字的風險。

**D3：沿用既有對照表，不新建。**
`outKey` 沿用 `window.OUTPUT_TYPE_REGISTRY[outKey][state.lang]`（與 :5469 一帶 toast 文案相同寫法）；`decision` 沿用既有 `REVIEW_DECISION_LABEL_KEYS` + `t()`（`bypass` 経 `BYPASS_WORDING.{zh,en}.decision`）。不新增第二套標籤來源，符合 DRY 與 Generalization-First。

## Risks / Trade-offs

- **[Risk]** 若某筆 `event.summary` 恰好有非決策內容意外符合 `<outKey> · <name>: <decision>` 樣式（`decision` 恰為 `approve`／`modify`／`bypass` 三個字面值之一），可能被誤轉換。
  → **Mitigation**：`decision` 比對限定為這三個字面值（非任意字），且僅套用於 `event.action` 屬於 `accepted`／`modified`／`bypassed` 之事件卡片（`historySummaryForDisplay()` 之呼叫端已持有 `event.action`），雙重限定後誤判面極小；既有測試（issue-881、issue-901、issue-909、issue-578）逐一複跑作為回歸防線。
- **[Risk]** `modified` 事件之 `event.summary` 在真實 UI 送出流程中可能為多行（`buildHistorySummary()` 之 `outKey: describedAnswer` 行 + 決策行），逐行轉換若處理不當可能誤動非決策行。
  → **Mitigation**：D2 之逐行比對天然規避此風險——非決策格式的行（如 `single_label: neutral`，冒號前後無 ` · ` 分隔）不符合比對樣式，維持原樣。

## Migration Plan

不適用（純顯示層變更，無資料遷移、無 API／DB 契約變更）。既有 localStorage 資料下次渲染即自動套用新文案。
