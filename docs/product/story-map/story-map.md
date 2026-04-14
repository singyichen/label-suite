# User Story Map — Label Suite

**版本**：1.0.0
**建立日期**：2026-04-14
**閱讀方式**：橫軸 = 用戶活動流程（時序由左至右）；縱軸 = Release 切片（越上方越優先）

---

## Backbone — 用戶活動流（橫軸）

```
帳號建立／登入 → 查看儀表板 → 建立任務 → 管理任務與成員 → 執行標注 → 審核品質 → 查看統計 → 平台成員與工時 → 系統管理
```

---

## Story Map

### 帳號建立／登入

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| **R1** | 以 Email + Password 登入 | `001` | 全角色 |
| R2 | 以 Email + Password 註冊新帳號 | `003` | 全角色 |
| R3 | 以 Google OAuth 登入 | `002` | 全角色 |
| R3 | 忘記密碼 / 重設密碼 | `004` | 全角色 |
| R3 | 編輯個人資料與頭像 | `005` | 全角色 |

---

### 查看儀表板

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| **R1** | 依登入角色顯示對應儀表板（任務清單 + 待處理事項） | `012` | 全角色 |

---

### 建立任務

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| **R1** | 三步驟精靈建立任務（基本資料 + Config Builder + 標記說明） | `013` | Project Leader |

---

### 管理任務與成員

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R2 | 查看任務清單，搜尋與篩選任務 | `010` | Project Leader |
| R2 | 在任務詳情頁邀請成員並指派角色 | `014` | Project Leader |
| R2 | 從平台成員列表挑選任務成員並查看其工時紀錄 | `008`、`009` | Project Leader |
| R2 | 發布 Dry Run → 確認 IAA → 發布 Official Run | `014` | Project Leader |
| R2 | 匯出最終標注結果（CSV / JSON） | `014` | Project Leader |

---

### 執行標注

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| **R1** | 進入標記作業頁，依任務類型執行標注（分類 / 評分/迴歸 / 句對 / NER / 關係抽取） | `015` | Annotator |
| **R1** | 草稿自動儲存，離開後可繼續 | `015` | Annotator |
| **R1** | 即時進度條顯示完成筆數 | `015` | Annotator |
| R2 | Dry Run 標注（與 Official Run 隔離） | `015` | Annotator |

---

### 審核品質

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R2 | 查閱已提交標注，執行抽查或全審 | `015` | Reviewer |
| R2 | 修改或標記錯誤標注，回報給 Project Leader | `015` | Reviewer |
| R3 | 查看 IAA 報告，協助確認標記共識 | `017` | Reviewer / Project Leader |

---

### 查看統計

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R2 | 查看標注分佈（label distribution、token counts） | `016` | Project Leader |
| R2 | 監控標記員進度，偵測異常 | `016` | Project Leader |
| R3 | 查看資料集品質指標（IAA、inter-rater agreement） | `017` | Project Leader / Reviewer |

---

### 平台成員與工時

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R2 | 查看平台成員列表，邀請成員加入任務並指派任務角色 | `008` | Project Leader |
| R2 | 查看任務成員工時與工作量紀錄 | `009` | Project Leader |
| R2 | 查看自己的工時與工作量紀錄 | `009` | 全平台成員 |
| R3 | 查看全平台工時與工作量紀錄 | `009` | Super Admin |

---

### 系統管理

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R3 | 建立、停用平台用戶帳號 | `006` | Super Admin |
| R3 | 配置角色與權限設定 | `007` | Super Admin |

---

## Release 切片定義

### R1 — Demo Core（最小可展示集合）

> 目標：能向教授展示完整的核心標注流程（一個任務從建立到標注完成）

涵蓋 spec：`001` · `012` · `013` · `015`

**可展示流程**：登入 → Dashboard → 建立任務（含 Config Builder）→ 執行標注（含進度追蹤）

---

### R2 — Complete Role Flows（四角色完整覆蓋）

> 目標：展示 Project Leader、Annotator、Reviewer 的完整協作流程，包含 Dry Run / Official Run 生命週期

新增 spec：`003` · `008` · `009` · `010` · `014` · `015`（Reviewer flow）· `016`

**可展示流程**：R1 + 註冊 → 平台成員列表挑選成員 → 任務清單 → 邀請成員 → Dry Run → IAA 確認 → Official Run → 審核 → 統計 / 工時

---

### R3 — Admin & Quality（管理與品質功能）

> 目標：Demo Paper 完整功能集，覆蓋 Super Admin 職責與資料集品質分析

新增 spec：`002` · `004` · `005` · `006` · `007` · `008` · `009` · `017`

---

## Spec 對照索引

| Spec # | 功能名稱 | Release | Backbone 活動 |
|--------|---------|---------|--------------|
| 001 | Login — Email / Password | R1 | 帳號登入 |
| 002 | Login — Google SSO | R3 | 帳號登入 |
| 003 | Register — Email / Password | R2 | 帳號登入 |
| 004 | Forgot / Reset Password | R3 | 帳號登入 |
| 005 | Profile Settings | R3 | 帳號登入 |
| 006 | User Management | R3 | 系統管理 |
| 007 | Role & Permission Settings | R3 | 系統管理 |
| 008 | Annotator List | R2 | 平台成員與工時 / 管理任務與成員 |
| 009 | Work Log | R2 / R3 | 平台成員與工時 |
| 010 | Task List | R2 | 管理任務與成員 |
| 012 | Dashboard | R1 | 查看儀表板 |
| 013 | New Task + Config Builder | R1 | 建立任務 |
| 014 | Task Detail | R2 | 管理任務與成員 |
| 015 | Annotation Workspace | R1 / R2 | 執行標注 / 審核品質 |
| 016 | Dataset Stats | R2 | 查看統計 |
| 017 | Dataset Quality | R3 | 審核品質 / 查看統計 |
