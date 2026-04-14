# Product Docs — Label Suite

本目錄保存 Label Suite 的產品級文件，用於對齊產品目標、角色模型、頁面結構、功能範圍與 release 切片。

---

## 文件清單

| 文件 | 路徑 | 用途 |
|------|------|------|
| Product Baseline Summary | [`baseline/product-baseline-summary.md`](./baseline/product-baseline-summary.md) | 後續撰寫 spec 時優先參考的產品基線摘要 |
| Functional Map | [`functional-map/functional-map.md`](./functional-map/functional-map.md) | 功能全景盤點，作為 IA 與 spec 的上游來源 |
| Information Architecture | [`ia/information-architecture.md`](./ia/information-architecture.md) | 定義角色模型、模組歸屬、頁面結構、導覽與核心使用者旅程 |
| Impact Map | [`impact-map/impact-map.md`](./impact-map/impact-map.md) | 對齊產品目標、角色行為改變與對應功能 |
| Story Map | [`story-map/story-map.md`](./story-map/story-map.md) | 以用戶活動流與 release 切片規劃功能落地順序 |
| Label Studio Reference | [`ia/label-studio-functional-map.md`](./ia/label-studio-functional-map.md) | 競品或參考系統拆解，用於比較與借鑑，不作為本產品權威基線 |

---

## 建議閱讀順序

1. [`baseline/product-baseline-summary.md`](./baseline/product-baseline-summary.md)
2. [`impact-map/impact-map.md`](./impact-map/impact-map.md)
3. [`story-map/story-map.md`](./story-map/story-map.md)
4. [`ia/information-architecture.md`](./ia/information-architecture.md)
5. [`functional-map/functional-map.md`](./functional-map/functional-map.md)

---

## 各文件責任邊界

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
