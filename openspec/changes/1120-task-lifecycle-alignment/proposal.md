---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1120
基準版本: 014 v4.3.0
目標版本: 014 v4.4.0
---

## Why

issue #1120 走查 `task-detail` 的五個示範任務（T013／T014／T015／T016／T018），要求對齊「試標完成條件」「正式結案條件」與概覽／成員／進度／結果／工時五個頁籤的資料與文案，讓負責人能分辨「標註已提交」「審核／仲裁已完成」「IAA 可供決策」「任務已完成」四件不同的事。

T01 唯讀盤點（本 change 的 `design.md` D1～D5 載明逐條 `file:line` 依據）得到三個結論，直接決定本提案的範圍：

**① issue §1 的七條產品規則多數已被正典涵蓋，不需要新規則。** 試標前提（狀態機單向遞進）、IAA 顧問化（FR-010o-3 逐字相符）、正式結案五條件（FR-008b 與 issue 決策逐項對應）、五態狀態機（`TASK_STATUSES`）四項均已成立。issue 對這四項的「決策」是確認現狀，不是變更；本提案因此不重寫它們，只在 `design.md` 標明引用位置，供 T03 的 Red 直接引用既有 FR／AC。

**② 「試標完成」的對齊會推翻既有 AC，屬 MAJOR，必須先由維護者裁示，本提案不承載。** 正典 `DRY_RUN_COMPLETION_RULE`（`specs/task-management/014-task-detail/spec.md:56`）與 FR-008a（同檔 `:584`）定義的試標完成**只計標註提交**；AC-3.2（同檔 `:449`）的 **Then** 子句明文承諾「全員 `assigned_count == completed_count` → 自動轉為 `waiting_iaa_confirmation`」。issue §4 驗收 01／§4 驗收 02 要求「全員提交但有待審核／待仲裁項目時維持試標中」，會使 AC-3.2 的 Then 子句變為偽——這是推翻既有驗收條件，不是澄清或擴充。連帶須修訂者還有 AC-3.16（`:463`，「依 `DRY_RUN_COMPLETION_RULE` 全部完成**才轉為**」之充分性敘述）、SC-004（`:773`）、FR-013 第 (1) 點之停用原因文字（`:637`），以及 `docs/adr/022-task-state-machine-location.md` Transition Table 該列。依 014 v4.0.0（issue #791，維護者裁定收回既有行為屬 BREAKING）先例，此對齊為 **MAJOR（014 → 5.0.0）**。本提案依 CLAUDE.md MAJOR 停止規則，**不撰寫推翻 FR-008a／AC-3.2 的 delta**，改列為維護者裁示項（`design.md` D1），裁示後另開 MAJOR change 承載 §4 驗收 01／§4 驗收 02／§4 驗收 03。

**③ 真正的正典缺口有兩個，且都不推翻任何既有條文，本提案承載這兩個。** 其一是 issue §4 驗收 06 的「正式標記池歸零」：FR-010f-3（`:597`）只規定正式清單筆數 `= dataset_total - sum(trial_round.sampling_value)`，FR-010t（`:631`）的發布前檢查只驗成員人數，**全文沒有任何條款在剩餘池為 0 時阻擋發布**；T013（資料總數 1、試標抽樣 1）正是此缺口的實例。其二是 issue §2 的衍生計數契約：`已定案 review unit`（`specs/annotation/015-annotation-workspace/spec.md:797` FR-051）與 `最終例外輸出項目`（同檔 `:1030` FR-095 ＋ 014 `:693` FR-018 第 (5) 點）已有正典定義，但 **`已提交` 與 `已完成輪次` 兩項在 014 全文查無分子分母定義**——`TrialRound`（`:738`）沒有完成欄位，Overview 摘要卡「已完成試標回合」（`:220`）沒有定義分子。T014 走查出現的「已完成輪次 1」與「審核 7/15 已定案」並存，就是這個缺口的症狀。

**是否需要存在（YAGNI 檢查）**：需要。兩個缺口都不是文案或樣式問題——沒有 FR-022 就沒有任何條款可以阻擋一個正式池為 0 的任務發布；沒有 FR-010u 就沒有任何條款規定五個頁籤必須用同一組分子分母，修掉顯示文字也只是把不一致藏起來（issue §4 驗收 10 明文要求「先修來源，不能只把顯示文字改成一致」）。

## What Changes

- **新增 FR-022**（正式標記池歸零之發布阻擋）：發布 `開始正式標記` 前，系統 MUST 驗證依 FR-010f-3 推導之剩餘正式標記池筆數 `> 0`；為 `0` 時 MUST 阻擋發布並顯示可閱讀原因，且該原因 MUST 與 IAA 相關狀態分列呈現，MUST NOT 把資料池不足歸因於 IAA 未達標或計算未結束（與 FR-010o-3、FR-010o-4 的語意切割一致）。`draft` 狀態下當目前抽樣設定會使剩餘池為 0 時，MUST 在發布前即顯示原因並停用 CTA；操作 handler MUST 同樣驗證，直接呼叫不得繞過。原因文字 MUST NOT 僅依賴 hover 或顏色，鍵盤與螢幕閱讀器 MUST 可取得。FR-010f-3、FR-010t、FR-010o-3、FR-010o-4 文字不變。
- **新增 FR-010u**（跨頁籤衍生計數的共用查詢上下文與聚合單位）：`task-detail` 五個頁籤呈現的計數 MUST 以同一組 `task_id × run_type × round` 查詢上下文推導，選取某一回合 MUST NOT 混入其他回合或其他任務的資料；工時與匯出歷史 MUST 依當前任務篩選，無紀錄 MUST 呈現真實空狀態而非其他任務的通用資料。本條並定義兩個目前無正典定義的計數：`已提交` 之分子為該 `task × run_type × round` 範圍內已提交之標記 assignment 數、分母為同範圍之已指派 assignment 數，依 FR-005h 被明確排除之作業不計入分子與分母；`已完成輪次` 之分子為已依試標完成規則結束之回合數，當前進行中回合 MUST NOT 計入，歷史回合與當前回合 MUST 分列呈現。`已定案 review unit`（`annotation/015-annotation-workspace` FR-051，聚合單位 `sample_id × annotator_id × run_type`）、`最終例外輸出項目`（`annotation/015-annotation-workspace` FR-095 ＋ 本規格 FR-018 第 (5) 點）MUST 讀取該兩處既有定義，MUST NOT 於 014 另建第二份定義。三種計數分屬三個不同聚合層級，MUST NOT 相加或共用分母；已提交時間 MUST NOT 冒充審核或仲裁完成時間。
- **新增六條驗收情境**（編號不預先配發，於 gate 4 回寫正典時依各使用者故事現有序號續編——現有最大為使用者故事 1 `AC-1.25`、使用者故事 2 `AC-2.5`、使用者故事 3 `AC-3.24`）：FR-010u 兩條（五頁籤同源計數與單位不相加、空狀態據實，屬使用者故事 1）；FR-022 四條（`draft` 提前提示並停用 CTA、計算狀態為 `done` 且 IAA 已達標仍因池為 0 而阻擋、資料池不足不得表述為 IAA 問題、handler 直呼亦失敗，屬使用者故事 3）。
- **新增兩條成功標準**：`SC-049`（FR-022）、`SC-050`（FR-010u）；兩者於 delta 中隨對應 Requirement 標題宣告。
- **既有條文一律不變**：FR-008a、`DRY_RUN_COMPLETION_RULE`、AC-3.2、AC-3.16、SC-004、FR-008b、AC-3.9、SC-037、FR-010o-3、FR-010o-4、AC-3.17～AC-3.20、FR-013、FR-018、FR-010f-3、FR-010t 文字全部維持原文。本 change 不移除任何 FR／AC／SC。

**BREAKING 判定**：非 BREAKING，**MINOR（4.3.0 → 4.4.0）**。FR-022 與 FR-010u 皆為全新 ID，六條 AC 與兩條 SC 皆為新增，沒有任何既有 FR／AC／SC 被移除或改寫。issue 中確實會造成 BREAKING 的部分（試標完成條件）已刻意排除於本 change 之外，見上方 ② 與 `design.md` D1。

**delta 形式說明**：FR-022、FR-010u、六條 AC 與兩條 SC 全部置於 `## ADDED Requirements`；本 change 沒有 `## MODIFIED Requirements` 內容。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑，兩條新 FR 皆落在既有 `task-management/014-task-detail` 之內。）

### Modified Capabilities

- `task-management/014-task-detail`：新增 FR-022、FR-010u、`SC-049`、`SC-050` 與六條驗收情境（AC 編號於 gate 4 回寫時配發）。既有條文全部維持原文。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v4.3.0 → v4.4.0，**MINOR**，理由：僅新增 FR／AC／SC，無既有行為被移除）。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 014 的實際版本，版本號依合併目標重算，不得倒退。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併）。
- **跨 owner，本 change 一律不編輯，列為維護者待辦**：
  1. `specs/annotation/015-annotation-workspace/spec.md`——`仲裁輸出項目` 的聚合計數單位目前無明文（FR-061 定義逐爭議項裁定機制，但未定義可顯示之計數單位）。此定義屬 015 轄下，須由 015 先定義、014 才能消費；本 change 的 FR-010u 因此只約束 014 不得自建第二份定義，不替 015 下定義。
  2. `docs/adr/022-task-state-machine-location.md`——**既有技術債，與 #1120 無關**：其 Transition Table（`:93`）與 2026-08-19 Amendment（`:104`、`:106`）仍寫著 014 v3.0.0（issue #688）已移除的 `min_reviewers` 與舊版「所有必要仲裁完成」條件，Amended 標頭（`:5`～`:7`）亦缺 2026-09-07 一列。應另開單一目的 PR 補正，不得夾帶於本 change。
  3. 若維護者裁示採納 issue §4 驗收 01／§4 驗收 02 的試標完成條件，ADR-022 Transition Table 的 `dry_run_in_progress → waiting_iaa_confirmation` 列另需新增一條 Amendment，屬該 MAJOR change 範圍。

**原型程式（Principle X 之產品檔案盤點）**

檔案清單與 PR 群組拆分見 `tasks.md`；本階段只建立提案與設計，未修改任何 `design/**` 檔案。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：FR-010u 明文禁止在 014 另建第二份 `已定案 review unit`／`最終例外輸出項目` 定義，計數一律讀既有正典來源；FR-022 的門檻由 FR-010f-3 既有推導式導出，不為任何單一任務或任務類型寫死數字。被排除作業的處理沿用 FR-005h，不另立規則。
- **Data Fairness（NON-NEGOTIABLE）**：本 change 不改變任何標記內容、答案或跨角色存取邊界。試標歷史回饋的揭露時點正典為 `annotation/015-annotation-workspace` FR-096（以回合為單位、嚴格晚於該回合轉入 `waiting_iaa_confirmation`、進行中回合 fail closed），FR-010u 的「歷史回合與當前回合分列」不得被解讀為放寬該揭露閘門；fixture 對齊亦不得讓進行中回合的資料提前可見。
- **Simplicity First / YAGNI**：不新增任務狀態、不新增重開流程、不新增一排進度卡片、不觸及 backend／API／DB／React（issue §8 明列範圍外）。issue §1 已被正典涵蓋的四項不重寫；可由既有條文承載的 AC（§4 驗收 04、§4 驗收 05、§4 驗收 07、§4 驗收 08、§4 驗收 13、§4 驗收 14、§4 驗收 15）不新增 FR。
- **PR 規模（Principle X）**：拆分與每群組產品檔案數見 `tasks.md`，各群組皆低於 5 檔／300 行門檻。
