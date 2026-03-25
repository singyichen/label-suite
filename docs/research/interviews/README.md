# LabelSuite 使用者需求訪談

## 訪談目的

在系統介面設計開始前，透過結構化訪談釐清三種角色的實際工作流程、痛點與期望，確保設計決策有真實使用者行為作為依據。

## 訪談角色

| 角色 | 說明 | 訪談指引 |
|------|------|---------|
| Annotator（工讀生） | 執行標注任務的大學生或研究生 | [annotator/interview-guide.md](annotator/interview-guide.md) |
| Researcher（研究生） | 設計並指派標注任務的研究人員 | [researcher/interview-guide.md](researcher/interview-guide.md) |
| Admin（管理者） | 負責帳號、工時與薪資管理的實驗室人員 | [admin/interview-guide.md](admin/interview-guide.md) |

## 訪談格式

- **形式**：半結構式個別訪談（Semi-structured Interview）
- **時間**：每場 45–60 分鐘
- **地點**：盡可能在受訪者實際工作環境中進行（情境訪查）
- **紀錄檔命名**：`YYYY-MM-DD-[角色]-[受訪者代號].md`
  - 範例：`2026-04-01-annotator-P01.md`

## 設計決策對應表

| 設計決策 | 對應問題 | 說明 |
|---------|---------|------|
| Config YAML vs. 視覺化介面 | R02、R15–R17 | 評估研究生對設定檔的接受度 |
| 工時自動記錄 vs. 手動回報 | A14、AD09–AD13 | 確認雙方認知一致，避免設計衝突 |
| 帳號邀請制 vs. 開放註冊 | AD24 | 影響 SSO 登入後的角色指派流程 |
| 任務指派 vs. 工讀生自選 | R06 | 決定任務分配流程設計 |
| 任務可見性與存取控制 | AD19–AD21 | RBAC 權限矩陣設計依據 |
| Dry Run 確認流程 | R11 | 設定啟動前的確認步驟設計 |
