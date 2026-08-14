---
版本: 1.2.0
建立日期: 2026-07-21
狀態: Active
---

# 共用規格常數（Shared Spec Constants）

> 跨 spec 共用常數的**唯一來源**。各 spec 的「規格常數」章節只得定義該 spec 特有的常數，
> 共用常數一律引用本文件，不得重複定義（由 /speckit.analyze 檢查）。
> 修改本文件任何常數 = 影響所有引用 spec，須依 SDD 版本連動流程通知下游。

## 使用規則

- **引用方式**：spec 於「規格常數」章節以 `參照 specs/_shared/constants.md` 引用共用常數，不得複製值。
- **新增門檻**：常數出現在 ≥ 2 份 spec **且值完全一致**（或差異僅為待統一的異名／子集）即應上收至本文件，並自各 spec 移除重複定義；值因情境而異的常數維持 spec 特有，不得上收。
- **修改流程**：修改任一常數須 bump 本文件版本、更新 Changelog，並同步 bump 所有引用 spec 的版本與 Changelog。
- **命名規則**：同一概念只得有一個常數名稱；異名（alias）視為待修正項，列於「衝突註記」。

## 常數定義

### 系統角色與權限

| 常數 | 值 | 引用 spec |
|------|-----|----------|
| `SYSTEM_ROLES` | `user \| super_admin` | 010, 013, 006, 007（4 份） |
| `TASK_ROLES` | `project_leader \| reviewer \| annotator` | 010, 013, 014, 007, 015（5 份）⚠ 見衝突註記 |
| `TASK_ROLES_ALLOWED` | `project_leader \| reviewer` | 016, 017（2 份；dataset-analysis 存取角色） |

### 任務模型

| 常數 | 值 | 引用 spec |
|------|-----|----------|
| `TASK_TYPE_ENUM` | `single_sentence_classification \| single_sentence_va_scoring \| sequence_labeling \| relation_extraction \| sentence_pairs` | 010, 014 定義；013 引用（015、017 已於各自 v2.0.0 起改用 `OUTPUT_TYPE_KEYS`，不再消費本常數） |
| `TASK_STATUS_ENUM` | `draft \| dry_run_in_progress \| waiting_iaa_confirmation \| official_run_in_progress \| completed` | 010；014 以異名 `TASK_STATUSES` 同值定義 |
| `RUN_STAGE_ENUM` | `dry_run \| official_run` | 010；015 以異名 `RUN_TYPES` 同值定義 |
| `OUTPUT_TYPE_KEYS` | `sequence_tagging \| entity_recognition \| relation_identification \| single_label \| multi_label \| single_dim \| multi_dim \| free_text` | 013 定義（source of truth：`OUTPUT_TYPE_REGISTRY`）；015 引用（同值，見 015 v2.0.0） |
| `SEQUENCE_LABELING_SUBTYPES` | `ner \| aspect_list` | 014（1 份；015 已於 v2.0.0 起改用 `OUTPUT_TYPE_KEYS` 的 `entity_recognition`，不再消費本常數） |
| `SENTENCE_PAIRS_MODES` | `similarity \| entailment` | 014（1 份；015 已於 v2.0.0 起、017 已於 v2.0.0 起改用 `OUTPUT_TYPE_KEYS`，不再消費本常數；低於 2 份上收門檻，是否改列 014 專屬常數留待下次相關 spec 改版一併檢視） |
| `SENTENCE_PAIRS_RESPONSE_FORMATS` | `classification \| scoring` | 014（1 份；015 已於 v2.0.0 起、017 已於 v2.0.0 起改用 `OUTPUT_TYPE_KEYS`，不再消費本常數；低於 2 份上收門檻，是否改列 014 專屬常數留待下次相關 spec 改版一併檢視） |
| `ACTIVE_TASK_TYPE_STORAGE_KEY` | `labelsuite.activeTaskType` | 010, 008（2 份；015 已於 v2.0.0 起改以 `task_id` 查詢 `TaskProfile`，移除 localStorage fallback，不再消費本常數） |

### 清單與分頁

| 常數 | 值 | 引用 spec |
|------|-----|----------|
| `PAGE_SIZE_DEFAULT` | `20` | 010, 016, 006（3 份） |
| `PAGE_SIZE_OPTIONS` | `20 \| 50 \| 100` | 010, 016, 006（3 份） |

### 資料集分析

| 常數 | 值 | 引用 spec |
|------|-----|----------|
| `DATASET_ANALYSIS_LIST_ROUTE` | `/dataset-analysis` | 016, 017（2 份） |
| `DATASET_ANALYSIS_DETAIL_ROUTE` | `/dataset-analysis-detail/:task_id` | 016, 017（2 份） |
| `INVALID_TASK_TRIGGER` | `task_not_found_or_no_membership` | 016, 017（2 份） |
| `IAA_BADGE_STATES` | `pass \| fail \| pending \| not_started \| not_applicable` | 016；017 以異名 `IAA_SUMMARY_STATES` 同值定義（`not_applicable` 供任務 `outputs[]` 僅含 IAA 排除類型如 `free_text` 時使用，017 v2.0.0 新增） |

### 帳號與偏好設定

| 常數 | 值 | 引用 spec |
|------|-----|----------|
| `PASSWORD_MIN_LENGTH` | `8` | 003, 005（2 份） |
| `PASSWORD_RULE` | 至少 8 個字元，含大寫英文、小寫英文與數字 | 003, 005（2 份） |
| `APPEARANCE_STORAGE_KEY` | `label-suite-theme` | 008, 005（2 份） |

### 響應式與 UI

| 常數 | 值 | 引用 spec |
|------|-----|----------|
| `MOBILE_BP` | `767px` | 全部 16 份 spec；**foundation spec 亦有定義**（FR-032：唯一實作來源為 `frontend/src/shared/constants/breakpoints.ts`） |
| `RWD_VIEWPORTS` | `375px / 768px / 1440px` | 全部 16 份 spec |

## 衝突註記

| 常數 | 本文件採用值 | 差異 spec 與值 |
|------|-------------|---------------|
| `TASK_ROLES` | `project_leader \| reviewer \| annotator`（4/5 多數） | 015 定義為 `annotator \| reviewer`（該 spec 僅涉及此二角色，屬子集；仍應改為引用本文件並於情境中限縮） |

> `DEFAULT_SORT` 曾評估上收：010 為 `updated_at desc`、006 為 `created_at desc`，值因情境而異、無法統一，
> 屬 spec 特有常數，不納入本文件（值相異的常數不得上收，避免與 /speckit.analyze 重複定義檢查矛盾）。

**同值異名（待統一命名）**：`TASK_STATUSES`（014）→ `TASK_STATUS_ENUM`；`RUN_TYPES`（015）→ `RUN_STAGE_ENUM`；`IAA_SUMMARY_STATES`（017，含 `not_applicable`）→ `IAA_BADGE_STATES`。

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.2.0 | 2026-08-12 | 同步 dataset-017 v2.0.0 IAA 策略 v2 遷移：`IAA_BADGE_STATES` 新增 `not_applicable`（供 `outputs[]` 僅含 IAA 排除類型如 `free_text` 的任務使用）；移除 017 作為 `TASK_TYPE_ENUM` 消費者的過時引用（017 已完全改用 `OUTPUT_TYPE_KEYS`）；`SENTENCE_PAIRS_MODES`／`SENTENCE_PAIRS_RESPONSE_FORMATS` 移除 017 作為消費者（僅剩 014，1 份，低於 2 份上收門檻，留待下次相關 spec 改版一併檢視是否改列 014 專屬常數）；同值異名清單移除已淘汰的 `TASK_TYPE_KEYS`（017）項目 |
| 1.1.0 | 2026-08-07 | 同步 annotation-015 v2.0.0 taxonomy 遷移：移除 015 作為 `TASK_TYPE_ENUM`／`SEQUENCE_LABELING_SUBTYPES`／`SENTENCE_PAIRS_MODES`／`SENTENCE_PAIRS_RESPONSE_FORMATS`／`ACTIVE_TASK_TYPE_STORAGE_KEY` 消費者的過時引用；新增 `OUTPUT_TYPE_KEYS`（013 定義，015 引用）。`SEQUENCE_LABELING_SUBTYPES` 現僅剩 014 消費，低於 2 份上收門檻，是否應改列 014 專屬常數留待下次相關 spec 改版一併檢視 |
| 1.0.0 | 2026-07-21 | 初版：自 16 份 spec 萃取共用常數 |
