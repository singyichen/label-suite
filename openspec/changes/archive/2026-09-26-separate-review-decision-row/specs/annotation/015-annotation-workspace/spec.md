# Spec Delta

## MODIFIED Requirements

### Requirement: FR-014P 審查列版面收斂

審查列外框必須收斂為「單一作答面板 ＋ 單一決策列」：(1) **不得渲染型別標題**（`.content-card-title`）——該列除作答面板外別無他物，面板本身已完整呈現受審內容，重複標示 outKey 僅增加噪音（v3.4.0 ~ v3.9.0 期間 `dry_run` 不套用，因其統計盒與標記員清單本身不帶型別資訊而仍需標題；v4.0.0 起兩者皆已移除，`dry_run` 一併套用本條）。(2) 該 outKey 的決策按鈕（`ws-review-row-approve` / `ws-review-row-reject`；v5.0.0 修訂，issue #596：決策自「通過/退回」二向改為 `通過 / 修正 / 無法判定` 三向，testid 沿用不改名，見 FR-092、FR-014B）**必須掛載於作答面板（含其 Bypass 列）之後、獨立於答案值 Bypass 列的專屬決策列（`.rv-decision-row`），MUST NOT 與答案值「無法判定 (Bypass)」chip 共處同一容器**（issue #927：兩者為獨立語彙，版面須明確分區），使所有輸出類型的卡片一律以同一條決策列收尾；span 合併列（FR-014N）於同一 `.rv-decision-row` 並列兩組按鈕，各組前置型別標籤（`ws-review-section-label`）以資區辨。(3) `.rv-decision-row` 是作答面板（`correction`）的同層 sibling，不掛載於共用引擎所渲染、會在 Bypass 切換與實體/關係新增刪除時整體重繪的容器內，因此**不需要**重繪後重新掛回的機制——既有決策狀態天然不受引擎重繪影響。(4) `.rv-decision-row` 的渲染**不依賴**任務是否設定 `allow_bypass: false` 或引擎是否渲染 Bypass 列，一律獨立渲染，使 (2) 的版面契約在所有設定下皆成立而無需備用分支。(5) **視覺權重**（issue #926）：`.rv-decision-row` 內的決策按鈕，其可視面積 MUST NOT 小於同卡答案值 chip（含 Bypass chip）的可視面積，觸控目標 MUST ≥ 44px（WCAG 2.5.5），版面呈現為橫跨決策列可用寬度的分段控制。(6) **鄰近送出**（issue #928）：該審核單位所有 outKey 皆已完成決策（`pendingReviewOutputKeys()` 為空）時，決策列範圍內或其後 MUST 呈現一個可操作的送出控制，其可視位置與決策列的距離 MUST 顯著小於既有 `.action-bar` 內 `ws-review-submit-btn` 與決策列的距離；該控制 MUST 文案沿用既有 `reviewSubmitLabel` 來源、點擊行為 MUST 呼叫既有 `handleReviewSubmit()`，MUST NOT 引入第二套送出驗證或第二套文案來源；既有 `ws-review-submit-btn` 之既有位置、右對齊契約與既有測試不受影響。

#### Scenario: 決策列與答案 Bypass 列分屬獨立容器（issue #927）
- **GIVEN** reviewer 開啟一個 `allow_bypass` 未關閉的審核單位
- **WHEN** 檢視該 outKey 的審查列
- **THEN** 答案值「無法判定 (Bypass)」chip（`.preview-bypass-row` 內）與決策按鈕（`.rv-decision-row` 內）分屬兩個不同的 DOM 容器
- **AND** `.preview-bypass-row` 之直接子元素 MUST NOT 包含 `.rv-choice-group` 或 `.rv-merged-decision`

#### Scenario: 決策按鈕視覺權重與觸控目標（issue #926）
- **GIVEN** reviewer 開啟任一審核單位的審查列
- **WHEN** 量測決策按鈕（`ws-review-row-approve`/`-modify`/`-bypass`）與同卡答案值 chip 的實際 boundingBox
- **THEN** 決策按鈕之高度 MUST ≥ 44px
- **AND** 決策按鈕群組（`.rv-choice-group`）之總可視面積 MUST NOT 小於同卡任一答案值 chip 之可視面積

#### Scenario: 決策完成後鄰近呈現送出控制（issue #928）
- **GIVEN** reviewer 已為某審核單位所有 outKey 完成決策（無 `pendingReviewOutputKeys`）
- **WHEN** 檢視決策列
- **THEN** 決策列附近 MUST 出現一個可點擊的送出控制，其與決策列的垂直距離 MUST 顯著小於既有 `ws-review-submit-btn`（`.action-bar` 內）與決策列的距離
- **AND** 點擊該控制之行為 MUST 與點擊 `ws-review-submit-btn` 一致（呼叫同一 `handleReviewSubmit()`）
- **AND** 尚有 outKey 未完成決策時，該控制 MUST NOT 呈現

### Requirement: FR-053 審核卡跨 run_type 統一版面

工作區 reviewer 審核卡必須對兩種 `run_type` 渲染**同一套版面**，不得存在任何依 `run_type` 分流的呈現分支。版面契約沿用既有 `official_run` 規則：每個 outKey 一列（span 型別依 FR-014N 合併為一列），列內僅有作答/修正控件與**其後方獨立決策列（`.rv-decision-row`，見 FR-014P）上的一組** `通過 / 修正 / 無法裁決` 三向決策按鈕（v5.0.0 修訂，FR-014B、FR-092；本版修訂，issue #926/#927：決策列改為與答案 Bypass 列獨立的專屬容器，不再是「Bypass 列上」），無型別標題（FR-014P）；seed 來源為受審標記員本人答案（FR-044、FR-044a）；送出驗證為「每個 outKey 一筆決策」（FR-044）。（v4.13.0 新增，對應 AC-3.38）**空審核單位閘門**：審核單位「真空」——受審標記員無儲存提交（FR-051 推導為 null）**且**該樣本無 `REVIEWER_MOCK_ROWS` 遞補列（FR-044a 兩個 seed 來源皆缺）——時，本條版面**不得**渲染：決策按鈕、直接修正控件與送出按鈕一律不出現，改渲染空狀態卡（`ws-review-empty-unit`）並保持送出按鈕隱藏（FR-058 快捷鍵因此同步失效）；「真空」判定必須與 FR-064 橫幅顯示 `尚無標記提交` 的判定同源（`getReviewUnitStatus` 為 null 且 FR-044a 遞補列不存在），不得另行維護第二份判定。標記員實際提交後，下一次載入即恢復完整審核卡。（v4.14.0 新增，對應 AC-3.39）**已定稿單位鎖定**：審核單位狀態推導為 `已定稿`（FR-051）時，本條版面同樣**不得**渲染：改渲染 FR-094 之**純文字**唯讀結果卡（`ws-review-finalized-card`）——定稿標題與唯讀說明、每個 outKey 的定稿作答、每個曾衝突項目一列微型衝突歷程（`ws-finalized-trace`）——（v5.0.0 修訂，對應 AC-3.52，issue #596：原逐爭議項「收斂/仲裁結果」列 `ws-finalized-resolved` 之收斂路徑隨多數決移除，卡片內容改由 FR-094 定義）並保持送出按鈕隱藏（FR-058 快捷鍵因此同步失效）；`handleReviewSubmit()` 加同源守衛，於**進入時**判定，促成定稿的那一筆送出本身不受影響。四種定稿路徑一體適用（v5.0.0 修訂，FR-063）：逐項全數 `通過`、仲裁定案、最終例外池收尾、該單位全部項目遭排除（仲裁者或專案負責人現場送出後，重渲染即落入唯讀結果卡）。**設計決策**：已定稿單位**全面唯讀**——無決策、無直接修正、無送出；重啟流程（FR-016A 審計理由）延後至後端階段，原型不發明任何解鎖入口。中間狀態（待審／爭議中）不受本鎖定影響（v5.0.0 修訂：`已通過`／`已修改` 兩態已隨 `REVIEW_UNIT_STATUS` 移除）。`dry_run` 原有之共識模型元件——標記分布統計盒（`ws-review-stats`）、一致/分歧徽章（`ws-review-consensus-badge`）、「套用多數決至全部分歧項」（`ws-review-apply-majority`）、標記員清單（`ws-review-annotator-list` / `ws-review-annotator-row`）、「設為底稿」（`ws-review-set-draft`）與原始文本聯集卡（`ws-review-source-text`）——一律**完全不渲染**，不得以空殼 DOM 形式存在。理由：審核單位為「樣本 × 標記員」（FR-051），一張卡只審一位標記員；跨標記員的分布、共識與多數決在此單位下沒有比對對象，而聯集高亮的資訊價值同樣依賴多位標記員，單人情境退化為作答面板內文本的重複副本（FR-014O）。本條取代 FR-030 的 `run_type` 分流規則。**實作備註**：本版僅移除呈現層；`annotation-workspace.data.js` 的共識演算法（`computeConsensusMerge` / `computeSequenceMajority`）與其孤兒輔助函式已無消費端，其刪除屬後續 PR 範圍（單一 PR 大小上限），不構成行為差異。

#### Scenario: 審核卡兩種 run_type 皆以獨立決策列收尾（issue #926/#927）
- **GIVEN** 一個成立的審核單位，`run_type` 為 `dry_run` 或 `official_run` 任一
- **WHEN** 檢視其審查列
- **THEN** 該 outKey 的決策按鈕 MUST 呈現於獨立的 `.rv-decision-row` 容器，而非答案值 Bypass 列（`.preview-bypass-row`）內
- **AND** 兩種 `run_type` 的呈現分支 MUST 完全一致，不得存在差異
