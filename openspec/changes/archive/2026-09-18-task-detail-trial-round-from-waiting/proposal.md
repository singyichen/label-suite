---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #791
基準版本: 014 v3.3.1
目標版本: 014 v4.0.0
---

## Why

正典 014 目前允許在一個試標回合**尚未完成**時就開下一回合：`:376` 規定 `dry_run_in_progress` 顯示 `新增試標回合 R{trial_round+1}`，FR-013（`:601`）重述同一規則，AC-3.12（`:450`）的前提更直接寫成「任務已完成 R1 試標且處於 `dry_run_in_progress`」。而 `waiting_iaa_confirmation`（`:377`）只提供 `開始正式標記`——看完 R1 的一致性結果、判斷需要再試一輪的專案負責人，在唯一有結果可看的狀態下反而沒有「再試一輪」的入口。

這讓回合之間沒有決策點：R1 還有人沒交就能開 R2，R1 的 IAA 從未被確認，下一輪的修訂紀錄（FR-017 的 `prior_round_findings`）也就沒有可依據的「前一輪發現」。prototype 更進一步把這條路徑寫死：`publishDryRun()` 依回合 IAA 結果決定停在 `dry_run_in_progress` 或 `waiting_iaa_confirmation`（`design/prototype/pages/task-management/task-detail.html:10092`），同時違反 FR-010o-3「此轉換與 IAA 達標與否無關」。

維護者已於 2026-09-18 裁定：**新增試標回合只能自 `waiting_iaa_confirmation` 發起**，新增 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，`dry_run_in_progress` 期間不得新增回合；`annotation/015-annotation-workspace` FR-096 不變。

同日維護者就本 change 的待決事項全數裁定：`:377` 與 FR-013 一併改寫（Q1）；`:455`「不允許跳階」與 SC-004 補一句釐清（Q2）；FR-096 揭露閘門的既有落差另以 issue #834 追蹤（Q3）；`publishDryRun()` `:10092` 的既有違規於本 change apply 內修正；正典自 `specs/_archive/` 取回可接受。

**是否需要存在（YAGNI 檢查）**：需要。這不是新功能而是補上狀態機缺的一條邊——少了它，「看完結果再決定要不要再試一輪」這個試標迴圈的核心動作在規格上不存在。

## What Changes

- **FR-013 改寫**：執行控制按鈕對照表中，`dry_run_in_progress` 的 `新增試標回合 R{trial_round+1}` 改為可見但停用，並於按鈕旁以可見文字顯示原因「本回合全部提交並完成 IAA 後才能新增下一回合」（維護者 2026-09-18 裁定）；`waiting_iaa_confirmation` 同時顯示 `開始正式標記` 與 `新增試標回合 R{trial_round+1}`。兩者是同一決策點的互斥選項，改寫後明文說明其不構成「語意衝突的操作」。
- **新增狀態轉換** `waiting_iaa_confirmation → dry_run_in_progress`：新回合清單建立與狀態轉換為同一動作；轉換後在新回合任何提交之前不得因 FR-008a 立即轉回待確認。
- **AC-3.12 前提改寫**：由「處於 `dry_run_in_progress`」改為「處於 `waiting_iaa_confirmation`」，並補上「被阻擋時狀態維持不變」與「成功後轉為 `dry_run_in_progress`」兩個可觀察結果。
- **新增 SC-047**：可點擊的 `新增試標回合` 恰只出現在 `draft` 與 `waiting_iaa_confirmation` 兩種狀態（`dry_run_in_progress` 只顯示停用按鈕與原因），且每個 R{n}（`n >= 2`）恰對應一次自待確認發起的轉換。
- **`:455` 與 SC-004 釐清**（Q2，不新增編號）：「合法轉換以 ADR-022 轉換表為準；表列的回溯轉換不視為跳階」，寫在 delta FR-013 第 (7) 點，gate 4 原地補入正典。
- **新增三條驗收情境**（AC 編號於 gate 4 回寫時配發，接續 AC-3.13）：試標進行中的新增回合按鈕停用並顯示原因、待確認同時提供兩個按鈕、新回合建立後不會立即轉回。
- **ADR-022 修訂**（apply 任務，不在本 propose 內改動）：Transition Table 新增一列、`:92`「Reverse transitions (other than `waiting_iaa_confirmation → draft`) are not permitted」補列新的回溯轉換、`ALLOWED_TRANSITIONS`（`:113`）`WAITING_IAA_CONFIRMATION` 集合加入 `DRY_RUN_IN_PROGRESS`，並新增 Amended 日期列。
- **prototype**：`renderPublishActions()` 依新對照表渲染；`publishDryRun()` 不再依 IAA 決定狀態（修正 `:10092` 對 FR-010o-3／FR-008a 的既有違規），發布後一律為 `dry_run_in_progress`，回合全員完成後經既有的 `syncStatusFromDryRunProgress()` 一律進入 `waiting_iaa_confirmation`，不論 IAA 是否達標；回合結果改在完成時寫入（design.md D1、D2）。

**BREAKING 判定**：**BREAKING**。沒有任何 FR／AC／SC ID 被移除，但既有行為「`dry_run_in_progress` 可新增下一回合」被收回；維護者 2026-09-18 裁定移除既有行為一律視為 MAJOR。版本判定見 Impact。

**delta 形式說明**：FR-013 與 AC-3.12 不在 `openspec/specs/` 衍生檢視內，無法使用 `## MODIFIED`（archive 會硬中止、`openspec validate` 零訊號），因此以既有 ID 置於 `## ADDED Requirements`。gate 4 回寫正典時必須**原地改寫** FR-013 與 AC-3.12，不得新增第二條同 ID 條文（見 tasks.md 群組 3）。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `task-management/014-task-detail`：改寫 FR-013 與 AC-3.12，新增 SC-047 與三條驗收情境，以及正典 `:375-377` 的 Prototype 互動規格按鈕列。FR-008、FR-008a、FR-010f-2、FR-010o-3、FR-017 維持原文。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v3.3.1 → v4.0.0，**MAJOR**）。維護者 2026-09-18 裁定：本 change 收回 `dry_run_in_progress` 可新增下一回合的既有行為，移除既有行為屬破壞性變更，一律判為 MAJOR。FR-013 與 AC-3.12 的 ID 保留、條文原地改寫。issue #783 的 014 change 以本版為基準，目標版本相應為 v4.1.0。
- 正典待改寫錨點（gate 4）：`:375-377`（Prototype 互動規格按鈕列）、`:450` AC-3.12、`:455` 行為規則（補釐清句）、`:601` FR-013、SC-004（`:737`，補釐清句）、驗收情境清單末（AC-3.13 之後新增三條）、成功標準區 SC-046 之後新增 SC-047、Changelog 新增 v4.0.0 列。
- 該正典原封存於 `specs/_archive/014-task-detail/`，本 change 開立時已依 issue #648 取回至 `specs/task-management/014-task-detail/`（本分支第一個 commit）；合併後依 #742／#772 先例另開 PR 歸位。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併；開頭「目前收錄」清單與正典版本註記須於 gate 4 同步）。
- ADR：`docs/adr/022-task-state-machine-location.md`（`:5` Amended、`:82` Transition Table、`:92` 回溯轉換句、`:113` `ALLOWED_TRANSITIONS`）。
- 上游 `annotation/015-annotation-workspace`：不修改（FR-096 不變；揭露閘門的既有落差另以 issue #834 追蹤，見 design.md Q3）。
- 下游：無。

**原型程式（Principle X 之產品檔案盤點）**

| 檔案 | 用途 | 群組 |
|------|------|------|
| `design/prototype/pages/task-management/task-detail.html` | `renderPublishActions()` 對照表、`publishDryRun()` 狀態與回合結果寫入時點、`syncStatusFromDryRunProgress()` 補寫回合結果、判定 banner 文案與雙語 i18n 鍵 | 1、2 |
| `docs/adr/022-task-state-machine-location.md` | 新轉換列入 Transition Table 與 `ALLOWED_TRANSITIONS` | 3 |

合計 1 個產品檔案＋1 份 ADR，預估 prototype 60–120 行，低於 5 檔／300 行門檻，單一 PR 交付。

**既有測試受影響**：`design/prototype/tests/task-management/task-detail-stage-flow.spec.ts`（`:50` 在 `dry_run_in_progress` 直接點 R2）與 `design/prototype/tests/task-management/task-detail-task-profiles.spec.ts`（`RUN_CONTROL_CASES` 的 `dry_run_in_progress` 與 `waiting_iaa_confirmation` 兩列）斷言的是舊規則，須由 `senior-qa` 於 Red 階段改寫；其餘使用 `#publishDryRunBtn` 的測試皆自 `draft` 發布 R1，行為不變，列入回歸。

**套用順序**：本 change 須先於 issue #783 的 014 change apply；#783 的 014 change 會在本 change 合併後 rebase，兩者都動 ADR-022 Transition Table 與 `specs/STATUS.md` 014 列。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：按鈕對照表只依任務狀態，不依任務 ID、任務類型或輸出類型分流；回合數上限不寫死。
- **Data Fairness（NON-NEGOTIABLE）**：R{n+1} 只能在 R{n} 已進入 `waiting_iaa_confirmation` 之後建立，`annotation/015-annotation-workspace` FR-096 對 R{n} 的揭露前提因此在 R{n+1} 開始前即已成立；R{n+1} 進行中其本身資料仍一律不揭露。FR-010f-2 規定新回合不重用前一回合清單，不因本變更改變。本變更不讓任何角色看到更多資料。
- **Simplicity First / YAGNI**：prototype 沿用既有 `syncStatusFromDryRunProgress()`，不新增示範捷徑鈕、不新增轉換白名單。
- **PR 規模（Principle X）**：1 個產品檔案＋1 份 ADR；archive 與正典回寫落在同一 PR（ADR-033 Rule 1）。
