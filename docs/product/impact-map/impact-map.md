# Impact Map — Label Suite

**版本**：1.2.0
**建立日期**：2026-04-14
**目標受眾**：論文指導教授、開發者

---

## Why — 商業目標

> 產出一套**可配置、通用型 NLP 標記與自動評估平台**，作為碩士論文 Demo Paper 的研究成果展示，
> 證明系統能在**不修改核心程式碼**的情況下支援多種 NLP 任務類型，並確保標記評估結果的公平性與可重現性。

---

## Who × How × What

### Actor 1 — Project Leader（專案負責人）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 不依賴工程師，能獨立透過 Config Builder 配置並啟動標記任務 | `013` New Task + Config Builder |
| 能查看所有任務狀態，快速掌握進度 | `010` Task List、`012` Dashboard |
| 能在任務詳情頁邀請成員、指派角色 | `014` Task Detail — 成員管理 |
| 能在任務詳情頁挑選可加入成員並查看工時紀錄 | `014` Task Detail（可加入成員名單／任務內工時） |
| 能主導 Dry Run → 確認 IAA → 發布 Official Run 生命週期 | `014` Task Detail — 任務狀態流 |
| 能匯出最終標記結果供模型訓練 | `014` Task Detail — 匯出功能 |
| 能監控標記進度與異常 | `016` Dataset Stats |

---

### Actor 2 — Annotator（標記員）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 能透過 email 或 Google OAuth 快速登入 | `001` Login Email、`002` Login Google SSO |
| 能從 Dashboard 即時看到被分配的任務與進度 | `012` Dashboard |
| 能依 outputs[] 組合（分類、評分/迴歸、實體辨識、關係識別、序列標記 等）執行標記 | `015` Annotation Workspace |
| 能即時看到自己的完成筆數（進度條） | `015` Annotation Workspace — 進度追蹤 |

---

### Actor 3 — Reviewer（審核員）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 能逐標記員審核已提交的標記結果，一致 → 下一筆，不一致 → 當場修正 | `015` Annotation Workspace — Reviewer 視角 |
| 能修改、刪除、標記錯誤標記；無法決定時歸入爭議池由第三人仲裁 | `015` Annotation Workspace — 審核操作 |
| 能查看 IAA 報告與標記員修正率；gold 僅於 Official Run 審核定案後產生 | `017` Dataset Quality |

---

### Actor 4 — Super Admin（系統管理員）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 能管理全平台用戶帳號與系統角色（建立、停用、角色指派） | `006` User Management |
| 能配置角色與權限設定 | `007` Role & Permission Settings |

---

## 影響鏈總覽

```
Why（Demo Paper 目標）
│
├── Project Leader
│   ├── How: 獨立配置任務 → What: spec 013
│   ├── How: 管理任務生命週期 → What: spec 014
│   ├── How: 監控進度 → What: spec 010, 012, 016
│   ├── How: 邀請成員並查看工時 → What: spec 014
│   └── How: 匯出結果 → What: spec 014 (export)
│
├── Annotator
│   ├── How: 快速登入 → What: spec 001, 002
│   ├── How: 掌握任務分配 → What: spec 012
│   └── How: 執行標記 → What: spec 015
│
├── Reviewer
│   ├── How: 審核標記 → What: spec 015 (reviewer flow)
│   └── How: 查看 IAA → What: spec 017
│
└── Super Admin
    ├── How: 管理用戶 → What: spec 006
    └── How: 配置權限 → What: spec 007
```

---

## 範疇外（Out of Scope for Demo Paper）

- 批次資料匯入（UI 未完成前由後端直接操作）
- 多語言介面切換（中文介面為 Demo 唯一目標語言）
