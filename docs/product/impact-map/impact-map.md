# Impact Map — Label Suite

**版本**：1.0.0
**建立日期**：2026-04-14
**目標受眾**：論文指導教授、開發者

---

## Why — 商業目標

> 產出一套**可配置、通用型 NLP 標注與自動評估平台**，作為碩士論文 Demo Paper 的研究成果展示，
> 證明系統能在**不修改核心程式碼**的情況下支援多種 NLP 任務類型，並確保標注評估結果的公平性與可重現性。

---

## Who × How × What

### Actor 1 — Project Leader（計畫負責人）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 不依賴工程師，能獨立透過 Config Builder 配置並啟動標注任務 | `013` New Task + Config Builder |
| 能查看所有任務狀態，快速掌握進度 | `010` Task List、`012` Dashboard |
| 能在任務詳情頁邀請成員、指派角色 | `014` Task Detail — 成員管理 |
| 能從平台成員列表挑選任務成員並查看工時紀錄 | `008` Annotator List、`009` Work Log |
| 能主導 Dry Run → 確認 IAA → 發布 Official Run 生命週期 | `014` Task Detail — 任務狀態流 |
| 能匯出最終標注結果供模型訓練 | `014` Task Detail — 匯出功能 |
| 能監控標注進度與異常 | `016` Dataset Stats |

---

### Actor 2 — Annotator（標記員）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 能透過 email 或 Google OAuth 快速登入 | `001` Login Email、`002` Login Google SSO |
| 能從 Dashboard 即時看到被分配的任務與進度 | `012` Dashboard |
| 能依任務類型（分類、評分/迴歸、句對、NER、關係抽取）執行標注 | `015` Annotation Workspace |
| 能即時看到自己的完成筆數（進度條） | `015` Annotation Workspace — 進度追蹤 |

---

### Actor 3 — Reviewer（審核員）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 能查閱已提交的標注結果，執行抽查或全審 | `015` Annotation Workspace — Reviewer 視角 |
| 能修改、刪除、標記錯誤標注 | `015` Annotation Workspace — 審核操作 |
| 能查看 IAA 報告，協助產生 Ground Truth | `017` Dataset Quality |

---

### Actor 4 — Super Admin（系統超級管理員）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 能管理全平台用戶帳號與系統角色（建立、停用、角色指派） | `006` User Management |
| 能配置角色與權限設定 | `007` Role & Permission Settings |
| 能查看全平台工時與工作量記錄 | `009` Work Log |

---

## 影響鏈總覽

```
Why（Demo Paper 目標）
│
├── Project Leader
│   ├── How: 獨立配置任務 → What: spec 013
│   ├── How: 管理任務生命週期 → What: spec 014
│   ├── How: 監控進度 → What: spec 010, 012, 016
│   ├── How: 邀請成員並查看工時 → What: spec 008, 009, 014
│   └── How: 匯出結果 → What: spec 014 (export)
│
├── Annotator
│   ├── How: 快速登入 → What: spec 001, 002
│   ├── How: 掌握任務分配 → What: spec 012
│   └── How: 執行標注 → What: spec 015
│
├── Reviewer
│   ├── How: 審核標注 → What: spec 015 (reviewer flow)
│   └── How: 查看 IAA → What: spec 017
│
└── Super Admin
    ├── How: 管理用戶 → What: spec 006
    ├── How: 配置權限 → What: spec 007
    └── How: 查看全平台工時 → What: spec 009
```

---

## 範疇外（Out of Scope for Demo Paper）

- 批次資料匯入（UI 未完成前由後端直接操作）
- 薪資計算自動化（Work Log 提供數據，計算邏輯不在系統內）
- 多語言介面切換（中文介面為 Demo 唯一目標語言）
