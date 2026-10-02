# Design — work-log 日期區間選擇器（issue #1101）

## D1. 共用元件契約（`design/prototype/pages/shared/date-range-picker.js`）

沿用 `sidebar.js` 的 vanilla IIFE 風格，掛載全域 `window.DateRangePicker`：

```js
var handle = window.DateRangePicker.mount(triggerEl, {
  value: { from: '2026-04-19', to: '2026-04-20' } /* or { from: null, to: null } */,
  lang: 'zh' /* 'zh' | 'en' */,
  onChange: function (range) { /* { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } or { from: null, to: null } */ }
});
handle.setLang('en');
handle.setValue({ from: null, to: null });
handle.destroy();
```

- `onChange` 只在「完整區間」或「清除」時觸發；只選起點時絕不觸發。
- `mount` 不預設建立 DOM 以外的全域狀態；可在同一頁掛載多個獨立實例。

## D2. Markup 契約

Trigger（呼叫端提供，元件只讀取/寫入，不自行建立）：

```html
<button type="button" class="date-range-trigger" id="<триggerId>"
        aria-haspopup="dialog" aria-expanded="false" aria-controls="<triggerId>Popover">
  <span class="date-range-trigger-text">YYYY-MM-DD ～ YYYY-MM-DD</span>
</button>
```

未選取時 `.date-range-trigger-text` 顯示 placeholder（zh：`選擇日期區間`；en：`Select date range`）。

Popover（元件建立，append 於 trigger 之後，預設 `hidden`）：

```html
<div class="date-range-popover" id="<triggerId>Popover" role="dialog" aria-modal="false"
     aria-label="選擇日期區間" hidden>
  <div class="date-range-popover-header">
    <button type="button" class="date-range-nav-prev" aria-label="上個月">‹</button>
    <span class="date-range-month-label">2026年4月</span>
    <button type="button" class="date-range-nav-next" aria-label="下個月">›</button>
  </div>
  <table class="date-range-grid" role="grid">
    <!-- <button class="date-range-day" data-date="2026-04-19" tabindex="-1|0"> -->
  </table>
  <div class="date-range-popover-footer">
    <button type="button" class="date-range-clear">清除</button>
  </div>
</div>
```

Day 按鈕狀態 class：`is-range-start`、`is-range-end`、`is-in-range`、`is-today`；起訖日同時具備 `is-range-start` 與 `is-range-end`（同日區間）。被選取的起訖日 `aria-selected="true"`。

## D3. 互動規則

1. **開啟**：點擊 trigger 或於其上按 Enter/Space 開啟 popover，`aria-expanded` 同步為 `true`；開啟時第一個可聚焦日期（已選起點或當月 1 日）取得 `tabindex="0"` 並接收焦點。
2. **選取**：點擊或 Enter/Space 選取聚焦中的日期。第一次點擊設為暫定起點（`is-range-start`）；第二次點擊設為終點。若終點早於暫定起點，正規化為 `from = min, to = max`（反向點選）。選取到終點後立即觸發 `onChange({from, to})` 並關閉 popover、焦點送回 trigger；若只完成起點，popover 保持開啟，不觸發 `onChange`。
3. **鍵盤方向**：左右方向鍵移動聚焦日期 ±1 天；上下方向鍵 ±7 天；跨月自動翻頁並重繪日曆網格；roving tabindex（僅聚焦日期 `tabindex="0"`，其餘 `-1"`）。
4. **Esc**：關閉 popover，捨棄尚未完成的暫定起點（還原為開啟前的已提交值），焦點送回 trigger，不觸發 `onChange`。
5. **清除**：點擊「清除」把已提交值與暫定選取一併清空，觸發一次 `onChange({from: null, to: null})`，關閉 popover，焦點送回 trigger。
6. **月份導覽**：上一月／下一月按鈕只重繪月曆，不影響已提交或暫定的選取。
7. **高亮**：起訖之間（不含起訖本身，起訖本身另有 `is-range-start`/`is-range-end`）的日期套用 `is-in-range`；同日區間時單一日期同時具 `is-range-start`、`is-range-end`，不套用 `is-in-range`。
8. **RWD**：popover 預設以 `position: absolute` 貼齊 trigger 左緣；若 `triggerRect.left + popoverWidth > window.innerWidth`，改貼齊右緣（`right: 0`）。CSS 另以 `max-width: min(320px, calc(100vw - 32px))` 保底，確保 375px viewport 不產生水平溢出。

## D4. 與 `work-log.html` / `task-detail.html` 整合契約（Group B）

- `work-log.html` 的兩個獨立欄位（`#workLogDateFrom`、`#workLogDateTo` 與其 wrapper）整段替換為一個 `date-range-field` 容器，內含 trigger `id="workLogDateRangeTrigger"`。
- `task-detail.html`：
  - `state.workLogDateFrom`／`state.workLogDateTo` 兩個既有欄位**不變**，繼續是唯一的篩選來源與 `wl_from`／`wl_to` URL mapping 的讀寫對象（FR-019 不變）。
  - render 時以 `window.DateRangePicker.mount()` 掛載一次（冪等：重複 render 需先 `destroy()` 舊 handle 或改走 `setValue`/`setLang`，避免重複綁定事件），`value` 來自 `state.workLogDateFrom`/`state.workLogDateTo`（任一為空即視為開放式區間的那一端為 `null`）。
  - `onChange` callback 把 `range.from`/`range.to`（可能為 `null`）寫回 `state.workLogDateFrom`/`state.workLogDateTo`（`null` 正規化為 `''`，與既有欄位的空字串語意一致），並呼叫既有的「篩選變更」路徑（沿用現有 `change` listener 內部邏輯：重算篩選結果、`wlPage` 重設為第 1 頁、`history.replaceState()` 寫回 `wl_from`/`wl_to`）。
  - 單邊網址（只有 `wl_from` 或只有 `wl_to`）：掛載時以 `{from: state.workLogDateFrom || null, to: state.workLogDateTo || null}` 傳入，元件須能顯示「只有起點」或「只有終點」的開放式區間（trigger 文字與日曆高亮各自處理單邊情形，例如只顯示已知一端、另一端顯示提示符號，如 `2026-04-19 ～ 不限`）。
  - `switchLang()` 既有流程需呼叫 `handle.setLang(lang)` 同步元件語言。
  - i18n 新增鍵（補入既有 zh/en 字典，命名沿用現有慣例）：`workLogDateRangeLabel`（篩選列欄位標籤，取代 `workLogDateFromLabel`/`workLogDateToLabel`）、`workLogDateRangePlaceholder`（取代 `workLogDatePlaceholder`）。

## D5. 測試分組與既有測試更新

- `tests/task-management/task-detail-work-log-i18n.spec.ts`：原斷言兩個 `type="date"` input 改為斷言單一 `#workLogDateRangeTrigger` 文案（zh／en）。
- `tests/task-management/issue-726-url-view-state.spec.ts`：原本透過 `#workLogDateFrom` `.fill()` 寫入 `wl_from` 的用例，改為透過日曆互動（開啟 popover → 選取日期 → 完成區間）觸發 `wl_from`/`wl_to` 寫回；斷言內容（URL 參數值）不變。

## D6. 拆分理由（Principle X）

Group A（共用元件 + showcase，3 檔）與 Group B（work-log 整合 + 正典回寫，2 檔）分屬不同產品檔案、不同關注點（可重用元件 vs. 功能整合），且 Group B 依賴 Group A 已合併的元件路徑，天然構成兩個序列相依但各自獨立可審查的 PR。
