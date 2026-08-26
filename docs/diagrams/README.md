# 圖表工具鏈分工

`docs/diagrams/` 底下存在兩套圖表工具鏈。它們各自解決不同問題，不互相取代。本文說明何時用哪一套、產出放哪裡。

## 分工表

| 工具 | 安裝位置 | 產出格式 | 適用場景 |
|------|---------|---------|---------|
| **`flowchart` skill** | `.claude/skills/flowchart/` | Mermaid（`.mmd`）+ `.png` | 開發者導向的系統流程、狀態機、時序圖 |
| **`diagram-design` skill** | 全域 `~/.claude/skills/diagram-design/`（見下） | 自包含 `.html` + inline SVG | 給非工程受眾看的流程圖，需套用 Label Suite 品牌樣式 |

## 怎麼選

**先問受眾是誰。**

- **受眾是工程師或 code reviewer** → `flowchart` skill。Mermaid 純文字、diff 友善、GitHub 原生渲染，改一行就看得出改了什麼。缺點是版面與配色不可控。
- **受眾是產品使用者（標記員、審核員）、教授或 Demo Paper 讀者** → `diagram-design`。它是唯一能套用專案 design token 的一套，圖面顏色會跟實際產品畫面一致；且輸出為單一 HTML 檔，直接用瀏覽器開就能看，不需要任何 renderer。

**再問要不要進版控做逐行比對。** 需要 → Mermaid（原始碼是純文字）。不需要、重點是視覺成品 → `diagram-design`。

## 產出位置慣例

所有圖表放在 `docs/diagrams/workflow/`。

Mermaid 要**同時提交 `.mmd` 原始檔與算繪後的 `.png`**，否則沒有 renderer 的讀者看不到內容。`diagram-design` 的 HTML 本身即成品，不需要另附圖檔。

> 專案先前另有一套 D2 工具鏈（`.d2` 原始檔 + `.png`，用於 thesis 章節架構圖），因無人引用且無建置接線而移除，見 PR #474。若日後需要，可自 git 歷史取回。

## `diagram-design` 的安裝與樣式

這個 skill **裝在全域 `~/.claude/skills/diagram-design/`，不在 repo 內**。原因是它含約 3 MB 第三方資產，納入 repo 會牽動 PR 規模門檻（Constitution Principle X）與 vendored 授權管理。副作用是它與 repo 版控脫鉤，升級需手動重新 clone（詳見 issue #465）。

Label Suite 的配色已存成 named client profile，位於 skill 安裝目錄之外，因此升級不會被覆蓋：

- profile 檔：`~/.diagram-design/profiles/label-suite.md`
- 原廠備份：`~/.diagram-design/profiles/default.md`

色票來源為 `design/prototype/assets/tokens.css`（paper `#F5F3FF`／ink `#1E1B4B`／accent `#6366F1`），字體為 Crimson Pro／Inter／JetBrains Mono，並加上 Noto Sans TC fallback 以正確顯示中文。若在新機器上重裝 skill，載入 `label-suite` profile 即可還原，不要手動改 install 目錄的 `style-guide.md`。

## 給非工程受眾的圖：語言規則

`diagram-design` 產出的圖若受眾是產品使用者，圖面文字一律用繁體中文敘述，不要留程式碼識別字。例如 `dry_run` 寫成「試標」、`min_reviewers` 寫成「需幾位審核員才開始計票」。

**例外：資料值與帳號 ID 保留原樣**（如 `positive`／`neutral`／`reviewer_chen`）。產品畫面本來就原樣顯示這些字串，翻譯後圖面會與使用者實際看到的畫面對不上。
