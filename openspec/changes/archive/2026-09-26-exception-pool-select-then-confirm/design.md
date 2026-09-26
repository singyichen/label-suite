# Design：exception-pool-select-then-confirm

本 change 不涉及 API 契約或 DB schema（純前端原型互動模型變更），依 `/opsx:propose` 準則本可省略本檔；但本次涉及多個既有測試「前提消失」的改寫範圍與一個刻意的既有慣例分歧（D3），為避免 Red／Green 兩位執行者各自臆測導致重工，仍寫此檔鎖定決策。

## D1 選取狀態的呈現與生命週期

四個處置按鈕（`ws-exception-pool-action-<action>`，testid 沿用不變）點擊只切換該 item 的本地狀態 `selectedAction`，以 `aria-pressed="true"`/`"false"` 呈現，不呼叫既有的 `resolveFn`。切換選取不清空已輸入的理由文字——使用者可能在比較處置後才決定選哪一個，理由框沿用同一份輸入。

**但**切換選取會把「確認處置」重新強制設回 disabled（見 D3），須理由欄位自身再觸發一次 `input` 事件才重新啟用——文字沒被清空，只是啟用狀態不因循前一個處置殘留的理由文字而免檢，避免某處置所填的理由被靜默沿用為另一處置的理由。此行為已明文寫入 AC-4.75 最後一點（spec delta），不是隱含的實作細節。

## D2 版面結構（單一寫入點）

每個例外項固定渲染以下區塊，不再是「點擊後才展開」：

1. 四個處置按鈕（既有）
2. `custom_answer` 專用作答控件掛載點——僅當 `selectedAction === 'custom_answer'` 時填入內容（重用 `renderOutputPreview()`，design.md D4 慣例延續自 issue #596），其餘時候留空
3. 理由輸入框 `ws-exception-pool-reason`——四種處置現在共用同一個欄位，恆常渲染（不再只在 `custom_answer`／`exclude_from_dataset` 選取時才出現）
4. 彙整列 `ws-exception-pool-summary`（新增 testid，恆常渲染）
5. 確認按鈕 `ws-exception-pool-confirm`（新增、統一 testid，取代舊有 `ws-exception-pool-custom-answer-confirm`／`ws-exception-pool-exclude-confirm` 兩個 testid，恆常渲染）

## D3 確認按鈕停用邏輯（刻意的既有慣例分歧）

`confirmBtn.disabled = !selectedAction || !reasonInput.value.trim()`，使用原生 `disabled` 屬性；此外，切換 `selectedAction` 的動作本身額外強制把 `confirmBtn.disabled` 設回 `true`（覆寫上述公式一次），須理由欄位的 `input` 事件重新觸發才會再依公式求值——即「切換處置後，即使理由欄位有前一個處置留下的非空文字，確認鈕仍先回到停用」，此為 AC-4.75 最後一點明文要求的行為（spec delta），不是公式本身自然推出、也不是意外副作用。

本規格另兩處理由必填情境（`ws-arbitration-submit` 的 `refreshArbitrationBlocker()`、本畫面舊有的 `custom_answer`／`exclude_from_dataset` 確認鈕）走「blocked-not-disabled」慣例：按鈕恆可點擊，理由為空時點擊後跳 toast 阻擋。2026-09-24 維護者裁定明文要求「確認處置按鈕在理由為空時停用」——即原生 `disabled`，與既有慣例不同。依 general.md「Conflicting Patterns」規則：採用維護者明示的新慣例（disabled），並在程式碼註解標註此分歧與原因；既有 `refreshArbitrationBlocker()` 慣例維持不動，供未來若要統一時參考，不在本 change 處理範圍。

因確認按鈕改為原生 disabled，理由為空時瀏覽器與 Playwright 皆不會送出點擊，原本的 toast 阻擋分支（`exceptionPoolReasonRequired` 訊息）失去唯一呼叫路徑，成為孤兒，隨本 change 移除該 i18n 鍵（zh／en 兩份）。

## D4 彙整列文案與即時更新

- 未選取任何處置：`t('exceptionPoolNoSelectionLabel')`（「尚未選擇最終處置」）。
- 已選取但無定稿值可顯示（`exclude_from_dataset` 恆無定稿值；`custom_answer` 尚未於作答控件選定合法值前）：`t('exceptionPoolSummaryTpl')`，帶入 `t(EXCEPTION_ACTION_I18N_KEYS[selectedAction])`。
- 已選取且有定稿值（`adopt_annotator`／`adopt_reviewer` 恆有；`custom_answer` 一旦選定合法值）：`t('exceptionPoolSummaryWithValueTpl')`，額外帶入 `formatDisputeValue(value)`。
- `custom_answer` 的即時更新：不修改 `renderOutputPreview()`／config-driven 引擎本身（Generalization-First），改在 `expandHost`（作答控件的掛載容器）上加一個 delegated click listener，捕捉子層按鈕點擊冒泡後重新渲染彙整列與確認按鈕的停用狀態——原生事件冒泡順序保證此 listener 在作答控件自身的 click handler 更新 `state.previewState` 之後才執行，讀到的值必為最新。

## D5 新增／移除 i18n 鍵

新增（zh／en）：`exceptionPoolNoSelectionLabel`、`exceptionPoolSummaryTpl`、`exceptionPoolSummaryWithValueTpl`。
移除（zh／en，孤兒鍵，見 D3）：`exceptionPoolReasonRequired`。

## D6 既有測試「前提消失」範圍（供 senior-qa 改寫 Red 契約參考，非本 change 的驗收範圍本身）

`design/prototype/tests/annotation/issue-596-exception-pool.spec.ts` 是本互動模型的主要契約檔，其「一鍵即處置」斷言（`adopt_annotator`／`adopt_reviewer` 點擊後立即斷言寫入完成，`custom_answer`／`exclude_from_dataset` 舊有各自的確認 testid）前提消失，須改寫為兩段式正向斷言，不得直接刪除。另有三個間接依賴一鍵寫入或舊確認 testid 的既有測試：`tests/task-management/issue-891-live-review-pools.spec.ts`（`adopt_annotator` 一鍵清空例外池的斷言）、`tests/annotation/issue-913-exception-pool-sticky-owner.spec.ts`（`adopt_reviewer` 一鍵定稿的斷言）、`tests/annotation/issue-914-finalized-value-validation.spec.ts`（`custom_answer` 未選答案情境的 seeding helper，使用舊有 `ws-exception-pool-custom-answer-confirm` testid）。這四個檔案的最終寫入結果斷言本身不變，只是驅動序列需補上「選取 → 填理由 → 點統一確認鈕」。
