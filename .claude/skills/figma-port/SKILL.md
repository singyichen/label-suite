---
name: figma-port
description: Port an already-designed source (SVG flowchart, HTML page, or prototype) into a Figma file as native editable nodes via the Figma MCP use_figma tool. Covers both a first-time build and incremental in-place sync of a board that was ported before. Use when the destination is a figma.com/board or figma.com/design URL — e.g. 「畫到 figma」「搬到 figma」「同步到 figma」「update the figma board」. Not for producing standalone HTML/SVG/PNG diagrams (use the diagram-design skill instead).
---

# figma-port

用 Figma MCP（`use_figma`）把「已經設計好的東西」搬進 Figma 的在地規範。**先讀完再開第一次 `use_figma`**——本 skill 的價值在於免去重新推導踩雷規則。

來源可以是 SVG 流程圖、HTML 頁面、或任何有明確幾何與樣式的規格。目標可以是 FigJam board 或 Design file。

**輸入、產出，以及「從零新建」與「就地增量更新」兩條執行路徑，見 §0.5。**

## 何時使用

- 把 `docs/diagrams/**` 或 `design/prototype/**` 的圖／頁面重建成 Figma 原生元件（可編輯，非貼圖）
- 在 FigJam 產出流程圖／泳道圖／架構圖
- 在 Design file 產出高保真頁面稿

**不適用**：產出 HTML/SVG 圖檔請用 `diagram-design` skill；本 skill 只處理 Figma 檔案。

## 0. 開工前：確認 editor mode

兩種模式可用的節點型別完全不同：

| URL | `editorType` | renderer |
|---|---|---|
| `figma.com/board/<key>` | `figjam` | §6 |
| `figma.com/design/<key>` | `figma` | §7 |

```js
return { editorType: figma.editorType, pageId: figma.currentPage.id };
```

**必須用 `return`，不能用 `console.log`。** `use_figma` 只把 `return` 的值交給 agent（官方 `figma-use` 規則 4）——照著印會得到空結果然後對著空手除錯。本文件所有腳本都遵守這條。

## 0.5 輸入與執行路徑

### 需要什麼、產出什麼

| | 內容 |
|---|---|
| 輸入 1 | **來源路徑**——一個或多個 HTML／SVG 檔，或含這些檔的目錄 |
| 輸入 2 | **目標 Figma URL**——決定走 §6 還是 §7（見 §0） |
| 輸入 3（選填） | 目標 Section／Page 名稱。多張圖共用同一個檔案時必填，否則判斷不出該更新哪一塊 |
| 產出 | Figma 原生節點（可編輯，非貼圖）＋ 每次 `use_figma` 回傳的節點 ID 清單 |

**來源不會被自動解析。** §1 的 IR 是人工抄寫的——`use_figma` 只收 plugin API 腳本，沒有「餵一份 HTML 就畫出來」的入口。所以「給來源路徑與目標 URL 就能執行」成立，但中間那段抄寫是這件事的主要成本，不是可以跳過的步驟。

### 兩條路徑，先分流再動手

```js
// 目標 Section 已有子節點 → 路徑 B；空的或不存在 → 路徑 A
const sec = figma.currentPage.findOne((n) => n.type === "SECTION" && n.name === NAME);
return { exists: !!sec, childCount: sec ? sec.children.length : 0 };
```

| | 路徑 A：從零新建 | 路徑 B：就地增量更新 |
|---|---|---|
| 何時 | 目標不存在，或是空 Section | 目標已有一版，要同步到來源最新狀態 |
| k 怎麼來 | 自己決定（§2，預設 2） | **反推既有版本的 k，不得另訂** |
| 動到誰 | 全部自建 | 只有內容變了的節點 |
| 驗收 | §5 逐層截圖 | §5「增量模式的驗收」 |

路徑 A 的步驟就是本文件的章節順序：§0 → §1 抄 IR → §2 定 k → §6／§7 逐層建 → §5 逐層驗 → §8 收尾。

### 路徑 B：就地增量更新

四步，順序不可換。

**① 反推變換式。** 既有版本的 k 與位移必須從檔案本身量出來，不能沿用記憶或猜測——猜錯時新增的節點會整批偏移，而既有節點看起來完全正常，截圖非常難發現。

```js
const n = await figma.getNodeByIdAsync("57:155");
return { x: n.x, y: n.y, w: n.width, h: n.height };
// 來源 (304, 140, 192, 52) → Figma (688, 664, 384, 104)
//   k        = 384 / 192      = 2
//   OFFSET_X = 688 - 2 * 304  = 80
//   OFFSET_Y = 664 - 2 * 140  = 384
```

**至少用兩個相距夠遠的節點各驗一次，兩軸都要。** 單一節點解出來的式子恆成立（兩個未知數配兩條方程式），驗不出任何錯。

`node.x` / `node.y` 讀回來的是 section-local 座標（§6.2），推出來的位移因此也是 section-local——寫回去時維持同一套座標系，不要中途換算成絕對座標。

**② dump 現況清單。** 讀出目標 Section 全部子節點的 ID、型別、座標與文字：

```js
const out = [];
for (const n of sec.children) {
  let s = null;
  if (n.type === "TEXT") s = n.characters;
  else if (n.type === "SHAPE_WITH_TEXT" || n.type === "CONNECTOR") {
    try { s = n.text.characters; } catch (e) {}
  }
  out.push({ id: n.id, type: n.type, x: Math.round(n.x), y: Math.round(n.y), s });
}
return out;
```

**`.text` 必須包型別守衛。** `RECTANGLE`、`VECTOR`、`LINE` 沒有這個 property，直接讀會丟 `TypeError: node.text: no such property 'text' on RECTANGLE node`；而 `use_figma` 是原子的，整支腳本失敗＝一個節點都沒讀到。

**③ 工單來自當前來源檔，不是 `git diff`。**

`git diff <上次同步的 commit> -- <來源路徑>` 看起來像現成的工單，但它會在兩種情況下騙你：

- 來源檔案改過路徑（搬移或更名）→ diff 把整份報成 new file，等於沒有工單
- 上次同步後另有 commit 動過同一份檔案 → 只 diff 到某一個 commit 會漏掉後續變更

**唯一可信的比對基準是當前來源檔的實際內容。** 拿它逐條對上 ② 的 dump，列出三類：新增、字串改了、來源已刪。

**④ 只改動到的節點。** 未列在工單上的節點一律不碰——不重設 `characters`、不重設 fills、不重排座標。這條是路徑 B 的全部價值：使用者在 Figma 上的手動微調不會被整批蓋掉。

改文字時注意：**設 `characters` 會清掉該節點全部的 range styling**，所以每改一個節點，就要把它每一字階的 `fontName` / `fontSize` / `lineHeight` / `letterSpacing` / `fills` 全部重設一次。

## 1. 先抄成 IR，再寫 plugin code

不要邊看來源邊寫腳本。先把來源抄成下列清單，同一份 IR 餵給兩種 renderer。

### 1.1 頁面層（最常被漏掉）

流程圖的 SVG 只是頁面的一部分，**頁面標題區不在 viewBox 裡**。IR 第一件事就是把它記下來，否則搬完的圖會少一整塊而截圖驗收看不出來（因為圖本身沒壞）。

```js
// { eyebrow, title, standfirst }  ← 全部含來源 fontSize / fontFamily / letterSpacing
{ eyebrow: { text: "REVIEW FLOW", size: 10.56, spacing: 0.18, upper: true },
  title:   { text: "審核流程總覽", size: 32, weight: 600, serif: true },
  standfirst: { text: "……", size: 15.2, italic: true, serif: true } }
```

### 1.2 節點與連線層

```js
// { id, title, sub, x, y, w, h, role, shape }
{ id: "unit", title: "審核單位", sub: "樣本 × 標記員 × 執行類型",
  x: 424, y: 240, w: 152, h: 48, role: "SYSTEM" }

// { from, to, fromMagnet, toMagnet, label, style }
{ from: "tally", to: "dispute", fromMagnet: "BOTTOM", toMagnet: "TOP",
  label: "未達 > N/2 票", style: "ACCENT" }
```

- `x/y/w/h` 一律寫 **來源原始座標**，換算交給 §2，避免手算錯誤散落各處
- `sub` 可省略；有值時走 §6.3 的單一 shape 多字階寫法
- `shape` 省略時預設 **`SQUARE`**。選型看 §6.3——不要反射性選 `ROUNDED_RECTANGLE`
- `style` ∈ `MAIN`（實線）／`COND`（虛線，循環或條件分支）／`ACCENT`（強調路徑）
- `label` 一律交給 §6.6 `link()` 寫進 connector 原生標籤，**不要另外畫底色遮罩**（理由見 §6.5）

### 1.3 樣式角色表

**色值不在本 skill 內另存一份。** 唯一來源是 `design/prototype/assets/tokens.css`（`diagram-design` 的 `label-suite` profile 同源）。建圖前先讀出實際 hex：

```bash
grep -E "color-(white|ink|ink-muted|text-soft|primary|primary-soft-bg|surface)\b" \
  design/prototype/assets/tokens.css
```

grep 會同時吐出 light 與 dark 兩組值——**取 `:root` 的 light 組**，圖一律只出 light 版。

| 角色 | 用途 | fill | stroke | 備註 |
|---|---|---|---|---|
| `HUMAN` | 人為動作 | `--color-white` | `--color-ink` | 實線 |
| `SYSTEM` | 系統推導狀態／判斷 | `--color-ink` @ 5% | `--color-text-soft` | 實線 |
| `GHOST` | 條件性節點 | `--color-ink` @ 5% | `--color-ink-muted` | 虛線 |
| `TERMINAL` | 終態（唯讀） | `--color-primary-soft-bg` | `--color-primary` | 實線 |
| `DECISION` | 判斷節點 | 同 `SYSTEM` | 同 `SYSTEM` | 形狀改 `DIAMOND` |

連線色：`MAIN`／`COND` 用 `--color-text-soft`，`ACCENT` 用 `--color-primary`。畫布底色 `--color-surface`。

`--color-ink` @ 5% 是既有圖源用的推導值（SVG 寫作 `#1E1B4B0D`），不是新色票——用 fill 的 `opacity: 0.05` 表達，不要硬編一個新 hex。

## 2. 比例守恆——本 skill 最重要的一條

> **來源的每一個長度量，都必須乘上同一個 k。**

```
figma = k · source  +  平移偏移
```

要乘 k 的量，一個都不能漏：

| 類別 | 項目 |
|---|---|
| 幾何 | 節點寬高、節點座標、節點間距、泳道間距、分隔線位置 |
| 文字 | **每一級 fontSize**（標題／副行／標籤／表格／圖例，含頁面層的 eyebrow／h1／standfirst） |
| 線條 | **strokeWeight**（節點框線、連線、分隔線） |
| 其他 | `letterSpacing`、`cornerRadius`、auto-layout 的 `padding` 與 `itemSpacing` |

**漏掉任何一項，截圖驗收抓不到。** 因為結果不是「壞掉」——沒有裁切、沒有重疊、走向也對——只是「不像」。字級留在原值而幾何放大 3.5×，看起來就是一張字太小、框太空、線太細的圖，而每一條 §8 的檢查都會通過。這是本 skill 唯一一種會安靜失敗的錯誤，所以它排在最前面。

### 怎麼決定 k

**預設 `k = 2`。** 理由是 Figma 100% 檢視時，來源常見的 12px 標題只有 12px，太小；2× 後是 24px，且高解析截圖有餘裕。

只有在 2× 之後真的裝不下文字時才調高 k，而**調高之前先走完 §3**——大部分「裝不下」不是尺寸問題，是行高問題。真的要調高時：

```
k = max(2, 內容所需最小寬 ÷ 來源最窄節點寬, 內容所需最小高 ÷ 來源最矮節點高)
```

然後**整份 IR 全部重乘一次新的 k**，不要只放大裝不下的那幾個節點。

### 平移偏移之外，文字還要補基線差

**SVG `<text>` 的 `y` 是基線，Figma `TextNode.y` 是行框頂。** 直接把 SVG 的 `y` 乘 k 當成 Figma 的 `y`，每一行文字都會往下掉約一個字高——版面看起來只是「整體偏鬆」，不會壞，所以截圖驗收會放過它。

`lineHeight = 1.15 · size` 時，基線落在行框頂下方約 `0.955 · size`：

```js
const top = (baseline, size) => k(baseline) + OFFSET_Y - 0.955 * size;   // size 是已乘 k 的值
```

**只有獨立 Text 節點需要這個轉換。** 形狀內建文字（`ShapeWithText.text`）由形狀自己垂直置中，不吃這條。

### 局部鉗制是例外，不是常態

若只有少數節點裝不下，寧可**只把那幾個節點鉗到下限並以中心點展開**（版面不位移），也不要為了它們拉高全域 k。鉗制過的節點要在交付說明裡列出來——那是刻意的偏差，不是精確 k。

## 3. 文字裝得下：先調行高，放大框放最後

**CJK 字型的預設行高遠大於拉丁字型**（`Noto Sans TC` 實測 ≈1.5×，`Inter` ≈1.21×）。這是「來源 48px 裝得下三行、Figma 96px 卻裝不下」的真正原因——不是 Figma 有尺寸下限。

`ShapeWithText.text` 是 `TextSublayerNode`，**支援 `setRangeLineHeight`**：

```js
s.text.setRangeLineHeight(0, n, { unit: "PIXELS", value: Math.round(24 * 1.15) });
s.text.setRangeLineHeight(n + 1, end, { unit: "PIXELS", value: Math.round(18 * 1.15) });
```

實測：`SQUARE` 304×96、標題 24px ＋ 兩行副行 18px——auto 行高被截成一行半；顯式 `1.15×` 三行全進、留白舒適。**先用行高解，比例守恆就不必破。**

排除順序：

1. 顯式設 `lineHeight`（1.0–1.2×）
2. 換 `shapeType`（`ROUNDED_RECTANGLE` 內距明顯大於 `SQUARE`，見 §6.3）
3. **形狀留空、文字另疊**（見下節）——形狀本身不能換時的正解
4. 才考慮鉗制尺寸（§2 例外條款）

### 形狀內距吃不下時：空文字 ＋ 疊一個置中 Text

有些形狀的內距**不隨尺寸縮小**，`lineHeight` 與 `shapeType` 兩招都用不上：

| 形狀 | 症狀 | 何時必然發生 |
|---|---|---|
| `DIAMOND` | 可用內接矩形只有外框的 **½ × ½** | 標題字寬 > w/2 時（幾乎所有 8 字以上的判斷節點） |
| `ROUNDED_RECTANGLE` | 圓角把左右內距吃掉 | 來源是扁膠囊（`rx ≈ h/2`）時 |

**不要為此放大形狀**——那正是 §2 說的破壞比例守恆。正解是把形狀當成純圖形、文字獨立畫：

```js
s.text.characters = "";                       // 形狀留空，magnet 照樣吸得住
stack(lines, k(o.w) + (o.pad || 0),           // pad：菱形給額外寬度讓字橫向溢出
      s.x + s.width / 2, s.y + s.height / 2); // 依形狀中心置中
```

`stack()` 見 §6.6。這麼做並不是繞路——**來源 SVG 本來就是這個結構**（`<polygon>`／`<rect>` 之外另有一個 `<text>`），照抄反而更貼近原圖。連線端點用 `endpointNodeId` 磁吸到那個空文字形狀，行為完全不受影響。

判斷規則：`DIAMOND` 一律用疊字；`ROUNDED_RECTANGLE` 在來源是扁膠囊時用疊字。其餘走 §6.6 `shape()` 的內建雙字階路徑。

### 裁切驗不到，只能看

**`text.characters` 讀回來永遠是完整字串，即使畫面上已經截成 `…`。** 裁切只發生在算繪層。所以任何「程式化驗收」都驗不出文字被吃掉——這件事只能靠截圖。

### 需要下限時，量，不要背

下限隨 `shapeType`、行數、fontSize、lineHeight 一起變，抄一組數字進來下次一定錯。要用就現場探：

```js
// 建一排同內容不同尺寸的探針 → 截圖 → 看哪個沒有 "…" → 刪掉探針
[96, 104, 112, 120].forEach((h, i) => { /* mkNode(...{ w: 304, h, y: i * 160 }) */ });
```

**探針一定要刪掉**，別留在交付圖上。

## 4. 字型對映

### CJK 必須指定 CJK 家族

CSS 的 `font-family` 是字型棧，第一個通常是拉丁字型、中文靠後面的 fallback。**Figma 的 `fontName` 只能指定一個家族，沒有棧。**

照抄第一個家族（例如 `Inter`）的後果：中文仍然顯示得出來（Figma 有隱式 fallback），但**你指定的字重不會套到中文上**——`Inter Semi Bold` 的中文會是 fallback 字型的 Regular。截圖上看起來只是「中文有點細」，非常容易放過。

> 含中文的文字，直接指定 `Noto Sans TC` / `Noto Serif TC`。純拉丁的段落（代碼、數字、英文標籤）才可以留 `Inter` / `JetBrains Mono`。

### 字重對映

`Noto Sans TC` **沒有 SemiBold**，CSS 的 600 只能落到 `Medium`：

| CSS weight | Noto Sans TC | Noto Serif TC |
|---|---|---|
| 400 | `Regular` | `Regular` |
| 500 | `Medium` | `Medium` |
| 600 | `Medium`（無 SemiBold） | `SemiBold` |
| 700 | `Bold` | `Bold` |

### 已知 style 清單（省一次 `listAvailableFontsAsync`）

| 字型 | style |
|---|---|
| `Noto Sans TC` | Black／Bold／DemiLight／Light／Medium／Regular／Thin——**無 Italic**、無 SemiBold |
| `Noto Serif TC` | Black／Bold／ExtraLight／Light／Medium／Regular／SemiBold——**無 Italic** |
| `Inter` | style 字串**有空格**：`Semi Bold`／`Extra Bold` |
| `Crimson Pro` | 16 種，style 字串**無空格**：`SemiBold`；**含 Italic** |
| `JetBrains Mono` | 中文會 fallback 顯示，**不會掉字** |

同一份腳本裡 `Semi Bold` 與 `SemiBold` 兩種寫法並存是正常的，不是筆誤。

兩條推論：

- **中文不能斜體。** 來源的 italic 引文，中文那半只能退回 Regular；拉丁那半仍可斜體。
- **`listAvailableFontsAsync()` 只回答有沒有這個 style，回答不了字符涵蓋範圍。** 要驗某字型顯不顯示中文，只能建探針節點打中文再截圖。

## 5. 驗收節奏

**每建完一「層」截一次圖，不得全部建完才驗。** 順序固定：

1. 節點（尺寸、填色、文字、行高）
2. 連線（磁吸點走向）
3. 標註（連線標籤、泳道標籤、引文）
4. 頁面標題區、圖例、對照表

截圖驗收無法消除——那是這件事的本質。每輪成本是 `get_screenshot` → `curl` → 讀圖三次呼叫且都是高 token 影像讀取，所以**寧可一次多建一整層，也不要一個節點驗一次**。

**最後一輪要跟來源並排比。** 只看 Figma 那張只能回答「有沒有壞」，回答不了「像不像」——§2 的失敗模式就藏在這個縫裡。

### 增量模式的驗收

路徑 B 不必逐層截圖——只有動到的那幾個節點需要看。但多兩件事要驗：

- **變換式已用第二個節點獨立複驗**（§0.5 ①）。這是新增節點會不會整批偏移的唯一防線
- **未列在工單上的節點沒有被觸碰**：改動前後各 dump 一次，比對 `id` 集合與未動節點的 `x` / `y`

### 文字覆蓋率可以程式化驗，不必肉眼數

本節開頭說截圖無法消除，那是針對「像不像」與裁切。但「有沒有漏搬、有沒有留下舊字串」純粹是字串比對，可以自動化：

```bash
# 來源側：先剝掉 <tspan> 再抽 <text> 內容
sed -e 's/<tspan[^>]*>//g' -e 's|</tspan>||g' <source>.html \
  | grep -o '<text[^>]*>[^<]*</text>' | sed 's/<[^>]*>//g'
```

對上 §0.5 ② dump 出來的 `s` 欄位做集合差：

- 只在來源 → 漏搬
- 只在 Figma → 上一版留下的舊字串（**增量更新最容易出的錯**，而且截圖只會看到一段合理的文字，不會看到它已經過期）

**已知的合法差集，先扣掉再看結果**：頁面層的 eyebrow／h1／standfirst 不在 SVG 的 `<text>` 裡（§1.1），會落在「只在 Figma」那側；來源用 `<tspan>` 拆行的字串在來源側是分段的，在 Figma 側是同一個節點的多行 `characters`。

## 6. FigJam renderer

### 6.1 覆寫上游文件錯誤

`figma-use-figjam` 宣告下列 API 為 design-mode only，**實測在 FigJam 全部可用**（十種 create API 探測 10/10 `OK`）：

- `figma.createRectangle()` — 分隔線底襯、圖例色塊都靠它
- `figma.createLine()` — 分隔線
- `figma.createFrame()`／`figma.createVector()`／巢狀 `Section`

照上游文件走只能產出降級版（無泳道分隔線、無圖例色塊、無虛線 ghost 框）。**以本文件為準。**

例外一條照上游：**`figma.createPage()` 在 FigJam 真的不存在**，用 Section 組織內容。

### 6.2 兩套座標系（最容易踩的雷）

- `node.x` / `node.y` 讀寫的是 **section-local** 座標（節點已 `appendChild` 進 Section 時）
- Connector 的 `position` 端點吃 **page 絕對座標**

Section 不在 `(0,0)` 時，凡是寫 `position` 端點都必須自己補：

```js
const abs = (sec, x, y) => ({ x: sec.x + x, y: sec.y + y });
```

**而且順序有規定：`position` 必須在 `appendChild` 之後才設。** 在 append 之前設好的絕對座標，會在重新掛載到 Section 時被當成 section-local 重新錨定——結果整條線往下／往右偏移一整個 `sec.y`／`sec.x`，Section 還會自動撐大去包住它。Section 在 `(0,0)` 時兩種解讀等值，看不出差別；一旦 Section 不在原點就會整段跑掉。

```js
sec.appendChild(c);                                  // 先 append
c.connectorStart = { position: abs(sec, lx, ly) };   // 再設端點
c.connectorEnd   = { position: abs(sec, lx2, ly2) };
```

用 `endpointNodeId` 磁吸的連線不受這條影響——磁吸端點沒有座標。

另外兩條：

- **浮動連線不會自動進 Section。** 建完 Connector 必須 `sec.appendChild(c)`，否則 section 截圖涵蓋不到它，你會對著一張沒有連線的圖除錯
- **`connector.text.fontName` 新建時是無效值。** 設 `characters` 前必須先指定，否則丟錯

### 6.3 形狀選型

`ShapeWithText` 的圓角**不可設**，只能在離散的 `shapeType` 裡挑最近的。用來源的圓角比判斷：

| 來源 `rx ÷ 節點高` | 選 | 
|---|---|
| < 0.25（近方角，例如 `rx=6` / `h=48`） | **`SQUARE`** |
| 接近 0.5（膠囊） | `ROUNDED_RECTANGLE` |

**這不只是外觀問題。** `ROUNDED_RECTANGLE` 的內部文字內距明顯大於 `SQUARE`——同一段文字、同一個框，`SQUARE` 進得去、`ROUNDED_RECTANGLE` 會截斷。反射性選 `ROUNDED_RECTANGLE` 會讓你誤以為 FigJam 有很大的尺寸下限，進而破壞 §2 的比例守恆。

判斷節點用 `DIAMOND`：菱形的可用內接矩形只有外框的一半，寬高各留兩倍文字尺寸。

### 6.4 有箭頭的線一律用 Connector

`figma.createLine()` **畫不出箭頭端點**。圖例裡那條「→ 表示流向」的示意線若用 `createLine()`，會變成一條沒有箭頭的短線，而截圖上看起來只像是「圖例有點淡」。

需要箭頭就用 `Connector`——即使是一條直線示意，也設 `connectorLineType = "STRAIGHT"` 走 Connector。`createLine()` 只留給真正無箭頭的分隔線。

### 6.5 連線標籤用 connector 原生 text，不要自己疊遮罩

`c.text.characters` 寫進去就好，**不要另外畫一個矩形墊在底下**。兩個理由：

- FigJam 的 connector 會**自動在標籤處把線斷開**留出缺口，標籤本來就不會壓在線上
- 新建 connector 的 `textBackground.fills` 預設是 `[]`（透明），不需要清

自己疊的矩形反而會多出一塊來源沒有的色塊，而且因為它「看起來像有意設計的 pill」，截圖驗收時很容易被當成正常樣式放過——這是另一種安靜失敗。**判準：標籤掛在連線上 → connector 原生 text；標籤是獨立標註（泳道名、引文、圖例）→ 才用 `text()`。**

只有兩種情況需要遮罩：Design renderer（沒有原生 connector，見 §7.2），或標籤確實壓到泳道分隔線那類**非連線**的圖元。

### 6.5.1 Connector 移植得進來的與移植不進來的

`ConnectorNode` 可寫的屬性只有三個——`connectorStart`、`connectorEnd`、`connectorLineType`。**沒有 waypoint、沒有可寫的 `cornerRadius`（宣告就是 `readonly`）、沒有標籤位置。** 折線怎麼繞、轉角多圓、標籤擺哪，全是 FigJam 自己的演算法。

| 來源指定的東西 | 移植得進來？ |
|---|---|
| 端點所在節點與邊 | ✅ 用 magnet |
| 通道位置（折線的垂直/水平段落在哪） | ✅ 實測與來源差 < 5px，router 的預設間距恰好接近手工值 |
| 線寬、顏色、虛線 | ✅ |
| 轉角圓角 | ❌ `readonly`。來源 8（k=2 → 16）實測被畫成約 40 |
| 標籤位置 | ❌ **一律置中於路徑中點** |
| 標籤處線是否連續 | ❌ 一律斷開（§6.5） |

**這與比例守恆是不同性質的問題**：那個是漏乘 k、可以修；這個是 API 沒開。誤判成前者會浪費一輪去找不存在的 bug。

**判準：來源把標籤放在明顯偏離路徑中點的位置時，那條線就不能交給 router。** 落差與線長成正比——短連線的中點本來就離作者指定位置很近，看不出來；全圖最長的那一兩條會歪到撞上別的節點。實測一條垂直跨 272 來源 px 的連線，作者放在 23%、FigJam 放在 50%，差 73 來源 px（k=2 後 146px），剛好落在鄰近判斷節點的頂點旁。

要精確時，**只把那幾條改成 `createVector()` 自畫折線（可照抄 SVG path 的 `A` 圓角）＋ 獨立 `text()` 標籤（可加來源的底板）**，其餘維持 Connector。代價是那幾條失去磁吸，節點搬動時不跟著走——所以是逐條換，不是整張圖換。

### 6.6 Helper 函式庫

`use_figma` 呼叫間**不共享狀態**，每次呼叫都要整段重貼——這砍不掉。以下可整段複製，**只需把頂端的 `K` 換成 §2 決定的比例**。

```js
// ── 比例：§2 比例守恆，所有長度量的唯一來源 ────────────────
const K = 2;
const k = (v) => v * K;

// ── 色值：hex 讀自 tokens.css，見 §1.3 ─────────────────────
const INK = "#1E1B4B", SOFT = "#64748B", MUTED = "#94A3B8";
const WHITE = "#FFFFFF", PRIMARY = "#6366F1", PRIMARY_BG = "#EEF2FF";

// ── 字型：含中文一律 CJK 家族，見 §4 ───────────────────────
const FONT_T = { family: "Noto Sans TC", style: "Medium" };   // CSS 600
const FONT_S = { family: "Noto Sans TC", style: "Regular" };

// ── 來源字級（原始 px），套用時才乘 k ──────────────────────
const SIZE = { title: 12, sub: 9, label: 8, lane: 9 };
const LH = 1.15;                                    // 顯式行高，見 §3

const ROLE = {
  HUMAN:    { fill: WHITE,      op: 1,    stroke: INK },
  SYSTEM:   { fill: INK,        op: 0.05, stroke: SOFT },
  GHOST:    { fill: INK,        op: 0.05, stroke: MUTED, dashed: true },
  TERMINAL: { fill: PRIMARY_BG, op: 1,    stroke: PRIMARY },
  DECISION: { fill: INK,        op: 0.05, stroke: SOFT },
};

async function h() {
  await Promise.all([figma.loadFontAsync(FONT_T), figma.loadFontAsync(FONT_S)]);
}

const rgb = (x) => ({
  r: parseInt(x.slice(1, 3), 16) / 255,
  g: parseInt(x.slice(3, 5), 16) / 255,
  b: parseInt(x.slice(5, 7), 16) / 255,
});
const solid = (hex, op = 1) => [{ type: "SOLID", color: rgb(hex), opacity: op }];
const abs = (sec, x, y) => ({ x: sec.x + x, y: sec.y + y });

// ── mkNode(): 節點 + 單一 shape 多字階。o 的 x/y/w/h 是來源座標 ──
function mkNode(sec, o) {
  const s = figma.createShapeWithText();
  s.shapeType = o.shape || "SQUARE";                // §6.3：預設方角
  s.resize(k(o.w), k(o.h));                          // 純 k，不鉗制
  sec.appendChild(s);                                // 先 append，x/y 才是 section-local
  s.x = k(o.x); s.y = k(o.y);

  const r = ROLE[o.role];
  s.fills = solid(r.fill, r.op);
  s.strokes = solid(r.stroke);
  s.strokeWeight = k(1);                             // 線寬也要乘 k，見 §2
  if (r.dashed) s.dashPattern = [k(4), k(3)];

  s.text.fontName = FONT_T;                          // 設 characters 前先指定
  const lines = [o.title, o.sub, o.sub2].filter(Boolean);
  if (o.overlay) {                                   // §3：內距吃字 → 形狀留空，另疊 stack()
    s.text.characters = "";
    stack(sec, lines, k(o.w) + k(o.pad || 0),
          s.x + s.width / 2, s.y + s.height / 2);
    return s;
  }
  s.text.characters = lines.join("\n");
  const n = o.title.length, end = s.text.characters.length;
  const ts = k(SIZE.title), ss = k(SIZE.sub);
  s.text.setRangeFontName(0, n, FONT_T);
  s.text.setRangeFontSize(0, n, ts);
  s.text.setRangeLineHeight(0, n, { unit: "PIXELS", value: Math.round(ts * LH) });
  s.text.setRangeFills(0, n, solid(INK));
  if (end > n) {
    s.text.setRangeFontName(n + 1, end, FONT_S);
    s.text.setRangeFontSize(n + 1, end, ss);
    s.text.setRangeLineHeight(n + 1, end, { unit: "PIXELS", value: Math.round(ss * LH) });
    s.text.setRangeFills(n + 1, end, solid(SOFT));
  }
  return s;
}

// ── link(): 連線。磁吸端點優先，position 端點必用 abs() ─────
function link(sec, a, b, o = {}) {
  const c = figma.createConnector();
  c.connectorStart = { endpointNodeId: a.id, magnet: o.from || "AUTO" };
  c.connectorEnd   = { endpointNodeId: b.id, magnet: o.to   || "AUTO" };
  c.connectorLineType = o.line || "ELBOWED";
  const accent = o.style === "ACCENT";
  c.strokes = solid(accent ? PRIMARY : SOFT);
  c.strokeWeight = k(accent ? 0.7 : 0.6);
  if (o.style === "COND") c.dashPattern = [k(4), k(3)];
  if (o.label) {
    c.text.fontName = FONT_S;                        // 新建時是無效值，必須先設
    c.text.characters = o.label;
    c.text.fontSize = k(SIZE.label);
    c.text.fills = solid(accent ? PRIMARY : SOFT);
  }
  sec.appendChild(c);                                // 不 append 就不進 section 截圖
  return c;
}

// ── text(): 泳道標籤、引文、對照表欄位。x/size 皆來源值 ─────
//    y 傳來源 <text> 的「基線」，函式自己換算成行框頂，見 §2 ───
function text(sec, x, baseline, str, o = {}) {
  const size = k(o.size || SIZE.sub);
  const t = figma.createText();
  t.fontName = o.font || FONT_S;
  t.characters = str;
  t.fontSize = size;
  t.lineHeight = { unit: "PIXELS", value: Math.round(size * LH) };
  t.fills = solid(o.color || SOFT);
  if (o.spacing) t.letterSpacing = { unit: "PIXELS", value: size * o.spacing };
  sec.appendChild(t);
  t.x = k(x); t.y = k(baseline) - 0.955 * size;      // 基線 → 行框頂
  return t;
}

// ── stack(): 多字階文字塊，依中心點置中。搭配 mkNode 的 overlay ──
function stack(sec, lines, w, cx, cy) {
  const t = figma.createText();
  t.fontName = FONT_T;
  t.characters = lines.map((l) => l.s).join("\n");
  t.textAutoResize = "HEIGHT";
  t.resize(w, t.height);                             // 先定寬才能置中對齊
  t.textAlignHorizontal = "CENTER";
  let i = 0;
  for (const l of lines) {
    const n = l.s.length, sz = k(l.size);
    t.setRangeFontName(i, i + n, l.font || FONT_S);
    t.setRangeFontSize(i, i + n, sz);
    t.setRangeFills(i, i + n, solid(l.color || SOFT));
    t.setRangeLineHeight(i, i + n, { unit: "PIXELS", value: Math.round(sz * LH) });
    i += n + 1;
  }
  sec.appendChild(t);
  t.x = cx - w / 2; t.y = cy - t.height / 2;         // 依形狀中心置中，不是靠左上角
  return t;
}

// ── rect(): 分隔線、圖例色塊（上游宣稱不可用，實測可用）────
function rect(sec, x, y, w, hh, o = {}) {
  const r = figma.createRectangle();
  r.resize(Math.max(k(w), 1), Math.max(k(hh), 1));
  sec.appendChild(r);
  r.x = k(x); r.y = k(y);
  r.fills = o.fill ? solid(o.fill, o.op == null ? 1 : o.op) : [];
  r.strokes = o.stroke ? solid(o.stroke) : [];
  r.strokeWeight = k(o.weight || 1);
  if (o.radius) r.cornerRadius = k(o.radius);
  if (o.dashed) r.dashPattern = [k(3), k(2)];
  return r;
}

// ── pill(): 遮罩式標籤。FigJam 連線標籤不要用它，見 §6.5 ───
function pill(sec, x, y, str, o = {}) {
  const t = text(sec, x + 4, y + 2, str, { size: o.size || SIZE.label, color: o.color || SOFT });
  const bg = rect(sec, x, y, 0, 0, { fill: o.bg || "#F5F3FF", radius: 2 });
  bg.resize(t.width + k(8), t.height + k(4));
  sec.appendChild(bg); sec.appendChild(t);   // bg 先、t 後 → t 在上層
  return { bg, t };
}
```

## 7. Design renderer

### 7.1 能力探測

換一個沒跑過的 Design file 時重跑一次即可；已知結果見 §7.2。

```js
const probe = {};
for (const [key, f] of Object.entries({
  ShapeWithText: () => figma.createShapeWithText(),
  Connector:     () => figma.createConnector(),
  Sticky:        () => figma.createSticky(),
  CodeBlock:     () => figma.createCodeBlock(),
  Section:       () => figma.createSection(),
  Frame:         () => figma.createFrame(),
  Rectangle:     () => figma.createRectangle(),
  Line:          () => figma.createLine(),
  Vector:        () => figma.createVector(),
  Text:          () => figma.createText(),
})) {
  try { const n = f(); probe[key] = "OK"; n.remove(); }
  catch (e) { probe[key] = String((e && e.message) || e); }
}
return { editorType: figma.editorType, probe };
```

| API | Design (`figma`) | FigJam (`figjam`) |
|---|---|---|
| `ShapeWithText` / `Connector` / `Sticky` / `CodeBlock` | ❌ `no such property` | ✅ OK |
| `Section` / `Frame` / `Rectangle` / `Line` / `Vector` / `Text` | ✅ OK | ✅ OK |

那四支在 Design mode 是 **`figma` 全域物件上根本沒有這個 property**，不是執行期權限拒絕——所以功能偵測要測 property 存不存在，不要靠 try/catch 接執行期錯誤。

### 7.2 節點與連線表示法

| 對象 | FigJam | Design |
|---|---|---|
| 節點 | `ShapeWithText` | `figma.createAutoLayout("VERTICAL")` + padding，內含標題／副行兩個 Text 子節點 |
| 連線 | `Connector`（原生磁吸） | `createVector()` + `setVectorNetworkAsync()`，端點自行計算 |
| 連線標籤 | `connector.text`（原生，自動挖缺口，見 §6.5） | 獨立 Text + `rect()` 遮罩（`pill()`）——**Design 沒有原生 connector，這裡才需要遮罩** |
| 判斷節點 | `DIAMOND` shapeType | `createVector()` 菱形路徑 + 另一個置中的文字 frame |

- **用 `figma.createAutoLayout("VERTICAL")`，不要 `createFrame()` + 手設 `layoutMode`。** 前者建出來就是兩軸 hug，省掉 `primaryAxisSizingMode` / `counterAxisSizingMode` 的設定順序雷（官方規則 12b：`layoutSizing*` 與 `*AxisSizingMode` 是兩組不同的 enum，交叉使用會丟錯）。
- **菱形兩種作法都可行，本文件採 Vector 路徑。** 「正方 frame `rotation = 45` + 內文反向 −45」實測成立，但會把菱形長寬比與內文綁死。若採旋轉法，**務必記得把子節點的 rotation 也還原**——只還原 frame 會留下一個斜的標題，截圖上很像字型問題。
- **`LineNode.strokeCap` 套用在線段兩端**，`"ARROW_LINES"` 會畫出雙頭箭頭。單向連線必須改用 vector network 逐頂點指定：

```js
async function arrow(x1, x2, y, accent) {
  const v = figma.createVector();
  figma.currentPage.appendChild(v);
  v.x = x1; v.y = y;
  await v.setVectorNetworkAsync({
    vertices: [
      { x: 0,       y: 0, strokeCap: "NONE" },
      { x: x2 - x1, y: 0, strokeCap: "ARROW_LINES" },
    ],
    segments: [{ start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }],
    regions: [],
  });
  v.strokes = solid(accent ? PRIMARY : SOFT);
  v.strokeWeight = k(accent ? 0.7 : 0.6);
  v.fills = [];            // vector 預設有 fill，不清掉線條會被填成一片
  return v;
}
```

### 7.3 畫布底色必須顯式設定

**Design file 的預設畫布是深色，FigJam 不是。** 沿用 §1.3 的角色表而不動背景，深藍文字會落在深底上近乎不可讀，且截圖看起來像是填色沒生效。每次建圖第一支腳本就設：

```js
figma.currentPage.backgrounds = solid("#F5F3FF");   // --color-surface
```

### 7.4 尺寸交給 hug

**Design 模式不要設固定下限。** FigJam 那套文字內距問題在 auto-layout 下由 `padding*` + `primaryAxisSizingMode = "AUTO"` 直接解掉，高度隨內容長。

高度可精確預測（`paddingY = 24`、`itemSpacing = 8`、標題 24px、副行 16px）：

```
H = 2·paddingY + titleH + (sub ? itemSpacing + subH : 0)
```

**寬度不要拿來做精確對齊。** `W = 2·paddingX + max(titleW, subW)` 大方向成立，但文字量測有次像素捨入，同一節點兩次會漂 ±2px。需要多節點等寬時設固定寬度（`layoutSizingHorizontal = "FIXED"` + `resize()`）再讓高度 hug，不要靠兩軸都 hug 去湊齊。

### 7.5 移植 UI 頁面（非流程圖）

**§1.2 的節點／連線清單描述不了 UI 頁面。** 來源若是 `design/prototype/pages/**` 的頁面，跳過 §1.2，直接照 DOM 結構鏡射成巢狀 auto-layout：一個 CSS flex 容器對一個 `createAutoLayout`，`gap` 對 `itemSpacing`，`padding` 對 `padding*`。§2／§4／§7.3／§7.4 仍然適用。

**① inline SVG 直接匯入，不要手刻 vector network。** `figma.createNodeFromSvg()` 在 Design mode 可用（實測含多路徑多填色的 icon 全數成功）。§7.2 那套 `setVectorNetworkAsync()` 只用在**沒有現成 SVG** 的連線箭頭上。

```js
const n = figma.createNodeFromSvg(svgString);   // 回傳 FrameNode，尺寸 = viewBox
n.rescale(target / 24);                          // 先縮放，rescale 會一併縮 strokeWeight
host.appendChild(n);
n.x = (host.width - n.width) / 2;                // 再置中
n.y = (host.height - n.height) / 2;
```

`stroke="currentColor"` 在 Figma 解析不出來——**送進去之前先把顏色寫死在 SVG 字串裡**。作法是預留一個透明的 placeholder frame（尺寸就是 icon 尺寸）當 auto-layout 的子項，最後一層再把 SVG 塞進去，版面不會因為 icon 晚到而位移。

**② CSS 的 border 佔空間，Figma 的 INSIDE stroke 不佔。** 專案全域設了 `box-sizing: border-box`，`1px` 邊框讓容器高度多 2px；Figma 的 `strokeAlign = "INSIDE"` 完全不影響 `height`。結果是**每個有邊框的容器都矮 2px**，而且截圖上看不出來。

> 移植時把 border 寬度加進 padding：CSS `padding: 11px 16px` ＋ `border: 1px` → Figma `padding 12 / 17`。

**③ 不要靠 Figma 的文字自動高度。** Figma 的 auto height ≈ `1.21 × fontSize`；CSS `line-height: normal` 在**含中文的行**會觸發較高的行框，實測 ≈ `fontSize + 6`（13→19、14→20、15→21），純拉丁文才是 ≈ 1.21×。同一頁面兩種行框並存，靠猜必錯。

> 從來源頁 `getComputedStyle(el).lineHeight` 取實際值，逐一顯式設 `t.lineHeight = { unit: "PIXELS", value: v }`。

**④ auto-layout 沒有 margin。** CSS 的 `margin-top: 4px` 無處可放——`itemSpacing` 是 gap，對所有子項一視同仁。作法是把該子項包進一個單子節點的 auto-layout wrapper，用 `paddingTop` 表達那個 margin。多一層節點是必要成本，不是髒作法。

**⑤ 只移植預設狀態。** `display: none` 的錯誤橫幅、`:hover` / `:focus` / `.error` / loading spinner、`prefers-color-scheme` 深色覆寫——一律不建。要交付狀態集就另建 frame 並在名稱上標明。

**⑥ 驗收改用數值。** 肉眼比對抓不到「每個容器矮 2px」這種累積誤差——單一元件上看不出來，累積到卡片層級才變成 546 vs 574。兩邊都量同一組容器再逐列對：

```js
document.querySelector(".card").getBoundingClientRect();   // 來源：瀏覽器
root.query("[name=card]").first().height;                  // Figma：同名節點
```

差 1–2px 通常是 `line-height` 的次像素捨入，不必再追。

### 7.6 Design 模式定位為靜態高保真交付

Design file 沒有原生 Connector，**連線不會跟隨節點移動**。要維護一套 layout solver 讓它跟隨，成本遠高於收益。

**決策**：Design 模式產出的是**交付用靜態高保真稿**——排版定稿後才移植，移植後不在 Figma 內搬節點。需要邊畫邊調位置的探索階段，一律用 FigJam。

## 8. 驗收清單

- [ ] editor mode 已確認，走對 §6／§7
- [ ] IR 三份清單（頁面層／節點／連線）先寫完才開第一次 `use_figma`
- [ ] 色值讀自 `tokens.css`，skill 內沒有另一份色票
- [ ] 腳本用 `return` 輸出，沒有靠 `console.log`
- [ ] **k 只有一個值，且幾何／每一級 fontSize／strokeWeight／letterSpacing 全部乘過**（§2）
- [ ] 局部鉗到下限的節點已逐一列出，不是靜悄悄放大
- [ ] 含中文的文字用 CJK 家族，字重照 §4 對映表落地
- [ ] 行高顯式設定，沒有依賴 auto（§3）
- [ ] `DIAMOND` 與扁膠囊改用「空文字 ＋ 疊 `stack()`」，沒有為了塞字放大形狀（§3）
- [ ] 獨立 Text 節點的 `y` 已從來源基線換算成行框頂（§2）
- [ ] 有箭頭的線用 `Connector`，不是 `createLine()`（§6.4）
- [ ] 連線標籤是 connector 原生 text，底下沒有自己疊的遮罩矩形（§6.5）
- [ ] 標籤明顯偏離路徑中點的長連線已改自畫，或已列為刻意偏差（§6.5.1）
- [ ] Design 模式已設 `figma.currentPage.backgrounds`（§7.3）
- [ ] 每建完一層截一次圖；探針節點已刪乾淨
- [ ] **最後一輪與來源並排比對**：無裁切、無重疊、走向一致，且字級／線寬比例看起來與來源相同

增量模式（路徑 B）另外加驗：

- [ ] 既有版本的 k 與位移是量出來的，且已用第二個節點獨立複驗（§0.5 ①）
- [ ] dump 的 `.text` 有型別守衛，沒有對 `RECTANGLE` 直接讀（§0.5 ②）
- [ ] 工單來自當前來源檔內容，不是 `git diff <上次同步 commit>`（§0.5 ③）
- [ ] 未列在工單上的節點沒有被觸碰（§5）
- [ ] 改過 `characters` 的節點已重設全部字階樣式（§0.5 ④）
- [ ] 來源文字字串已與 dump 做過集合差，無漏搬、無殘留舊字串（§5）

## 附註

- **放專案內而非全域**：樣式角色引用 Label Suite 的 design token 與 `label-suite` diagram profile，引用鏈只在本 repo 成立。
- **不併進 `diagram-design`**：該 skill 產出 HTML/SVG，觸發情境不同；合併會讓做網頁圖時白白載入大量 Plugin API 細節。
- 相關：issue #475（本 skill）、#579（frontmatter 與本節輸入/路徑）、#465（`diagram-design` 導入）；上游 `figma-use` / `figma-use-figjam`（Figma plugin 2.2.96）。
- 規則來源：`specs/annotation/015-annotation-workspace/diagrams/review-flow-{overview,dry-run,official-run}.html` 三張圖以 `k = 2` 移植進同一個 FigJam board 的過程；每一條規則都是那三次移植裡實際踩過並修掉的。§0.5 的路徑 B 則來自同一個 board 之後的兩輪就地增量同步（2026-08-27、2026-08-31）。
