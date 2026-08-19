# Label Suite — 產品基線摘要

**版本**：1.2.0
**基線 SHA**：`2328392f2fc50ca171c485582e26ab7d577be52b`
**盤點日期**：2026-08-19（17 份現存 spec；`shared/018-help-button` 為 deferred，不是目前交付能力）
**用途**：供 Agent 快速導覽產品全景；不是 feature 行為 SSOT。閱讀順序與權威邊界見 [README 的 Agent Context Contract](../agent-context-contract.md)，交付實作狀態只以 [`specs/STATUS.md`](../../../specs/STATUS.md) 為準。
**基礎來源**：[`information-architecture.md`](../ia/information-architecture.md) · [`impact-map.md`](../impact-map/impact-map.md) · [`story-map.md`](../story-map/story-map.md)

---

## 1. 產品定位

Label Suite 是一套**可配置、通用型 NLP 標記與自動評估平台**，作為碩士論文 Demo Paper 的研究成果展示。

核心目標：
- 在**不修改核心程式碼**的前提下，支援多種 NLP 任務類型
- 提供從任務建立、成員協作、標記執行、審核到品質分析的完整流程
- 確保標記評估結果具備**公平性、可重現性與可追溯性**

---

## 2. 角色模型

本系統採用**雙層角色模型**。

### 系統角色（平台層級）

| 角色 | 識別碼 | 說明 |
|------|--------|------|
| 平台成員 | `user` | 所有註冊成功的使用者預設角色 |
| 系統管理員 | `super_admin` | 負責平台使用者管理與系統權限設定 |

### 任務角色（任務層級）

| 角色 | 識別碼 | 說明 |
|------|--------|------|
| 專案負責人 | `project_leader` | 建立任務、設定流程、指派成員、啟動 Dry Run / Official Run、匯出結果 |
| 審核員 | `reviewer` | 逐標記員審核標記結果、不一致時直接修正標籤、查看品質報告 |
| 標記員 | `annotator` | 執行標記、查看個人進度與工時 |

基線原則：
- 系統角色只保留 `user` / `super_admin`
- `project_leader` / `reviewer` / `annotator` 全部為任務角色
- 同一使用者可在不同任務持有不同任務角色
- 任務層級授權以 `task_membership` 為準，不依賴 JWT 系統角色繼承

---

## 3. 產品模組與主要頁面

| 模組 | 主要頁面 | 主要使用者 |
|------|----------|-----------|
| 帳號模組 | `login`、`register`、`forgot-password`、`reset-password`、`profile` | 全角色 |
| 儀表板 | `dashboard` | 全角色 |
| 任務管理模組 | `task-list`、`task-new`、`task-detail` | `project_leader`、`reviewer` |
| 標記任務模組 | Annotation List、`annotation-workspace` | `annotator`、`reviewer` |
| 資料集分析模組 | Dataset Analysis List、Dataset Analysis Detail | `project_leader`、`reviewer` |
| 系統管理模組 | `user-management`、`role-settings` | `super_admin` |

補充原則：
- `task-detail` 以設定、成員、進度、結果、工時五個 tabs 管理任務；成員挑選與工時/工作量紀錄都由此承接
- `user-management` 只管理系統角色與平台帳號狀態

---

## 4. 支援的任務類型

任務由 `input_type`（`single_item` / `item_pair`）與可組合的 `outputs[]` 陣列決定（ADR-029 Output-Type Composition Model）：

- `outputs[]` 可選輸出類型：`single_label`、`multi_label`、`single_dim`、`multi_dim`、`entity_recognition`、`relation_identification`、`sequence_tagging`、`free_text`
- 同一任務可組合多個輸出類型（如 `entity_recognition` + `relation_identification` 同時使用）

所有輸出類型都必須透過 config 驅動，不可依賴硬編碼流程。
十三個 prototype fixtures 僅用於驗收例示，並非產品任務或可組合輸出的白名單。品質分析依 output type 呈現；`free_text` 不適用自動 IAA，指標與 threshold 以 `017` registry 為準。

---

## 5. 核心流程

### 任務生命週期

`draft` → `dry_run_in_progress` → `waiting_iaa_confirmation` → `official_run_in_progress` → `completed`

### 協作流程

1. `project_leader` 以四步驟建立任務：taxonomy、可組合 outputs、啟動設定與 guidelines；資料集上傳只接受 JSON
2. 在 Task Detail 的成員 tab 指派 `annotator` / `reviewer`，發布試標並由相同樣本產生 IAA gate
3. IAA 確認後發布正式標記，標記員提交資料；審核員以每個 `sample × annotator × run` 的 review unit 逐筆定案
4. 不一致可直接修正；無法決定的項目交由合格且非當事人的 arbiter 仲裁
5. 所有正式提交、必要 review unit 與仲裁完成，沒有未解爭議且品質指標可用後，任務才進入 `completed`
6. `project_leader` 由結果 tab 匯出 JSON／JSON-MIN，供後續訓練或研究使用

### 資料隔離原則

- Dry Run 與 Official Run 必須資料隔離
- Annotator 可見資料不得暴露 test set ground truth
- Official gold 僅能在 Official Run 的適用 review unit 全部定案後形成，且不得向 annotator 下發
- Reviewer 的審查、修正與仲裁決定應保留歷程紀錄

---

## 6. 各角色最重要能力

### Project Leader

- 獨立配置任務，不依賴工程師修改程式
- 掌握任務狀態、標記進度與異常
- 邀請成員、查看任務成員工時
- 主導 Dry Run → IAA 確認 → Official Run
- 匯出最終標記結果

### Annotator

- 快速登入並查看被分配任務
- 依任務類型完成標記
- 查看個人進度與自己的工時紀錄

### Reviewer

- 逐標記員審查已提交標記
- 一致 → 下一筆；不一致 → 當場直接修正標籤；無法決定則歸入爭議池由第三人仲裁
- 查看 IAA 與品質報告、每位標記員的修正率

### Super Admin

- 管理全平台使用者帳號與系統角色
- 維護角色權限矩陣
- 查看全平台工時與工作量紀錄

---

## 7. Release 基線

### R1 — Demo Core

> Release 是規劃切片，不表示已實作；各 spec 的實作／流程狀態請查 [`specs/STATUS.md`](../../../specs/STATUS.md)。

最小可展示集合，覆蓋：
- `001` Login
- `012` Dashboard
- `013` New Task + Config Builder
- `015` Annotation Workspace

展示重點：
- 登入
- 建立任務
- 執行標記
- 查看即時進度

### R2 — Complete Role Flows

補齊 Project Leader、Annotator、Reviewer 的完整協作流程，新增：
- `003` Register
- `010` Task List
- `014` Task Detail
- `015` Reviewer Flow
- `016` Dataset Analysis List

展示重點：
- 挑選成員並指派任務角色
- Dry Run / Official Run 流程
- 審查與統計
- 任務成員工時查看

### R3 — Admin & Quality

補齊平台管理與品質分析，新增：
- `002` Login — Google SSO
- `004` Forgot / Reset Password
- `005` Profile Settings
- `006` User Management
- `007` Role & Permission Settings
- `017` Dataset Analysis Detail

展示重點：
- 平台級帳號管理
- 角色權限管理
- IAA 與品質分析

`002` 的 Google SSO 是可操作入口與未來整合預留，目前為 no-op，不代表 OAuth flow 已可登入。

---

## 8. Spec 撰寫時不可偏離的基線

- 新功能不得破壞雙層角色模型
- 任務角色不得回寫成系統角色
- 新任務類型必須可由 config 擴充，不可要求修改核心流程
- 任務成員指派與工時/工作量紀錄應留在任務管理脈絡，不應被重新歸類為系統管理功能
- `user-management` 不應承擔任務角色指派責任
- Story、IA、Impact Map 三者若有變更，應同步維護

---

## 9. 建議使用方式

撰寫新 spec 前，先用這份摘要確認：

1. 功能屬於哪個模組
2. 主要使用者是系統角色還是任務角色
3. 是否會影響任務生命週期或資料隔離原則
4. 應歸屬於 R1 / R2 / R3 哪個規劃 release（不以此判斷實作狀態）
5. 是否已超出 Demo Paper 範圍
