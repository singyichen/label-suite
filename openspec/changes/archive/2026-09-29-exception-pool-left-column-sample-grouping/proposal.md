---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

# Proposal

## Why

`renderExceptionQueueList()`（issue #907 建立的例外池專屬外殼）目前把 `sampleId + ' · ' + annotatorId` 塞進單一 `.sample-snippet`，並以原始 `poolItem.outKey` 鍵名（如 `SINGLE_LABEL`）直接顯示，左欄因此缺少審核工作區既有的「樣本身分 → 文本摘要 → 標記員／單位狀態」資訊層級（reviewer 端已由 `buildSampleGroup()`／issue #455 建立此語彙），造成專案負責人須自行拆解兩個 ID、無法從左欄快速回憶對應文本，也看不到人類可讀的輸出類型與明確的「待處置」狀態文字。這是既有畫面的資訊呈現落差（issue #1060），不是新建功能：Reach-for-ladder rung-1 判斷為「需要存在」——左欄若不分組呈現，AC-4.69 的可用性缺口會持續造成專案負責人誤讀，且 reviewer 端已有同構解法（`buildSampleGroup()`）可參照沿用，不是憑空新增的彈性需求。

## What Changes

- 修訂 FR-095／AC-4.69：`role=project_leader` 最終例外池左欄依 `sampleId` 分組待處置例外項，群組表頭顯示樣本 ID、該樣本待處置例外項數，以及 `getRecordPreviewText(record, fieldRoleMap)` 文本摘要（每樣本群組僅一次；摘要不可得時省略，不得以其他欄位或 ground truth 頂替）。
- 群組內每個 `pendingExceptions` 項仍各自渲染一個 `ws-exception-queue-item` 原生按鈕，不合併不同 `annotatorId`／`outKey`；群組數（樣本數）與全欄列項數（例外項數）為兩種不同計數，頂部總數維持例外項數不變。
- 列項次要資訊改用 `OUTPUT_TYPE_REGISTRY[outKey][state.lang]` 的人類可讀名稱取代原始 `outKey` 鍵名；原始 `outKey` 僅保留於資料屬性／內部識別。
- 新增「待處置」zh/en 文字狀態標示（非僅靠顏色區辨），與一般標記進度狀態文案（待標記／已儲存／已提交）明確區隔，不得誤用既有 `wsStatusPending` 等三態標記文案。
- 新增功能命名的分組 selector（`ws-exception-sample-group`，與 reviewer 專用 `ws-sample-group` 區隔）並有測試覆蓋；`ws-exception-queue-item`、`data-sample-id`、`data-annotator-id`、URL 參數契約維持不變。
- 長樣本 ID／長標記員 ID 於桌面欄寬不造成水平溢出，完整值透過 `title` 屬性與按鈕 `aria-label` 可得；鍵盤 `Tab` 可到達各列項、`Enter` 可選取；1024px 與 375px 下左欄與中欄無重疊或裁切，375px 沿用既有左欄收合規則。

## 非目標

- 不改變中央處置卡、右側歷程、處置寫入邏輯、RBAC 或任務詳情頁按鈕排版（issue #1057／#1058 範圍）。
- 不改變 `listReviewPoolItems()`、`EXCEPTION_POOL_ACTIONS` 或任何資料寫入語意；僅變更左欄呈現層級。
- 不修改 `buildReviewSubmittedDecisionSection()` 或 `annotation-workspace.config.js` 5000 行附近內容（peer issue #1058 範圍）。
- 不修改 `backend/**`、`frontend/**` 或 root `e2e/**`。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `annotation/015-annotation-workspace`：修訂 FR-095（最終例外池的逐筆收尾）之 AC-4.69（例外池左欄外殼契約），左欄新增樣本分組、人類可讀輸出類型名稱與「待處置」文字狀態層級；既有「左欄僅列待處置例外、不列一般標記樣本、不用標記進度狀態」之契約保留並延伸，不移除既有子句。

## Constitution Check

| 原則 | 符合方式 |
| --- | --- |
| **II. Generalization-First（NON-NEGOTIABLE）** | 輸出類型顯示名稱沿用既有 `OUTPUT_TYPE_REGISTRY[outKey][state.lang]`，不逐 task／逐 outKey 硬編顯示文案；分組邏輯只依 `sampleId` 通用分組，不含特定任務或輸出類型分支 |
| **III. Data Fairness（NON-NEGOTIABLE）** | 文本摘要僅透過既有 `getRecordPreviewText(record, fieldRoleMap)` 取得，不讀取未映射欄位或 ground truth；摘要不可得時省略，不得以其他來源頂替 |
| **X. Change Scope Discipline** | 產品程式碼集中於 `annotation-workspace.config.js`（例外池分組區域）與 `annotation-workspace.html`（對應 CSS）兩個檔案 |
| **XX. Source of Truth & Contract Governance** | 正典 `specs/annotation/015-annotation-workspace/spec.md` 為唯一真相來源；archive 時同步回寫版本與 Changelog，derived view 僅為衍生檢視 |

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`renderExceptionQueueList()`（約 2436–2473 行）改為依樣本分組渲染；新增例外池專用分組輔助函式（不修改 `buildSampleGroup()` 或 `buildReviewSubmittedDecisionSection()`）；新增／擴充例外池分組與「待處置」狀態的 I18N 條目。
- `design/prototype/pages/annotation/annotation-workspace.html`：擴充 `.sample-item`／`.sample-group*`／`.sample-status-label` 相關 CSS 以支援例外池分組樣式與長 ID 截斷、RWD。
- `design/prototype/tests/annotation/issue-1060-exception-pool-sample-grouping.spec.ts`（新增）；既有 `issue-907-exception-pool-screen-shell.spec.ts`、`issue-922-exception-breadcrumb.spec.ts`、`issue-455-workspace-unit-grouping.spec.ts` 須維持通過。
- 正典 `specs/annotation/015-annotation-workspace/spec.md`：FR-095／AC-4.69 修訂，版本升級至 9.1.0（MINOR），Changelog 新增條目引用本 change 與 issue #1060。
