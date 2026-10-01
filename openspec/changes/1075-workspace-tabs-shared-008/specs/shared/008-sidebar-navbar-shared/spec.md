# Spec Delta

## ADDED Requirements

### Requirement: FR-022 關閉作用中頁籤焦點移動規則

共用 Sidebar 殼層掛載之工作頁籤列（行為定義見 `specs/shared/019-workspace-tabs/spec.md`），關閉作用中頁籤後，焦點 MUST 依下列規則移動：

1. 若被關閉之作用中頁籤並非最右側頁籤，焦點 MUST 移至其右鄰頁籤。
2. 若被關閉之作用中頁籤為最右側頁籤，焦點 MUST 移至其左鄰頁籤。
3. 若關閉後已無任何頁籤，則無頁籤可移焦，頁籤列呈現空狀態。
4. 此規則僅適用於**作用中**頁籤之關閉；關閉非作用中頁籤 MUST NOT 觸發任何焦點或導頁變化，僅更新頁籤列自身渲染（定義見 `specs/shared/019-workspace-tabs/spec.md` 既有行為，本條不重複）。

#### Scenario: AC-022.1 關閉中間或最左側作用中頁籤時焦點移至右鄰
- **GIVEN** 已開啟 3 個以上頁籤，目前作用中頁籤非最右側
- **WHEN** 使用者關閉該作用中頁籤
- **THEN** 焦點（系統導頁至該頁籤之網址）必須移至原本緊鄰其右側的頁籤

#### Scenario: AC-022.2 關閉最右側作用中頁籤時焦點移至左鄰
- **GIVEN** 已開啟 2 個以上頁籤，目前作用中頁籤為最右側
- **WHEN** 使用者關閉該作用中頁籤
- **THEN** 焦點必須移至原本緊鄰其左側的頁籤

### Requirement: FR-016H 快捷鍵總覽新增頁籤 section

Desktop 快捷鍵總覽 modal（FR-016 群既有入口與顯示規則）MUST 新增一個獨立的「頁籤」section，列出下列兩個快捷鍵，各自獨立成列（依既有 FR-016E 不合併列規則）、各按鍵以獨立 keycap 呈現（依既有 FR-016C）、採既有緊湊視覺密度（依既有 FR-016F）：

1. `Alt+1…8`（切換至對應位置頁籤）。
2. `Alt+W`（關閉作用中頁籤）。

此二快捷鍵之實際觸發行為、按鍵位置判斷方式（`event.code`），以及焦點位於可輸入元素時之抑制規則，MUST 由 `specs/shared/019-workspace-tabs/spec.md` FR-013／AC-5.1 至 AC-5.4 定義；本條僅規範快捷鍵總覽之顯示內容與格式，不重複定義其觸發行為。

#### Scenario: AC-016H.1 快捷鍵總覽顯示頁籤 section 兩列
- **GIVEN** viewport `> MOBILE_BP`，使用者開啟快捷鍵總覽（點擊 keyboard icon 或按 `?`）
- **WHEN** 檢視 modal 內容
- **THEN** 必須存在一個「頁籤」section，內含恰兩列：「切換至對應位置頁籤」（鍵位標示含 `ALT` 與代表 1 至 8 之鍵位）與「關閉作用中頁籤」（`ALT`＋`W` 兩個獨立 keycap）

#### Scenario: AC-016H.2 頁籤 section 隨語言切換同步翻譯
- **GIVEN** 快捷鍵總覽已開啟
- **WHEN** 使用者切換 zh/en
- **THEN** 「頁籤」section 標題與兩列動作文字必須同步切換為對應語系，與既有「全域」「標記作業」「審核」三個 section 之既有語言切換行為一致
