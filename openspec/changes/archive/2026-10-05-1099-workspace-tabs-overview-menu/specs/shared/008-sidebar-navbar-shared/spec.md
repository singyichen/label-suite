# Spec Delta

## MODIFIED Requirements

### Requirement: FR-016H 快捷鍵總覽新增頁籤 section

Desktop 快捷鍵總覽 modal（本規格 `specs/shared/008-sidebar-navbar-shared/spec.md` 既有 FR-016 群入口與顯示規則）MUST 提供一個獨立的「頁籤」section，列出下列三個快捷鍵，各自獨立成列（依既有 FR-016E 不合併列規則）、各按鍵以獨立 keycap 呈現（依既有 FR-016C）、採既有緊湊視覺密度（依既有 FR-016F）：

1. `Alt+1…8`（切換至對應位置頁籤）。
2. `Alt+W`（關閉作用中頁籤）。
3. `Alt+Shift+T`（重開剛關閉的頁籤）。

前兩項快捷鍵之實際觸發行為、按鍵位置判斷方式（`event.code`），以及焦點位於可輸入元素時之抑制規則，MUST 由 `specs/shared/019-workspace-tabs/spec.md` FR-013／AC-5.1 至 AC-5.4 定義；第三項（重開剛關閉的頁籤）之觸發行為、按鍵位置判斷方式與輸入元素抑制規則，MUST 由 `specs/shared/019-workspace-tabs/spec.md` FR-024A／AC-024A.1／AC-024A.2 定義。本條僅規範快捷鍵總覽之顯示內容與格式，不重複定義任一快捷鍵之觸發行為。

#### Scenario: AC-016H.1 快捷鍵總覽顯示頁籤 section 兩列
- **GIVEN** viewport `> MOBILE_BP`，使用者開啟快捷鍵總覽（點擊 keyboard icon 或按 `?`）
- **WHEN** 檢視 modal 內容
- **THEN** 必須存在一個「頁籤」section，其中包含以下兩列：「切換至對應位置頁籤」（鍵位標示含 `ALT` 與代表 1 至 8 之鍵位）與「關閉作用中頁籤」（`ALT`＋`W` 兩個獨立 keycap）——本情境不斷言 section 列數上限，列數上限與第三列由 `AC-016H.3` 定義

#### Scenario: AC-016H.2 頁籤 section 隨語言切換同步翻譯
- **GIVEN** 快捷鍵總覽已開啟
- **WHEN** 使用者切換 zh/en
- **THEN** 「頁籤」section 標題與三列動作文字必須同步切換為對應語系，與既有「全域」「標記作業」「審核」三個 section 之既有語言切換行為一致

#### Scenario: AC-016H.3 頁籤 section 恰三列且重開快捷鍵列以三個獨立 keycap 呈現
- **GIVEN** 快捷鍵總覽之「頁籤」section 已顯示
- **WHEN** 計算該 section 之列數，並檢視「重開剛關閉的頁籤」該列
- **THEN** section 內恰三列（不多不少）；「重開剛關閉的頁籤」列之 `ALT`、`SHIFT`、`T` 三個按鍵標籤各自為獨立 DOM 元素，不得合併為單一文字字串，複合按鍵間距依既有 FR-016F 規則
