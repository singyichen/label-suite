# Spec Delta

> **流程註記**：`openspec/specs/shared/019-workspace-tabs/` 衍生檢視目前只收錄 `FR-002`／`FR-011`／`FR-018`／`FR-023`～`FR-025`（見 `1099-workspace-tabs-overview-menu` 的首次收錄流程註記），**不含 `FR-010`**。OpenSpec 對衍生檢視中不存在的條文只接受 `## ADDED Requirements`，因此本 delta 比照該前例，以 `## ADDED Requirements` 宣告 `FR-010` **修訂後全文**；這不代表 `FR-010` 對正典而言是新增，正典回寫時 Changelog 會正確記述為修訂既有條文。新情境依專案慣例不在 delta 階段預先編號，於 gate 4 回寫正典時接續使用者故事 1 現行最大者（`AC-1.6`）編號。

## ADDED Requirements

### Requirement: FR-010 頁籤標題組成（種類小標籤＋對象名稱）

頁籤標題 MUST 能分辨頁面種類與對象（如任務名稱），並 MUST 由「種類小標籤（kind chip）」與「對象名稱」兩部分組成：

1. **組成規則**：種類小標籤為獨立 DOM 節點（`.workspace-tab-kind`），名稱放在既有 `.workspace-tab-label`。各頁面種類的組成 MUST 如下表：

   | 頁面種類 | 種類小標籤（zh／en） | 對象名稱 |
   |---|---|---|
   | `dashboard`、`profile`、`task-list`、`task-new`、`annotation-list`、`dataset-analysis-list`、`user-management`、`role-settings` | 無 | 既有頁面種類名（不變） |
   | `annotation-workspace`（`annotate`） | 標記／Annotate | 任務名稱 |
   | `annotation-workspace`（`review`） | 審核／Review | 任務名稱 |
   | `task-detail`（無 `ap_stage`） | 詳情／Detail | 任務名稱 |
   | `task-detail`（`ap_stage=rN`） | 試標 RN／Dry Run RN | 任務名稱 |
   | `task-detail`（`ap_stage=official`） | 正式／Official | 任務名稱 |
   | `dataset-analysis-detail` | 分析／Analysis | 任務名稱（資料集以 `task_id` 定位，名稱取自 `dataset-analysis-list.data.js` 的 `nameZh`／`nameEn`） |

2. **名稱解析**：任務名稱 MUST 依序回退——即時查詢（目前頁面的任務資料）→ 頁籤上的名稱快照 → 原始 `taskId`；英文介面取 `nameEn`，缺漏時回退 `nameZh`。名稱快照 MUST 對所有帶 `taskId` 的頁面種類寫入（不再僅限 `task-detail`）。去重鍵對照表（`FR-006`）MUST NOT 因本條改變，本條只影響顯示。
3. **純文字版標題**：`title` 屬性、關閉按鈕的 `aria-label`、總覽選單列（`FR-023`）與行動版選單 MUST 使用純文字版標題「小標籤＋空格＋名稱」（無小標籤的頁面種類即為頁面種類名），且 MUST NOT 渲染小標籤 DOM；總覽選單的篩選（`FR-023`）MUST 比對純文字版標題，因此輸入任務名稱亦能篩到對應的標記作業頁籤。名稱過長時 `.workspace-tab-label` MUST 以 `text-overflow: ellipsis` 截斷。
4. **階段與模式色彩（`TAB_STAGE_BADGE`）**：階段色 MUST 作用於種類小標籤而非整顆頁籤文字——試標（`dry_run`）小標籤用警示色語意 token、正式（`official_run`）用主色語意 token；`annotation-workspace` 的 `review` 模式用資訊色語意 token；其餘種類用中性色語意 token。頁籤本文 MUST 一律使用既有的非作用中／作用中文字色。色彩 MUST 取自語意 token，兩主題皆然，不得出現硬編碼色碼。

#### Scenario: AC-1.6-updated 試標與正式頁籤以小標籤色分辨階段
- **GIVEN** 一個 `task-detail` 頁籤處於 `ap_stage=r1`（試標）、另一個處於 `ap_stage=official`（正式）
- **WHEN** 檢視兩個頁籤的標題
- **THEN** 試標頁籤的種類小標籤顯示「試標 R1」並以警示色語意 token 著色，正式頁籤的小標籤顯示「正式」並以主色語意 token 著色，兩顆頁籤的名稱欄皆顯示任務名稱
- **AND** 兩顆頁籤的本文文字色一致，不隨階段改變

#### Scenario: 不同任務的標記作業頁籤可由名稱分辨
- **GIVEN** 同時開啟任務 T001 與 T002 的標記作業頁籤（`annotate` 模式）
- **WHEN** 檢視頁籤列
- **THEN** 兩顆頁籤分別顯示「標記」小標籤與各自的任務名稱，不再顯示同名

#### Scenario: 同一任務的標記與審核頁籤以小標籤分辨模式
- **GIVEN** 同一任務同時開啟 `annotate` 與 `review` 兩個標記作業頁籤
- **WHEN** 檢視頁籤列
- **THEN** 小標籤分別為「標記」與「審核」，名稱欄相同，且兩顆頁籤的去重行為仍符合 `FR-006`

#### Scenario: 任務詳情依階段顯示三種小標籤並使用語意 token 色
- **GIVEN** 三個 `task-detail` 頁籤，分別為 `ap_stage=r1`、`ap_stage=official` 與無 `ap_stage`
- **WHEN** 於淺色與深色兩種主題檢視小標籤的 computed style
- **THEN** 小標籤文字依序為「試標 R1」「正式」「詳情」，背景與文字色分別取自警示色、主色與中性色語意 token，不出現硬編碼色碼

#### Scenario: 資料集分析詳情頁籤與清單頁籤可區別
- **GIVEN** 已開啟資料集分析清單頁籤與某任務的資料集分析詳情頁籤
- **WHEN** 檢視頁籤列
- **THEN** 詳情頁籤顯示「分析」小標籤與任務名稱，清單頁籤只顯示「資料集分析」且無小標籤

#### Scenario: 純文字版標題用於 title、aria-label、總覽選單與篩選
- **GIVEN** 已開啟「標記」小標籤加任務名稱的標記作業頁籤
- **WHEN** 檢視該頁籤的 `title` 屬性與關閉按鈕 `aria-label`、開啟總覽選單並於篩選框輸入該任務名稱
- **THEN** `title` 與 `aria-label` 皆為「小標籤＋空格＋名稱」完整文字；總覽選單列與行動版選單顯示同一段純文字且不含小標籤 DOM；該頁籤被篩出
- **AND** 名稱超長時 `.workspace-tab-label` 以省略號截斷

#### Scenario: 英文介面的小標籤與名稱
- **GIVEN** 介面語言為 en
- **WHEN** 檢視各頁面種類的頁籤
- **THEN** 小標籤為 Annotate、Review、Detail、Dry Run RN、Official、Analysis，名稱取 `nameEn`，回退順序與 zh 相同
