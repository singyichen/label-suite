# Label Suite — 產品基線摘要

**版本**：1.0.0  
**建立日期**：2026-04-14  
**用途**：作為後續撰寫 spec、切分 release、對齊頁面與角色權限時的統一基線摘要。  
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
| 審核員 | `reviewer` | 審查標記結果、協助產出標準答案、查看品質報告 |
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
| 標記任務模組 | `annotation-workspace` | `annotator`、`reviewer` |
| 資料集分析模組 | `dataset-stats`、`dataset-quality` | `project_leader`、`reviewer` |
| 標記員管理模組 | `annotator-list`、`work-log` | `project_leader`、全平台成員、`super_admin` |
| 系統管理模組 | `user-management`、`role-settings` | `super_admin` |

補充原則：
- `annotator-list` 用於挑選平台成員加入任務，不負責系統角色指派
- `work-log` 為工時與工作量紀錄頁，不負責薪資計算
- `user-management` 只管理系統角色與平台帳號狀態

---

## 4. 支援的任務類型

目前產品基線支援 5 種 `task_type`：

1. 單句分類
2. 單句評分 / 回歸
3. 句對任務
4. 序列標記（NER、詞性標記）
5. 關係抽取

所有任務類型都必須透過 config 驅動，不可依賴硬編碼流程。

---

## 5. 核心流程

### 任務生命週期

`草稿` → `Dry Run 進行中` → `等待 IAA 確認` → `Official Run 進行中` → `已完成`

### 協作流程

1. `project_leader` 建立任務並完成 Config Builder 設定
2. `project_leader` 從 `annotator-list` 挑選平台成員加入任務，指派 `annotator` / `reviewer`
3. 發布 Dry Run，讓所有標記員標記相同樣本
4. 系統產生 IAA 與品質報告，由 `project_leader` / `reviewer` 確認
5. 達標後發布 Official Run，分配正式資料進行標記
6. 完成後由 `project_leader` 匯出結果供後續訓練或研究使用

### 資料隔離原則

- Dry Run 與 Official Run 必須資料隔離
- Annotator 可見資料不得暴露 test set ground truth
- Reviewer 的審查與修正應保留歷程紀錄

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

- 查閱與審查已提交標記
- 修改、退回或標記錯誤標記
- 查看 IAA 與品質報告，協助形成標記共識

### Super Admin

- 管理全平台使用者帳號與系統角色
- 維護角色權限矩陣
- 查看全平台工時與工作量紀錄

---

## 7. Release 基線

### R1 — Demo Core

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
- `008` Annotator List
- `009` Work Log
- `010` Task List
- `014` Task Detail
- `015` Reviewer Flow
- `016` Dataset Stats

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
- `017` Dataset Quality

展示重點：
- 平台級帳號管理
- 角色權限管理
- IAA 與品質分析

---

## 8. Spec 撰寫時不可偏離的基線

- 新功能不得破壞雙層角色模型
- 任務角色不得回寫成系統角色
- 新任務類型必須可由 config 擴充，不可要求修改核心流程
- `annotator-list` / `work-log` 不應被重新歸類為系統管理功能
- `user-management` 不應承擔任務角色指派責任
- Story、IA、Impact Map 三者若有變更，應同步維護

---

## 9. 建議使用方式

撰寫新 spec 前，先用這份摘要確認：

1. 功能屬於哪個模組
2. 主要使用者是系統角色還是任務角色
3. 是否會影響任務生命週期或資料隔離原則
4. 應歸屬於 R1 / R2 / R3 哪個 release
5. 是否已超出 Demo Paper 範圍
