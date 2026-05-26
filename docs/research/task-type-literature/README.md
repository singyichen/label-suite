# 任務類型文獻筆記（Task Type Literature Notes）

本資料夾用來整理與任務類型相關的論文、資料集、shared task 與 annotation guideline。這些筆記會用來補強 Label Suite 的任務分類法（task taxonomy）、config schema、標記介面（annotation UI）、品質指標（quality metrics）與後續實作規劃（implementation plan）。

## 建議檔案（Suggested Files）

- `implementation-matrix.md` - 跨文獻整理任務類型、輸入/輸出 schema、UI 需求、IAA 指標與 config 缺口。
- `paper-notes/` - 每篇論文、資料集、shared task 或 annotation guideline 建立一份筆記。

## 論文筆記模板（Paper Note Template）

```md
## 論文 / 資料集名稱（Paper / Dataset Name）

- 引用資訊（Citation）:
- 任務類別（Task category）:
- 輸入結構（Input schema）:
- 輸出結構（Output schema）:
- 標記操作（Annotation operation）:
- 標籤 / 分數定義（Label / score definition）:
- 標記者數量（Annotator count）:
- IAA / 品質指標（IAA / quality metric）:
- 品質控管（Quality control）:
- Gold / 參考答案可見性（Gold / hidden reference policy）:
- 審核 / 仲裁流程（Review / adjudication）:
- 匯出格式（Export format）:
- Label Suite 支援狀態（Label Suite support）:
- 缺少的 config 欄位（Missing config fields）:
- 實作備註（Implementation notes）:
```

## 使用方式（Usage）

更新 task taxonomy 或 implementation specs 時，請用這些筆記說明：

- 應支援哪些任務類型（supported task types）；
- 需要哪些 config 欄位（required config fields）；
- 標記介面需要哪些互動行為（annotation UI behavior）；
- 適用哪些 IAA 與品質指標（IAA and quality metrics）；
- ground-truth references 是否必須對標記者隱藏（hidden from annotators）。
