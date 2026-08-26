---
name: figma-port
description: Use when porting a Label Suite diagram (docs/diagrams/**, design/prototype/**, or any SVG/HTML spec) into a Figma file via the use_figma tool — covers both FigJam boards (figma.com/board/) and Design files (figma.com/design/). Contains the shared node/edge intermediate representation, the style-role table, SVG→Figma coordinate conversion, the FigJam helper library, verified size minimums, and corrections to upstream figma-use-figjam documentation errors.
---

# figma-port

把「圖規格」搬進 Figma 的在地規範。**先讀完再開第一次 `use_figma`**——本 skill 的價值在於免去重新推導踩雷規則，不是免去重送樣板。

## 何時使用

- 要把 `docs/diagrams/**` 或 `design/prototype/**` 的 SVG／HTML 圖重建成 Figma 原生元件時
- 要在 FigJam board 或 Design file 產出可編輯（非貼圖）的流程圖／泳道圖／架構圖時

**不適用**：產出 HTML/SVG 圖檔請用 `diagram-design` skill；本 skill 只處理 Figma 檔案。

## 0. 前置：確認 editor mode

兩種模式的節點型別完全不同，**開工前必須先確認**：

| URL | editorType | 走本文件哪一節 |
|---|---|---|
| `figma.com/board/<key>` | `figjam` | §3（已實證） |
| `figma.com/design/<key>` | `figma` | §4（已實證） |

```js
return { editorType: figma.editorType, pageId: figma.currentPage.id };
```

**必須用 `return`，不能用 `console.log`。** `use_figma` 只把 `return` 的值交給 agent，`console.log` 的輸出永遠看不到（官方 `figma-use` 規則 4）——照著印會得到空結果然後對著空手除錯。本文件所有腳本都遵守這條。

## 1. 中間表示（IR）——兩種 mode 共用

同一份規格餵給兩種 mode，只換 §3／§4 的 renderer。先把來源圖抄成這兩份清單再動手，不要邊看 SVG 邊寫 plugin code。

**節點清單**

```js
// { id, title, sub, x, y, w, h, role, shape }
{ id: "unit", title: "審核單位", sub: "樣本 × 標記員 × 執行類型",
  x: 424, y: 240, w: 152, h: 48, role: "SYSTEM", shape: "ROUNDED_RECTANGLE" }
```

- `x/y/w/h` 一律寫 **SVG 原始座標**，換算交給 §1.2，避免手算錯誤散落各處
- `sub` 可省略；有值時走 §3 的單一 shape 雙字階寫法
- `shape` 省略時預設 `ROUNDED_RECTANGLE`；判斷節點用 `DIAMOND`

**連線清單**

```js
// { from, to, fromMagnet, toMagnet, label, style }
{ from: "tally", to: "dispute", fromMagnet: "BOTTOM", toMagnet: "TOP",
  label: "未達 > N/2 票", style: "ACCENT" }
```

- `style` ∈ `MAIN`（主流程實線）／`COND`（虛線，循環或條件分支）／`ACCENT`（仲裁路徑）
- `label` 有值時一律加底色遮罩 pill（見 §3 `pill()`），否則會壓在泳道分隔線上

### 1.1 樣式角色表

**色值不在本 skill 內另存一份。** 唯一來源是 `design/prototype/assets/tokens.css`（`diagram-design` 的 `label-suite` profile 同源，見 `references/style-guide.md`）。建圖前先讀出實際 hex：

```bash
grep -E "color-(white|ink|ink-muted|text-soft|primary|primary-soft-bg|surface)\b" \
  design/prototype/assets/tokens.css
```

grep 會同時吐出 light 與 dark 兩組值——**取 `:root` 的 light 組**，圖一律只出 light 版。

| 角色 | 用途 | fill | stroke | 備註 |
|---|---|---|---|---|
| `HUMAN` | 人為動作 | `--color-white` | `--color-ink` | 實線 |
| `SYSTEM` | 系統推導狀態／判斷 | `--color-ink` @ 5% | `--color-text-soft` | 實線 |
| `GHOST` | 條件性節點（僅特定執行類型出現） | `--color-ink` @ 5% | `--color-ink-muted` | 虛線 |
| `TERMINAL` | 終態（唯讀） | `--color-primary-soft-bg` | `--color-primary` | 實線 |
| `DECISION` | 判斷節點 | 同 `SYSTEM` | 同 `SYSTEM` | 形狀改 `DIAMOND` |

連線色：`MAIN`／`COND` 用 `--color-text-soft`，`ACCENT` 用 `--color-primary`。畫布底色 `--color-surface`。

`--color-ink` @ 5% 是既有圖源用的推導值（SVG 寫作 `#1E1B4B0D`），不是新色票——用 fill 的 `opacity: 0.05` 表達，不要硬編一個新 hex。

### 1.2 SVG → Figma 座標換算

```
local = 2 · svg + 標題區偏移
```

- 比例固定 **2×**：SVG 的 12px 標題在 Figma 縮到 100% 時太小，2× 後對應 24px／副行 16px
- `標題區偏移` 是每個 Section 頂部標題帶的高度，一個 Section 設一次常數，不要逐節點微調
- **⚠ 純 2× 會撞到尺寸下限**：SVG 常見的 152×48 節點 ×2 只有 304×96，低於 §3.4 的 520×128。作法是**先把所有節點鉗到下限，再等比拉開節點間距**，不要只放大節點而不放大間距——那會讓相鄰節點黏死

## 2. 驗收節奏（強制）

**每建完一「層」截一次圖，不得全部建完才驗。** 四層順序固定：

1. 節點（含尺寸、填色、文字）
2. 連線（含磁吸點走向）
3. 標註（連線標籤、泳道標籤、編輯性引文）
4. 圖例與底部對照表

截圖驗收無法消除——那是這件事的本質。前置好尺寸下限與座標規則後，預期可把 8 輪壓到 3–4 輪。每輪成本是 `get_screenshot` → `curl` → 讀圖三次呼叫且都是高 token 影像讀取，所以**寧可一次多建一整層，也不要一個節點驗一次**。

## 3. FigJam 模式（已實證）

證據來源：board `ngCyaOirtKoU2XiFrO6NaC`，三個 Section（`11:2` / `17:62` / `21:110`），2026-08-26 建成。

### 3.1 覆寫上游文件錯誤

`figma-use-figjam` 宣告下列 API 為 design-mode only，**實測在 FigJam 全部可用**：

- `figma.createRectangle()` — 泳道分隔線底襯、圖例色塊、標籤遮罩都靠它
- `figma.createLine()` — 泳道分隔線
- `figma.createFrame()`
- `figma.createVector()`
- 巢狀 `Section`

2026-08-26 用 §4.1 的同一支探測腳本在 board `X9FrC1vXYbdNQU6agmGYsF` 覆驗：十種 create API **10/10 全部 `OK`**，含上述四支。

照上游文件走只能產出降級版（無泳道分隔線、無圖例色塊、無虛線 ghost 框）。**以本文件為準。**

### 3.2 兩套座標系（最容易踩的雷）

- `node.x` / `node.y` 讀寫的是 **section-local** 座標（節點已 `appendChild` 進 Section 時）
- Connector 的 `position` 端點吃 **page 絕對座標**

Section 不在 `(0,0)` 時，凡是寫 `position` 端點都必須自己補 `sec.x + localX`：

```js
const abs = (sec, x, y) => ({ x: sec.x + x, y: sec.y + y });
```

另外兩條：

- **浮動連線不會自動進 Section**。建完 Connector 必須 `sec.appendChild(c)`，否則 section 截圖涵蓋不到它，你會對著一張沒有連線的圖除錯
- **`connector.text.fontName` 新建時是無效值**。設 `characters` 前必須先指定 `fontName`，否則丟錯

### 3.3 `ShapeWithText.text` 是 `TextSublayerNode`

支援 `setRangeFontSize` / `setRangeFontName` / `setRangeFills`，因此**單一 shape 內就能做標題＋副行雙字階，省掉一半節點數**——不要為了副行另建 Text 節點再手動對齊。

### 3.4 尺寸下限表（實測）

| 對象 | 下限 | 條件 |
|---|---|---|
| `ROUNDED_RECTANGLE` | **520 × 128** | 8 字標題 ＋ 一行副行 |
| `DIAMOND` | **480 × 240** | 8 字標題 ＋ 一行副行 |
| 分支標籤兩側水平間距 | **≥ 140 px** | 判斷節點左右分歧標籤 |

低於下限文字會被內距裁切，且截圖上看起來只是「有點擠」，很容易漏掉。**寧可超過下限。**

### 3.5 Helper 函式庫

`use_figma` 呼叫間**不共享狀態**，每次呼叫都要整段重貼——這砍不掉。以下是可整段複製的原文：

> **狀態：已逐行回歸（2026-08-26，board `X9FrC1vXYbdNQU6agmGYsF`）。** `mkNode` × 3（`SYSTEM` 雙字階／`DIAMOND` 雙字階／`TERMINAL` 無副行）＋ `link` × 2（`MAIN`／`ACCENT`，皆帶標籤）五步全通、零錯誤。以 `getStyledTextSegments` 驗回雙字階實際落地為兩段——`24px Semi Bold #1E1B4B` ＋ `16px Regular #64748B`，與 §1.1 的 token 逐位元相符；兩條 connector 的 `characters` 與 `ELBOWED` 皆正確且 `parent` 確實是 Section。

```js
// ── 常數：hex 讀自 tokens.css，見 §1.1 ──────────────────────
const INK = "#1E1B4B", SOFT = "#64748B", MUTED = "#94A3B8";
const WHITE = "#FFFFFF", PRIMARY = "#6366F1", PRIMARY_BG = "#EEF2FF";

const FONT_T = { family: "Inter", style: "Semi Bold" };
const FONT_S = { family: "Inter", style: "Regular" };

const ROLE = {
  HUMAN:    { fill: WHITE,      op: 1,    stroke: INK },
  SYSTEM:   { fill: INK,        op: 0.05, stroke: SOFT },
  GHOST:    { fill: INK,        op: 0.05, stroke: MUTED, dashed: true },
  TERMINAL: { fill: PRIMARY_BG, op: 1,    stroke: PRIMARY },
  DECISION: { fill: INK,        op: 0.05, stroke: SOFT },
};

const MIN = {
  ROUNDED_RECTANGLE: { w: 520, h: 128 },
  DIAMOND:           { w: 480, h: 240 },
};

// ── h(): 字型預載。任何 setCharacters 之前必須先跑 ──────────
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

// ── mkNode(): 節點 + 單一 shape 雙字階 ──────────────────────
function mkNode(sec, o) {
  const s = figma.createShapeWithText();
  s.shapeType = o.shape || "ROUNDED_RECTANGLE";
  const m = MIN[s.shapeType] || { w: 0, h: 0 };
  s.resize(Math.max(o.w, m.w), Math.max(o.h, m.h));   // 鉗到下限，見 §3.4
  sec.appendChild(s);                                  // 先 append，x/y 才是 section-local
  s.x = o.x; s.y = o.y;

  const r = ROLE[o.role];
  s.fills = solid(r.fill, r.op);
  s.strokes = solid(r.stroke);
  s.strokeWeight = 1;
  if (r.dashed) s.dashPattern = [8, 6];

  s.text.fontName = FONT_T;                            // 設 characters 前先指定
  s.text.characters = o.sub ? `${o.title}\n${o.sub}` : o.title;
  const n = o.title.length, end = s.text.characters.length;
  s.text.setRangeFontName(0, n, FONT_T);
  s.text.setRangeFontSize(0, n, 24);
  s.text.setRangeFills(0, n, solid(INK));
  if (o.sub) {
    s.text.setRangeFontName(n + 1, end, FONT_S);
    s.text.setRangeFontSize(n + 1, end, 16);
    s.text.setRangeFills(n + 1, end, solid(SOFT));
  }
  return s;
}

// ── link(): 連線。磁吸端點優先，position 端點必用 abs() ─────
function link(sec, a, b, o = {}) {
  const c = figma.createConnector();
  c.connectorStart = { endpointNodeId: a.id, magnet: o.from || "AUTO" };
  c.connectorEnd   = { endpointNodeId: b.id, magnet: o.to   || "AUTO" };
  c.connectorLineType = "ELBOWED";
  const accent = o.style === "ACCENT";
  c.strokes = solid(accent ? PRIMARY : SOFT);
  c.strokeWeight = accent ? 1.4 : 1.2;
  if (o.style === "COND") c.dashPattern = [8, 6];
  if (o.label) {
    c.text.fontName = FONT_S;                          // 新建時是無效值，必須先設
    c.text.characters = o.label;
    c.text.fontSize = 16;
    c.text.fills = solid(accent ? PRIMARY : SOFT);
  }
  sec.appendChild(c);                                  // 不 append 就不進 section 截圖
  return c;
}

// ── text(): 泳道標籤、引文、對照表欄位 ──────────────────────
function text(sec, x, y, str, o = {}) {
  const t = figma.createText();
  t.fontName = o.font || FONT_S;
  t.characters = str;
  t.fontSize = o.size || 16;
  t.fills = solid(o.color || SOFT);
  if (o.spacing) t.letterSpacing = { unit: "PIXELS", value: o.spacing };
  sec.appendChild(t);
  t.x = x; t.y = y;
  return t;
}

// ── rect(): 泳道分隔線、圖例色塊（上游宣稱不可用，實測可用）─
function rect(sec, x, y, w, h, o = {}) {
  const r = figma.createRectangle();
  r.resize(w, h);
  sec.appendChild(r);
  r.x = x; r.y = y;
  r.fills = o.fill ? solid(o.fill, o.op == null ? 1 : o.op) : [];
  r.strokes = o.stroke ? solid(o.stroke) : [];
  r.strokeWeight = o.weight || 1;
  if (o.radius) r.cornerRadius = o.radius;
  if (o.dashed) r.dashPattern = [6, 4];
  return r;
}

// ── pill(): 連線標籤的底色遮罩（避免壓在分隔線上）──────────
function pill(sec, x, y, str, o = {}) {
  const t = text(sec, x + 8, y + 4, str, { size: o.size || 14, color: o.color || SOFT });
  const bg = rect(sec, x, y, t.width + 16, t.height + 8,
                  { fill: o.bg || "#F5F3FF", radius: 4 });
  sec.appendChild(bg); sec.appendChild(t);   // bg 先、t 後 → t 在上層
  return { bg, t };
}
```

## 4. Design 模式（已實證）

證據來源：Design file `xWvoreTTZhY5KSgBCyEVwc`，與 §3 同一份三節點 IR，2026-08-26 建成並截圖比對。

### 4.1 能力探測

換一個沒跑過的 Design file 時重跑一次即可；`figma` mode 的結果已載於 §4.2。

```js
const probe = {};
for (const [k, f] of Object.entries({
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
  try { const n = f(); probe[k] = "OK"; n.remove(); }
  catch (e) { probe[k] = String((e && e.message) || e); }
}
return { editorType: figma.editorType, probe };
```

**實測結果**（2026-08-26，兩種 mode 同一支腳本）：

| API | Design (`figma`) | FigJam (`figjam`) |
|---|---|---|
| `ShapeWithText` / `Connector` / `Sticky` / `CodeBlock` | ❌ `no such property` | ✅ OK |
| `Section` / `Frame` / `Rectangle` / `Line` / `Vector` / `Text` | ✅ OK | ✅ OK |

那四支在 Design mode 是 **`figma` 全域物件上根本沒有這個 property**，不是執行期權限拒絕——`typeof figma.createConnector === "undefined"`，所以功能偵測要測 property 是否存在，不要靠 try/catch 接執行期錯誤。

### 4.2 節點與連線表示法（已實證）

| 對象 | FigJam | Design |
|---|---|---|
| 節點 | `ShapeWithText` | `figma.createAutoLayout("VERTICAL")` + padding，內含標題／副行兩個 Text 子節點 |
| 連線 | `Connector`（原生磁吸） | `createVector()` + `setVectorNetworkAsync()`，端點自行計算 |
| 連線標籤 | `connector.text` | 獨立 Text + `rect()` 遮罩（同 `pill()`） |
| 判斷節點 | `DIAMOND` shapeType | `createVector()` 菱形路徑 + 另一個置中的文字 frame |

三點實測補充：

- **用 `figma.createAutoLayout("VERTICAL")`，不要 `createFrame()` + 手設 `layoutMode`。** 前者建出來就是兩軸 hug，省掉 `primaryAxisSizingMode` / `counterAxisSizingMode` 的設定順序雷（官方 `figma-use` 規則 12b：`layoutSizing*` 與 `*AxisSizingMode` 是兩組不同的 enum，交叉使用會丟錯）。
- **菱形兩種作法都可行，本文件採 Vector 路徑。** 原提案的「正方 frame `rotation = 45` + 內文反向 −45」實測**成立**（auto-layout frame 可旋轉，其子節點也能獨立設 `rotation = -45`）。改採 Vector 是因為菱形長寬比要能獨立於內文調整，旋轉法會把兩者綁死。若採旋轉法，**務必記得把子節點的 rotation 也還原**——只還原 frame 會留下一個斜的標題，且截圖上很像字型問題。
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
  v.strokeWeight = accent ? 1.4 : 1.2;
  v.fills = [];            // vector 預設有 fill，不清掉線條會被填成一片
  return v;
}
```

### 4.2.1 畫布底色必須顯式設定

**Design file 的預設畫布是深色，FigJam 不是。** 沿用 §1.1 的角色表（`SYSTEM` 是 `--color-ink` @ 5%、標題是 `--color-ink`）而不動背景，深藍文字會落在深底上近乎不可讀，且截圖看起來像是填色沒生效。每次建圖第一支腳本就設：

```js
figma.currentPage.backgrounds = solid("#F5F3FF");   // --color-surface
```

**採 auto-layout 承載節點內文**：FigJam 的文字內距裁切問題（§3.4 尺寸下限的成因）在 auto-layout 下由 `paddingLeft/Right/Top/Bottom` + `primaryAxisSizingMode = "AUTO"` 直接解掉，節點高度隨內容長。因此 Design 模式**不沿用 §3.4 的固定下限**，改設最小寬度＋內距，高度交給 auto-layout。

### 4.3 取捨決策：Design 模式定位為「靜態高保真交付」

Design file 沒有原生 Connector，**連線不會跟隨節點移動**。兩條路：

| 選項 | 成本 | 結論 |
|---|---|---|
| A. 定位為靜態高保真稿 | 低 | ✅ **採用** |
| B. 另建連線重算腳本 | 高（要維護 layout solver） | ❌ 不做 |

**決策**：Design 模式產出的是**交付用靜態高保真稿**——排版定稿後才移植，移植後不在 Figma 內搬節點。需要邊畫邊調位置的探索階段，一律用 FigJam。若日後 Design 稿確實需要反覆搬移，再回頭評估 B，不預先建設。

### 4.4 尺寸下限表（實測）

**結論：Design 模式沒有尺寸下限，不要設。** §3.4 那組 520×128 / 480×240 是 FigJam 的文字內距裁切補償，在 auto-layout 下成因已消失——把尺寸交給 hug，內容多高節點就多高。

量測條件：`paddingLeft/Right = 32`、`paddingTop/Bottom = 24`、`itemSpacing = 8`、標題 `Inter Semi Bold 24`、副行 `Inter Regular 16`。

| 節點（同 §3 那份 IR） | hug 尺寸 | 對照：FigJam 下限 |
|---|---|---|
| `審核單位` ＋ 13 字副行 | **248 × 104** | 520 × 128 |
| `票數判定` ＋ 8 字副行 | **180 × 104** | 520 × 128 |
| `定稿`（無副行） | **112 × 77** | 520 × 128 |

**高度可精確預測**，兩次量測完全一致：

```
H = 2·paddingY + titleH + (sub ? itemSpacing + subH : 0)
  有副行：24 + 29 + 8 + 19 + 24 = 104
  無副行：24 + 29 + 24           = 77
```

其中 `titleH = 29`（24px Semi Bold 單行）、`subH = 19`（16px Regular 單行）。

**寬度不要拿來做精確對齊。** `W = 2·paddingX + max(titleW, subW)` 大方向成立，但同一節點兩次量到 247／248、114／112——文字量測有次像素捨入，會漂 ±2px。需要多節點左右對齊或等寬欄位時，設固定寬度（`layoutSizingHorizontal = "FIXED"` + `resize()`）再讓高度 hug，不要靠兩軸都 hug 去湊齊。

**菱形另計。** 菱形的可用內接矩形只有外框的一半，所以 `W ≥ 2 × 文字寬`、`H ≥ 2 × 文字高`，再留邊距。實測 **360 × 200** 承載 116 × 56 的文字堆疊（`票數判定` ＋ `是否達 N/2 門檻`）視覺寬鬆、無裁切。

## 5. 字型現況（實測，2026-08-26）

| 字型 | 限制 | 後果 |
|---|---|---|
| `Noto Serif TC` | **無 Italic** | 原圖的編輯性引文（`Crimson Pro` italic + 中文）在 Figma 只能退回 Regular |
| `JetBrains Mono` | **無中文字** | 中文副行／標籤不能用 mono，會掉字；改用 `Inter` + `Noto Sans TC` |

這兩處是 2026-08-26 那版與原 SVG 唯一的視覺偏差來源。移植時**先確認目標字型有沒有你要的 style**，不要等截圖才發現。

## 6. 驗收清單

- [ ] editor mode 已確認，走對 §3／§4
- [ ] 節點清單／連線清單先寫完才開第一次 `use_figma`
- [ ] 色值讀自 `tokens.css`，skill 內沒有另一份色票
- [ ] 腳本用 `return` 輸出，沒有靠 `console.log`
- [ ] Design 模式已設 `figma.currentPage.backgrounds`（預設深色，見 §4.2.1）
- [ ] 每建完一層截一次圖（節點 → 連線 → 標註 → 圖例）
- [ ] FigJam 節點尺寸 ≥ §3.4 下限；Design 節點交給 auto-layout hug（§4.4）；無文字裁切
- [ ] 無節點重疊；分支標籤兩側水平間距 ≥ 140px
- [ ] 連線走向正確，且都已 `appendChild` 進 Section
- [ ] 同一份 IR 在 FigJam 與 Design 各產一張，截圖比對無裁切／無重疊／走向一致

## 附註

- **放專案內而非全域**：樣式角色引用 Label Suite 的 design token 與 `label-suite` diagram profile，引用鏈只在本 repo 成立。
- **不併進 `diagram-design`**：該 skill 產出 HTML/SVG，觸發情境不同；合併會讓做網頁圖時白白載入大量 Plugin API 細節。
- 相關：issue #475（本 skill）、#465（diagram-design 導入）；圖源 `docs/diagrams/workflow/review-flow-{overview,dry-run,official-run}.html`；上游 `figma-use` / `figma-use-figjam`（Figma plugin 2.2.96）。
