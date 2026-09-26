---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

issue #907 預期結果第 4 點後半（底部改為「尚未選擇最終處置」＋「確認處置」）在 PR #919（畫面外殼）中刻意未實作，留下明確出口由本 issue（#920）承接：「該改動會取代 AC-4.56／AC-4.57 已驗證的『一鍵即處置』互動契約，屬互動模型變更而非畫面外殼，因此必須另立 change 與 PR」。

現況（`annotation-workspace.config.js` `buildExceptionPoolItemRow()`）：`adopt_annotator`／`adopt_reviewer` 點擊即以空字串理由（`resolveFn(item, action, value, '')`）一鍵定案；`custom_answer`／`exclude_from_dataset` 則展開理由欄與各自的確認按鈕。四個處置的互動節奏不一致，畫面底部亦無彙整區顯示目前選取狀態。

維護者 2026-09-24 裁定引用正典 FR-095（`spec.md:1012`）已明文「收尾必須附理由」，而衍生檢視 `openspec/specs/annotation/015-annotation-workspace/spec.md`（現行行號 794-795）將 `adopt_annotator`／`adopt_reviewer` 兩點寫成「一鍵完成」，與正典矛盾——正典為唯一真相來源，以正典為準，且該矛盾須在同一個 change 內修正。同一則裁定亦指出：`adopt_*` 現行寫出 `reason: ""`（issue #913 重現結果），代表現行程式碼本來就沒有落實 FR-095 的「必附理由」要求，屬真實缺陷，本 change 一併修正。

2026-09-26 裁定解除 9/24「本波先不動」之暫緩（該波已隨 #907／PR #919 合併而結束），並預先授權本 change 於同一支 PR 內把 AC-4.56／AC-4.57 判定為「前提消失」做 MAJOR bump，且不需在 archive 前停下等二次確認。

## What Changes

- `FR-095` 新增「先選取、後確認的處置互動模型」段落（v7.0.0，BREAKING）：四個處置動作的點擊 MUST 只標記選取狀態、MUST NOT 觸發寫入；新增彙整列，未選取顯示「尚未選擇最終處置」、選取後顯示所選處置與（若適用）其定稿值；理由必填擴及全部四種處置，理由為空時「確認處置」控件 MUST 停用（disabled）；「確認處置」為唯一寫入點。
- 廢止 **AC-4.56**、**AC-4.57**（前提消失——其「開啟收尾畫面即以單步呈現處置結果」之一鍵契約不再存在，ID 保留不重用），新增 **AC-4.72 ~ AC-4.75** 承接其驗收範圍並涵蓋選取狀態、彙整列狀態機、理由必填與確認按鈕停用、寫入後 `reason` 非空。
- 同步修正衍生檢視 `openspec/specs/annotation/015-annotation-workspace/spec.md` 之 FR-095 段落——移除與正典矛盾的「一鍵完成」措辭（issue #920 裁定要求同一 change 內修正，非另案）。
- 原型 `design/prototype/pages/annotation/annotation-workspace.config.js`：`buildExceptionPoolItemRow()`／`expandExceptionPoolAction()` 改寫為「選取→確認」兩段式，四個處置按鈕改為選取切換（`aria-pressed`）；恆常渲染理由欄、新增彙整列（新 testid `ws-exception-pool-summary`）與統一的確認按鈕（新 testid `ws-exception-pool-confirm`，取代舊有 `ws-exception-pool-custom-answer-confirm`／`ws-exception-pool-exclude-confirm`）；確認按鈕以原生 `disabled` 屬性停用（既有 toast-blocked 慣例的刻意分歧，見 design.md D3）；新增/移除對應 i18n 鍵。
- 改寫既有測試中「前提消失」的斷言：主要契約檔 `design/prototype/tests/annotation/issue-596-exception-pool.spec.ts`，以及三個間接依賴一鍵寫入的既有測試（`tests/task-management/issue-891-live-review-pools.spec.ts`、`tests/annotation/issue-913-exception-pool-sticky-owner.spec.ts`、`tests/annotation/issue-914-finalized-value-validation.spec.ts`）。

## 非目標

- 不改變 `EXCEPTION_POOL_ACTIONS` 集合本身、`custom_answer` 僅 `official_run` 提供之 run_type 分流、或四個處置各自的資料寫入語意（採 A／採 B／自訂答案／排除）。
- 不改變 FR-095「最終例外處置畫面的外殼」（AC-4.69、SC-011，issue #907）既有規範，本 change 不觸碰左側佇列、進度計數、自動儲存隱藏或排除動作危險樣式四項。
- 不處理 `arbitrationFinalizedSnapshot()` 之 `readReviewerSubmissions(...)[0]`（issue #975）或 `annotation-workspace.config.js` 另四處同構寬鬆判準（v6.21.0 Changelog 已記錄，另案追蹤）。
- 不修改 `backend/**`、`frontend/**` 或 root `e2e/**`。

## Capabilities

`annotation` — 最終例外池逐筆收尾之處置互動模型（先選取、後確認、理由必填擴及四種處置）。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First** | `custom_answer` 仍重用既有 config-driven 作答控件（`renderOutputPreview()`），不新建例外池專屬作答 UI；選取/確認邏輯不依賴任何任務或輸出類型的硬編分支 |
| **III. Data Fairness** | 不新增任何跨標記員／跨審核員資料揭露，僅變更既有資料的寫入時序與理由必填範圍 |
| **X. Change Scope Discipline** | 產品程式碼集中於 `annotation-workspace.config.js` 一個檔案（含其內嵌 i18n 區塊） |
| **XX. Source of Truth** | 正典為唯一真相來源；衍生檢視與正典矛盾之「一鍵完成」措辭於本 change 內修正，不留待另案 |
