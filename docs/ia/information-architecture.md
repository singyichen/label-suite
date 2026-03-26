# Label Suite — 資訊架構（Information Architecture）

> **Draft / Outdated** — This file is an early graph LR draft kept for reference only.
> For the current authoritative IA, see [`ia-diagram.md`](ia-diagram.md).

```mermaid
graph LR
  Root([Label Suite])

  Root --> Login[登入]
  Root --> Dashboard[儀表板]
  Root --> Task[標記任務]
  Root --> Annotate[標記介面]
  Root --> Annotator[標記員管理]
  Root --> Dataset[資料集分析]


  Login --> L1[Google SSO]
  Login --> L2[GitHub SSO]

  Dashboard --> D1[任務概覽]
  Dashboard --> D2[標記進度]
  Dashboard --> D3[系統公告]

  Task --> T1[任務設定]
  Task --> T2[Dry Run 試標]
  Task --> T3[Official Run 正式標記]

  T1 --> T1a[YAML / JSON Config]
  T1 --> T1b[單一句子分類]
  T1 --> T1c[句子對標記]
  T1 --> T1d[序列標記]
  T1 --> T1e[生成標記]

  T2 --> T2a[介面驗證]
  T2 --> T2b[Config 正確性確認]

  T3 --> T3a[資料收集]
  T3 --> T3b[進度追蹤]

  Annotate --> A1[標記操作區]
  Annotate --> A2[說明與範例]
  Annotate --> A3[進度指示器]
  Annotate --> A4[儲存 / 提交]

  Annotator --> M1[帳號管理]
  Annotator --> M2[工時追蹤]
  Annotator --> M3[薪資試算]

  M1 --> M1a[新增帳號]
  M1 --> M1b[編輯帳號]
  M1 --> M1c[停用帳號]

  M2 --> M2a[工時紀錄]
  M2 --> M2b[出勤查詢]

  M3 --> M3a[時薪設定]
  M3 --> M3b[薪資報表]

  Dataset --> S1[統計總覽]
  Dataset --> S2[品質監控]

  S1 --> S1a[Sentence 數量]
  S1 --> S1b[Token 數量]
  S1 --> S1c[Label 分布]

  S2 --> S2a[標記一致性]
  S2 --> S2b[異常偵測]
```
