---
name: prototype-diagram-diff
description: 每次修改 design/prototype/**/*.html 或 specs/ 底下任何 *.html 後，用 Artifact 把調整前後兩份完整原始檔各自用 iframe 內嵌渲染出來做並排對照，套用專案自己的色票（design/prototype/assets/tokens.css 或流程圖檔案自己的 :root），並附解剖標註、程式碼 diff、「沒有涵蓋的部分」與詳細說明。由 PostToolUse hook 在編輯這兩類目錄下的 HTML 後自動提醒觸發，也可手動呼叫。
---

# Prototype / Diagram Diff Artifact

修改 prototype 畫面（`design/prototype/**/*.html`）或流程圖 HTML（`specs/` 底下任何 `*.html`，不限特定 module/feature，涵蓋 `specs/[module]/NNN-feature/diagrams/` 這類任意巢狀路徑）後，用一份 Artifact 呈現「調整前 vs 調整後」的對照，附上詳細說明。**不需要啟動瀏覽器、Playwright 或 dev server**——但因為這類檔案本身就是可獨立開啟的完整 HTML（inline CSS／SVG，沒有外部依賴），呈現方式固定為**把調整前後兩份完整原始檔，各自用 `<iframe srcdoc="...">` 直接內嵌進 Artifact，讓它們在 Artifact 裡真的渲染出來**，而不是只給色塊或抽象化的結構示意——色票、版面、SVG 節點的視覺效果要看真正渲染出來才知道對不對，單獨列 hex 值或代表色塊看不出視覺份量。

版面與敘事手法參考站內既有案例「歷程面板改版樣貌」（並排面板＋解剖標註＋沒有涵蓋的部分＋色票取自專案本身）——但那份是**尚未寫代碼的設計提案，靠手刻重建畫面**；本 skill 處理的是**已經真的改動的現成檔案**，手刻重建會有跟真實 DOM 不一致卻沒人發現的風險，所以「調整前/調整後的畫面本體」一律用 iframe 內嵌真實檔案，只有敘事、版面、色票這幾層手法照搬過來。

## 觸發時機

- PostToolUse hook（`.claude/hooks/prototype-diagram-diff-reminder.sh`）會在 Edit / Write / NotebookEdit 命中上述兩類路徑下任一 `.html` 檔案後（任意巢狀深度都算），注入提醒。看到提醒就照本技能執行，不要略過。
- 使用者也可能直接說「幫我畫一下這次調整的前後對照」等語句，比照辦理。

## 前置：載入 artifact-design

發布任何 Artifact 前，先用 Skill 工具載入 `artifact-design`，依其設計準則決定版面與資訊密度，再動手寫 HTML 檔。

## 取得「調整前」「調整後」完整內容

- 若這次修改是透過 Edit 工具完成、且原檔仍在磁碟上：`git diff -- <file>`（未 commit）或 `git show HEAD:<file>`（已 commit）可以還原「調整前」的完整檔案內容；「調整後」直接讀現在磁碟上的檔案。
- 若已經跨了好幾個 Edit、記不清最初內容，一樣用 `git diff` / `git show HEAD:<file>` 取得基準版本，不要用 Edit 的 `old_string`／`new_string` 片段拼湊——iframe 要塞的是完整、可獨立渲染的文件，片段會缺 `<head>`／樣式而渲染不出來。
- 若同一輪改了多個檔案，逐檔各自一組 before/after iframe，不要合併成一份籠統的說明。

## Artifact 自己的色票：不要發明新的一套

Artifact 外層的排版色票，跟著被改動的檔案走，不要另外設計一套通用「diff 報告」灰階配色：

- 改動 `design/prototype/**/*.html`：這類頁面共用 `design/prototype/assets/tokens.css`，Artifact 直接抄錄該檔案裡對應的 `--color-*` 值（含 `@media (prefers-color-scheme: dark)` 與 `:root[data-theme="dark"]` 兩層），讓 Artifact 讀起來像產品的一部分，而不是外部工具的報告頁。
- 改動 `specs/**/*.html`（流程圖）：這類檔案通常自己在 `<style>:root` 定義一套獨立色票（不 import 共用 tokens），Artifact 就抄該檔案自己的 `--color-*` 值。
- 兩種情況都只抄「色票」本身，不用連版面、字級全部照搬——Artifact 仍是獨立頁面，只是配色跟被改動的來源一致。

## 把 before/after 塞進 iframe（技術做法）

`srcdoc` 屬性直接寫在 HTML 裡容易被檔案本身的雙引號、換行搞壞轉義，穩妥做法是**用 JS 設定**：

```html
<div class="render-frame"><iframe id="frame-before"></iframe></div>
<div class="render-frame"><iframe id="frame-after"></iframe></div>
<script>
  document.getElementById('frame-before').srcdoc = /* 調整前完整檔案內容，JSON.stringify 過的字串字面值 */;
  document.getElementById('frame-after').srcdoc = /* 調整後完整檔案內容 */;
</script>
```

用 Python（`json.dumps(content)`）或 Node（`JSON.stringify(content)`）把讀進來的完整檔案內容轉成一個安全的 JS 字串字面值再貼進 `<script>`，不要手動逐行轉義——手動轉義遇到中文引號、SVG 屬性裡的雙引號很容易漏掉。iframe 本身給固定的實際尺寸（寬度抓來源檔的 `min-width`／`max-width`，高度視內容抓一個合理值），外層包一層 `overflow: auto` 的容器，讓內容原尺寸渲染、需要時用捲動看全貌，不要縮放到看不清楚。

## Artifact 內容結構

1. **標題與一句話摘要**：這次調整的目的（例如「調整標註卡片的審核狀態徽章樣式」）。
2. **並排渲染對照**：`grid`／`flex` 並排兩個 pane（改動範圍夠寬時可上下堆疊改捲動），各自標籤「調整前」／「調整後」（可比照參考案例用 `tag now` / `tag next` 這種語感），標籤旁邊補一句話講**這個差異解決了什麼／為什麼重要**，不要只重複列 hex 值或屬性名——那件事程式碼 diff 那節會做。每個 pane 底下放對應的 iframe（見上一節做法）。
3. **解剖標註（視情況）**：如果這次改動集中在少數幾個可指認的視覺區塊（例如特定幾個節點、幾個元件），用編號圖例逐項解釋每個標記對應到程式碼的哪一行／哪個屬性、在畫面上叫什麼名字（例如「①「已定稿」節點框線」），讓讀者可以照著名字在旁邊的真實渲染裡自己對到位置。**不要在 iframe 上面疊加絕對定位的圓點/標記**——iframe 內嵌的是外部檔案的真實排版，實際文字換行、留白高度都要瀏覽器實際算過才知道，沒有實際跑瀏覽器量測（本 skill 刻意不用 Playwright）就疊上去的座標多半會對不準，畫面看起來像壞掉而不是精準。改動範圍是整頁排版重排、或牽涉太多分散區塊時，這個手法本身也不適用，改用程式碼 diff 說清楚就好——這是「解釋複雜度」的工具，不是每次都要用的門面。
4. **程式碼 Diff**：列出實際變動的行／區塊，搭配 `<ins>`/`<del>` 標示，作為渲染對照的精確依據。只列變動處，不貼整份檔案。
5. **詳細說明**：條列式寫清楚——改了什麼、為什麼改（對應到哪個 issue / PR / 使用者需求）、對既有互動流程或其他頁面／步驟是否有影響。過程中若順手發現既有的不一致或技術債（例如宣告了但沒被引用的 CSS 變數），另闢一段點出來，但不要順手修掉——那是使用者的決定。
6. **這次沒有涵蓋的部分**：明確列出這次改動刻意沒動、或本 Artifact 沒有呈現的範圍（例如「只調整了顏色，排版與互動邏輯未變」「未涵蓋這個元件在其他頁面的引用」），避免讀者誤以為看到的就是全部。
7. **待確認事項**（若有）：例如視覺上是否符合 `design/system/MASTER.md` 的規範、是否需要回寫 spec.md。
8. **Footer**：精確引用被改動的檔案路徑（能取得行號就附行號），格式類似「對照 `path/to/file.html:16-141`」，方便使用者直接跳去對照原始碼，也符合本專案 Source-Verify 的習慣。

## 產出後

- 用 Artifact 工具發布（`favicon` 選一個貼切的 emoji），把連結回報給使用者。
- 同一次對話裡若接著再改同一個檔案，更新同一份 Artifact（用同一個 `file_path` 重新 publish 到同一個 URL），不要每次都開新的。
