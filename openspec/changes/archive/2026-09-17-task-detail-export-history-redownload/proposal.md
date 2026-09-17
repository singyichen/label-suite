---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #772
基準版本: 014 v3.2.0
目標版本: 014 v3.3.0
---

## Why

正典 014 對匯出記錄表的「下載」早有明文：使用者故事 1 區塊 3 寫「`下載` 語意為 `重新下載`：系統必須依該筆記錄保存的原始匯出條件重新產生相同範圍的匯出結果，不得套用使用者目前畫面上的篩選條件」，FR-010i-2 要求重新下載「以該快照為唯一依據重建匯出結果」，v3.2.0 的 FR-020 第 3 點更要求 `sequence_tagging` 的快照保存方案、單位與切詞引擎，「使重新下載重建出的檔案與原檔逐字元相同」。

但這三段條文在畫面上**完全沒有兌現**，且現況可直接證實：

- **按鈕沒有行為**。`renderArExportHistory()`（`design/prototype/pages/task-management/task-detail.html:9642`）建立「下載」按鈕後沒有綁定任何 click handler。issue #742 只補上了快照寫入端，#742 tasks.md 使用者裁定 ② 明文把讀取端移交本 issue。
- **快照不足以重建原檔**。`getArFilteredSamples()` 依五個篩選值過濾樣本，快照只存了三個；匯出檔的 `exported_at`、`exported_by` 與任務名稱語言都在匯出當下即時取值。即使接上按鈕、照現有快照重跑，得到的也不是原檔。
- **正典沒有說重新下載要不要新增紀錄**。這是實作前必須定案的行為，維護者已於 2026-09-17 裁定：**重新下載不新增匯出記錄**。

## What Changes

- **新增 FR-021：匯出記錄重新下載依條件快照重建且不新增紀錄**。點擊「下載」只依該列快照重建並觸發下載；不讀取當前頁面篩選、不讀取匯出對話框選項、不開啟對話框；不在匯出記錄表新增任何列。
- **快照補存重建所需的最小欄位**。審核員篩選、審核狀態篩選、完整精度的匯出時間、匯出人與匯出當下的介面語言——每一項都對應一個「不存就會讓重建結果不同」的具體來源（見 design.md 背景第 2、4 點）。
- **逐字元相同**。標記結果與切詞引擎資料未變動時，重建檔內容與檔名皆與原始下載相同；適用所有任務類型與兩種匯出格式（維護者裁定點名 `sequence_tagging`，擴及全部為建議，見 design.md Q5）。
- **無法重建時明確拒絕、不補值**。缺快照或缺必要欄位的紀錄，「下載」停用並附中文說明；詞級紀錄的切詞引擎已不可用時阻擋並顯示中文原因。兩者皆不產檔、不新增紀錄、不以預設值或當前畫面補齊。
- **單一產生路徑**。重新下載與匯出按鈕共用同一組匯出內容組裝函式，只換條件來源；`sequence_tagging` 推導入口維持 FR-020 第 1 點與 SC-045 的單一呼叫點。
- **不修訂任何既有條文**。FR-010i-2 與 FR-020 第 3 點原文不動，FR-021 自述為兩者的讀取側並寫明邊界。採純 `## ADDED Requirements` 的理由：FR-010i-2 不在 `openspec/specs/` 衍生檢視內，對它下 `## MODIFIED` 會在 archive 階段硬中止（`openspec validate` 對此零訊號）；FR-020 雖在衍生檢視內，但要 MODIFIED 必須整段重貼 FR-020 全文，只為了補一句讀取側行為，風險與 diff 都不成比例。

無 **BREAKING**：匯出按鈕的行為、兩種匯出格式的欄位結構、記錄表欄位與排序皆不變；快照是只增不減的記憶體物件。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `task-management/014-task-detail`：新增 FR-021、AC-1.14、AC-1.15、AC-1.16 與 SC-046。既有匯出條文（FR-009、FR-009a、FR-010i、FR-010i-1、FR-010i-2、FR-015g、FR-015h、FR-020）全部維持原文。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v3.2.0 → v3.3.0，**MINOR**）。判為 MINOR 的理由：新增 FR／AC／SC，CLAUDE.md Lightweight Path 要求「no requirement (FR/AC) is added or removed, only clarified」，本變更新增需求故不適用輕量路徑，且新增需求屬功能擴充；沒有任何既有行為被推翻——重新下載原本就不存在可觀察行為，快照只增欄位。
- 該正典原封存於 `specs/_archive/014-task-detail/`，本 change 開立時已依 issue #648 取回至 `specs/task-management/014-task-detail/`；合併後依 #742／PR #786 先例另開 PR 歸位。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併；其開頭正典路徑與版本註記須於重新封存 PR 同步）。
- 上游：不修改。`dataset/017` 的推導契約僅被沿用。
- 下游：不修改。

**原型程式（Principle X 之產品檔案盤點）**

| 檔案 | 用途 | 群組 |
|------|------|------|
| `design/prototype/pages/task-management/task-detail.html` | 條件來源參數化、快照補存欄位、「下載」按鈕綁定、停用說明與阻擋提示、雙語 i18n 鍵 | 1 |

合計 1 個產品檔案，預估 150–220 行，低於 5 檔／300 行門檻，單一 PR 交付。若 Green 完成後實測超過 300 行，比照 #742 先例把 design.md D1 的純重構移到 Red 之前另成一個 PR（見 tasks.md 群組 1 說明）。

**既有機制交互**

- **`getArFilteredSamples()`（`:8790`）**：現行讀五個 `state.ar*` 篩選值；改為接受條件物件（design.md D1）。
- **`buildJsonExportPayload()`（`:9321`）與 `buildJsonMinExportPayload()`（`:9389`）**：現行讀 `state.arStage`、`state.arStatus`、`state.arAnnotator`、`state.lang` 與即時時間；改為讀條件物件。
- **`downloadArExport()`（`:9440`）**：現行另取一次時間組檔名，與 manifest 時間是兩個值；改為讀條件物件中的同一個匯出時間。
- **`performArExport()`（`:9461`）**：快照補存五個值（design.md D2）；此函式仍是唯一會新增匯出記錄的入口。
- **issue #742 的 SC-045 原始碼掃描護欄**：斷言頁面內 `deriveSequence(` 恰好一次；重新下載不得新增呼叫點（FR-021 第 5 點）。
- **匯出對話框確認處理（`:10525` 起）與 `state.arSeqExportRun`**：重新下載需使用同一累加器取得詞級 metadata，但不得渲染擴張摘要（design.md D5）。

**範圍界線（明示排除，供審閱者確認）**

- **不做檔案快取**。維護者裁定為依快照重建（design.md D1 替代方案）。
- **不凍結標記資料版本**。逐字元相同的前提是標記結果未變動；資料版本保存屬後端範圍（design.md Q7）。
- **不改動匯出記錄表的欄位、排序與分頁**，不調整 `scope_label`／`export_type` 在紀錄中的存放位置（design.md Q6）。
- **不修改 `task-detail.data.js` 與 `annotation-results.html`**，不修改共用推導模組 `design/prototype/pages/shared/span-tagging-export.js`。
- **不修改既有測試檔**。`design/prototype/tests/task-management/issue-761-review-workload-derivation.spec.ts` 開頭註解仍引用 `specs/_archive/014-task-detail/spec.md`，正典重新封存後即恢復正確，本 change 不動它。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：重新下載的行為對所有任務類型一致，不依任務 ID 或任務類型分流；`sequence_tagging` 的額外必要欄位（方案與單位）是否必須存在，依任務 `outputs[]` 是否含 `sequence_tagging` 判定，與 FR-020 對話框開關為同一個設定驅動判定。
- **Data Fairness（NON-NEGOTIABLE）**：重新下載的樣本範圍嚴格等於原始匯出的範圍，不因當前篩選放寬而多帶資料；不改變任何角色可見的資料範圍，`reviewer` 唯讀邊界（SC-029）與被排除標記作業規則（FR-015l）不受影響。
- **Simplicity First / YAGNI**：只補重建所需的最小欄位；不做快取、不做重新下載紀錄、不做資料版本凍結。
- **DRY**：重新下載與匯出按鈕共用同一組組裝函式，只換條件來源（design.md D1）。
- **PR 規模（Principle X）**：1 個產品檔案、預估 150–220 行，單一 PR；archive 與正典回寫落在同一 PR（ADR-033 Rule 1）。
