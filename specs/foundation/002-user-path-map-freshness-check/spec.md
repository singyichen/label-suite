---
功能分支: feat/path-map-freshness-check
建立日期: 2026-09-05
版本: 2.1.0
狀態: Draft
---

# 功能規格：User Path Map Freshness Check

## 功能目標

讓維護者能以離線、唯讀且可重複執行的命令，判斷 `design/system/user-path-map.html` 所記錄的畫面清單指紋（screen-list fingerprint）是否仍與 `design/system/screen-inventory.md` 目前的畫面／視圖 ID 清單相符；當圖已過期時，命令必須以非零狀態阻擋並說明原因，避免使用者到達路徑圖在 UI 演進後靜默漂移。

本功能依賴 GitHub issue #645 先交付該 HTML。#645 尚未完成以前，本規格只允許建立 CLI／fixture regression foundation；不得猜測檔頭欄位、commit 長度、解析語法或最終比較演算法，也不得接上一個對缺檔永遠通過或讓目前 `main` 永久失敗的 production CI gate。#645 合併後，2026-09-18 design amendment（OpenSpec change `add-user-path-map-freshness-check` 之 `design.md`）依維護者裁定採用 screen-list fingerprint 模型取代 git revision 比較，Stage 2 依此交付。

## 已釐清事項

- 監看的來源為 `design/system/screen-inventory.md` 目前渲染的畫面 ID 與視圖 ID 清單（v2.0.0 起；v1.0.0 原為 `design/prototype/pages/**` 與 `design/system/screen-inventory.md` 兩個來源集合）。`design/prototype/pages/**` 的變更只在透過 `gen-screen-inventory.mjs --check` 反映為 ID 增減時才會被偵測。本功能不重繪 `design/system/user-path-map.html` 的 walkthrough 內文；只在其 `<head>` 寫入指紋 meta。
- #645 是 `design/system/user-path-map.html` artifact 的 authority；記錄值的 locator 與比較語意由 2026-09-18 design amendment 核准為 `<head>` 內唯一 `<meta name="path-map-screen-fingerprint" content="sha256:<64 碼小寫 hex>">`，不建立相容欄位、git revision 或其他 fallback。
- 交付分兩階段：#645 前的安全 foundation，以及 #645 後的權威解析、fresh/stale 判定與 production CI activation。
- regression harness 的 CI coverage 與真實 artifact freshness gate 是兩個不同契約。前者可在 Stage 1 由既有 `speckit-tests` job 覆蓋；後者在 Stage 2 前保持未接線。
- 這是 command-line／CI governance tooling，沒有產品 route、prototype 行為、React component、API 或 DB schema；Frontend Ready Gate 不適用。

## 使用者情境與測試 *(必填)*

### 使用者故事 1 — 安全建立檢查命令基礎（優先級：P1）

維護者可以執行固定的 checker entry point，取得穩定 usage／configuration 結果；在 #645 artifact 或權威檔頭尚未可用時，命令明確 fail closed，而不是把「無法判斷」當成 fresh。

**此優先級原因**：先固定安全的 CLI 與測試邊界，才能與 #645 同步推進而不製造暫時性 CI 漏洞。
**獨立測試方式**：在 synthetic repository fixture 執行 help、無效參數、缺少 artifact 與 no-write assertions；fixture 不提供或猜測 #645 metadata。

**驗收情境**：

1. **AC-1.1**：**Given** checker 可執行，**When** 使用 `--help`，**Then** exit `0` 並說明正式檢查尚依賴 #645 的權威檔頭契約。
2. **AC-1.2**：**Given** 傳入不支援的參數或無法解析 repository root，**When** 執行 checker，**Then** exit `2` 並輸出 usage／configuration diagnostic。
3. **AC-1.3**：**Given** `design/system/user-path-map.html` 不存在，或雖存在但 #645 權威 metadata 契約尚未完成，**When** 執行正式檢查，**Then** exit `2`，明確表示 freshness 無法判斷，且不得回報 fresh。
4. **AC-1.4**：**Given** 任一 Stage 1 fixture，**When** 執行 checker，**Then** repository 內容與 Git working tree 保持不變。

### 使用者故事 2 — 依權威來源判斷 fresh 或 stale（優先級：P1）

在 #645 完成後，維護者能以 HTML `<head>` 記錄的畫面清單指紋為基準，與 screen inventory 即時重算的指紋比較，並取得可定位的判定原因。

**此優先級原因**：這是 issue #665 的核心阻擋行為，但在來源 metadata 尚不存在時不能誠實實作。
**獨立測試方式**：以 synthetic fixtures 覆蓋 fresh、指紋不符的 stale、無效 metadata／inventory 與未增減 ID 的 prototype-only 編輯 negative control。

**驗收情境**：

1. **AC-2.1**：**Given** `design/system/user-path-map.html` `<head>` 的 `path-map-screen-fingerprint` meta 與依 `design/system/screen-inventory.md` 目前畫面／視圖 ID 清單即時重算的 sha256 指紋相符，**When** 執行 checker，**Then** exit `0` 且回報 fresh（`PATH_MAP_FRESH`）。
2. **AC-2.2**：**Given** `design/system/screen-inventory.md` 目前的畫面或視圖 ID 清單改變，使即時重算的指紋與 `<meta>` 記錄值不同，**When** 執行 checker，**Then** exit `1`（`PATH_MAP_STALE_FINGERPRINT`），指出需依 #645 流程重新實走並更新 `<meta>` 值，且同時印出記錄值與即時重算的 `sha256:<hex>`。**（2026-09-24 amendment，issue #906 追加）**：**Given** 指紋相符，但內文某個 `<檔案>:<行號>` 引用已無法解析到檔案，或行號已超出該檔行數範圍，**When** 執行 checker，**Then** exit `1`（`PATH_MAP_CITATION_UNRESOLVED`）並指出該引用與失效原因；**Given** 指紋相符，但內文以 `grep` 為證據所陳述的某個計數經即時重算後與陳述值不同，**When** 執行 checker，**Then** exit `1`（`PATH_MAP_CLAIM_COUNT_MISMATCH`）並同時印出陳述值與重算值。
3. **AC-2.3（Retired，v2.0.0 併入 AC-2.2；原文保留供追溯）**：指紋模型下不再區分 prototype 與 screen inventory 兩種觸發來源。原文：**Given** HTML 記錄的來源 revision 之後，`design/system/screen-inventory.md` 依核准比較規則出現較新的變更，**When** 執行 checker，**Then** exit `1` 並指出該檔案觸發 stale。
4. **AC-2.4**：**Given** `path-map-screen-fingerprint` meta 缺漏、出現 2 次以上、`content` 不符 `sha256:[0-9a-f]{64}`，或 `design/system/screen-inventory.md` 缺少可解析的畫面／視圖 ID 表格，**When** 執行 checker，**Then** exit `2` 並說明 configuration 原因（`PATH_MAP_META_MISSING`／`PATH_MAP_META_DUPLICATE`／`PATH_MAP_META_MALFORMED`／`PATH_MAP_INVENTORY_UNREADABLE`），不得回報 fresh 或 stale。**（2026-09-24 amendment，issue #906 追加）**：**Given** 內文寫出 `grep` 命令但未附帶可重算的計數，或該宣稱的目標無法解析為唯一檔案或目錄，**When** 執行 checker，**Then** exit `2` 並說明 configuration 原因（`PATH_MAP_CLAIM_UNDECIDABLE`），不得回報 fresh 或 stale。
5. **AC-2.5**：**Given** 只有受監看 ID 清單之外的內容發生變更，包括未增減任何畫面／視圖 ID 的 `design/prototype/pages/**` 編輯，**When** 執行 checker，**Then** 不得僅因此判為 stale。**（2026-09-24 amendment，issue #906）** 此 negative control 的前提收斂為：該變更未增減任何畫面／視圖 ID，且未觸及路徑圖內文任何 `<檔案>:<行號>` 引用或任何 `grep` 計數宣稱。

### 使用者故事 3 — 分離 regression coverage 與 production gate（優先級：P2）

維護者能在 #645 前持續由 CI 執行 checker 的安全 foundation regression；只有 #645 權威契約、核心 Red/Green 與真實 repository fresh evidence 均成立後，才啟用直接 freshness job 與本機對等命令。

**此優先級原因**：既不能留下沒有 CI 覆蓋的 checker，也不能以臨時例外讓 production gate 假綠或永紅。
**獨立測試方式**：先驗證既有 `speckit-tests` job 覆蓋 Stage 1 fixtures；Stage 2 再驗證獨立 job、`CLAUDE.md` 命令與 `scripts/ci-jobs.tsv` 雙向對照。

**驗收情境**：

1. **AC-3.1**：**Given** Stage 1 foundation 已完成但 #645 尚未交付，**When** CI 執行，**Then** 既有 `speckit-tests` job 會執行 checker regression fixtures，但 `.github/workflows/ci.yml` 不會對真實 `design/system/user-path-map.html` 執行 production freshness check。
2. **AC-3.2**：**Given** #645 權威檔頭與 artifact 已合併、Stage 2 Red/Green 全綠，且真實 repository checker exit `0`，**When** 啟用 production gate，**Then** `.github/workflows/ci.yml` 有獨立 job 執行 checker，`CLAUDE.md` 列出相同本機命令，`scripts/ci-jobs.tsv` 將 checker 登錄至該 job。
3. **AC-3.3**：**Given** 任一階段完成其預定接線，**When** 執行 `scripts/check-sdd.sh`，**Then** 不得輸出 `CI_JOB_PARITY` diagnostic。

## 需求規格 *(必填)*

### 功能需求

- **FR-001**：系統必須提供唯讀 entry point `node scripts/check-user-path-map-freshness.mjs`；`--help` 與無效參數的結果必須可重複，且不得修改 repository。
- **FR-002**：命令必須區分成功、stale governance violation 與 usage／configuration failure；exit `0` 只可表示依已核准完整契約證明 fresh，exit `1` 表示已證明 stale，exit `2` 表示無法可信判斷。Stage 1 不得產生 exit `0` 的 production freshness 結果。
- **FR-003**：Stage 1 必須在 artifact 缺漏或權威 metadata 契約尚未完成時 fail closed；不得以預設 revision、當前 `HEAD`、檔案 mtime、固定日期或其他猜測代替 #645 authority。
- **FR-004**：Stage 2 的受監看來源必須且只包含 `design/system/screen-inventory.md` 目前渲染的畫面 ID（`## 畫面 × 元件`）與視圖 ID（`## 同頁多重視圖`），除非後續 spec 變更明確修訂此集合；`design/prototype/pages/**` 不再直接監看。**（2026-09-24 amendment，issue #906）** 前句預留的「後續 spec 變更明確修訂此集合」於此生效：Stage 2 指紋相符後，系統必須額外監看 `design/system/user-path-map.html` 內文自己指名的來源，該追加集合必須且只包含兩族——內文中的 `<檔案>:<行號>` 引用，以及內文以 `grep` 命令為證據所陳述的計數（`<檔案> = <n>`、`<目錄>/ → <n> 行`）。
- **FR-005**：Stage 2 必須只從 `design/system/user-path-map.html` `<head>` 內唯一的 `<meta name="path-map-screen-fingerprint" content="sha256:<64 碼小寫 hex>">` 取得記錄值；不得使用 git revision、mtime 或其他相容 fallback。**（2026-09-24 amendment，issue #906）** FR-004 追加的兩族判準必須全部由被指名的來源即時重算；系統不得讀取該唯一 fingerprint meta 以外的任何記錄值，也不得使用 git revision、file mtime、固定日期或任何時間戳作為判準。
- **FR-006**：Stage 2 必須依 screen inventory 即時重算 sha256 指紋並與記錄值逐位元比較，相符為 fresh、不符為 stale，metadata 或 inventory 無法判斷時為 configuration failure；指紋輸入的排序與序列化語意以 2026-09-18 design amendment 為準。checker 不呼叫 `git`。**（2026-09-24 amendment，issue #906）** 指紋不符時必須立即以 exit `1` 結束，不進行後續判定；指紋相符時必須續行 Stage 3：內文的每個 `<檔案>:<行號>` 引用必須仍能解析到實際檔案且行號仍在該檔行數範圍內，內文每個以 `grep` 為證據的計數宣稱必須仍能被重算重現。任一項不成立為 stale，任一項無法解析時必須判為無法判斷，不得退回猜測。
- **FR-007**：stale diagnostic 必須印出記錄值與即時重算的指紋，並指出需依 #645 流程重新實走；configuration diagnostic 必須以穩定 rule ID 指出不可判斷的條件，且不得把 captured parser raw output 直接當成唯一訊息。**（2026-09-24 amendment，issue #906）** Stage 3 的 stale diagnostic 必須以穩定 rule ID `PATH_MAP_CITATION_UNRESOLVED` 指出失效的引用與原因，或以 `PATH_MAP_CLAIM_COUNT_MISMATCH` 同時印出陳述值與重算值；無法判斷時必須以 `PATH_MAP_CLAIM_UNDECIDABLE` 結束於 exit `2`，不得回報 fresh 或 stale。
- **FR-008**：Stage 1 regression 必須加入既有 `scripts/speckit-tests.sh`，並由既有 `speckit-tests` CI job 覆蓋；checker 新增時必須在 `scripts/ci-jobs.tsv` 登錄為由該 regression suite 覆蓋。此接線不得直接檢查真實 path map freshness。
- **FR-009**：production freshness gate 只能在 #645 權威檔頭與 artifact 已合併、Stage 2 Red/Green 全綠、真實 repository checker exit `0` 後啟用；啟用時必須新增獨立 `.github/workflows/ci.yml` job、`CLAUDE.md` 對等本機命令，並將 checker 的 `scripts/ci-jobs.tsv` 登錄改由該 job 覆蓋。不得建立對缺檔永遠通過的臨時 job，也不得在目前 artifact 缺席時建立永久失敗的 blocking job。
- **FR-010**：Stage 1 與 Stage 2 的每個可合併狀態都必須使 `scripts/check-sdd.sh` 對真實 repository 輸出零個 `CI_JOB_PARITY` diagnostic；production gate 不得包裝或取代 OpenSpec schema validation、Project SDD lint 或其他 code/test gates。

## 規格相依性

### 上游（本規格依賴的規格／authority）

| 規格或來源 | 功能 | 本規格需要的內容 |
|---|---|---|
| GitHub issue #645 | 使用者到達路徑圖 | `design/system/user-path-map.html` artifact（已合併）；指紋 meta 的 locator 與比較語意見 2026-09-18 design amendment |
| foundation-001 | Project SDD Lint | `scripts/ci-jobs.tsv` 的雙向 local／CI parity 與 `CI_JOB_PARITY` gate |
| `design/system/screen-inventory.md` | generated screen inventory | Stage 2 唯一受監看來源；本功能只讀取其畫面／視圖 ID 清單，不重新生成該檔 |

### 下游（依賴本規格的規格）

| 規格編號 | 功能 | 依賴本規格的內容 |
|---|---|---|
| Frontend Ready Gate consumers | 新增／修改 page-scoped feature | 以 current 的 user path map 作為主要目標到達性檢查背景；本 checker 只保證 freshness，不判定 F3／F4 結果正確性 |

## 成功標準 *(必填)*

- **SC-001**：Stage 1 的 committed QA Red 先因 checker entry point 缺失而以預期原因失敗；paired Green 後，help、無效參數、缺少／未定 authority 與 no-write fixtures 全綠。
- **SC-002**：#645 完成前，checker regression 由既有 `speckit-tests` job 覆蓋，但 CI 與 `CLAUDE.md` 均沒有宣稱真實 path map freshness 已受 production gate 驗證。
- **SC-003**：#645 完成後的 design amendment 明確記錄權威 metadata locator、指紋比較語意與 stable diagnostics；不得由實作 agent 自行補完。**（2026-09-24 amendment，issue #906）** 同一要求延伸至 Stage 3：被指名來源的兩族判準、stable diagnostics 與無法判斷語意必須先在 spec 明確記錄，不得由實作 agent 自行補完。
- **SC-004**：Stage 2 committed QA Red 覆蓋 fresh、指紋不符 stale、invalid metadata／inventory 與 unmonitored-content negative control；paired Green 後全部通過，且真實 repository checker exit `0`。**（2026-09-24 amendment，issue #906）** Stage 3 的 committed QA Red 另須涵蓋引用失效、計數不符、無法判斷，以及「fingerprint mismatch 優先於 Stage 3」四種情境；paired Green 後全部通過，且真實 repository checker 仍 exit `0`。
- **SC-005**：獨立 production CI job、`CLAUDE.md` 本機命令與 `scripts/ci-jobs.tsv` direct checker mapping 同批完成；`scripts/check-sdd.sh` exit `0` 且無 `CI_JOB_PARITY` diagnostic。
- **SC-006**：整個變更除在 `design/system/user-path-map.html` 的 `<head>` 寫入唯一指紋 meta 外，不修改該檔 walkthrough 內文、`design/prototype/pages/**`、`design/system/screen-inventory.md`、API、DB schema、產品 runtime 或 dependency。

## 範圍外（Out of Scope）*(必填)*

- 產生、重繪、修復或改寫 `design/system/user-path-map.html` 的 walkthrough 內文；該 artifact 屬 issue #645（`<head>` 指紋 meta 除外）。
- 在 #645 前定義 HTML metadata 欄位、commit abbreviation、parser、fallback 或最終比較演算法；以 git history 判定 freshness。
- 判斷 path map 內容是否完整、F3／F4 finding 是否正確，或自動開修正 issue。
- 修改 `design/prototype/pages/**` 或重新生成 `design/system/screen-inventory.md`。
- API、DB schema、backend、frontend runtime、package dependency 或 deployment 行為。

## Changelog

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| 2.1.0 | 2026-09-24 | OpenSpec change `strengthen-path-map-cited-source-freshness` archive 回寫（issue #906，PR #918）：Stage 2 指紋相符後追加 Stage 3「被指名來源」判定。**MINOR**（只新增 MUST，無移除）：FR-004 追加受監看集合為內文的 `<檔案>:<行號>` 引用與 `grep` 計數宣稱兩族；FR-005 追加「全部即時重算、不得讀取 fingerprint meta 以外記錄值、不得用任何時間戳」；FR-006 追加指紋不符優先結束與 Stage 3 逐項判定；FR-007 追加 `PATH_MAP_CITATION_UNRESOLVED`／`PATH_MAP_CLAIM_COUNT_MISMATCH`／`PATH_MAP_CLAIM_UNDECIDABLE` 三個 stable rule ID；AC-2.2／AC-2.4 追加對應情境，AC-2.5 negative control 前提收斂，SC-003／SC-004 追加 Stage 3 要求。既有 v2.0.0 條文逐字保留為沿革。實作落在 `scripts/check-user-path-map-freshness.mjs` 與 `scripts/speckit-tests.sh`，derived view 由 archive 自動合併 |
| 2.0.0 | 2026-09-18 | OpenSpec change `add-user-path-map-freshness-check` archive 回寫（issue #665 Stage 2，PR #831）：依 2026-09-18 design amendment 以 screen-list fingerprint 模型取代 git revision 比較。**MAJOR**：FR-004 受監看來源收斂為 `screen-inventory.md` 的畫面／視圖 ID 清單，不再直接監看 `design/prototype/pages/**`；AC-2.3 退役併入 AC-2.2（原文保留）。FR-005～FR-007、AC-2.1／AC-2.2／AC-2.4／AC-2.5、SC-003／SC-004 改寫為指紋語意並移除 Blocked 標記；AC-3.2、SC-005 解除 Blocked；SC-006 與範圍外放寬為允許在 `<head>` 寫入指紋 meta。production gate 已啟用：CI job `user-path-map-freshness`、`CLAUDE.md` 本機命令與 `scripts/ci-jobs.tsv` 直接映射同批完成 |
| 1.0.0 | 2026-09-05 | 建立 issue #665 的兩階段 freshness checker 契約：#645 前只交付 fail-closed CLI 與 fixture regression foundation；#645 後才核准 metadata／comparison semantics 並啟用 production CI gate |
