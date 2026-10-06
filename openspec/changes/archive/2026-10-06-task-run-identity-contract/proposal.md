---
對應 Spec: specs/task-management/014-task-detail/spec.md
---

# 任務／執行身分正典對齊提案

## Why

Issue #1160 的 task/run 候選 Schema 規劃揭露三份正典之間的身分與生命週期衝突：IAA 拒絕可退回 draft 並再次發布 R1，但原本 `(task_id, round)` 與缺少 cycle 的統計範圍無法區分保留的舊 R1；task 級單一 snapshot 也無法同時表達每次發布的不可變清單。R1 若先凍結 Official 清單，後續 Rn 又從剩餘池取樣，兩者無法同時成立。014 的實體 `ReviewAssignment.review_unit_id` 敘述亦與 015 FR-093 的提交推導 sticky assignment 衝突。

本 change 只擁有已提交的 014 v6.0.0 delta，以 013 v8.3.0、015 v11.0.1 與 Accepted ADR-022 的 2026-10-06 修訂作為相依正典基準，為後續實體層設計提供可核對的來源。ADR-022 修訂將退回 draft 定義為關閉目前 cycle 並保存歷史，將 snapshot 定義為每個 published run 各自持有，避免後續設計沿用舊的單一 task snapshot 假設。

## Goal

完成 014 的 task/run 身分、版本釘選、抽樣與歷史保存規劃對齊，使重複 R1、Official 發布與下游 annotation/review 投影皆能追溯至穩定 run／assignment。013、015 的相依契約由各自的 OpenSpec change 承載；ADR-022 與 DBA 設計提供裁決依據及後續候選 Schema 的輸入。

## What Changes

- 014 FR-010f 與 FR-010f-5／FR-010f-6 定義 cycle、每次發布的不可變 run／snapshot、退回 draft 的歷史保存與發布原子性／冪等性；FR-010f-2／FR-010f-3 定義 cycle 內 round 身分與 task 生命週期最多一次 Official 發布。
- 014 FR-010b～FR-010f 與 FR-022 固定 cycle 的 sealed dataset version 資格池，以當前 cycle 已發布 Dry 的實際數量計算剩餘量，每次 Dry 保留至少一筆 Official 資料。R1 釘住資格池，Official 清單在 Official 發布時才封存；`isolation_enabled=false` 仍不得讓 cycle 內 item 重疊，也不新增自動混合結果流程。
- 014 FR-010u 以穩定 run 或 `task_id × cycle_id × run_type × round_no` 計數；FR-005h 保存穩定 assignment slot 的終局排除證據。FR-010s-1／FR-010t 區分目前 reviewer roster 與發布時凍結的候選池。
- 014 FR-014／FR-017a 對齊回合間 guideline-only 編輯與內容版本觸發，run 釘住同 task 的不可變 guideline version；FR-010i-1／FR-010i-2 明定匯出所引用的 config/schema 版本。`force_guideline` 政策變更本身不增加內容版本。
- 014 依 Accepted ADR-022 的 Transition Table 與 Cycle and Per-Run Snapshot Invariant 對齊 cycle 關閉、歷史保留及 Official 封存時點；服務層仍擁有狀態轉換責任。

## 相依 changes

- `task-config-version-contract` 擁有 `specs/task-management/013-task-new/spec.md` 的 config/schema 版本起點與儲存契約；本 change 引用其版本身分，不收錄 013 delta。
- `annotation-run-identity-contract` 擁有 `specs/annotation/015-annotation-workspace/spec.md` 的 annotation/review run／assignment 身分與 guideline 解析契約；本 change 僅提供 014 的上游 run 身分，不收錄 015 delta。

## 範圍與非目標

本 change 只交付 014 的正典對齊與 OpenSpec 規劃文件，記錄邏輯身分、版本來源、責任邊界及未部署候選設計的前置契約。不建立 ORM、migration、API、資料搬遷、實體 ER 或 NoteCraft 圖面，不宣稱任何候選表、FK、索引或併發控制已部署；不改五態 task lifecycle、不新增任務類型或 annotation/review 實體表。

後續實體 Schema 與 API 契約須獨立規劃、確認並依 TDD 實作；migration 的 upgrade、downgrade 與 roundtrip 仍為分開任務。原始來源的 `declared_split` 不決定 run 分區，dataset-021 的答案隔離契約不在此 change 改寫。

## Capabilities

| owning source | 本 change 的責任 |
|---|---|
| `specs/task-management/014-task-detail/spec.md` v6.0.0 | cycle／round／run／snapshot、發布、抽樣餘額、版本釘選、成員投影、排除與統計／匯出範圍。 |

DBA 裁決依據為 `docs/superpowers/specs/2026-10-06-task-run-identity-design.md` 的 T1～T12 決策 ledger；它不是另一份行為正典。上游 `specs/dataset/021-dataset-ingestion-and-lineage/spec.md` FR-005／FR-010 保有公開 item、私有來源宣告與 run 綁定的責任邊界。014 與相依的 013／015 正典、Accepted ADR 優先於 DBA 草稿中的舊版行號或「待修訂」描述。

## Constitution Check

| 原則 | 符合方式 |
|---|---|
| II. Generalization-First | config/schema 與 registry 版本釘選適用所有 task config，不依 NLP task type 建立核心分支。 |
| III. Data Fairness | 抽樣僅使用公開 item 身分與 payload；不讀 private answer、`declared_split` 或受限 `source_ref`，run item／manifest 不新增 gold/test 標記。 |
| XIV. Lineage、XVI. Reproducibility | cycle 釘住 sealed dataset/config 版本；每個 run 保存不可變 snapshot、guideline 版本與 assignment 身分，退回 draft 保留歷史。 |
| XVIII. Deployment Safety、XX. Source of Truth | 明示規劃與未部署狀態；本 change 僅擁有 014 delta，013／015 的相依 changes 與 ADR-022 提供正典依據，實體 Schema／API／migration 留待獨立流程。 |
| Backend／Testing 憲章 | 狀態轉換留在 service；後續發布交易、唯一性、併發、SQLite／PostgreSQL 與答案洩漏驗證先取得獨立 Red evidence，再實作 Green。 |

## 風險與回滾

014 v6.0.0 的 cycle／snapshot 契約是 BREAKING 規劃修訂；下游若仍以 task×stage×round 或單一 task snapshot 當身分，會混合不同 cycle 的 R1。013 每次 config 儲存同步增加 schema version，會產生 schema digest 相同的多個版本；015 必須始終用確切 run／assignment 解析作業與 guideline。這些風險由正典引用與後續獨立實作驗證處理，不能以文件檢查代替資料庫或 API 行為證據。

如需撤回本規劃，使用新的文件修訂／revert commit 處理本 change 與 014 的對應修訂，並核對 013／015 相依 changes、ADR-022、版本、Changelog、引用與下游 derived view，不以破壞性 reset 清除歷史。若其他契約已依賴新版身分，先列出相依來源並另行裁決；本 change 沒有部署 Schema 或資料，因此沒有資料庫 downgrade 或資料刪除動作。archive 前完成 OpenSpec schema validation、Project SDD lint 與 Source-Verify；archive 後逐條核對 derived view 的 canonical 引用可定位，依 `docs/sdd-workflow.md` §6.2 留存證據。
