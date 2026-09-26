對應 Spec: specs/annotation/015-annotation-workspace/spec.md

# Proposal

## Why

審核決策摘要（右欄「歷程」頁籤的 `.history-summary`，由 `historySummaryForDisplay()` 渲染）目前直接顯示程式內部識別字串，例如 `single_label · kioleemg12: approve`，其中 `single_label`（`outKey`）與 `approve`（決策 enum）皆為對使用者不可讀的英文內部值。issue #992 承接 issue #909（PR #991）後半範圍，維護者已裁定文案形式（方案 B：輸出類型與決策中文化、標記員維持識別碼）與持久化格式（方案 D：只改渲染、`event.summary` 儲存格式不變）。正典 `specs/annotation/015-annotation-workspace/spec.md` 之 FR-016B／AC-2.15／AC-2.17（issue #901 修訂）僅規範「何時顯示 `.history-summary`」（結構化差異可用時的 fallback 抑制規則）與必要欄位，並未規定該摘要字串本身的顯示語言／token 格式，故本次為新增 AC，非修訂既有條文。

## What Changes

- 在 `historySummaryForDisplay()`（`design/prototype/pages/annotation/annotation-workspace.config.js`，約 :2016-2023）新增一個顯示層轉換：辨識 `event.summary` 中形如 `<outKey> · <name>: <decision>`（`decision` ∈ `approve`／`modify`／`bypass`）的行，將 `outKey` 換成既有 `window.OUTPUT_TYPE_REGISTRY[outKey][state.lang]` 標籤、`decision` 換成既有 `REVIEW_DECISION_LABEL_KEYS` + `t()` 對照之繁體中文／英文標籤（`bypass` 沿用 `BYPASS_WORDING.{zh,en}.decision`）；`<name>`（`actor_id`）維持原樣不譯。
- **不更動**任何持久化路徑：`event.summary`（`markSampleSubmitted()`／`appendReviewDecisionEvents()` 寫入 localStorage 的儲存值）維持現行內部格式；`handleReviewSubmit()` 內的 `line`／`decisionLines`／`reviewHistoryLines`／`#wsReviewHistory`（工作區內送出後的暫時確認卡片，issue #924）皆不修改，以免牽動既有綠燈測試 `issue-924-review-history-clear.spec.ts:161`（斷言 `#wsReviewHistory` 內容含英文原值 `approve`）。
- 既有 localStorage 舊資料自動受益：轉換只發生於渲染時查表，不需要資料遷移。
- 更新 `design/prototype/tests/annotation/issue-881-history-reason-dedup.spec.ts` 的 `.history-summary` 精確比對斷言（:111 zh、:125 en）為新文案；`:79`／`:86`（legacy fixture／字串組裝）與 `:180`（`event.summary` 持久化斷言）不變。
- 新增 `design/prototype/tests/annotation/issue-992-decision-summary-readable.spec.ts` 覆蓋：(a) 顯示層中文化格式（zh／en 各一）；(b) 持久化 `event.summary` 仍為原內部格式；(c) 需理由的決策（`modify`／`bypass`）理由仍正確附加、不受文案轉換影響。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `annotation/015-annotation-workspace`：新增一則 AC，規範 `.history-summary` 顯示層對 `outKey`／決策 token 之繁體中文／英文標籤轉換規則，且明文不得變更 `event.summary` 之持久化格式。

## Constitution Check

依 `specs/_governance/constitution.md` 逐一檢視與本次變更相關之設計時原則：

- **II. Generalization-First（NON-NEGOTIABLE）**：轉換規則完全依賴既有通用對照表 `OUTPUT_TYPE_REGISTRY`（任一 `outKey` 皆適用）與 `REVIEW_DECISION_LABEL_KEYS`（`REVIEW_DECISIONS` 三值皆適用），不新增任何 task-specific 或 output-type-specific 的硬編碼分支，符合本原則。
- **III. Data Fairness（NON-NEGOTIABLE）**：本變更僅涉及審核決策摘要之顯示文案，不涉及測試集答案外洩或資料集分割，不適用。
- **XII. Traceability & Auditability**：`event.summary`（稽核追蹤所依賴之持久化字串）維持原內部格式完全不變，`.history-action-badge` 的 `data-action` 亦不受影響；本變更僅調整 `.history-summary` 的可見文字，稽核鏈完整性不受影響。
- **X. Change Scope Discipline**：單一目的（審核決策摘要顯示層中文化），預期僅動 1 個生產檔（`annotation-workspace.config.js`）之 1 個函式，符合 PR 5 檔／300 行門檻。

## Impact

- 受影響程式：`design/prototype/pages/annotation/annotation-workspace.config.js`（僅 `historySummaryForDisplay()`）。
- 受影響測試：`design/prototype/tests/annotation/issue-881-history-reason-dedup.spec.ts`（兩處斷言位移）；新增 `issue-992-decision-summary-readable.spec.ts`。
- 無 API／DB 契約變更、無資料遷移；`event.summary` 儲存格式與既有 localStorage 資料完全相容。
- 正典 `specs/annotation/015-annotation-workspace/spec.md` 版本 bump（propose 時暫定 6.28.0；主 session 於合併時依實際順序指派為 **7.2.0** —— 同波 #920 為 MAJOR 落地 7.0.0、#956 落地 7.1.0，本變更接續）＋ Changelog 一筆；`specs/STATUS.md` 同 PR 更新（僅動 `annotation-015` 一列）。
