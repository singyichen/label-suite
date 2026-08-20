# Impact Map — Label Suite

**版本**：1.3.0
**最後驗證**：2026-08-19；產品導航而非 feature SSOT，實作狀態以 [`specs/STATUS.md`](../../../specs/STATUS.md) 為準。
**目標受眾**：論文指導教授、開發者

---

## Why — 商業目標

> 產出一套**可配置、通用型 NLP 標記與自動評估平台**，作為碩士論文 Demo Paper 的研究成果展示，
> 證明系統能在**不修改核心程式碼**的情況下支援多種 NLP 任務類型，並確保標記評估結果的公平性與可重現性。

---

## Who × How × What

共同產品契約：任務以 `outputs[]` 的八個 output key 組合，生命週期為 `draft` → `dry_run_in_progress` → `waiting_iaa_confirmation` → `official_run_in_progress` → `completed`；各 key 與 IAA 詳情以 active `013`／`017` 為準，不在本地圖重複 registry。

### Actor 1 — Project Leader（專案負責人）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 不依賴工程師，能以四步驟 Config Builder 配置可組合 `outputs[]` 並啟動標記任務 | `013` New Task + Config Builder |
| 能查看所有任務狀態，快速掌握進度 | `010` Task List、`012` Dashboard |
| 能在任務詳情頁邀請成員、指派角色 | `014` Task Detail — 成員管理 |
| 能在任務詳情頁挑選可加入成員並查看工時紀錄 | `014` Task Detail（可加入成員名單／任務內工時） |
| 能主導 Dry Run → 確認 IAA → 發布 Official Run 生命週期 | `014` Task Detail — 任務狀態流 |
| 能在完成 gate 後匯出 JSON／JSON-MIN 結果供模型訓練 | `014` Task Detail — 結果 tab／匯出功能 |
| 能從 Dataset Analysis List 監控標記進度與異常，進入 detail 查看品質 | `016` Dataset Analysis List、`017` Dataset Analysis Detail |

---

### Actor 2 — Annotator（標記員）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 能以 Email + Password 登入；Google SSO 入口目前為 no-op，保留未來整合 | `001` Login Email、`002` Login Google SSO |
| 能從 Dashboard 即時看到被分配的任務與進度 | `012` Dashboard |
| 能依 outputs[] 組合（分類、評分/迴歸、實體辨識、關係識別、序列標記 等）執行標記 | `015` Annotation Workspace |
| 能即時看到自己的完成筆數（進度條） | `015` Annotation Workspace — 進度追蹤 |

---

### Actor 3 — Reviewer（審核員）

| How（需要做到的行為改變） | What（對應功能／Spec） |
|--------------------------|----------------------|
| 能逐標記員審核已提交的標記結果，一致 → 下一筆，不一致 → 當場修正 | `015` Annotation Workspace — Reviewer 視角 |
| 能以 review unit 直接修正；無法決定時建立爭議項，由合格且非當事 arbiter 仲裁 | `015` Annotation Workspace — 審核操作 |
| 能查看逐 output type 品質分析與 IAA；`free_text` 不適用自動 IAA | `016` Dataset Analysis List、`017` Dataset Analysis Detail |

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
│   └── How: 完成後匯出 JSON／JSON-MIN → What: spec 014 (export)
│
├── Annotator
│   ├── How: 快速登入 → What: spec 001, 002
│   ├── How: 掌握任務分配 → What: spec 012
│   └── How: 執行標記 → What: spec 015
│
├── Reviewer
│   ├── How: 逐標記員審核／仲裁 → What: spec 015 (reviewer flow)
│   └── How: 查看 IAA → What: spec 017
│
└── Super Admin
    ├── How: 管理用戶 → What: spec 006
    └── How: 配置權限 → What: spec 007
```

---

## 範疇與安全邊界

- Task New 資料集上傳目前只接受 JSON；資料格式擴充不在此地圖承諾。
- zh/en 介面切換屬目前範圍；實際交付狀態不由 release 切片推定。
- Annotator 及其可見資料不得取得 test-set ground truth 或 gold；完成與品質條件回鏈 `014`／`015`／`017`。
