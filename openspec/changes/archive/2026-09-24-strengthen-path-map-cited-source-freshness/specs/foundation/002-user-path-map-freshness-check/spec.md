## Purpose

強化 User Path Map Freshness Check 的判定來源集合（GitHub issue #906）。Stage 2 的 screen-list fingerprint 只證明畫面／視圖 ID 清單未變，因此不增減 ID 的 prototype 行為修正會讓 `design/system/user-path-map.html` 的內文悄悄失準而 checker 仍回報 fresh。本 change 在 Stage 2 之後新增 Stage 3：以路徑圖自己指名的來源即時重算它自己陳述的宣稱，仍不引入 git revision、mtime、日期或任何時間戳。

## MODIFIED Requirements

### Requirement: FR-004～FR-007、SC-003～SC-004 — #645 後的 authoritative freshness 判定（2026-09-18 amendment：screen-list fingerprint model）

#645 已合併 `design/system/user-path-map.html`；2026-09-18 design amendment 依維護者裁定，將 recorded metadata 定義為 screen-list fingerprint（`design/system/screen-inventory.md` 的畫面／視圖 ID 清單雜湊），而非 git revision。系統 MUST 從 `design/system/user-path-map.html` 的 `<head>` 讀取唯一 `<meta name="path-map-screen-fingerprint" content="sha256:<64 碼小寫 hex>">`，並與依 screen-inventory.md 即時重算的 sha256 fingerprint 逐位元比較；相符為 Stage 2 fresh，不符為 stale 且 MUST 立即以 exit `1` 結束而不進行後續判定。

2026-09-24 amendment（GitHub issue #906）：Stage 2 相符僅證明畫面／視圖 ID 清單未變，不證明路徑圖內文仍成立。系統 MUST 在 Stage 2 相符後額外監看「`design/system/user-path-map.html` 內文自己指名的來源」，判準 MUST 且只包含下列兩族，且 MUST 全部由被指名的來源即時重算：(1) 內文中的 `<檔案>:<行號>` 引用 MUST 仍能解析到實際檔案，且行號 MUST 仍在該檔行數範圍內；(2) 內文以 `grep` 命令為證據所陳述的計數（`<檔案> = <n>`、`<目錄>/ → <n> 行`）MUST 仍能被重算重現。系統 MUST NOT 使用 git revision、file mtime、固定日期或任何時間戳作為判準，MUST NOT 讀取單一 fingerprint meta 以外的記錄值，也 MUST NOT 在任一判準無法解析時退回猜測。系統 MUST 區分 fresh、stale 與無法判斷（metadata／inventory 缺漏、重複、格式錯誤、無法解析，或宣稱無法解析）。

#### Scenario: AC-2.1 authoritative fresh

- **GIVEN** `design/system/user-path-map.html` `<head>` 的 `path-map-screen-fingerprint` meta 與依 `design/system/screen-inventory.md` 目前畫面／視圖 ID 清單即時重算的 sha256 fingerprint 相符
- **WHEN** 執行 checker
- **THEN** command 以 exit `0` 結束並回報 fresh（`PATH_MAP_FRESH`）

#### Scenario: AC-2.2 screen-list fingerprint mismatch 觸發 stale

- **GIVEN** `design/system/screen-inventory.md` 目前的畫面或視圖 ID 清單改變，使即時重算的 fingerprint 與 `<meta>` 記錄值不同
- **WHEN** 執行 checker
- **THEN** command 以 exit `1` 結束（`PATH_MAP_STALE_FINGERPRINT`），並指出需依 #645 流程重新實走並更新 `<meta>` 值；診斷同時印出記錄值與即時重算的 `sha256:<hex>`
- **AND GIVEN** fingerprint 相符，但路徑圖內文的某個 `<檔案>:<行號>` 引用已無法解析到檔案，或行號已超出該檔行數範圍
- **WHEN** 執行 checker
- **THEN** command 以 exit `1` 結束（`PATH_MAP_CITATION_UNRESOLVED`），並指出該引用與失效原因
- **AND GIVEN** fingerprint 相符，但路徑圖內文以 `grep` 為證據所陳述的某個計數，經由被指名來源即時重算後與陳述值不同
- **WHEN** 執行 checker
- **THEN** command 以 exit `1` 結束（`PATH_MAP_CLAIM_COUNT_MISMATCH`），並同時印出陳述值與重算值

#### Scenario: AC-2.3（Retired — 併入 AC-2.2，原文保留供追溯）

> 2026-09-18 amendment：fingerprint 模型下不再區分「prototype 觸發」與「screen inventory 觸發」兩種 stale——兩者都只透過 screen-inventory.md 的同一份 ID 清單反映，已收斂為單一 AC-2.2。以下為 amendment 前原始草案文字，保留供追溯，不再獨立實作。

- **GIVEN** recorded revision 之後，`design/system/screen-inventory.md` 依核准規則有較新變更
- **WHEN** 執行 checker
- **THEN** command 以 exit `1` 結束，並指出 screen inventory 觸發 stale

#### Scenario: AC-2.4 metadata 或 inventory 不可判斷

- **GIVEN** `path-map-screen-fingerprint` meta 缺漏、出現 2 次以上、`content` 不符 `sha256:[0-9a-f]{64}` 格式，或 `design/system/screen-inventory.md` 缺少可解析的畫面／視圖 ID 表格
- **WHEN** 執行 checker
- **THEN** command 以 exit `2` 結束並說明 configuration 原因（`PATH_MAP_META_MISSING`／`PATH_MAP_META_DUPLICATE`／`PATH_MAP_META_MALFORMED`／`PATH_MAP_INVENTORY_UNREADABLE`），不回報 fresh 或 stale
- **AND GIVEN** 路徑圖內文寫出 `grep` 命令，但未附帶可重算的計數，或該宣稱的目標無法解析為唯一檔案或目錄
- **WHEN** 執行 checker
- **THEN** command 以 exit `2` 結束並說明 configuration 原因（`PATH_MAP_CLAIM_UNDECIDABLE`），不回報 fresh 或 stale

#### Scenario: AC-2.5 不相關內容 negative control

- **GIVEN** 只有受監看來源之外的內容發生變更，亦即該變更未增減任何畫面／視圖 ID，且未觸及路徑圖內文任何 `<檔案>:<行號>` 引用或任何 `grep` 計數宣稱
- **WHEN** 執行 checker
- **THEN** checker 不得僅因此判為 stale

#### Scenario: SC-003 Stage 2 design amendment 完整

- **GIVEN** #645 已合併
- **WHEN** Stage 2 開始前複核 design
- **THEN** 七個 open decisions 全部已有可測試的核准結論（2026-09-18 amendment 已完成此項），OpenSpec schema validation 與 Project SDD lint 重新通過，且使用者已明確確認

#### Scenario: SC-004 committed Stage 2 Red／Green

- **GIVEN** QA 已提交 authoritative fixture Red
- **WHEN** 主 session 驗證 foundation checker 因尚未實作核准語意而失敗，再派 paired Green
- **THEN** fresh、stale（fingerprint mismatch）、invalid metadata／inventory、unmonitored-content negative control，以及 Stage 3 的引用失效、計數不符、無法判斷與「fingerprint mismatch 優先於 Stage 3」全數通過，且真實 repository checker exit `0`
