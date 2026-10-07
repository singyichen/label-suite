---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
關聯 Spec: specs/task-management/014-task-detail/spec.md
---

# Annotation／Review 實體契約提案

## Why

Issue #1160 已為 task/run 建立穩定的 `run_id × assignment_id`，但 annotation／review 尚無可供物理字典使用的一致寫入契約。015 FR-052 已採 `(start,end,label)` span 集合，FR-059／FR-061 的現行文字卻仍以 token 位置計爭議；FR-103 明言不阻擋已有仲裁票時的 reviewer 改判，可能讓已記錄的裁定失去來源。014 的停用／重派條款則未定義前任未提交草稿的隔離及保存。

## Goal

以 014／015 正典明確裁決 V1 的 span 爭議鍵、首次審核後的標記來源凍結、仲裁後的審核凍結、單批一次裁定，以及重派時的私人草稿生命週期，供八張未部署候選表的字典與 NoteCraft 投影使用。此 change 只改規劃契約；不建立 ORM、migration、API、gold、品質報告或匯出表。

## What Changes

- 修正 015 FR-059／FR-061 的 `sequence_tagging` 爭議粒度為帶型別的 `(start,end,label)` span 鍵，並使 `OutputAnswer` 現行實體敘述與 015 FR-024A／FR-052 的 `spans[]` 一致。`entity_recognition` CompactAnswer 位置落差維持待決，不在此偷換鍵。
- 以 015 FR-103 及新增 FR-105 明示第一次 reviewer 提交後的 annotator 寫入鎖；只有無票且仍 `disputed` 時原 reviewer 可留下不可變修訂並改判。第一票之後，提交及草稿都不可改動，不能透過刪票解鎖。
- 以 015 FR-061／FR-065／FR-095 明示單位全部當前爭議鍵同一 batch 原子提交，每鍵最多一張不可變票；相同 batch key／內容冪等，異內容拒絕；舊 FR-065 的覆寫式 idempotent PUT 與改票規則被完整取代。`reject` 只由最終例外池唯一收尾，讀取不再選「最新票」。
- 以 014 FR-005f／FR-005l 和 015 FR-014S／FR-105 明示未提交 slot 退回／重派時舊 annotator 草稿轉 `abandoned`、保留原作者但繼任者不可見；reviewer 失權的未提交草稿失效且不得成為 sticky 來源。
- 以新增 AC 情境測跨 cycle span 鍵、並發審核／仲裁、冪等重送、失權與重派的隔離。八張表均標為未部署候選，不將推導的 `ReviewUnit`／`DisputeItem`／`ReviewAssignment` 畫成表。

## Capabilities

| 正典 | 本 change 的責任 |
|---|---|
| `specs/annotation/015-annotation-workspace/spec.md` | FR-024A／FR-052 的 span 契約；FR-059／FR-061／FR-065／FR-095／FR-103 及新增 FR-105 的審核與仲裁寫入契約。 |
| `specs/task-management/014-task-detail/spec.md` | FR-005f／FR-005l 的 membership 失權、slot 退回與草稿責任鏈。 |

上游 `task-management/014` FR-010f／FR-010t 已定義 run、assignment 與當前 membership；本 change 消費它們，不修改發佈交易。下游 dataset-016／017 消費已提交標記與已解決輸出，需檢查衍生檢視與品質計數，但本 change 不新增其實體。

## Constitution Check

| 原則 | 設計對應 |
|---|---|
| II. Generalization-First | `OutputAnswer` 仍依釘住的 `outputs[]` registry 驗證；一個 JSON 欄位承載八種可配置答案，不依輸出類型建立硬編資料表。 |
| III. Data Fairness、XI. Security | 標記者與其他角色無法讀未提交 reviewer 草稿、前任標記草稿、`dataset_item_private` 或隱藏答案；歷程與仲裁讀取採角色投影。 |
| XIV. Lineage、XVI. Reproducibility | 所有決策以 `run_id × assignment_id`、不可變 submission revision 與有版本的爭議鍵追溯，不以顯示用 R1／sample ID 作識別。 |
| XV. RBAC | 寫入時驗當前 active membership、任務角色、候選名冊、本人及非當事條件；歷史 membership 只供責任鏈，不授權。 |
| XVIII. Deployment Safety、XX. Source of Truth | 正典先裁決，字典和 NoteCraft 後投影；八表均為候選且未部署，SQLite／PostgreSQL 約束、交易及 migration 留待後續實作。 |

## 範圍與回滾

設計依據為 `docs/superpowers/specs/2026-10-07-annotation-review-physical-design.md`，它不取代 014／015 正典。若撤回本規劃，同步修訂兩份正典、版本／Changelog、OpenSpec delta、字典與 NoteCraft；本 change 不觸及既有資料庫，因此沒有資料搬遷或 downgrade。
