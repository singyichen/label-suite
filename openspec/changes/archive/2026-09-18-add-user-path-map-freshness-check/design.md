# Design: add-user-path-map-freshness-check

## Context（脈絡）

本設計服務 `specs/foundation/002-user-path-map-freshness-check/spec.md` 的功能目標：以離線、唯讀 checker 發現 `design/system/user-path-map.html` 相對於 prototype 與 screen inventory 的漂移。上游 #645 原本刻意暫停，artifact 與權威 metadata 契約都不存在，因此本設計原本不能定義欄位名稱、commit 長度、HTML parsing syntax 或最終 Git comparison semantics。

**2026-09-18 更新：** #645 已合併，`design/system/user-path-map.html` 現以手寫 prose（`<dl class="provenance">`）記錄來源，尚無機器可讀檔頭。維護者於 issue #665 留言裁定 recorded metadata 應為「畫面清單 fingerprint」而非 git revision（見下方 `Stage 2 Design Amendment` 一節）；本節之後所有 Stage 2 決策段落已依裁定更新，原始 revision-based 描述保留供追溯，不逐句刪除。

現有 `foundation-001` 已要求 `scripts/` 每支 shell／Node script 都透過 `scripts/ci-jobs.tsv` 對應 CI job 或合理豁免。#665 的 checker 是會阻擋變更的 verification suite，最終不能豁免；但直接在缺少 target artifact 時啟用 production job，也會使目前 `main` 永久失敗。解法是分離 regression-harness coverage 與 production artifact activation。

## Goals / Non-Goals

**Goals：**

- 固定唯讀 CLI surface、exit 類別與 Stage 1 可誠實測試的 preflight。
- Stage 1 以 synthetic fixtures 證明 help、usage、missing／unsettled authority fail-closed 與 no-write。
- Stage 1 將 checker 登錄為由既有 `speckit-tests` job 覆蓋，但不在真實 repository 執行 freshness check。
- Stage 2 在 #645 authority 完成後，補齊 recorded screen-list fingerprint extraction 與受監看來源比較，並啟用獨立 production job。
- 每個可合併狀態都維持 `scripts/check-sdd.sh` 無 `CI_JOB_PARITY` gap。

**Non-Goals：**

- 不生成、重繪、修改或驗證 path map 內容完整性。
- 不修改 prototype pages 或重新生成 screen inventory。
- 不在 #645 前發明 metadata、parser、commit abbreviation、fallback、revision resolution、dirty working tree 或 shallow history semantics。（2026-09-18 更新：#645 後的裁定改採 fingerprint 模型，revision resolution、dirty working tree、shallow history 語意已被判定為不適用，見 `Stage 2 Design Amendment`，而非延後補齊。）
- 不新增 API、DB schema、frontend／backend runtime、dependency 或 deployment 行為。

## Decisions

### 1. 使用 Node 標準函式庫提供單一唯讀 entry point

entry point 固定為 `node scripts/check-user-path-map-freshness.mjs`，只使用 Node 標準函式庫（`node:fs`、`node:path`；Stage 2 另加 `node:crypto` 計算 fingerprint），不新增 package dependency。checker 不提供 write／fix mode，也不呼叫 #645 的繪圖流程。**2026-09-18 更新：** fingerprint 模型下 checker 全程不呼叫任何 `git` 指令（見下方 `Stage 2 Design Amendment` 第 3／5／7 項），原先預留的 Git command 依賴已被排除。

### 2. 三類 outcome，但 Stage 1 不可回報 production fresh

command outcome 分成：

| Outcome | Exit | 意義 |
|---|---:|---|
| fresh | `0` | 只有完整、已核准的 Stage 2 契約能證明 target current |
| stale | `1` | 只有完整、已核准的 Stage 2 契約能證明受監看來源觸發漂移 |
| usage／configuration | `2` | 參數、root、artifact、authority 或 fingerprint metadata 不足以可信判斷 |

Stage 1 的 `--help` 可 exit `0`，但正式 freshness invocation 在 artifact 或 authority 未完成時固定 exit `2`，不得輸出 fresh。這不是 production gate 的臨時 pass；production gate 尚未存在。

### 3. 將 regression coverage 與 production activation 分成兩個 CI 契約

Stage 1：

```text
scripts/speckit-tests.sh
  └─ synthetic fixtures 呼叫 checker
       ├─ help / invalid arguments
       ├─ missing artifact
       ├─ authority not activated
       └─ no-write
```

現有 `speckit-tests` job 已執行該 harness。checker 新增時，`scripts/ci-jobs.tsv` 暫時把 checker 宣告為由 `scripts/speckit-tests.sh` 覆蓋；不新增 production job，不在 `CLAUDE.md` 新增 direct checker command，也不對真實 artifact 執行 checker。

Stage 2：

```text
path-map-freshness-tests（既有 speckit-tests job）
  └─ synthetic authoritative fixtures

user-path-map-freshness（新增獨立 job）
  └─ node scripts/check-user-path-map-freshness.mjs（真實 repository）
```

啟用時將 checker 的 registry row 改由獨立 production job 覆蓋，harness 仍由 `speckit-tests` job 覆蓋；`CLAUDE.md` 同批加入 direct local command。這個切換只有在下列條件全數成立後才可執行：

1. #645 artifact 與權威檔頭已合併；
2. 本 design 經 amendment 記錄所有 open decisions；
3. Stage 2 committed Red/Green 全綠；
4. 真實 repository direct checker exit `0`；
5. OpenSpec schema validation 與 Project SDD lint 重新通過；
6. 使用者明確確認 activation。

### 4. 監看集合收斂為單一 authoritative ID 清單（2026-09-18 amendment 生效）

issue #665 原本固定的受監看來源為：

- `design/prototype/pages/**`
- `design/system/screen-inventory.md`

2026-09-18 amendment 依維護者裁定將其收斂為單一輸入：checker 只讀取 `design/system/screen-inventory.md` 目前渲染出的畫面 ID（`## 畫面 × 元件` 表格首欄，對應 manifest `screens[].id`，見 `scripts/gen-screen-inventory.mjs:319`）與視圖 ID（`## 同頁多重視圖` 區塊各表格首欄，對應 `entry.views[].id` 與 `screenViews[*].views[].id`，見 `scripts/gen-screen-inventory.mjs:369,377`），不再直接檢視 `design/prototype/pages/**`。

理由：prototype 頁面內容變更只有在造成畫面／視圖新增或移除時才需要 path map 重新實走；這類變更必然反映為 `screen-inventory.md` 的 ID 增減，而該檔案是否落後於 prototype 已由既有、獨立的 `node scripts/gen-screen-inventory.mjs --check`／`scripts/inventory-tests.sh` freshness gate 把關（foundation-001）。本 checker 若疊加同一路徑，會重建 `INVENTORY_FRESHNESS` 的 rebase 級聯（`screen-inventory.md` 內嵌「pages 最後一次變更的 commit」，見 `design/system/screen-inventory.md:7`，每次 rebase 都會使其重新過期），且手繪 path map 無法用單一指令重繪，因此不能沿用「recorded revision 之後有變更即 stale」的模型。收斂後，checker 只在畫面／視圖集合本身改變時才報 stale；純內容編輯（不增減 ID）不再是本 checker 的訊號來源，也不再需要區分「prototype 觸發」與「screen inventory 觸發」兩種 stale。

### 5. Source authority 與 fail-closed boundary（2026-09-18 amendment：fingerprint locator 取代 revision 檔頭）

`design/system/user-path-map.html` 的 `<head>` 內、唯一的 `<meta name="path-map-screen-fingerprint" content="sha256:<64 碼小寫 hex>">` 是 Stage 2 metadata authority，取代原本假設的 revision 檔頭。Stage 2 不接受環境變數 override、第二份 manifest、相容別名，也不從 `HEAD`、mtime 或日期推導缺失值。下列情形均為 configuration failure，而非 fresh：`<meta>` 遺漏、出現 2 次以上、`content` 不符 `sha256:[0-9a-f]{64}` 格式，或 `design/system/screen-inventory.md` 缺少可解析的畫面／視圖 ID 表格。

diagnostic 必須陳述觸發條件（缺漏／重複／格式錯誤／inventory 無法解析／fingerprint 不符）；可以捕捉底層 parser 例外供穩定分類使用，但不能把 raw exception message 當成唯一輸出。exact rule ID 與訊息已由下方 `Stage 2 Design Amendment` 第 6 項固定，沿用 Stage 1 既有 `PATH_MAP_*` 命名慣例（`scripts/check-user-path-map-freshness.mjs:53-101`）。

## Stage 2 Open Decisions（原始清單，#645 合併前留下；已由下方 Amendment 逐項解決，原文保留供追溯，不改寫）

下列項目原本未決，實作 agent 不得自行選擇：

1. HTML 內 recorded prototype source revision 的權威 locator 與唯一性規則。
2. 可接受的 revision 表示形式、長度、canonical resolution 與 ancestor 要求。
3. 「revision 之後」的完整 Git comparison semantics，包括 merge history、rename、path existence 與 source ordering。
4. dirty／untracked target 與 monitored sources 的處理方式。
5. shallow clone、缺少 object 或 history 不完整時的 configuration 行為。
6. fresh、各 stale trigger 與各 configuration case 的 stable rule ID／訊息。
7. production CI 是否需要 checkout full history，以及最小 fetch-depth 契約。

任何一項未記錄在 design amendment 時，Stage 2 Red、Green 與 production activation 都保持 blocked。**2026-09-18 起，下方 Amendment 已逐項解決全部七項**；Stage 2 Red／Green 與 production activation 仍額外受 `#645 hard checkpoint` 步驟 4～5（gate 重跑與使用者第二次明確確認）阻擋，見 `tasks.md`。

## Stage 2 Design Amendment — Screen-List Fingerprint Model（2026-09-18）

維護者於 2026-09-18 在 issue #665 留言裁定（<https://github.com/singyichen/label-suite/issues/665#issuecomment-5726925379>）：`design/system/user-path-map.html` 的 header 應記錄「畫面清單 fingerprint」——即 `design/system/screen-inventory.md` 畫面／視圖 ID 清單的雜湊——而非 source commit SHA。

理由：path map 是手繪產物，無法用單一指令重繪；若採 SHA，任何觸及 `design/prototype/pages/**` 的 PR 都會使其轉紅，並重建 `INVENTORY_FRESHNESS` 的 rebase 級聯（`screen-inventory.md` 內嵌「pages 最後一次變更的 commit」，見 `design/system/screen-inventory.md:7`，故每次 rebase 都會使其重新過期）。checker 只應在畫面新增／移除時轉紅，這才是 issue #665 的真實 rerun 觸發條件；語意性觸發（例如三層接力審核模型改版）無法被自動偵測，仍是維護者的人工責任——本 amendment 明確承認此限制，不假裝可自動化。

此裁定使七個 open decisions 有以下結論：

1. **HTML 內 recorded prototype source revision 的權威 locator 與唯一性規則。**
   → 已解決（重新定義為 fingerprint locator）：唯一 `<head><meta name="path-map-screen-fingerprint" content="sha256:<64 碼小寫 hex>"></head>`。比照既有 `<meta name="description">` 慣例（`design/system/user-path-map.html:2`），放在 `<head>` 而非 `<dl class="provenance">` 的手寫導覽文字（`design/system/user-path-map.html:282-293`），避免維護者編輯 walkthrough 文案時意外破壞機器可讀值，且 `<head>` 是單一、不與內文 `span.mono` 樣式混淆的既知位置。唯一性規則：`<head>` 內必須恰好出現 1 個該 `name` 的 `<meta>`；0 個或 ≥2 個都是 configuration failure。
2. **可接受的 revision 表示形式、長度、canonical resolution 與 ancestor 要求。**
   → fingerprint 模型下不適用（沒有 revision，也沒有 ancestor 語意）。改為：`content` 必須符合 `^sha256:[0-9a-f]{64}$`；不符即 malformed configuration failure。沒有「canonical resolution」步驟——值不對任何 git object 解析，只與即時重算的 digest 逐位元比較。
3. **「revision 之後」的完整 Git comparison semantics，包括 merge history、rename、path existence 與 source ordering。**
   → fingerprint 模型下不適用：checker 不執行任何 `git` 指令，改為無狀態相等比較（見 Decision 4／5）。原本區分「prototype 觸發」與「screen inventory 觸發」兩種 stale（草案 AC-2.2／AC-2.3）收斂為單一「fingerprint mismatch」判定，因為兩者現在都只透過同一份 `screen-inventory.md` 的 ID 清單反映；spec delta 的 AC-2.3 標記為 retired／併入 AC-2.2，原文保留供追溯。
4. **dirty／untracked target 與 monitored sources 的處理方式。**
   → checker 一律讀取 working tree 上的即時檔案內容（`fs.readFileSync`，與現有 Stage 1 `PATH_MAP_ARTIFACT_MISSING` 檢查同一模式），不分是否已 commit、staged 或只是本機修改——這與 `gen-screen-inventory.mjs --check` 本身「讀 disk 現況」的既有慣例一致。沒有 git-diff 意義下的「dirty」語意需要另外處理；`design/system/user-path-map.html` 或 `design/system/screen-inventory.md` 缺席時分別落回既有 `PATH_MAP_ARTIFACT_MISSING` 與新 `PATH_MAP_INVENTORY_UNREADABLE`。
5. **shallow clone、缺少 object 或 history 不完整時的 configuration 行為。**
   → 不適用：checker 全程零 git 指令（無 `git log`、無 object 查詢、無 revision walk），shallow clone 或 missing object 不可能影響本 checker。
6. **fresh、各 stale trigger 與各 configuration case 的 stable rule ID／訊息。**
   → 沿用 Stage 1 已建立的 `PATH_MAP_*` 命名慣例（`scripts/check-user-path-map-freshness.mjs:53-101`），新增：
   - `PATH_MAP_FRESH`（exit `0`）：fingerprint 相符。
   - `PATH_MAP_STALE_FINGERPRINT`（exit `1`）：`screen-inventory.md` 目前的畫面／視圖 ID 清單與 `<meta>` 記錄的 fingerprint 不符。診斷同時印出記錄值與即時重算的 `sha256:<hex>`，讓維護者依 #645 流程重走路徑圖後，直接用這個值更新 `<meta>`，不必另外重現演算法（2026-09-18 補充；checker 仍不提供 write／fix mode）。
   - `PATH_MAP_META_MISSING`（exit `2`）：`<head>` 沒有 `path-map-screen-fingerprint` meta。
   - `PATH_MAP_META_DUPLICATE`（exit `2`）：`<head>` 出現 2 個以上該 meta。
   - `PATH_MAP_META_MALFORMED`（exit `2`）：`content` 不符 `sha256:[0-9a-f]{64}`。
   - `PATH_MAP_INVENTORY_UNREADABLE`（exit `2`）：`design/system/screen-inventory.md` 缺席，或其 `## 畫面 × 元件`／`## 同頁多重視圖` 表格無法解析出 ID 清單。
   沿用既有 `PATH_MAP_ARTIFACT_MISSING`（path map 本身缺席）。Stage 1 佔位用的 `PATH_MAP_AUTHORITY_UNSETTLED` 於 Stage 2 Green 由上列具體規則取代，不得與新規則並存造成雙重訊息。
7. **production CI 是否需要 checkout full history，以及最小 fetch-depth 契約。**
   → 不適用：checker 不呼叫任何 `git` 指令，不需要 full history 或任何 fetch-depth 契約；沿用既有 CI checkout 設定即可，Stage 2 task 2.5 的 workflow 新增不得引入 history 相關參數。

### Fingerprint 演算法（新增，使第 1／2／6 項可測試）

- **Hash 函式**：Node stdlib `node:crypto` 的 `createHash('sha256')`，與 Decision 1「只使用 Node 標準函式庫」原則一致，不新增 dependency。
- **輸入資料**：從 `design/system/screen-inventory.md` 擷取兩組 ID：
  - `screenIds`：`## 畫面 × 元件` 表格每一資料列的第一欄（例：`01`～`15`，對應 manifest `screens[].id`，由 `scripts/gen-screen-inventory.mjs:319` 渲染）。
  - `viewIds`：`## 同頁多重視圖` 區塊（含 `### 入口` 與各畫面子區塊）每一資料列的第一欄（例：`V00`～`V35`，對應 `scripts/gen-screen-inventory.mjs:369,377`）。
- **正規化**：每個 ID 去除前後空白；`screenIds`、`viewIds` 各自以 JavaScript 預設字串排序（ordinal）重新排序，不依賴文件內表格的原始排列順序——避免生成器未來調整區塊順序造成無意義的 fingerprint 變動。
- **Canonical serialization**（UTF-8 字串，`\n` 換行）：
  ```
  screens:<排序後 screenIds 以 , 相接>
  views:<排序後 viewIds 以 , 相接>
  ```
- **Fingerprint** = 對上述字串取 sha256，輸出 64 碼小寫 hex，寫入 `<meta>` 的 `content` 為 `sha256:<hex>`。
- **Known ceiling**（Stage 2 Green 實作時以 `ponytail:` comment 標註，非阻擋決策）：排序假設 ID 為固定寬度、zero-padded（現況 `01`~`15`、`V00`~`V35`）；若未來 ID 位數增加（例如超過 99 個畫面），詞法排序需要改為數值排序，屆時另行調整，不影響本 amendment 的正確性。
- **重複 ID**：`screen-inventory.md` 本身理論上不會有重複 ID（`gen-screen-inventory.mjs` 的 `validate()` 已在產生前擋下），但 checker 把該檔案當作獨立輸入來源解析，發現重複仍須以 `PATH_MAP_INVENTORY_UNREADABLE` fail closed，不得信任上游不變量。

## TDD 與 file ownership

| 檔案 | Owner | 用途 |
|---|---|---|
| `scripts/speckit-tests.sh` | `senior-qa` | Stage 1／2 committed Red 與 regression harness |
| `scripts/check-user-path-map-freshness.mjs` | `senior-devops` | production checker |
| `scripts/ci-jobs.tsv` | `senior-devops` | CI/local/script parity mapping |
| `.github/workflows/ci.yml` | `senior-devops` | Stage 2 production job；Stage 1 不修改 |
| `CLAUDE.md` | `main` | Stage 2 local command；Stage 1 不修改 |

Stage 1 Red 只修改 harness，先提交並執行，expected failure 必須是 checker entry point 缺失。paired Green 建立 checker；因新增 checker 與 mandatory registry row 必須原子避免 `CI_JOB_PARITY` gap，該 task 使用允許的 `scaffold` exception，且不得修改 Red harness。

Stage 2 在 hard checkpoint 後先修改同一 harness，expected failure 必須是 foundation checker 尚未解析權威 metadata／比較 screen-list fingerprint；Green 只修改 checker。路徑圖 `<meta>` 初始值（先核對涵蓋範圍）、CI registry、workflow 與 `CLAUDE.md` 各為後續單檔 task。

## Verification gates

### Propose checkpoint

本 change 四件套完成後：

1. 執行 non-strict OpenSpec schema validation；
2. 執行 `scripts/check-sdd.sh`；
3. 兩者分開回報；
4. 停止並取得使用者明確確認，才可進 `/opsx:apply`。

使用者即使確認 apply，也只解除 Stage 1。Stage 2 仍需 #645 hard checkpoint、design amendment、兩個 gate 重跑與第二次明確確認。

### Stage 1 gates

- committed Red evidence：只因 checker 缺失失敗。
- Green：`bash scripts/speckit-tests.sh`。
- parity：`scripts/check-sdd.sh` 無 `CI_JOB_PARITY`。
- syntax／scope：`node --check scripts/check-user-path-map-freshness.mjs`、`git diff --check`。
- negative activation：workflow 與 `CLAUDE.md` 不含 direct checker production invocation。

### Stage 2 gates（Blocked）

- amended OpenSpec schema validation 與 Project SDD lint。
- committed Red/Green authoritative fixture suite。
- 真實 repository direct checker exit `0`。
- direct job／local command／registry parity。
- applicable repository verification suites與 `git diff --check`。

## Migration / Activation Plan

1. 先交付 Stage 1 Red／Green 與 regression mapping，不建立真實 artifact job。（已完成）
2. 保持 change open，等待 #645 合併。（已完成——#645 已合併）
3. 讀取已合併 HTML 與 #645 acceptance，更新 design／delta 以解決全部 open decisions。（已完成，見本次 2026-09-18 Design Amendment PR；canonical `specs/foundation/002-user-path-map-freshness-check/spec.md` 的 FR／AC 措辭與版本號依規則不在本 PR 內修改，待本 checkpoint 步驟 4～5 完成後、於 Stage 2 apply／archive 既定回寫步驟同步。）
4. 重跑 OpenSpec schema validation 與 Project SDD lint，取得使用者第二次明確確認。（待辦——本 amendment PR 只回報 gate 結果，不視同第二次確認）
5. 完成 Stage 2 Red／Green，先在真實 repository 手動證明 checker exit `0`。
6. 最後才新增 production job、direct local command 與 registry mapping。
7. final PR group 完成 Source-Verify 與 archive/write-back；合併後更新 STATUS 並移動 canonical spec。

Rollback 時先移除外部 required-check expectation，再回復 production job、direct local command 與 registry mapping；不得把缺少 production job 描述為 freshness success。Stage 1 regression 可獨立保留。

## Risks / Trade-offs

- [Stage 1 checker 被誤當成完整功能] → help 與正式 invocation 明確表示 authority 尚未 activation；CI 只跑 fixtures，不對真實 artifact 宣稱 fresh。
- [新增 script 造成 parity gap] → Green scaffold 原子新增 checker 與既有 regression job mapping，Stage 1 final gate 要求零 `CI_JOB_PARITY`。
- [Stage 2 猜測 #645 header] → open decisions 全列為 hard blocker，需 amendment 與第二次使用者確認。
- [production job 太早加入導致 main 永紅] → workflow／`CLAUDE.md` task 明確位於 Stage 2，且以真實 checker exit `0` 為前置條件。
- [缺檔被 temporary pass 隱藏] → 不建立 conditional skip job；Stage 1 根本不接 production invocation，direct invocation 對缺檔 exit `2`。

## Constitution Check（憲法檢查）

- **I. Spec-First**：design 目標與 canonical `## 功能目標` 一致，並以 FR／AC／SC 為實作與驗證邊界。
- **IV. Test-First**：兩階段皆有獨立 QA Red、main 驗證 expected failure、paired Green 與不可改寫 Red contract。
- **X. Change Scope Discipline**：只修改 checker、harness 與必要 CI parity consumers；path map、prototype、inventory、API 與 DB 排除。
- **XVII. CI/CD Quality Gates**：fixture coverage 與 production gate 分離；不以 always-pass 或 permanent-fail job 取代有效 gate。
- **XIX. Environment & Configuration Integrity**：不完整 authority／fingerprint metadata fail closed，CI/local 使用同一 direct command。
- **XX. Source of Truth & Contract Governance**：#645 HTML metadata 與 `scripts/ci-jobs.tsv` 各自維持唯一 authority，不建立第二份 metadata。
- **II. Generalization-First** 與 **III. Data Fairness**：不觸及 task-type runtime、annotator data、ground truth 或 scoring。
