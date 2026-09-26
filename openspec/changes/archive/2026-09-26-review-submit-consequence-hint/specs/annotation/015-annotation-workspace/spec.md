# Spec Delta

## ADDED Requirements

### Requirement: FR-102 送出前即時後果提示

`annotation-workspace` reviewer 視角、**可互動**審核單位（範圍與 FR-070 完全一致：仲裁版面〔FR-061〕、已定稿唯讀卡〔FR-094〕、空審核單位〔FR-053〕皆不渲染）的兩個送出入口——固定 footer 的 `ws-review-submit-btn` 與決策列的 `ws-review-quick-submit-btn`（僅於全部 outKey 已決策時可見，issue #926／#927／#928）——旁 MUST 各渲染一行**恆常可見**（純文字，非 `role="tooltip"`、不需點擊觸發即可讀取，與 FR-070 之 `ws-review-note` 為互補而非取代關係）的送出後果提示，testid 分別為 `ws-review-submit-consequence`、`ws-review-quick-submit-consequence`。

**推導規則（MUST 重用 FR-051／FR-092 既有規則，MUST NOT 另立第二套判定）**：對該單位全部 `selectedOutputTypes` 之**尚未送出**草稿決策（`reviewRowDecisions`）：

1. 任一 outKey 之決策為 `modify` 或 `bypass`（即 FR-092 之 `REVIEW_DECISIONS` 中非 `approve` 的兩個成員）→ 提示 MUST 顯示「送出後進入爭議池，待仲裁定案」（testid 元素 MUST 帶 `data-consequence="disputed"`）。此規則對應 FR-051 判定式「任一項決策為 `modify` 或 `bypass` → `disputed`」的草稿版等價判定；`modify` 與 `bypass` 兩者 MUST 顯示相同文字——FR-092 定義兩者對單位狀態之效果相同（皆推導為 `爭議中`），MUST NOT 為兩者分別編造不同措辭。
2. 全部 outKey 皆已決策，且皆為 `approve` → 提示 MUST 顯示「送出後即定稿」文字，並依 `run_type` 分流（testid 元素 MUST 帶 `data-consequence="finalized"` 與 `data-run-type`，沿用 FR-070 `ws-review-note-bubble` 之屬性慣例）：
   - `official_run`：「送出後即定稿，成為最終答案」。
   - `dry_run`：在同一句後加註「（試標不產生最終答案，僅計入一致性統計）」——沿用 FR-070 既有 `reviewNoteDryRunExtra` 措辭精神，MUST NOT 另編一套與其矛盾的說法。
3. 不落入第 1、2 點（尚未完成全部決策，且已選定的決策中沒有第 1 點之爭議性決策）→ 提示 MUST 顯示中性文字「尚未選擇決策」（testid 元素 MUST 帶 `data-consequence="pending"`），MUST NOT 宣稱任何確定的送出結果。
4. 上述三分支互斥，同一時刻恰一句成立；第 1 點的判定 MUST 優先於第 2、3 點（即使其他 outKey 尚未決策，只要已有一個 `modify`／`bypass`，提示即 MUST 顯示爭議池文字，因為該決策一旦連同其餘決策一起送出，單位就會依 FR-051 推導為 `爭議中`，且該推導不會因為其他 outKey 是否為 `approve` 而改變）。

**動態切換**：審核員變更任一 outKey 之決策（點選決策按鈕、使用 FR-054 快捷鍵、或因改答案觸發既有重置規則而使決策被清空）時，兩個提示 MUST 立即依上述規則重新計算並更新文字，MUST NOT 需要重新整理頁面或重新開啟該單位才會更新。兩個入口之提示 MUST 讀取同一份推導結果與同一組 i18n 來源，MUST NOT 各自維護第二套文案或第二套判定邏輯。

**可視範圍鏡射既有送出鈕**：兩個提示元素之顯示／隱藏 MUST 與其相鄰之送出鈕本身完全一致——`ws-review-submit-btn` 於 FR-070 所列之非互動分支（仲裁版面、已定稿唯讀卡、off-roster、未指派、空審核單位）隱藏時，`ws-review-submit-consequence` MUST 同步隱藏；`ws-review-quick-submit-btn` 依既有規則（全部 outKey 已決策）顯示／隱藏時，`ws-review-quick-submit-consequence` MUST 同步顯示／隱藏。

**zh／en 對等**：兩份語言之文案 MUST 表達相同語意，不得僅修正單一語言。

**不改變的部分**：本條不改變 FR-051 狀態機、FR-070 既有 tooltip 之呈現契約與渲染次數、FR-092 決策集合、FR-083 送出阻擋 toast 之判定與觸發，僅新增一組讀取既有草稿狀態的呈現層提示；本條之推導結果為預覽用途，MUST NOT 寫入任何持久化欄位，亦 MUST NOT 影響 `handleReviewSubmit()` 實際送出時的任何判定。

#### Scenario: AC-3.64 固定 footer 提示依決策與 run_type 即時切換
- **GIVEN** reviewer 開啟一個僅有單一 outKey、`待審` 的審核單位，尚未對該 outKey 做出決策
- **WHEN** 檢視固定 footer 送出鈕旁的 `ws-review-submit-consequence`
- **THEN** 該元素必須顯示「尚未選擇決策」且帶 `data-consequence="pending"`
- **AND**〔選「通過」〕**WHEN** reviewer 對該 outKey 選擇「通過」（`approve`），**THEN** `official_run` 之該元素必須顯示「送出後即定稿，成為最終答案」且帶 `data-consequence="finalized"` `data-run-type="official_run"`；同一操作於 `dry_run` 之該元素必須顯示「送出後即定稿，成為最終答案（試標不產生最終答案，僅計入一致性統計）」且帶 `data-run-type="dry_run"`
- **AND**〔選「修正」與「無法裁決」〕**WHEN** reviewer 改選「修正」（`modify`）並填妥必填理由，**THEN** 該元素必須顯示「送出後進入爭議池，待仲裁定案」且帶 `data-consequence="disputed"`；改選「無法裁決」（`bypass`）並填妥理由後，該元素必須顯示與上一步**完全相同**的文字與 `data-consequence`，不得出現任何差異措辭；上述兩者於 `dry_run` 與 `official_run` 皆成立（爭議池分支不依 `run_type` 分流）
- **AND**〔即時切換〕**WHEN** reviewer 從已選擇「通過」（顯示定稿文字）改選「修正」並填妥理由，**THEN** 該元素必須立即更新為爭議池文字，不須重新整理頁面；**WHEN** reviewer 再次點選同一個「修正」決策按鈕使其依既有的按鈕再點選取消規則（`setReviewUnitDecision()` 之取消分支，`annotation-workspace.config.js`）被清空、回到未決策狀態，**THEN** 該元素必須立即回到「尚未選擇決策」——**明確排除**：`modify` 決策 MUST NOT 因改答案而被清空（issue #925 已確立之既有行為：`modify` 之後改答案僅重新綁定快照、不重置決策），本條之「即時切換」示範 MUST NOT 依賴改答案清空 `modify` 這個不存在的路徑；`approve`／`bypass` 兩者改答案後仍依既有規則被清空（issue #925 未變更此側行為），若改以這兩者示範改答案清空亦成立

#### Scenario: AC-3.65 決策列送出鈕之提示與 footer 同源同步
- **GIVEN** 一個僅有單一 outKey 的審核單位，尚未對該 outKey 做出決策
- **WHEN** 檢視決策列（`ws-review-quick-submit-btn` 所在區域）
- **THEN** 因尚未全部決策，`ws-review-quick-submit-btn` 依既有規則隱藏，`ws-review-quick-submit-consequence` 亦必須隱藏
- **AND**〔轉為可見後同源〕**WHEN** reviewer 對該 outKey 選擇「通過」使全部 outKey 已決策、`ws-review-quick-submit-btn` 依既有規則轉為可見，**THEN** `ws-review-quick-submit-consequence` 必須同時可見，且其文字、`data-consequence`、`data-run-type` 必須與同一時刻的 `ws-review-submit-consequence`**逐字相同**——兩者讀取同一份推導結果與同一組 i18n 來源，不得任一入口顯示與另一入口不同的文字
- **AND**〔修正／無法裁決同步〕改選「修正」或「無法裁決」（各自填妥理由）後，`ws-review-quick-submit-consequence` 之爭議池文字與 `data-consequence="disputed"` 必須與 AC-3.64 該時刻的 `ws-review-submit-consequence` 逐字相同
- **AND**〔dry_run 同步〕上述「通過」分支之 `dry_run` 定稿文字與 `data-run-type="dry_run"`，兩個入口亦必須逐字相同
