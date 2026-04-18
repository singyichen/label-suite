# User Story Map — Label Suite

**版本**：1.3.0
**建立日期**：2026-04-14
**閱讀方式**：橫軸 = 用戶活動流程（時序由左至右）；縱軸 = Release 切片（越上方越優先）

---

## Backbone — 用戶活動流（橫軸）

```
帳號建立／登入 → 查看儀表板 → 建立任務 → 管理任務與成員 → 執行標記 → 審核品質 → 查看統計 → 平台成員與工時 → 系統管理
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
| R2 | 在任務詳情頁挑選可加入成員並查看其工時紀錄 | `014` | Project Leader |
| R2 | 發布 Dry Run → 確認 IAA → 發布 Official Run | `014` | Project Leader |
| R2 | 匯出最終標記結果（CSV / JSON） | `014` | Project Leader |

---

### 執行標記

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| **R1** | 進入標記作業頁，依任務類型執行標記（分類 / 評分/迴歸 / 句對 / NER / 關係抽取） | `015` | Annotator |
| **R1** | 草稿自動儲存，離開後可繼續 | `015` | Annotator |
| **R1** | 即時進度條顯示完成筆數 | `015` | Annotator |
| R2 | Dry Run 標記（與 Official Run 隔離） | `015` | Annotator |

---

### 審核品質

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R2 | 查閱已提交標記，執行抽查或全審 | `015` | Reviewer |
| R2 | 修改或標記錯誤標記，回報給 Project Leader | `015` | Reviewer |
| R3 | 查看 IAA 報告，協助確認標記共識 | `017` | Reviewer / Project Leader |

---

### 查看統計

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R2 | 查看標記分佈（label distribution、token counts） | `016` | Project Leader |
| R2 | 監控標記員進度，偵測異常 | `016` | Project Leader |
| R3 | 查看資料集品質指標（IAA、inter-rater agreement） | `017` | Project Leader / Reviewer |

---

### 平台成員與工時

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R2 | 在任務詳情頁邀請成員加入任務並指派任務角色 | `014` | Project Leader |
| R2 | 查看任務成員工時與工作量紀錄 | `014` | Project Leader |
| R2 | 查看自己的工時與工作量紀錄 | `014` | 全平台成員 |

---

### 系統管理

| Release | Story | Spec | 主要角色 |
|---------|-------|------|---------|
| R3 | 建立、停用平台用戶帳號 | `006` | Super Admin |
| R3 | 配置角色與權限設定 | `007` | Super Admin |

---

## 角色導向後續流程（Onboarding + Progressive Disclosure）

### 1) Project Leader（專案負責人）

**核心流程**

```
建立專案 → 設定標記規格 → 匯入資料 → 指派成員 → 追蹤進度
```

**入口條件**

- 使用者首次建立任務
- 點擊「建立任務後成為專案負責人」

**第一階段（最小必要）**

1. Step 1 建立任務：任務名稱、任務類型（分類 / NER / span / 多標籤）、語言與資料格式
2. Step 2 設定標記規則：label schema、必填欄位、說明文件 / examples
3. Step 3 匯入資料：CSV / JSONL / TXT、欄位對應、預覽匯入結果
4. Step 4 指派人員：指派標記員、指派審核員、設定每人比例或 batch
5. Step 5 開始追蹤：已完成數、待審數、衝突數、平均處理時間

**首次成功事件**

- 成功建立第一個任務
- 成功匯入第一批資料
- 成功指派至少一名標記員

**進階解鎖（完成基本操作後）**

- 批次匯入
- guideline versioning
- inter-annotator agreement
- 資料品質分析 dashboard
- export / API integration

---

### 2) Annotator（標記員）

**核心流程**

```
看到待辦 → 打開任務 → 完成標記 → 提交
```

**入口條件**

- 被加入標記成員
- 點擊「被指派標記工作後成為標記員」

**第一階段（最短路徑）**

1. Step 1 看待辦任務：今日待標數量、優先任務、快速進入按鈕
2. Step 2 進入標記頁：文字區、label 區、快捷鍵提示、儲存 / 下一筆
3. Step 3 完成一筆標記：選 span、套 label、修改或清除
4. Step 4 提交結果：草稿儲存、正式提交、跳下一筆

**首次成功事件**

- 完成第一筆標記
- 完成第一個 batch
- 無錯誤使用快捷鍵完成一次操作

**進階解鎖（熟悉後）**

- 快捷鍵教學
- 批量操作
- 智能建議標籤
- 歷史紀錄
- 不確定標記 / escalate 給 reviewer

---

### 3) Reviewer（審核員）

**核心流程**

```
看到待審 → 比對內容 → 通過 / 退回 → 填寫原因
```

**入口條件**

- 被加入審核成員
- 點擊「被指派審核工作後成為審核員」

**第一階段（最小必要）**

1. Step 1 看待審清單：待審任務、優先項目、衝突或低信心項目
2. Step 2 打開審核頁：原文、標記結果、guideline 提示、標記人資訊（可隱藏/顯示）
3. Step 3 做審核決策：通過、退回修改、指派重做、加註原因
4. Step 4 回饋閉環：常見錯誤分類、reviewer comment template、退回後標記員可見回饋

**首次成功事件**

- 完成第一次審核
- 完成第一次退回並附原因
- 完成第一批審核任務

**進階解鎖（熟悉後）**

- 衝突仲裁
- reviewer guideline quick panel
- 一致性分析
- QA dashboard
- 錯誤類型報表

---

## Release 切片定義

### R1 — Demo Core（最小可展示集合）

> 目標：能向教授展示完整的核心標記流程（一個任務從建立到標記完成）

涵蓋 spec：`001` · `008`（Shared Sidebar Navbar）· `012` · `013` · `015`

**可展示流程**：登入 → Dashboard → 建立任務（含 Config Builder）→ 執行標記（含進度追蹤）

---

### R2 — Complete Role Flows（四角色完整覆蓋）

> 目標：展示 Project Leader、Annotator、Reviewer 的完整協作流程，包含 Dry Run / Official Run 生命週期

新增 spec：`003` · `010` · `014` · `015`（Reviewer flow）· `016`

**可展示流程**：R1 + 註冊 → 任務清單 → 任務詳情指派成員 → Dry Run → IAA 確認 → Official Run → 審核 → 統計 / 任務內工時

---

### R3 — Admin & Quality（管理與品質功能）

> 目標：Demo Paper 完整功能集，覆蓋 Super Admin 職責與資料集品質分析

新增 spec：`002` · `004` · `005` · `006` · `007` · `017`

---

## Release 驗收清單（依角色流程）

### R1 驗收清單（Demo Core）

| 角色 | 必過驗收項目 |
|------|-------------|
| Project Leader | 可完成 Step 1～2：建立任務（名稱/類型/語言/格式）與設定標記規則（schema/必填欄位/examples） |
| Annotator | 可完成最短路徑：看待辦 → 進入標記頁 → 完成 1 筆標記 → 提交下一筆 |
| Reviewer | R1 不要求完整 reviewer 流程（可僅展示待審入口存在） |

**R1 成功門檻**

- 至少完成一次「建立任務 → 執行標記」的閉環 demo。
- Annotator 具備草稿儲存與繼續作業能力。

---

### R2 驗收清單（Complete Role Flows）

| 角色 | 必過驗收項目 |
|------|-------------|
| Project Leader | 可完成 Step 1～5：建立任務、設定規則、匯入資料、指派人員、追蹤進度 |
| Annotator | 完成第一筆 + 第一個 batch；可正確使用至少一項快捷鍵操作 |
| Reviewer | 完成待審清單 → 審核決策（通過/退回）→ 附原因回饋閉環 |

**R2 成功門檻**

- 完成三角色協作流程：PL 指派 → Annotator 提交 → Reviewer 審核回饋。
- 可展示任務生命週期：Dry Run → IAA 確認 → Official Run。
- 可展示進度與統計（至少含完成數與待審數）。

---

### R3 驗收清單（Admin & Quality）

| 角色 | 必過驗收項目 |
|------|-------------|
| Super Admin | 可管理平台帳號（建立/停用）與角色權限矩陣（含衝突保護/不可移除規則） |
| Project Leader / Reviewer | 可檢視品質分析結果（IAA/一致性相關指標） |

**R3 成功門檻**

- 完成 `user-management` 與 `role-settings` 管理閉環。
- 權限守門正確：非 `super_admin` 不可存取系統管理頁。
- 品質分析頁可支援審核與研究展示需求。

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
| 008 | Sidebar Navbar（Shared） | R1 | 跨模組共用導覽（L0/L1/L2） |
| 010 | Task List | R2 | 管理任務與成員 |
| 012 | Dashboard | R1 | 查看儀表板 |
| 013 | New Task + Config Builder | R1 | 建立任務 |
| 014 | Task Detail | R2 | 管理任務與成員 |
| 015 | Annotation Workspace | R1 / R2 | 執行標記 / 審核品質 |
| 016 | Dataset Stats | R2 | 查看統計 |
| 017 | Dataset Quality | R3 | 審核品質 / 查看統計 |
