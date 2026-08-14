# Product Docs — Label Suite

本目錄保存 Label Suite 的產品級文件，用於對齊產品目標、角色模型、頁面結構、功能範圍與 release 切片。

---

## 文件清單

| 文件 | 路徑 | 用途 |
|------|------|------|
| Product Requirements Document | [`prd.md`](./prd.md) | 產品層需求總結，彙整目標、角色旅程、功能需求、NFR、架構約束與開放問題 |
| Milestone Plan | [`milestones.md`](./milestones.md) | 產品交付里程碑規劃，依 PRD、story map 與 `specs/STATUS.md` 彙整 release 順序與進入條件 |
| Product Baseline Summary | [`baseline/product-baseline-summary.md`](./baseline/product-baseline-summary.md) | 後續撰寫 spec 時優先參考的產品基線摘要 |
| Functional Map | [`functional-map/functional-map.md`](./functional-map/functional-map.md) | 功能全景盤點，作為 IA 與 spec 的上游來源 |
| Information Architecture | [`ia/information-architecture.md`](./ia/information-architecture.md) | 定義角色模型、模組歸屬、頁面結構、導覽與核心使用者旅程 |
| Impact Map | [`impact-map/impact-map.md`](./impact-map/impact-map.md) | 對齊產品目標、角色行為改變與對應功能 |
| Story Map | [`story-map/story-map.md`](./story-map/story-map.md) | 以用戶活動流與 release 切片規劃功能落地順序 |
| Label Studio Reference | [`ia/label-studio-functional-map.md`](./ia/label-studio-functional-map.md) | 競品或參考系統拆解，用於比較與借鑑，不作為本產品權威基線 |
| Reviewer Model Redesign | [`reviewer-model-redesign.md`](./reviewer-model-redesign.md) | 審核員模型重構規劃（2026-08-14）：定案決策、目標流程、畫面與資料模型變更、五個 PR 拆分 |

---

## 建議閱讀順序

1. [`prd.md`](./prd.md)
2. [`baseline/product-baseline-summary.md`](./baseline/product-baseline-summary.md)
3. [`impact-map/impact-map.md`](./impact-map/impact-map.md)
4. [`story-map/story-map.md`](./story-map/story-map.md)
5. [`ia/information-architecture.md`](./ia/information-architecture.md)
6. [`functional-map/functional-map.md`](./functional-map/functional-map.md)
7. [`milestones.md`](./milestones.md)

---

## 各文件責任邊界

### `prd.md`

產品層需求總結，用來對齊產品目標、成功指標、角色旅程、功能需求、非功能需求、架構約束、範疇外與開放問題。

適合用在：
- 對齊整體產品方向
- 確認功能是否仍符合 Demo Paper 範圍
- 在進入 spec 或 milestone 規劃前確認目前產品共識

### `product-baseline-summary.md`

用來快速確認產品共識，適合在寫 spec、排 release、討論新需求前先讀。

包含：
- 產品定位
- 角色模型
- 模組與頁面歸屬
- 任務類型範圍
- 核心流程
- Release 基線
- 不可偏離原則

### `impact-map.md`

回答「為什麼做」與「誰需要改變什麼行為」。

適合用在：
- 驗證某功能是否真的支撐產品目標
- 檢查 actor、行為改變與功能是否對齊

### `story-map.md`

回答「先做什麼、後做什麼」。

適合用在：
- release 規劃
- MVP / Demo 範圍切分
- 確認功能落點屬於哪個 backbone 活動

### `milestones.md`

回答「以目前 PRD 與 spec 狀態，應該如何分階段交付」。

適合用在：
- 規劃 R1 / R2 / R3 的工程交付順序
- 確認里程碑依賴、Definition of Done 與進入條件
- 在 `specs/STATUS.md` 或 PRD 有重大變更後重新評估時程

### `information-architecture.md`

回答「系統怎麼被組織」。

適合用在：
- 確認頁面、模組與導覽關係
- 確認角色存取矩陣
- 確認使用者旅程與任務生命週期

### `functional-map.md`

回答「目前產品應有哪些功能面向」。

適合用在：
- 補齊功能盤點
- 對照 spec 是否漏掉模組或功能面

---

## 使用原則

- `prd.md` 是產品層總結文件；`specs/STATUS.md` 與各 `spec.md` 仍是實作狀態與規格細節的單一真實來源
- `milestones.md` 是由 PRD、story map 與 `specs/STATUS.md` 彙整出的規劃文件；當上游文件重大變更時需同步檢查
- 若要撰寫新 spec，先以 `product-baseline-summary.md` 為準，再對照 `story-map.md` 與 `information-architecture.md`
- 若調整角色、模組歸屬、頁面責任或 release 切片，應同步更新 `baseline / impact-map / story-map / ia`
- 若只是擴充功能細節，但不改變產品基線，可只更新對應文件與 spec
- `label-studio-functional-map.md` 僅作為參考資料，不應直接覆蓋本產品定義

---

## 維護建議

出現以下任一情況時，應回頭更新本目錄文件：

- 新增或移除任務類型
- 調整角色模型或權限邏輯
- 新增主要頁面或模組
- 重新切分 R1 / R2 / R3 範圍
- 修改任務生命週期或資料隔離原則
- PRD 的 P0/P1/P2 範圍、Out of Scope 或 Open Questions 有重大變更
- `specs/STATUS.md` 的狀態、里程碑依賴或交付順序有重大變更
