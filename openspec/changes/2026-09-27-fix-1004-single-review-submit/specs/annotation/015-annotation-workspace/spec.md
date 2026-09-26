# Spec Delta

## MODIFIED Requirements

### Requirement: FR-014P 審查列版面收斂

審查列外框 MUST 收斂為「單一作答面板 ＋ 單一決策列」：(1) **不得渲染型別標題**（`.content-card-title`）——該列除作答面板外別無他物，面板本身已完整呈現受審內容，重複標示 outKey 僅增加噪音（v3.4.0 ~ v3.9.0 期間 `dry_run` 不套用，因其統計盒與標記員清單本身不帶型別資訊而仍需標題；v4.0.0 起兩者皆已移除，`dry_run` 一併套用本條）。(2) 該 outKey 的決策按鈕（`ws-review-row-approve` / `ws-review-row-reject`；v5.0.0 修訂，issue #596：決策自「通過/退回」二向改為 `通過 / 修正 / 無法判定` 三向，testid 沿用不改名，見 FR-092、FR-014B）MUST 掛載於作答面板（含其 Bypass 列）之後、獨立於答案值 Bypass 列的專屬決策列（`.rv-decision-row`），MUST NOT 與答案值「無法判定 (Bypass)」chip 共處同一容器（issue #927：兩者為獨立語彙，版面須明確分區），使所有輸出類型的卡片一律以同一條決策列收尾；span 合併列（FR-014N）於同一 `.rv-decision-row` 並列兩組按鈕，各組前置型別標籤（`ws-review-section-label`）以資區辨。(3) `.rv-decision-row` 是作答面板（`correction`）的同層 sibling，不掛載於共用引擎所渲染、會在 Bypass 切換與實體/關係新增刪除時整體重繪的容器內，因此**不需要**重繪後重新掛回的機制——既有決策狀態天然不受引擎重繪影響。(4) `.rv-decision-row` 的渲染**不依賴**任務是否設定 `allow_bypass: false` 或引擎是否渲染 Bypass 列，一律獨立渲染，使 (2) 的版面契約在所有設定下皆成立而無需備用分支。(5) **視覺權重**（issue #926）：`.rv-decision-row` 內的決策按鈕，其可視面積 MUST NOT 小於同卡答案值 chip（含 Bypass chip）的可視面積，觸控目標 MUST ≥ 44px（WCAG 2.5.5），版面呈現為橫跨決策列可用寬度的分段控制。

**(6) 鄰近送出——v8.0.0 移除，MAJOR，issue #1004**：~~該審核單位所有 outKey 皆已完成決策（`pendingReviewOutputKeys()` 為空）時，決策列範圍內或其後 MUST 呈現一個可操作的送出控制，其可視位置與決策列的距離 MUST 顯著小於既有 `.action-bar` 內 `ws-review-submit-btn` 與決策列的距離；該控制 MUST 文案沿用既有 `reviewSubmitLabel` 來源、點擊行為 MUST 呼叫既有 `handleReviewSubmit()`，MUST NOT 引入第二套送出驗證或第二套文案來源；既有 `ws-review-submit-btn` 之既有位置、右對齊契約與既有測試不受影響。~~ 維護者裁示送出入口統一為一個，保留底部 action bar 的 `ws-review-submit-btn`，決策列旁的 `ws-review-quick-submit-btn`（`buildReviewQuickSubmit()`）整段移除，本點所述之第二個送出控制不復存在。本點之編號**保留不重用**，比照 issue #920 廢止 AC-4.56／AC-4.57 之作法。既有 (1)~(5) 點不受影響，逐字保留。

#### Scenario: AC-3.61 決策列與答案 Bypass 列分屬獨立容器
- **GIVEN** reviewer 開啟一個 `allow_bypass` 未關閉的審核單位
- **WHEN** 檢視該 outKey 的審查列
- **THEN** 答案值「無法判定 (Bypass)」chip（`.preview-bypass-row` 內）與決策按鈕（`.rv-decision-row` 內）分屬兩個不同的 DOM 容器
- **AND** `.preview-bypass-row` 之直接子元素 MUST NOT 包含 `.rv-choice-group` 或 `.rv-merged-decision`

#### Scenario: AC-3.62 決策按鈕視覺權重與觸控目標
- **GIVEN** reviewer 開啟任一審核單位的審查列
- **WHEN** 量測決策按鈕（`ws-review-row-approve`/`-modify`/`-bypass`）與同卡答案值 chip 的實際 boundingBox
- **THEN** 決策按鈕之高度 MUST ≥ 44px
- **AND** 決策按鈕群組（`.rv-choice-group`）之總可視面積 MUST NOT 小於同卡任一答案值 chip 之可視面積

#### Scenario: AC-3.63 決策完成後鄰近呈現送出控制
~~**GIVEN** reviewer 已為某審核單位所有 outKey 完成決策（無 `pendingReviewOutputKeys`），**WHEN** 檢視決策列，**THEN** 決策列附近 MUST 出現一個可點擊的送出控制，其與決策列的垂直距離 MUST 顯著小於既有 `ws-review-submit-btn`（`.action-bar` 內）與決策列的距離，**AND** 點擊該控制之行為 MUST 與點擊 `ws-review-submit-btn` 一致（呼叫同一 `handleReviewSubmit()`），**AND** 尚有 outKey 未完成決策時，該控制 MUST NOT 呈現。~~ 送出入口統一為底部 action bar 的 `ws-review-submit-btn` 一個入口，決策列旁不得再出現第二個送出控制。本情境之 ID 保留不重用（比照 issue #920 廢止 AC-4.56／AC-4.57 之作法），由 `annotation-workspace-action-shortcuts.spec.ts` 與改寫後的 `issue-928-submit-near-decision.spec.ts` 之正向斷言（決策列旁不存在 `ws-review-quick-submit-btn`）取代其驗收角色。

### Requirement: FR-102 送出前即時後果提示

`annotation-workspace` reviewer 視角、**可互動**審核單位（範圍與 FR-070 完全一致：仲裁版面〔FR-061〕、已定稿唯讀卡〔FR-094〕、空審核單位〔FR-053〕皆不渲染）的送出入口——固定 footer 的 `ws-review-submit-btn`——旁 MUST 渲染一行**恆常可見**（純文字，非 `role="tooltip"`、不需點擊觸發即可讀取，與 FR-070 之 `ws-review-note` 為互補而非取代關係）的送出後果提示，testid 為 `ws-review-submit-consequence`。**v8.0.0 修訂，MAJOR，issue #1004**：本條原規範「兩個送出入口——固定 footer 的 `ws-review-submit-btn` 與決策列的 `ws-review-quick-submit-btn`（僅於全部 outKey 已決策時可見，issue #926／#927／#928）——旁必須各渲染一行……提示，testid 分別為 `ws-review-submit-consequence`、`ws-review-quick-submit-consequence`」；決策列的 `ws-review-quick-submit-btn` 已隨本次變更（見 FR-014P(6) 移除、AC-3.63 廢止）整段移除，其後果提示 `ws-review-quick-submit-consequence` 失去相鄰的送出鈕、一併移除，本條之「兩個入口」敘述同步收斂為單一入口，AC-3.65（決策列送出鈕之提示與 footer 同源同步）隨之廢止（見下）。

**推導規則（MUST 重用 FR-051／FR-092 既有規則，MUST NOT 另立第二套判定，本段逐字保留不改寫）**：對該單位全部 `selectedOutputTypes` 之尚未送出草稿決策（`reviewRowDecisions`）：

1. 任一**已決策**之 outKey 符合下列任一條件 → 提示 MUST 顯示「送出後進入爭議池，待仲裁定案」（testid 元素 MUST 帶 `data-consequence="disputed"`）：(a) 決策為 `modify` 或 `bypass`（即 FR-092 之 `REVIEW_DECISIONS` 中非 `approve` 的兩個成員）；(b) 決策為 `approve`，但該 outKey 之審核員目前草稿答案與標記員原答案不同——MUST 重用既有 `compareOutputAnswer()`／`convertSubmissionAnswer()`（`annotation-workspace.data.js`，已匯出至 `window.LabelSuiteAnnotationWorkspaceData`）之比較邏輯，MUST NOT 自建第三套答案比較邏輯；草稿答案取自審核員當前之 `state.previewState`／`previewEntities`／`previewTriples`，標記員原答案取自既有 `getAnnotatorSubmission()`；該單位無真實標記員提交（FR-044a 示範列遞補、`getAnnotatorSubmission()` 回傳空值）時，本條件比照 `anyReviewerChanged()` 自身之前提不成立，不視為爭議。此規則對應 FR-051／`anyReviewerChanged()`（`annotation-workspace.data.js`）之判定式——「任一 outKey 之審核員答案與標記員答案不同，或該 outKey 決策為 `DISPUTE_FORCING_DECISIONS` 成員 → `disputed`」——的草稿版等價判定，**MUST 完整實作上述兩個條件的 OR，MUST NOT 只實作其中一個而遺漏另一個**（issue #930 PR 審查發現：僅實作 (a) 會使審核員在選擇決策前先改動答案、再選「通過」時，提示誤報「送出後即定稿」，但實際送出後會因答案不同被判為爭議中）。`modify` 與 `bypass` 兩者 MUST 顯示相同文字——FR-092 定義兩者對單位狀態之效果相同（皆推導為 `爭議中`），MUST NOT 為兩者分別編造不同措辭。未決策之 outKey 不參與本點判定——送出本即被 FR-083 全數阻擋，其目前答案狀態尚非可送出之事實。
2. 全部 outKey 皆已決策，且皆為 `approve` → 提示 MUST 顯示「送出後即定稿」文字，並依 `run_type` 分流（testid 元素 MUST 帶 `data-consequence="finalized"` 與 `data-run-type`，沿用 FR-070 `ws-review-note-bubble` 之屬性慣例）：`official_run` 為「送出後即定稿，成為最終答案」；`dry_run` 在同一句後加註「（試標不產生最終答案，僅計入一致性統計）」——沿用 FR-070 既有 `reviewNoteDryRunExtra` 措辭精神，MUST NOT 另編一套與其矛盾的說法。
3. 不落入第 1、2 點（尚未完成全部決策，且已選定的決策中沒有第 1 點之爭議性決策）→ 提示 MUST 顯示中性文字「尚未選擇決策」（testid 元素 MUST 帶 `data-consequence="pending"`），MUST NOT 宣稱任何確定的送出結果。
4. 上述三分支互斥，同一時刻恰一句成立；第 1 點的判定 MUST 優先於第 2、3 點，即使其他 outKey 尚未決策，只要已有一個 outKey 符合第 1 點之任一條件（爭議性決策，或 `approve` 但答案已與標記員原答案不同），提示即 MUST 顯示爭議池文字。

**動態切換**：審核員變更任一 outKey 之決策（點選決策按鈕、使用 FR-054 快捷鍵、或因改答案觸發既有重置規則而使決策被清空）時，該提示 MUST 立即依上述規則重新計算並更新文字，MUST NOT 需要重新整理頁面或重新開啟該單位才會更新。**v8.0.0 修訂**：原「兩個入口之提示必須讀取同一份推導結果與同一組 i18n 來源」一句，隨入口收斂為單一入口而移除其比較對象；`reviewSubmitConsequenceCopy()` 單一計算函式與單一 i18n 來源之防重複判定精神不變，僅不再有第二入口需要保持同步。

**可視範圍鏡射既有送出鈕**：`ws-review-submit-btn` 於 FR-070 所列之非互動分支（仲裁版面、已定稿唯讀卡、off-roster、未指派、空審核單位）隱藏時，`ws-review-submit-consequence` MUST 同步隱藏。**v8.0.0 修訂**：原另有一句「`ws-review-quick-submit-btn` 依既有規則（全部 outKey 已決策）顯示／隱藏時，`ws-review-quick-submit-consequence` MUST 同步顯示／隱藏」，隨 `ws-review-quick-submit-btn` 與其提示一併移除而刪除。

**zh／en 對等**：兩份語言之文案 MUST 表達相同語意，不得僅修正單一語言。

**不改變的部分（逐字保留）**：本條不改變 FR-051 狀態機、FR-070 既有 tooltip 之呈現契約與渲染次數、FR-092 決策集合、FR-083 送出阻擋 toast 之判定與觸發，僅新增一組讀取既有草稿狀態的呈現層提示；本條之推導結果為預覽用途，MUST NOT 寫入任何持久化欄位，亦 MUST NOT 影響 `handleReviewSubmit()` 實際送出時的任何判定。

#### Scenario: AC-3.64 固定 footer 提示依決策與 run_type 即時切換
- **GIVEN** reviewer 開啟一個僅有單一 outKey、`待審` 的審核單位，尚未對該 outKey 做出決策
- **WHEN** 檢視固定 footer 送出鈕旁的 `ws-review-submit-consequence`
- **THEN** 該元素 MUST 顯示「尚未選擇決策」且帶 `data-consequence="pending"`
- **AND**〔選「通過」〕reviewer 對該 outKey 選擇「通過」（`approve`）後，`official_run` 之該元素 MUST 顯示「送出後即定稿，成為最終答案」且帶 `data-consequence="finalized"` `data-run-type="official_run"`，同一操作於 `dry_run` 之該元素 MUST 顯示「送出後即定稿，成為最終答案（試標不產生最終答案，僅計入一致性統計）」且帶 `data-run-type="dry_run"`
- **AND**〔選「修正」與「無法裁決」〕reviewer 改選「修正」（`modify`）並填妥必填理由後，該元素 MUST 顯示「送出後進入爭議池，待仲裁定案」且帶 `data-consequence="disputed"`，改選「無法裁決」（`bypass`）並填妥理由後，該元素 MUST 顯示與上一步完全相同的文字與 `data-consequence`，不得出現任何差異措辭，上述兩者於 `dry_run` 與 `official_run` 皆成立
- **AND**〔即時切換〕reviewer 從已選擇「通過」改選「修正」並填妥理由後，該元素 MUST 立即更新為爭議池文字，不須重新整理頁面，若之後再次點選同一個「修正」決策按鈕使其依既有的按鈕再點選取消規則被清空、回到未決策狀態，該元素 MUST 立即回到「尚未選擇決策」
- **AND**〔通過但答案已與標記員原答案不同，PR 審查發現〕reviewer 在對該 outKey 做出任何決策**之前**，先於直接修正控件把答案改為與標記員原答案不同的值，之後才點選「通過」（未經「修正」），該元素 MUST 顯示爭議池文字「送出後進入爭議池，待仲裁定案」且帶 `data-consequence="disputed"`，不得顯示定稿文字

#### Scenario: AC-3.65 決策列送出鈕之提示與 footer 同源同步
~~**GIVEN** 一個僅有單一 outKey 的審核單位，尚未對該 outKey 做出決策，**WHEN** 檢視決策列（`ws-review-quick-submit-btn` 所在區域），**THEN** 因尚未全部決策，`ws-review-quick-submit-btn` 依既有規則隱藏，`ws-review-quick-submit-consequence` 亦 MUST 隱藏；**AND**〔轉為可見後同源〕reviewer 對該 outKey 選擇「通過」使全部 outKey 已決策、`ws-review-quick-submit-btn` 依既有規則轉為可見後，`ws-review-quick-submit-consequence` MUST 同時可見，且其文字、`data-consequence`、`data-run-type` MUST 與同一時刻的 `ws-review-submit-consequence` 逐字相同；**AND**〔修正／無法裁決同步〕改選「修正」或「無法裁決」（各自填妥理由）後，`ws-review-quick-submit-consequence` 之爭議池文字與 `data-consequence="disputed"` MUST 與同一時刻的 `ws-review-submit-consequence` 逐字相同；**AND**〔dry_run 同步〕上述「通過」分支之 `dry_run` 定稿文字與 `data-run-type="dry_run"`，兩個入口亦 MUST 逐字相同；**AND**〔通過但答案已改動之同步，PR 審查發現〕AC-3.64 所述「先改答案、後選通過」情境下，`ws-review-quick-submit-consequence` 亦 MUST 同時顯示爭議池文字與 `data-consequence="disputed"`，與同一時刻的 `ws-review-submit-consequence` 逐字相同，不得任一入口誤報定稿文字。~~ 本情境驗證之前提——決策列存在第二個送出入口——隨 `ws-review-quick-submit-btn`（見 FR-014P(6)、AC-3.63）與其提示 `ws-review-quick-submit-consequence` 一併移除而不復存在，無「兩個入口」可供比對同步。本情境之 ID 保留不重用（比照 issue #920 廢止 AC-4.56／AC-4.57 之作法），由 AC-3.64（footer 單一入口）與改寫後的 `issue-930-submit-consequence-hint.spec.ts` 正向斷言（決策列旁不存在 `ws-review-quick-submit-btn`／`ws-review-quick-submit-consequence`）取代其驗收角色。
