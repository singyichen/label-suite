---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

# Design: annotation-run-identity-contract

## Goal and ownership

Issue #1160 的標記／審核資料須在同一 task 退回 draft、關閉舊 cycle 並再次發布 R1 後，仍能保留原紀錄且不混入新 run。本 change 僅鏡射 `specs/annotation/015-annotation-workspace/spec.md` v11.0.1 的下游作業身分契約：AnnotationRecord／ReviewUnit、審核草稿、reviewer 黏著、爭議計數及工作區指引來源。它不重新定義 task 建立、抽樣或發布狀態機，也不建立實體 annotation／review 表。

上游 `task-config-version-contract`／013 擁有不可變 config/schema 版本起點；`task-run-identity-contract`／014 擁有 cycle、published run、run item、assignment、reviewer 候選快照與每 run 的 guideline pin。015 以 014 交出的穩定身分消費 013 的精確 config/schema 版本。Accepted ADR-022 負責 `waiting_iaa_confirmation → draft` 關閉舊 cycle 並保留歷史；ADR-037 負責目前身分、membership、permission matrix 與資源條件的授權合成。DBA 設計 `docs/superpowers/specs/2026-10-06-task-run-identity-design.md` 提供候選關聯邊界，不取代這些正典。

## Annotation and review unit identity

依 015 FR-051 及關鍵實體，AnnotationListItem 在 run 發布後才形成，包含 `task_id`、`cycle_id`、`run_id`、`assignment_id`、`dataset_item_id` 與呈現用 `sample_id`。AnnotationRecord 的持久化身分含 `task_id`、`run_id`、`assignment_id`；受派 annotator 和 item 必須與 assignment 一致。ReviewUnit 為一位 annotator 的該筆提交所形成的**推導單位**，身分為 `run_id × assignment_id`，其 `pending | disputed | finalized` 狀態由標記提交、審核決策及爭議處置推導，不另以狀態寫入代替來源紀錄。

因此審核決策、歷程、回饋、仲裁／例外處置及 Official gold 追溯都必須解析同一 `run_id × assignment_id`。015 FR-014S 的未送出 reviewer 決策草稿再加 `reviewer_id`，以 `run_id × assignment_id × reviewer_id` 隔離；送出後清除草稿，其他 reviewer 不能觀察其存在。FR-059／FR-061 的爭議項由該審核單位下 `outKey × 合併鍵` 推導，仲裁寫入和待仲裁分子／分母不得跨 run 或 assignment 聚合；已解決與未解決的判斷仍由 015 原條文負責。

來源 sample ID 與顯示 round 不是持久化唯一鍵。依 AC-7.1，cycle 1 的 R1 與 cycle 2 的 R1 即使含同一來源 ID、同一 annotator，仍是不同 run／assignment，舊提交、草稿、審核、仲裁與分母不進新 run；舊歷史仍可由原 run 找回。同一 run 的不同 batch 也可能有相同來源 ID，須以不同 `dataset_item_id` 保持 item 身分。此設計只確認邏輯一致性；annotation／review 實體 FK 與複合唯一鍵留待其 owning schema slice 裁決。

## Reviewer derivation and live authorization

015 FR-093 保留單人接力：Dry 以 `run_id × dataset_item_id` 為 per-sample 指派／黏著群組，該 item 的多個 ReviewUnit 由同一 reviewer 審；Official 以 `run_id × assignment_id` 為單位。已儲存的**審核提交**推導 sticky reviewer；未送出草稿不黏著，未黏住單位從 `specs/task-management/014-task-detail/spec.md` FR-010t 的當次 run 凍結候選快照中，選取目前仍符合資格的人員。凍結候選快照記錄當時輸入，不是持久化 `ReviewAssignment`，也不授予永久操作權。014 的同名概念僅為唯讀推導投影，不可成為第二份可與提交分歧的真相。

歷史黏著與提交、候選及責任鏈保留；停用 membership 或撤銷權限不刪除它們，也不能為了繞過停用而改派已黏住單位。每次正式讀取、提交、仲裁或未黏住分派，仍須依 015 FR-104、SC-013 與 ADR-037 重新驗證目前帳號、明選 active task role、active membership、對應矩陣格、assignment／reviewer 資格及資料可見範圍；路由的 `role`／使用者 ID 不能建立權限。AC-7.2 的停用情境須拒絕下一次讀取與寫入，歷史紀錄則保持可追溯。

## Run-pinned profile and guideline

TaskProfile 以所選 `run_id` 解析 cycle 釘住的精確 013 config/schema 版本，以及該 run 釘住的不可變 `guideline_version_id`。015 FR-066 要求 modal 與右欄「說明與檔案」讀取同一版指引；確認狀態比對 task 與該版本。Dry 的版本等於其 TrialRound 的版本；Official 在發布交易取得當時 current guideline，可能不同於最後一次 Dry。之後指引另存新版不改寫舊 run 的內容，也不使舊版確認失效；`force_guideline` 為顯示政策，不自行建立指引內容版本。

AC-7.3 驗證已確認 Dry v1、等待階段另存 v2、直接發布 Official 時，Official 首次進入重新確認 v2，而重訪舊 Dry 仍顯示 v1。`TaskProfile.guidelineVersion?` 與 prototype `materializedRuns` 僅為相容示範，不能替代正式的 run／version 參照。015 不重新擁有 013 的 registry 或 014 的 guideline 發布交易。

## Privacy, later physical work, and verification

正式標記與審核投影只讀 014 run-item 綁定的 dataset-021 公開 item、該角色可見的作業紀錄與指引。`dataset_item_private`、`declared_split`、隱藏答案、測試集答案及其他 reviewer 的未提交草稿均不進 annotator-facing 回應、歷程或可見快取。盲審與 peer annotation 隔離沿用 015／憲章既有規則；run 身分正確不會自動取代權限與答案隔離檢查。

本 change 沒有 ORM、migration、API、資料搬遷、ER 投影或已部署 Schema。後續 annotation／review 物理字典須以 014 的 run／assignment 明確設計 FK、唯一性、索引、刪除／保留策略與跨 task 一致性；SQLite Lite 與 PostgreSQL production 各自驗證 FK 啟用、交易、併發及查詢計畫，migration 另立 PR。審核員改判後仲裁一致性與 `sequence_tagging` span 爭議合併鍵仍是後續 owning slice 的待決事項，不能在此 design 臆定。

本次文件驗證以 015 FR-014S／FR-051／FR-059／FR-061／FR-066／FR-093／FR-104、AC-7.1～AC-7.3、SC-013／SC-014 的來源定位及 OpenSpec／Project SDD 結構檢查為限。後續實作先用獨立 Red tests 證明跨 cycle／同源 ID 隔離、草稿盲審、Dry 黏著、停用即時撤權、版本確認及遞迴答案洩漏阻擋，再進 Green；文件檢查不能代替 runtime 證據。archive 後依 `docs/sdd-workflow.md` §6.2 核對衍生 view 的每一條正典引用可定位。

## Risks and rollback

最大的相容風險是舊 prototype bucket、`run_type` 或 R1 顯示序號被當作正式唯一鍵，導致新舊 cycle 的作業和統計串用；另一風險是把凍結候選或 sticky reviewer 視為目前授權。後續資料庫與安全測試須直接覆蓋這些失敗模式。若撤回規劃，以新文件修訂或 revert commit 同步檢查 013／014／015 的版本、Changelog、三份相依 OpenSpec change 與 derived view；本 change 未部署資料，沒有資料庫 downgrade 或資料刪除。
