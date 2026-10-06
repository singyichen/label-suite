---
對應 Spec: specs/task-management/013-task-new/spec.md
---

# 任務建立時設定版本起點提案

## Why

Issue #1160 的 task/run 資料表盤點需要能追溯任務建立時的完整設定與 schema。若初始設定只保留可覆寫的目前值，後續 draft 修改將失去版本起點，run 也無法精確引用當時驗證過的設定。013 v8.3.0 已在 FR-006、FR-006a、FR-006d 與 AC-4.3～AC-4.5 裁定建立交易、不可變版本及冪等重送；本 change 將該 owning spec 的既有決策交由 OpenSpec delta 追蹤。

## Goal

以 013 為任務建立的正典，明確保存初始 config/schema 版本與建立者權限起點，使後續 014 的 cycle/run 與 015 的標記／審核資料可引用確切的歷史版本。本 change 只對齊規劃契約，不建立實體 Schema 或執行資料搬遷。

## What Changes

- 對齊 013 FR-006 與 `TaskConfig`：第一次通過 registry 驗證的完整 config 與內嵌 label-schema snapshot 共用不可變 `task_config_version` v1，`version_no = schema_version_no = 1`；保存 canonicalized outputs／field roles 的 `schema_digest`，並釘住可供歷史解析的 `schema_registry_version`。
- 對齊 013 FR-006 與 AC-4.5：後續 draft 每次成功儲存完整 config 都新增版本並同步遞增兩個版本號，不覆寫歷史；非 schema 修改可產生相同 digest，驗證失敗不產生新版本。後續編輯與 cycle 釘選的行為由 014 FR-014 及 `task-run-identity-contract` 擁有。
- 對齊 013 FR-006a、FR-006c 與 AC-4.3：task、creator 的 `project_leader` membership、初始 config、初始指引內容版本及啟動設定在同一交易提交；任一步失敗時全部回滾。
- 對齊 013 FR-006d、AC-4.4 與 SC-006：同一 `Idempotency-Key` 於既有時窗內重送，回傳相同 `task_id`，不重複建立 membership、config 或指引版本；建立成功後的導頁行為維持既有 013 契約。

## Capabilities

| 來源 | 責任 |
|---|---|
| `specs/task-management/013-task-new/spec.md` v8.3.0 | 任務建立、完整 config/schema v1、creator membership、建立交易與冪等性；本 change 唯一對應的 owning spec。 |
| `task-run-identity-contract` → `specs/task-management/014-task-detail/spec.md` | 相依的下游 change；擁有 draft 編輯、cycle 綁定精確 config version、run 與 snapshot 的行為。 |
| `annotation-run-identity-contract` → `specs/annotation/015-annotation-workspace/spec.md` | 相依的下游 change；消費穩定 run／assignment 與其釘住的 config/schema 版本，不重定義建立交易。 |

三份 change 共同服務 issue #1160，依 013 建立版本起點 → 014 釘選 run 版本 → 015 消費 run 身分的來源順序銜接。Accepted ADR-022 管理狀態轉換；DBA 規劃文件 `docs/superpowers/specs/2026-10-06-task-run-identity-design.md` 是設計依據，不取代上述正典。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| II. Generalization-First | 對所有 `outputs[]` 組合使用同一 registry 驗證與版本契約，沒有以 NLP task type 硬編核心流程。 |
| III. Data Fairness | config 版本只保存建立者確認的可見欄位角色與輸出設定；不將 dataset 私有答案或 `declared_split` 投影給標記者。 |
| XIV. Lineage、XVI. Reproducibility | 不可變初始版本、digest 及保留的 registry 定義讓後續 run 能解析當時 schema；每次修改保留歷史。 |
| XV. RBAC、XVIII. Deployment Safety、XX. Source of Truth | creator membership 與 task 同交易；013 為建立契約的權威來源，本 change 不宣稱候選表或交易實作已部署。 |

## 範圍、風險與回滾

本 change 只交付 013 的 OpenSpec 規劃文件。不建立 ORM、migration、API、資料搬遷、實體 ER 或 NoteCraft 圖面，也不宣稱 SQLite／PostgreSQL 的唯一性、外鍵或交易語意已實測。物理約束、migration upgrade／downgrade／roundtrip 與 API 測試由後續獨立切片處理。

主要風險是下游若只讀可覆寫的目前 config，仍無法重現歷史 run；若把相同 digest 誤當同一 version，也會混淆非 schema 修改。以精確 `config_version_id` 及 014／015 的相依契約避免這兩種誤用。需要撤回規劃時，以後續文件修訂或 revert commit 同步檢查 013、014、015 的版本、Changelog、OpenSpec delta 與 derived view；本 change 沒有部署資料，故不涉及資料庫 downgrade 或刪除。
