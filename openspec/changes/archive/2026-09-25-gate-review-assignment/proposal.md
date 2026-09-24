---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #921。審核員工作區**從未檢查審核指派**。未被系統指派到某審核單位的審核員，只要在工作區左欄點選該單位（或直接以網址開啟），就能對它送出審核決策——這會造出 FR-093 明文禁止的「同一審核單位有多位審核員提交」形狀。

FR-093（`specs/annotation/015-annotation-workspace/spec.md:1004`）規定每個審核單位恰有**一位**指派審核員，「不由審核員自行挑單」。但目前只有 `annotation-list.html` 有依指派過濾（`filterToAssignedUnits()`，issue #824 隨 `sticky-review-assignment` 一併引入）：

- `getAssignedReviewUnits()`（`annotation-workspace.data.js:2422`）本身存在且已匯出，工作區側的資料層完全就緒。
- 但工作區 `annotation-workspace.config.js` 的 `buildUnits()`（`:1516`）從未呼叫它——左欄列出該任務**全部**審核單位，不只指派給自己的。
- 工作區唯一的互動閘門 `reviewUnitBlockReason()`（`:3623`）只判斷仲裁（`isArbiterCandidate()`，FR-060）、已定稿（FR-094）、離冊（`isRosterReviewer()`，issue #824 FR-093 本版修訂 4），完全不判斷「目前這位審核員是不是被指派到這個單位的那一位」。

**這是 #913 的實際產生途徑**：#913 內文原推測多審核員形狀要靠 #824 的名冊異動才會出現；實測顯示不需要改名冊，一般審核員在工作區正常點擊（或直接開網址）就能產生，因為工作區從未讀過 `getAssignedReviewUnits()`。

**維護者裁定（2026-09-24，issue #921 留言）——可查看內容、不能送出**：

> 審核員用直接網址開啟沒有指派給自己的審核單位時，工作區照常顯示樣本內容，但審核卡唯讀、送出按鈕不可用，並顯示「這個審核單位未指派給你」之類的原因說明（確切文案實作時定）。不做完全擋下的無權限頁。

理由：和已定稿單位的唯讀模式（FR-094）走同一套呈現，原型改動最小；真正的權限控管屬於後端職責。審核員之間看得到彼此的單位，不牽涉測試集答案外洩（Data Fairness）——這與 `annotation-list.html` 目前對離冊審核員的唯讀呈現同構。其他預期結果不變：工作區左欄只列出指派給自己的單位，和清單頁一致；仲裁者資格走 `isArbiterCandidate()`（FR-060），不得被這個閘門擋掉。

**已知的既有測試位移（非新缺陷）**：`design/prototype/pages/task-management/task-detail.data.js` 裡多數示範任務（如 T001）未設定 `reviewerIds`，指派因而回退到全域 4 人名冊（扣除仲裁者後 3 人）。issue #824 為 `annotation-list.html` 加上同一個 `filterToAssignedUnits()` 時，`annotation-list-reviewer.spec.ts` 已經示範過這個位移的正確處理方式：預設身分 `reviewer_wang` 在 T001 的 15 個單位裡實際只分到 `official_run: 5`、`dry_run: 6`（`ASSIGNED_UNITS = { dry_run: 6, official_run: 5 }`，該檔 `:23-37`）。工作區走同一份 `getAssignedReviewUnits()`、同一份指派推導，所以會出現同構的位移——這是「指派閘門終於在工作區也生效」的預期結果，不是新缺陷；比照 #824 `sticky-review-assignment` change 的 tasks.md 1.2，Red 之後需要一輪 probe 同步既有斷言的期望值。

## What Changes

**範圍收斂（apply 階段追加，team lead 裁定）**：維護者裁定包含兩件事——(1) 送出動作依指派收斂為唯讀閘門，(2) 工作區左欄／導覽只列出指派給自己的單位。實作 (2) 時實測發現既有測試語料庫（reviewer 角色工作區測試）廣泛假設「任一在冊審核員可開啟任一單位」，全面補上左欄過濾會牽動約 48 個既有測試檔，遠超單一 PR 承載範圍與 CLAUDE.md 之「task 觸及 ≥ 10 檔須升級」門檻。經升級判定，(2) 移交新開 issue #956（前置為本 issue 先合併），本變更之 delta 與實作只保留 (1)。

- **修訂 FR-093**：補一段本版修訂，定義工作區側的**送出**指派閘門：
  1. **直接網址開啟未指派單位時唯讀可見**：審核員以直接網址開啟未指派給自己的審核單位時，MUST 仍顯示樣本內容，但 MUST NOT 渲染任何可送出的審核控件（含鍵盤捷徑之送出路徑，FR-058），並 MUST 顯示明確原因說明。
  2. **仲裁入口不受影響**：具仲裁資格（FR-060 `isArbiterCandidate()`）的爭議單位入口 MUST NOT 被本條閘門擋掉——仲裁判定序 MUST 優先於本條。
  3. **推導來源**：本條閘門 MUST 沿用既有的 `getAssignedReviewUnits()` 推導，MUST NOT 另立第二套指派判定（DRY，避免與 `annotation-list` 的過濾邏輯分歧）。
- **原型實作**（1 個產品檔，`design/prototype/pages/annotation/annotation-workspace.config.js`）：
  - `buildUnits()` 維持不變（左欄／導覽列舉全部單位，不過濾——過濾留給 #956）。
  - 新增 `isCurrentUnitAssigned()`：把 `buildUnits()` 既有的完整單位宇宙原樣交給既有的 `getAssignedReviewUnits()`，只檢查**目前這一個單位**是否在回傳結果中，不另立第二套判定。
  - `REVIEW_UNIT_BLOCK` 新增 `NOT_ASSIGNED` 值，`reviewUnitBlockReason()` 判定序改為 ARBITRATION → FINALIZED → OFF_ROSTER → **EMPTY → NOT_ASSIGNED**（EMPTY 排在 NOT_ASSIGNED 之前：真正空的單位——標記員尚無提交、亦無示範列——在指派推導的輸入宇宙中不產生任何列舉項，對任何人都不構成「已指派」，若指派檢查排在前面，會讓未來輪值會分到它的審核員收到「未指派給你」的假訊息；此為 apply 階段跑既有測試才發現並修正的設計缺陷，非 propose 階段原始設計）。
  - 新增唯讀渲染分支（沿用 OFF_ROSTER 分支寫法）與中英文案 `reviewNotAssignedNote`。
- **既有測試修正**：跑受影響既有測試（`annotation-list-reviewer.spec.ts`、`annotation-workspace-arbitration.spec.ts`、`issue-307-empty-review-unit-gate.spec.ts`）發現 6 則因本閘門生效而轉紅，逐一 triage：1 則由上述判定序修正自動轉綠（無需測試改動）；3 則為位移（測試固定使用 T015 唯一 `can_arbitrate` 成員 `reviewer_chen` 作為預設身分，但 chen 依 issue #868／v6.15.0 規則被排除於全部新指派之外，改為傳入各案例實際受派者，斷言本身未改）；2 則為前提消失（`annotation-workspace-arbitration.spec.ts` 兩則「非受派者／非爭議單位仍正常審核」案例，其前提正是本單要修的多提交漏洞本身，在指派閘門生效後不可能合法發生，未刪除，改為斷言 FR-093 要求的正確結果並更名說明理由）。
- **正典回寫（gate 4）**：015 版號 MINOR bump（自當下最新版號接續）並補一列 Changelog；delta 中未編號的新情境於回寫時接續 FR-093 使用者故事（US4）現行最大 AC 編號，編成新 AC。

**非目標**：

- **不做工作區左欄／導覽的指派過濾**。維護者裁定的這半部分移交 issue #956（前置本 issue），詳見本節開頭之範圍收斂說明；`buildUnits()` 本變更維持不過濾。
- **不改 `getAssignedReviewUnits()`／`getReviewAssignments()`／`taskReviewAssignments()` 等指派推導本身**。工作區只是**消費**既有的指派結果，不重新定義指派規則本身（該規則已由 issue #596／#824／#868 定案）。
- **不改 `annotation-list.html` 的既有過濾邏輯**。它已經正確過濾，不受本單影響。
- **不改仲裁者資格判定（FR-060）與 `isArbiterCandidate()`**。
- **不新增後端權限控管**。維護者已明確裁定本單只做前端唯讀呈現，真正的存取控管屬於後端職責，非本單範圍。
- **不處理 #913（`[0]` 取值錯誤而非 sticky 擁有者）與 #914**。兩者依維護者排程（#921 → #913 → #914）為獨立 issue，本單只切斷「未指派審核員送出決策」的產生途徑本身。

## Capabilities

`annotation` — 審核指派閘門在工作區側生效，防止未指派審核員送出審核決策。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 閘門直接沿用既有 `getAssignedReviewUnits()` 推導，不含任何任務 ID、樣本 ID、帳號分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 唯讀可見不擴大任何人對測試集答案的存取範圍——審核員彼此互見審核內容本屬既有行為（`annotation-list` 同構），本單只收斂「誰能送出」，不收斂「誰能看」 |
| **XV. Role-Based Access Control（NON-NEGOTIABLE）** | 補齊工作區側缺失的存取閘門，使審核員的送出動作受限於系統指派，與清單頁同標準 |
| **X. Change Scope Discipline** | 1 個產品檔；測試檔與 `openspec/**`／`specs/**` 不計入門檻 |
| **XX. Source of Truth & Contract Governance** | 指派事實單一來源（`getAssignedReviewUnits()`），工作區與清單頁對「誰能送出」不再可能給出不同答案 |
