## Purpose

User Path Map Freshness Check 的 derived capability；正典為 `specs/foundation/002-user-path-map-freshness-check/spec.md` v1.0.0。本 change 以兩階段實作 FR-001～FR-010、AC-1.1～AC-3.3 與 SC-001～SC-006。Stage 2 原本明確受 GitHub issue #645 的 artifact／metadata authority 阻擋；#645 已合併，且 2026-09-18 design amendment（screen-list fingerprint model，見 `design.md`）已核准 metadata locator 與比較語意。Stage 2 實作仍受 `#645 hard checkpoint` 的 gate 重跑與使用者第二次明確確認阻擋（`tasks.md`）。

## ADDED Requirements

### Requirement: FR-001～FR-003、SC-001 — #645 前的 fail-closed CLI foundation

系統 MUST 提供唯讀 `node scripts/check-user-path-map-freshness.mjs`。在 #645 artifact 或權威 metadata 契約尚未完成時，正式 invocation MUST 以 configuration failure 結束，MUST NOT 將「無法判斷」回報為 fresh，且 MUST NOT 以 `HEAD`、mtime、固定日期或臨時 metadata 代替上游 authority。Stage 1 MUST 只固定 help、usage／root preflight、missing-or-unsettled-authority 與 no-write 行為。

#### Scenario: AC-1.1 help 說明 dependency

- **GIVEN** checker entry point 可執行
- **WHEN** 使用 `--help`
- **THEN** command 以 exit `0` 結束，並說明 production freshness 尚依賴 #645 權威檔頭

#### Scenario: AC-1.2 無效 usage 或 root

- **GIVEN** 使用不支援的參數或無法解析的 repository root
- **WHEN** 執行 checker
- **THEN** command 以 exit `2` 結束，並輸出 usage／configuration diagnostic

#### Scenario: AC-1.3 缺少 artifact 或未定 authority

- **GIVEN** `design/system/user-path-map.html` 缺少，或 #645 metadata authority 尚未完成
- **WHEN** 執行正式 freshness invocation
- **THEN** command 以 exit `2` 結束，明確表示 freshness 無法判斷，且不輸出 fresh

#### Scenario: AC-1.4 checker 唯讀

- **GIVEN** 任一 Stage 1 fixture
- **WHEN** 執行 checker
- **THEN** repository 內容與 Git working tree 不變

#### Scenario: SC-001 committed Stage 1 Red／Green

- **GIVEN** QA 已提交只修改 `scripts/speckit-tests.sh` 的 Stage 1 Red
- **WHEN** 主 session 驗證其只因 checker entry point 缺失而失敗，再派 paired Green
- **THEN** Green 不修改 Red contract，且 help、usage、missing／unsettled authority 與 no-write fixtures 全數通過

### Requirement: FR-004～FR-007、SC-003～SC-004 — #645 後的 authoritative freshness 判定（2026-09-18 amendment：screen-list fingerprint model）

#645 已合併 `design/system/user-path-map.html`；2026-09-18 design amendment 依維護者裁定，將 recorded metadata 定義為 screen-list fingerprint（`design/system/screen-inventory.md` 的畫面／視圖 ID 清單雜湊），而非 git revision。系統 MUST 只監看 `design/system/screen-inventory.md` 目前渲染的畫面 ID（`screens[].id`）與視圖 ID（`entry.views[].id`、`screenViews[*].views[].id`）；`design/prototype/pages/**` 的內容變更不再由本 checker 直接監看，只有在該變更透過既有 `gen-screen-inventory.mjs --check` 反映為 screen-inventory.md 的 ID 增減時才會被偵測到。系統 MUST 從 `design/system/user-path-map.html` 的 `<head>` 讀取唯一 `<meta name="path-map-screen-fingerprint" content="sha256:<64 碼小寫 hex>">`，並與依 screen-inventory.md 即時重算的 sha256 fingerprint 逐位元比較；相符為 fresh，不符為 stale。系統 MUST 區分 fresh、stale 與無法判斷（metadata／inventory 缺漏、重複、格式錯誤、無法解析）。實作仍受 `#645 hard checkpoint` 的 gate 重跑與使用者第二次明確確認阻擋。

#### Scenario: AC-2.1 authoritative fresh

- **GIVEN** `design/system/user-path-map.html` `<head>` 的 `path-map-screen-fingerprint` meta 與依 `design/system/screen-inventory.md` 目前畫面／視圖 ID 清單即時重算的 sha256 fingerprint 相符
- **WHEN** 執行 checker
- **THEN** command 以 exit `0` 結束並回報 fresh（`PATH_MAP_FRESH`）

#### Scenario: AC-2.2 screen-list fingerprint mismatch 觸發 stale

- **GIVEN** `design/system/screen-inventory.md` 目前的畫面或視圖 ID 清單改變，使即時重算的 fingerprint 與 `<meta>` 記錄值不同
- **WHEN** 執行 checker
- **THEN** command 以 exit `1` 結束（`PATH_MAP_STALE_FINGERPRINT`），並指出需依 #645 流程重新實走並更新 `<meta>` 值

#### Scenario: AC-2.3（Retired — 併入 AC-2.2，原文保留供追溯）

> 2026-09-18 amendment：fingerprint 模型下不再區分「prototype 觸發」與「screen inventory 觸發」兩種 stale——兩者都只透過 screen-inventory.md 的同一份 ID 清單反映，已收斂為單一 AC-2.2。以下為 amendment 前原始草案文字，保留供追溯，不再獨立實作。

- **GIVEN** recorded revision 之後，`design/system/screen-inventory.md` 依核准規則有較新變更
- **WHEN** 執行 checker
- **THEN** command 以 exit `1` 結束，並指出 screen inventory 觸發 stale

#### Scenario: AC-2.4 metadata 或 inventory 不可判斷

- **GIVEN** `path-map-screen-fingerprint` meta 缺漏、出現 2 次以上、`content` 不符 `sha256:[0-9a-f]{64}` 格式，或 `design/system/screen-inventory.md` 缺少可解析的畫面／視圖 ID 表格
- **WHEN** 執行 checker
- **THEN** command 以 exit `2` 結束並說明 configuration 原因（`PATH_MAP_META_MISSING`／`PATH_MAP_META_DUPLICATE`／`PATH_MAP_META_MALFORMED`／`PATH_MAP_INVENTORY_UNREADABLE`），不回報 fresh 或 stale

#### Scenario: AC-2.5 不相關內容 negative control

- **GIVEN** 只有受監看 ID 清單之外的內容發生變更，包括未增減任何畫面／視圖 ID 的 `design/prototype/pages/**` 編輯
- **WHEN** 執行 checker
- **THEN** checker 不得僅因此判為 stale

#### Scenario: SC-003 Stage 2 design amendment 完整

- **GIVEN** #645 已合併
- **WHEN** Stage 2 開始前複核 design
- **THEN** 七個 open decisions 全部已有可測試的核准結論（2026-09-18 amendment 已完成此項），OpenSpec schema validation 與 Project SDD lint 重新通過，且使用者已明確確認

#### Scenario: SC-004 committed Stage 2 Red／Green

- **GIVEN** QA 已提交 authoritative fixture Red
- **WHEN** 主 session 驗證 foundation checker 因尚未實作核准語意而失敗，再派 paired Green
- **THEN** fresh、stale（fingerprint mismatch）、invalid metadata／inventory 與 unmonitored-content negative control 全數通過，且真實 repository checker exit `0`

### Requirement: FR-008～FR-010、SC-002、SC-005～SC-006 — regression 與 production gate 分離

Stage 1 MUST 由既有 `scripts/speckit-tests.sh` 與 `speckit-tests` CI job 覆蓋 checker fixtures，並在 `scripts/ci-jobs.tsv` 宣告 checker 的 regression coverage；Stage 1 MUST NOT 在 workflow 或 `CLAUDE.md` 加入真實 artifact invocation。Stage 2 只有在 #645 authority、authoritative Red/Green 與 true-repository fresh evidence 成立後，才 MUST 新增獨立 production job、相同 local command 與 direct checker registry mapping。兩階段的可合併狀態都 MUST 維持零 `CI_JOB_PARITY` diagnostic。

#### Scenario: AC-3.1 Stage 1 只有 regression coverage

- **GIVEN** Stage 1 已完成且 #645 尚未交付
- **WHEN** CI 執行
- **THEN** 既有 `speckit-tests` job 執行 checker fixtures，但 workflow 不對真實 path map 執行 production freshness check

#### Scenario: AC-3.2 Stage 2 production activation

- **GIVEN** #645 artifact／authority 已合併、Stage 2 Red/Green 全綠，且真實 repository checker exit `0`
- **WHEN** 使用者明確確認 production activation
- **THEN** workflow 具有獨立 direct checker job、`CLAUDE.md` 列出相同本機命令，且 registry 將 checker 映射至該 job

#### Scenario: AC-3.3 每階段 parity 無缺口

- **GIVEN** Stage 1 或 Stage 2 已完成該階段預定接線
- **WHEN** 執行 `scripts/check-sdd.sh`
- **THEN** 不輸出 `CI_JOB_PARITY` diagnostic

#### Scenario: SC-002 pre-#645 不宣稱 production fresh

- **GIVEN** #645 尚未完成
- **WHEN** Stage 1 PR 交付
- **THEN** CI 僅覆蓋 fixtures，且 workflow／`CLAUDE.md` 均未宣稱真實 artifact freshness 已受 gate 驗證

#### Scenario: SC-005 production local／CI parity

- **GIVEN** Stage 2 production gate 已啟用
- **WHEN** 執行 Project SDD lint
- **THEN** direct job、local command 與 registry mapping 一致，lint exit `0` 且無 `CI_JOB_PARITY`

#### Scenario: SC-006 範圍保持唯讀且無 API／DB 變更

- **GIVEN** 本 change 的任一階段
- **WHEN** 複核 diff
- **THEN** 不包含 path map 重繪、prototype／screen inventory 修改、API、DB schema、產品 runtime 或 dependency 變更
