---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

# 標記／審核 run 身分正典對齊提案

## Why

Issue #1160 盤點 task/run 與標記／審核資料時，發現只用 `task_id × run_type × sample_id × annotator_id` 定址，無法區分退回 draft 後再次發布的 R1；同一來源 sample ID 也可能對應不同 dataset item。若提交、草稿、審核單位或仲裁紀錄沿用這些顯示用值，新舊 run 的責任鏈與統計會混合。另一方面，若把 reviewer 指派另存為持久化 `ReviewAssignment`，會與 015 FR-093 依已提交審核推導黏著的規則衝突；若工作區讀取 task 的目前指引，歷史 run 的指引確認也無法重現。

015 v11.0.1 已在 FR-014S、FR-051、FR-059、FR-061、FR-066、FR-093、AC-7.1～AC-7.3 與 SC-014 裁定上述下游身分邊界。本 change 僅承載 015 owning spec 的 OpenSpec delta，不重定義上游建立、發布或抽樣規則。

## Goal

讓標記與審核作業以穩定 `run_id × assignment_id` 追溯同一次發布的工作，保留跨 cycle 的歷史隔離、submission-derived reviewer 黏著及 run-pinned 指引確認，作為後續實體欄位字典與測試的可核對來源。

## What Changes

- 對齊 015 FR-051、FR-014S 與關鍵實體：AnnotationListItem、AnnotationRecord、ReviewUnit，以及審核草稿、歷程、仲裁／例外處置與 gold 追溯，均以確切 run／assignment 限定範圍；來源 sample ID、R1 顯示序號與 prototype route/bucket 不能充當跨 cycle 的持久化唯一鍵。
- 對齊 015 FR-093：Dry 的同一 run／`dataset_item_id` 形成 per-sample 黏著群組，Official 以審核單位分派；已提交審核推導 reviewer 黏著，未提交草稿不構成黏著，不建立第二份持久化 ReviewAssignment。歷史責任鏈保留，但下一次讀取或寫入仍依目前有效 membership、角色、矩陣與資料範圍授權。
- 對齊 015 FR-066：工作區的 modal 與側欄讀取同一 run 釘住的不可變 `guideline_version_id`；確認紀錄比對 task 與該版本。Dry 對應其 round 指引，Official 於發布時鎖定當時 current 指引，日後編輯不改寫舊 run。
- 以 AC-7.1～AC-7.3／SC-014 追蹤重啟 R1、相同來源 ID 的不同 item、停用 reviewer 與 Official 指引版本差異的驗收邊界；FR-059／FR-061 的爭議寫入與逐項計數沿用審核單位身分。

## Capabilities

| 來源 | 責任 |
|---|---|
| `specs/annotation/015-annotation-workspace/spec.md` v11.0.1 | 本 change 唯一對應的 owning spec；消費穩定 run／assignment，定義標記、審核、仲裁及指引顯示的下游身分。 |
| `task-config-version-contract` → `specs/task-management/013-task-new/spec.md` | 相依的上游 change；擁有初始不可變 config/schema 版本、registry 來源及建立交易。 |
| `task-run-identity-contract` → `specs/task-management/014-task-detail/spec.md` | 相依的上游 change；擁有 cycle、run、assignment、每次發布的 snapshot 與 run-pinned guideline/config 版本。 |

三份 change 共同服務 issue #1160，依 013 建立版本起點 → 014 發布並釘住 run → 015 消費 run／assignment 的來源順序銜接。Accepted ADR-022 管理 task 狀態轉換；DBA 規劃文件 `docs/superpowers/specs/2026-10-06-task-run-identity-design.md` 提供裁決依據，不取代正典。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| II. Generalization-First | 審核單位身分及黏著依 run、assignment、item 與提交推導，沒有依任務類型或帳號硬編。 |
| III. Data Fairness | 標記／審核資料只讀授權的公開 item 與所屬提交；不複製 dataset 私有答案、`declared_split`、測試集答案或其他審核員未提交草稿至可見投影。 |
| XIV. Lineage、XVI. Reproducibility | 提交、決策、仲裁與 gold 可追溯至同一 run／assignment，工作區使用該 run 的 config/schema 與 guideline 版本；歷史 R1 保留且隔離。 |
| XV. RBAC、XVIII. Deployment Safety、XX. Source of Truth | 歷史黏著不授予當前存取權；015 是下游行為正典，本 change 不宣稱任何候選表、FK 或正式授權實作已部署。 |

## 範圍、風險與回滾

本 change 只交付 015 的正典對齊與 OpenSpec 規劃文件。不建立 ORM、migration、API、資料搬遷、實體 ER 或 NoteCraft 圖面，也不宣稱 SQLite／PostgreSQL 的外鍵、唯一性、授權或交易語意已實測。物理 annotation／review 欄位與 FK、審核員改判後仲裁一致性及 span 爭議合併鍵，留待各自後續 owning slice 裁決；本提案不擴充兩種 run type 的既有 UI 流程。

主要風險是後續實作仍用 `run_type`、round 或來源 sample ID 查找提交，造成不同 cycle 的 R1 互相污染；或把歷史 reviewer 黏著誤當目前權限。後續測試須分別驗證身分隔離、即時授權、指引版本及答案洩漏。撤回規劃時，以新的文件修訂或 revert commit 核對 013／014／015 的版本、Changelog、delta 與衍生 view；本 change 沒有部署資料，不涉及資料庫 downgrade 或刪除。
