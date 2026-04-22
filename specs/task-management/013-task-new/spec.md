# 功能規格：New Task — 新增任務（Step 1–4 + 啟動設定 + 標記設定檔）

**功能分支**：`013-task-new`
**建立日期**：2026-04-20
**版本**：1.8.4
**狀態**：Draft
**需求來源**：IA Spec 清單 #013 — 新增任務（Step 1–4 + 啟動設定 + 標記設定檔 全任務類型）（`task-new`）

## 規格常數

- `SYSTEM_ROLES = user | super_admin`
- `TASK_ROLES = project_leader | reviewer | annotator`
- `TASK_CREATION_STEPS = step-1-basic | step-2-config-builder | step-3-startup-settings | step-4-guideline`
- `TASK_TYPE_ENUM = single_sentence_classification | single_sentence_scoring_regression | sequence_labeling | relation_extraction | sentence_pairs`
- `TASK_CONFIG_MODES = visual | code`
- `CONFIG_FORMATS = yaml | json`
- `CONFIG_UPLOAD_FORMATS = yaml | yml | json`
- `TASK_CREATOR_SYSTEM_ROLES = user | super_admin`
- `DATASET_UPLOAD_FORMATS = txt | csv | tsv | json`
- `DATASET_MAX_FILE_SIZE_MB = 200`
- `DATASET_MAX_ROWS = 1000000`
- `DATASET_ENCODING = utf-8`
- `GUIDELINE_FORMATS = pdf | image | markdown`
- `GUIDELINE_IMAGE_FORMATS = png | jpg | jpeg | webp`
- `RUN_INIT_SAMPLING_MODES = by_count | by_percentage`
- `RUN_INIT_PERCENT_RANGE = 1..99`
- `RUN_INIT_COUNT_MIN = 1`
- `RUN_ISOLATION_DEFAULT = enabled`
- `INITIAL_MEMBER_SOURCES = platform-users | email-invite`
- `PLATFORM_MEMBER_ROLE_FILTER = system_role == user`
- `IDEMPOTENCY_WINDOW_HOURS = 24`
- `MOBILE_BP = 767px`
- `RWD_VIEWPORTS = 375px / 768px / 1440px`

## Process Flow

```mermaid
sequenceDiagram
    actor U as User / Super Admin
    participant UI as task-new
    participant API as Task API
    participant Registry as task_type registry
    participant DB as Database

    U->>UI: 進入 /task-new
    UI-->>U: 顯示 Step 1（基本資料）

    U->>UI: 填寫任務名稱、上傳資料集、選擇 task_type
    UI->>Registry: 載入該 task_type schema
    Registry-->>UI: 回傳 schema

    U->>UI: 進入 Step 2（標記設定檔）
    UI-->>U: 上方顯示標記預覽；下方左側顯示「範本/上傳設定檔 + schema 欄位」、右側顯示 YAML/JSON code 區

    U->>UI: 進入 Step 3（啟動設定）
    U->>UI: 設定成員管理與抽樣方式（試標抽樣、資料隔離）

    U->>UI: 進入 Step 4（標記說明）
    U->>UI: 上傳說明 / 設定是否強制顯示

    U->>UI: 點擊建立任務
    UI->>API: 提交任務 payload（含 startup settings）
    API->>DB: 建立 Task
    API->>DB: 建立 task_membership (creator -> project_leader)
    API->>DB: 建立初始任務成員（reviewer/annotator）
    API->>DB: 寫入初始執行設定（試標抽樣、資料隔離）
    DB-->>API: 建立成功
    API-->>UI: 回傳 task_id
    UI-->>U: 導向 /task-detail?task_id=...
```

| 步驟 | 角色 | 動作 | 系統回應 |
|------|------|------|---------|
| 1 | `user` / `super_admin` | 進入 `/task-new` | 顯示 Step 1 基本資料 |
| 2 | `user` / `super_admin` | 選擇 `task_type` | 載入對應 schema 與 Step 2 設定介面 |
| 3 | `user` / `super_admin` | 完成 Step 2 標記設定檔 | 產生可提交的 config |
| 4 | `user` / `super_admin` | 完成 Step 3 啟動設定 | 記錄初始成員與抽樣方式設定 |
| 5 | `user` / `super_admin` | 完成 Step 4 標記說明設定（可略過） | 記錄說明資產與強制顯示設定 |
| 6 | `user` / `super_admin` | 建立任務 | 建立 task、creator 的 `project_leader` membership、初始成員、初始執行設定 |
| 7 | `user` / `super_admin` | 取消建立流程 | 導回 `/task-list` |

---

## 使用者情境與測試 *(必填)*

### User Story 1 — 完成 4 步驟任務建立流程（優先級：P1）

使用者可透過 Step 1 → Step 2 → Step 3 → Step 4 完成任務建立，並在成功後進入任務詳情頁。

**此優先級原因**：建立任務是整個任務生命週期的起點。  
**獨立測試方式**：依序填完四步驟並提交，驗證建立成功、導頁、membership 建立。

**驗收情境**：

1. **Given** 已登入且可使用任務管理模組，**When** 完成 Step 1~4 並提交，**Then** 成功建立任務且導向 `/task-detail?task_id=...`。
2. **Given** 建立成功，**When** 檢查任務成員資料，**Then** 建立者自動有一筆 `project_leader` 的 `task_membership`。
3. **Given** 正在建立流程中，**When** 點擊取消，**Then** 導回 `/task-list` 且不建立任務。

**介面定義（需與 IA 導覽語意一致）**：

- Step 1：`基本資料`
  - 必要欄位：`task_name`、`dataset_file`、`task_type`
  - 畫面元素：`task_name` 單行輸入、`dataset_file` 上傳區（顯示檔名/大小/格式）、`task_type` 下拉選單
- Step 2：`標記設定檔`
  - 必要元素：task-type 模板入口、設定檔上傳入口、schema 驅動設定面板、YAML/JSON 切換與 code 編輯區、實際標記預覽區
  - 畫面元素：上方預覽區、下方左側「範本/上傳設定檔」區塊 + schema 設定區、下方右側 code 區、欄位級錯誤訊息
  - 研究情境必備任務型別（第一層）：
    - `single_sentence_classification`（含多標籤）
    - `single_sentence_scoring_regression`（VA 評分 / 回歸）
    - `sequence_labeling`（含 Aspect 抽取 / NER）
    - `relation_extraction`（Entity + Relation + Triple，可擴充五元組）
  - 延伸任務型別（第二層）：`sentence_pairs`（相似度 / 蘊含）
- Step 3：`啟動設定`
  - 必要元素：成員管理（至少可加入 `reviewer` / `annotator`）、抽樣方式（試標抽樣 + 資料隔離）
  - 畫面元素：成員來源切換 tabs（`平台使用者` / `Email 邀請`）、目前成員清單、可加入成員名單、角色指派控制、抽樣模式切換（筆數/百分比）、抽樣數值輸入、資料隔離開關與說明
  - 成員來源 A（`平台使用者`）：下拉選單只顯示可加入使用者（`PLATFORM_MEMBER_ROLE_FILTER`），placeholder 為「選擇使用者」
  - 成員來源 B（`Email 邀請`）：輸入 email 並寄送邀請連結，邀請成功後加入初始成員清單（待啟用）
- Step 4：`標記說明`
  - 必要元素：可直接編輯之說明內容區塊、上傳檔案區塊（PDF/圖片/Markdown）、`開始標記前強制顯示` 開關
  - 畫面元素：說明內容 textarea、上傳列表（可移除）、強制顯示 toggle
- 操作列：`上一步`、`下一步`、`取消`、`建立任務`

**行為規則**：

- 僅 `TASK_CREATOR_SYSTEM_ROLES` 可進入 `/task-new` 並提交建立任務。
- 未完成當前步驟必要欄位不得進入下一步。
- Step 3 必須完成首次啟動設定（成員管理、抽樣方式）才可進入 Step 4。
- 建立成功前不得寫入正式任務資料。
- 建立成功後導向 `task-detail`，L0 active 保持「任務管理」。

**Prototype 互動規格（本版必做）**：

- Step 1 `下一步` 按鈕預設 disabled；當且僅當 `task_name` 非空、已選 `task_type`、dataset 檔案通過格式/大小/編碼檢查後 enabled。
- Step 2 `下一步` 按鈕預設 disabled；schema 必填欄位通過且無 parser/schema error 才 enabled。
- Step 2 在 code 有未儲存變更時，`下一步` 必須維持 disabled 並提示先儲存；不得自動覆寫/自動儲存 code。
- Step 3 `下一步` 按鈕預設 disabled；至少需有 1 位 `annotator` 且試標初始化設定通過驗證才 enabled。
- Step 3 成員管理需支援 `INITIAL_MEMBER_SOURCES` 兩種來源，且來源切換不應清空已加入成員。
- Step 3 成員管理需阻擋重複加入（同一 email 不得重複出現在初始成員清單）。
- Step 4 的 `建立任務` 按鈕永遠可見；Step 4 為選填，未上傳說明也可提交。
- 任一步驟點擊 `取消` 或離開頁面（側欄跳轉、重新整理、關閉分頁）時，若已有變更需顯示「離開將遺失未儲存內容」確認視窗。
- 驗證錯誤顯示採欄位下方 inline message + 頁首 toast；訊息需指出欄位名稱與修正方向。
- 在 `375px` viewport 下，Step 3 成員輸入列需採垂直堆疊（欄位與按鈕滿寬）以避免擁擠。

---

### User Story 2 — 標記設定檔以 registry/schema 驅動（優先級：P1）

Step 2 必須由 `task_type registry` 與 schema 驅動，不得把任務類型寫死在核心流程。

**此優先級原因**：符合架構要求「新增 task type 不需修改核心流程」。  
**獨立測試方式**：切換不同 `task_type`，驗證 UI 與校驗規則由 schema 自動生成；左側 schema 與右側 code 內容一致。

**驗收情境**：

1. **Given** 在 Step 2 且已選擇 `task_type`，**When** 載入頁面，**Then** 以對應 schema 產生設定欄位。
2. **Given** 在 Step 2，**When** 調整 schema 欄位，**Then** 右側 code 區需即時呈現等價 YAML/JSON config。
3. **Given** 在右側 code 區手動修改設定，**When** 點擊 `儲存`，**Then** 能映射欄位需同步更新；無效設定需顯示錯誤。
4. **Given** 平台新增一種 task type 到 registry，**When** 使用者進入 Step 1/Step 2，**Then** 可選到新型別並看到對應設定，無需變更核心流程。
5. **Given** 使用者在 Step 2 上傳 `.yaml/.yml/.json` 設定檔，**When** 讀取成功，**Then** code 區應載入檔案內容、切換對應格式並要求使用者按儲存套用。
6. **Given** 使用者切換語言（zh/en），**When** 當前 labels 仍為預設模板值，**Then** Step 2 預覽、schema 標籤與 code labels 應同步切換為對應語系文案。

**介面定義**：

- 區塊 A：`標記預覽（上方）`
  - 必要元素：示例文本、可選標記/實體預覽（非 YAML 純文字）
- 區塊 B：`設定區（下方左側）`
  - 必要元素：`從範本開始或者上傳設定檔` 區塊、schema 驅動欄位、即時校驗訊息
  - 必要預設模板：
    - 多標籤分類模板（對應 MultiLabel 實務）
    - 單句評分 / 回歸模板（對應 VA 實務）
    - 序列標記模板（對應 Aspect / NER 實務）
    - 關係抽取模板（對應 Entity + Relation + Triple 實務）
- 區塊 C：`Code 區（下方右側）`
  - 必要元素：YAML/JSON 切換、可編輯區、`儲存` 按鈕、格式與 schema 驗證結果

**行為規則**：

- `task_type` 選項來源必須為 registry，而非前端硬編碼清單。
- 左側 schema 欄位與右側 code 區需共享同一份結構化 config source-of-truth。
- 提交前需通過 schema 驗證；失敗不得進入任務建立 API。
- schema 欄位變更時，右側 code 區需輸出最新 YAML/JSON（由同一 source-of-truth 產生）。
- 上方預覽需呈現「可操作的標記樣式」（示例文本 + 可選標籤/實體），並隨 schema 欄位變更即時更新。
- 上方預覽之「可選標記」checkbox 必須可實際勾選；單選任務（評分、句對、單句分類且不允許多選）應限制一次一個選項。
- code 內容儲存成功後，左側 schema 欄位需即時重建並顯示更新結果；儲存失敗需顯示可定位錯誤且保留使用者輸入。
- 預覽示例文本需依任務型別切換（分類/評分/序列標記/關係抽取/句對）。
- 研究生目前實際任務需可直接對應至既有模板：
  - MultiLabel 勾選分類 -> `single_sentence_classification`
  - VA 分數標記 -> `single_sentence_scoring_regression`
  - Aspect 抽取 / 校正 -> `sequence_labeling`
  - Entity + Relation + Triple（五元組流程）-> `relation_extraction`

---

### User Story 3 — 啟動設定前置於任務建立（優先級：P1）

Project Leader 在建立任務時必須先完成啟動設定，包含成員管理與抽樣方式，確保任務建立後可直接進入可執行狀態。

**此優先級原因**：避免建立完成後仍缺關鍵啟動條件，造成任務狀態與操作入口割裂。  
**獨立測試方式**：於 Step 3 完成成員與抽樣方式後建立任務，驗證任務詳情可直接讀取初始設定。

**驗收情境**：

1. **Given** 位於 Step 3，**When** 加入成員並指定任務角色，**Then** 建立後可在 task-detail member-management 看到相同初始成員。
2. **Given** 位於 Step 3，**When** 設定試標抽樣（筆數或百分比）與資料隔離，**Then** 建立後可在 task-detail overview 看到一致的抽樣方式設定。
3. **Given** 位於 Step 3，**When** 未指派任何 `annotator` 或抽樣設定無效，**Then** 不可進入 Step 4 並顯示可修正錯誤訊息。

**行為規則**：

- Step 3 必須提供任務內成員指派功能（可加入 `reviewer`、`annotator`）。
- 成員來源需支援：
  - `platform-users`：來源為「使用者管理」名單，且僅限 `PLATFORM_MEMBER_ROLE_FILTER`。
  - `email-invite`：輸入有效 email 後可寄送邀請連結，並加入初始成員清單。
- `platform-users` 來源的「選擇使用者」下拉選單不得顯示 system role 文案（僅顯示使用者資訊）。
- 已加入成員必須從 `platform-users` 可選名單中排除；移除成員後需重新可選。
- `email-invite` 必須驗證 email 格式，格式錯誤需阻擋加入並顯示可修正訊息。
- 任一來源皆需阻擋重複成員（同 email）。
- Step 3 完成條件至少包含 1 位 `annotator` 為 `active`。
- Step 3 必須提供試標初始化：
  - 抽樣模式：`by_count` 或 `by_percentage`
  - 抽樣驗證：百分比僅允許 `RUN_INIT_PERCENT_RANGE`；筆數需 `>= RUN_INIT_COUNT_MIN` 且 `< 資料集總筆數`
  - 百分比換算筆數採 `floor(total * percent / 100)`；若結果 `< 1` 必須阻擋前進
- Step 3 資料隔離開關預設 `RUN_ISOLATION_DEFAULT`。
- Step 3 僅做首次初始化；後續調整由 `task-detail` 負責。

---

### User Story 4 — 標記說明與強制顯示設定（優先級：P2）

Project Leader 在建立任務時可設定標記說明資產，並決定 annotator 進入作業前是否強制顯示。

**此優先級原因**：可降低任務啟動時的學習成本與操作錯誤。  
**獨立測試方式**：上傳說明資產並啟用強制顯示，驗證設定儲存到任務並可供 annotation 模組使用。

**驗收情境**：

1. **Given** 位於 Step 4，**When** 上傳說明文件並完成建立，**Then** 任務保存對應說明資產。
2. **Given** 位於 Step 4，**When** 啟用 `開始標記前強制顯示`，**Then** 任務設定需紀錄此旗標供 annotation-workspace 讀取。

**行為規則**：

- Step 4 應提供可直接編輯的說明內容文字區塊（textarea），並可與上傳檔案並行使用。
- 支援 `GUIDELINE_FORMATS`，其中 `image` 僅允許 `GUIDELINE_IMAGE_FORMATS`；超出格式需阻擋並提示。
- Step 4 為選填，不填仍可建立任務。
- 強制顯示設定預設為關閉。

---

### Edge Cases

- 非 `TASK_CREATOR_SYSTEM_ROLES` 造訪 `/task-new`：導回允許入口並顯示無權限提示。
- 上傳資料集格式不在 `DATASET_UPLOAD_FORMATS`：阻擋進下一步並顯示錯誤。
- 上傳資料集超過 `DATASET_MAX_FILE_SIZE_MB`、非 `DATASET_ENCODING` 或超過 `DATASET_MAX_ROWS`：阻擋進下一步並顯示可定位錯誤。
- 切換 `task_type` 後已填 Step 2 設定不相容：提示重置或轉換失敗欄位。
- Code 區輸入非有效 YAML/JSON：保留輸入內容並顯示可定位錯誤。
- Step 3 未加入任何 `annotator`：阻擋進入 Step 4。
- Step 3 `platform-users` 未選擇任何使用者即點擊加入：顯示錯誤並維持原狀。
- Step 3 `email-invite` 輸入無效 email：阻擋寄送邀請連結並提示有效格式。
- Step 3 嘗試加入已存在成員（同 email）：阻擋加入並顯示重複提示。
- Step 3 抽樣輸入為 `0%`、`100%`、`0 筆`、或 `>= 資料集總筆數`：阻擋進入 Step 4 並顯示修正提示。
- 使用者在 Step 1~4 有變更後直接離頁：需先跳確認視窗，選擇「離開」才可導頁。
- 建立中（submit pending）重複點擊 `建立任務`：按鈕進入 loading 並禁止重複提交。
- 建立任務 API 成功但 membership 建立失敗：整體交易需回滾，避免孤兒任務。
- 網路中斷導致重送：同一 `Idempotency-Key` 於 `IDEMPOTENCY_WINDOW_HOURS` 內必須回傳同一 `task_id`，不得重複建立任務。

---

## 需求規格 *(必填)*

### 功能需求

- **FR-001**：系統必須提供 `/task-new` 四步驟建立流程（Step 1/2/3/4）。
- **FR-001a**：僅 `TASK_CREATOR_SYSTEM_ROLES` 可進入 `/task-new` 與呼叫建立任務 API。
- **FR-002**：Step 1 必須要求任務名稱、資料集、`task_type`。
- **FR-002a**：資料集上傳必須限制於 `DATASET_UPLOAD_FORMATS`，且符合 `DATASET_MAX_FILE_SIZE_MB`、`DATASET_MAX_ROWS`、`DATASET_ENCODING`。
- **FR-003**：Step 2 標記設定檔必須由 `task_type registry` 與 schema 驅動。
- **FR-003a**：Step 2 必須採單頁佈局：上方標記預覽、下方左側 schema 設定區、下方右側 code 區。
- **FR-003a-1**：Step 2 左側必須先顯示「從範本開始或者上傳設定檔」區塊，再顯示 schema 欄位。
- **FR-003b**：schema 設定區與 code 區必須同步同一份 config，並在提交前通過 schema 驗證。
- **FR-003c**：新增 task type 應可透過 registry/schema 擴充，不修改核心流程（Step 1–4）。
- **FR-003d**：系統預設必須至少提供研究情境第一層任務型別：`single_sentence_classification`、`single_sentence_scoring_regression`、`sequence_labeling`、`relation_extraction`。
- **FR-003e**：code 區必須支援可編輯 YAML/JSON，並提供 `儲存` 操作以套用回 schema 設定欄位。
- **FR-003f**：當 code 區有未儲存變更且使用者嘗試進入下一步時，系統必須阻擋前進並提示先儲存；不得自動儲存。
- **FR-003g**：Step 2 上方必須提供實際標記預覽區，顯示示例文本與可標記選項，且在設定變更時即時同步更新。
- **FR-003h**：Step 2 必須支援上傳 `CONFIG_UPLOAD_FORMATS` 設定檔，載入至 code 區並由使用者手動儲存套用。
- **FR-003i**：Step 2 預設模板需支援 i18n（至少 zh/en）；切換語言時，若使用中為預設 labels，需同步轉換為對應語言 labels。
- **FR-004**：Step 3 必須支援啟動設定，包含成員管理與抽樣方式。
- **FR-004a**：Step 3 必須允許加入任務成員並指派 `reviewer` 或 `annotator`。
- **FR-004a-1**：Step 3 成員管理必須支援 `INITIAL_MEMBER_SOURCES` 兩種來源：`platform-users` 與 `email-invite`。
- **FR-004a-2**：`platform-users` 來源必須只顯示符合 `PLATFORM_MEMBER_ROLE_FILTER` 的使用者，且已加入成員不可再次被選取。
- **FR-004a-3**：`email-invite` 來源必須支援 email 格式驗證、寄送邀請連結與加入初始成員清單。
- **FR-004a-4**：成員加入必須以 email 作為唯一鍵，阻擋重複成員。
- **FR-004b**：Step 3 完成條件至少需包含 1 位 `active annotator`。
- **FR-004c**：Step 3 必須提供試標初始化，支援 `RUN_INIT_SAMPLING_MODES`。
- **FR-004d**：試標抽樣驗證必須明確：百分比 `RUN_INIT_PERCENT_RANGE`；筆數 `>= RUN_INIT_COUNT_MIN` 且 `< 資料集總筆數`。
- **FR-004e**：Step 3 必須提供資料隔離開關，預設值為 `RUN_ISOLATION_DEFAULT`。
- **FR-005**：Step 4 必須支援標記說明資產上傳與強制顯示設定。
- **FR-005a**：Step 4 指南格式必須支援 `GUIDELINE_FORMATS`，其中 `image` 受限於 `GUIDELINE_IMAGE_FORMATS`。
- **FR-005b**：Step 4 必須提供可直接編輯的說明內容欄位，且此欄位應可獨立於上傳檔案存在。
- **FR-006**：提交成功後，系統必須建立任務並導向 `/task-detail`。
- **FR-006a**：任務建立成功時，系統必須自動建立一筆 `task_membership`，並將建立者設為 `project_leader`。
- **FR-006b**：若 Step 3 已設定初始成員，系統必須一併建立對應 `task_membership`。
- **FR-006c**：若 Step 3 已設定抽樣方式，系統必須於任務建立時一併保存。
- **FR-006d**：建立任務 API 必須支援 `Idempotency-Key`；同一 key 在 `IDEMPOTENCY_WINDOW_HOURS` 內重送時回傳同一 `task_id`。
- **FR-007**：取消建立流程時，系統必須導回 `/task-list` 且不寫入任務。
- **FR-007a**：使用者在任一步驟已有未儲存變更時，離頁前必須顯示確認視窗（含取消建立、側欄跳頁、重新整理、關閉分頁）。
- **FR-008**：頁面必須支援 `RWD_VIEWPORTS`，在 `<= MOBILE_BP` 仍可完成四步流程。
- **FR-008a**：在 `375px`、`768px`、`1440px` 三個 viewport，必須可完成：Step 1 填寫與驗證、Step 2 預覽/設定/code 編輯與驗證、Step 3 成員與抽樣方式、Step 4 上傳或略過、建立成功導頁、取消返回。
- **FR-008b**：在 `375px` 下，Step 3 成員輸入列必須採垂直堆疊與滿寬控制項，避免輸入框與按鈕擁擠或截斷。
- **FR-009**：任務型別模板需覆蓋研究生現行任務情境（MultiLabel、VA 評分、Aspect 抽取、Entity/Relation/Triple）。

### User Flow & Navigation

```mermaid
flowchart LR
    tasklist["/task-list"] --> tasknew["/task-new"]
    tasknew --> step1["Step 1 基本資料"]
    step1 --> step2["Step 2 標記設定檔"]
    step2 --> step3["Step 3 啟動設定"]
    step3 --> step4["Step 4 標記說明"]
    step4 -->|建立成功| taskdetail["/task-detail?task_id="]
    step1 -->|取消| tasklist
    step2 -->|取消| tasklist
    step3 -->|取消| tasklist
    step4 -->|取消| tasklist
```

| From | Trigger | To |
|------|---------|-----|
| `/task-list` | 點擊 `新增任務` | `/task-new` |
| Step 1 | 點擊 `下一步`（驗證通過） | Step 2 |
| Step 2 | 點擊 `下一步`（驗證通過） | Step 3 |
| Step 3 | 點擊 `下一步`（驗證通過） | Step 4 |
| Step 4 | 點擊 `建立任務`（提交成功） | `/task-detail?task_id=...` |
| 任一步驟 | 點擊 `取消` | `/task-list` |

**Entry points**：`/task-list` 的 `新增任務` CTA。  
**Exit points**：建立成功進 `/task-detail`、取消返回 `/task-list`。

---

### 關鍵實體

- **TaskDraftInput**：建立任務輸入草稿。欄位：`task_name`、`dataset`、`task_type`、`config`、`initial_members`、`run_init`、`guideline_assets`、`force_guideline`。
- **TaskTypeRegistryItem**：任務類型定義。欄位：`task_type`、`display_name`、`schema`、`default_templates`。
- **TaskConfig**：schema 驗證後設定內容（供 annotation/dataset 模組使用）。
- **TaskMembership**：建立者自動加入的任務角色關係，及 Step 3 指派的初始成員關係。
- **RunInitConfig**：首次啟動設定。欄位：`sampling_mode`、`sampling_value`、`isolation_enabled`。

---

## 規格相依性 *(本功能依賴其他規格，或被其他規格依賴時填寫)*

### 上游（本規格依賴的規格）

| 規格編號 | 功能 | 本規格需要的內容 |
|---------|------|----------------|
| 010 | Task List | 新增任務入口與導覽關係 |
| 001 | Login — Email / Password | 已登入狀態與身份識別 |
| 008 | Shared Sidebar Navbar | L0 active 與跨頁導覽一致性 |

### 下游（依賴本規格的規格）

| 規格編號 | 功能 | 依賴本規格的內容 |
|---------|------|----------------|
| 014 | Task Detail | 建立成功後導向與初始任務資料（含成員與抽樣方式） |
| 015 | Annotation Workspace | 讀取 task config 與標記說明設定 |
| 016 | Dataset Stats | 依 `task_type` 與 config 呈現統計 |
| 017 | Dataset Quality | 依 `task_type` 與 config 計算品質指標 |

---

## 成功標準 *(必填)*

- **SC-001**：使用者可在同一流程完成 Step 1~4 並成功建立任務。
- **SC-002**：任務建立成功後，自動建立 creator 的 `project_leader` membership。
- **SC-002a**：Step 3 設定的初始成員可於建立後在 task-detail member-management 正確呈現。
- **SC-002b**：Step 3 設定的抽樣方式可於建立後在 task-detail overview 正確呈現。
- **SC-002c**：Step 3 可透過 `platform-users` 或 `email-invite` 兩種來源新增成員，建立後皆可在 task-detail 正確呈現。
- **SC-003**：Step 2 可依 registry/schema 產生設定介面，且 schema 設定區與 code 區內容一致。
- **SC-003a**：Step 2 上方預覽可呈現接近實際標記介面，並可反映當前 labels/entities/scoring 設定。
- **SC-003b**：Step 2 預覽可勾選標記選項；單選情境一次僅可勾選一個。
- **SC-003c**：Step 2 預覽示例文字會依任務型別切換，不同任務看到對應語意情境。
- **SC-004**：新增 task type 到 registry 後，可直接在流程中使用，不需改核心流程程式碼。
- **SC-004a**：研究生現行四種任務情境（MultiLabel、VA 評分、Aspect 抽取、Entity/Relation/Triple）可在 `task-new` 以預設模板完成設定。
- **SC-004b**：在 code 區編輯 YAML/JSON 後，點擊 `儲存` 可立即回填並反映於 schema 欄位；格式錯誤時不覆蓋既有設定。
- **SC-004c**：上傳 `.yaml/.yml/.json` 設定檔後，code 區可載入內容並等待使用者手動儲存套用。
- **SC-004d**：切換 zh/en 時，新增任務頁 sidebar 與 Step 2 預設模板 labels 皆可正確切換語系。
- **SC-005**：在 `375px`、`768px`、`1440px` 下皆可完成：Step 1 填寫與驗證、Step 2 預覽/設定/code 驗證、Step 3 成員與抽樣方式、Step 4 上傳或略過、建立成功導頁、取消返回，且驗證錯誤可被清楚定位。
- **SC-005a**：在 `375px` 下，Step 3 的 `email-invite` 成員輸入區不擁擠（欄位垂直排列且控制項可完整輸入/點擊）。
- **SC-006**：非 `TASK_CREATOR_SYSTEM_ROLES` 不可建立任務；同一 `Idempotency-Key` 於 `IDEMPOTENCY_WINDOW_HOURS` 內重送不會重複建立任務。

---

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.8.4 | 2026-04-22 | Step 3 用詞同步：將「執行初始化」統一改為「抽樣方式」（含流程、介面定義、FR/SC 與跨規格依賴描述） |
| 1.8.3 | 2026-04-22 | 同步 prototype 建立成功導向：Step 4 點擊 `建立任務` 成功後，改為導向 `task-detail?task_id=...`（不再返回 task-list） |
| 1.8.2 | 2026-04-22 | `TASK_TYPE_ENUM` 改為與 Step 1 任務類型下拉實際 value 完全一致：`single_sentence_classification / single_sentence_scoring_regression / sequence_labeling / relation_extraction / sentence_pairs`（不含生成式標記） |
| 1.8.1 | 2026-04-22 | 補充共用常數：`TASK_TYPE_ENUM = Single Sentence | Sequence Labeling | Sentence Pairs | Generative Labeling`，與 `010-task-list` 對齊 |
| 1.0.0 | 2026-04-20 | 初版建立：依 IA 重建 `task-new` 規格（三步流程、registry-driven 標記設定檔、說明設定） |
| 1.1.0 | 2026-04-20 | 補強 prototype 導向規格：步驟按鈕啟用條件、離頁確認、Visual/Code 同步策略、空/有資料狀態與錯誤呈現規則 |
| 1.2.0 | 2026-04-20 | 同步 IA：新增研究情境任務型別覆蓋（MultiLabel/VA/Aspect/Relation）；將 FR-008 改為任務覆蓋要求 |
| 1.3.0 | 2026-04-20 | 同步 Code 編輯需求：新增 `儲存到 Visual` 行為、Code->Visual 儲存失敗停留規則、對應 FR/SC |
| 1.4.0 | 2026-04-20 | Step 2 Visual 預覽由 YAML 改為實際標記介面預覽（示例文本 + 可選標記），並新增對應 FR/SC |
| 1.5.0 | 2026-04-20 | Step 2 版面重排：移除 Visual/Code 切頁，改為上方預覽 + 下方左設定右 code，並將範本區移至任務說明下方 |
| 1.6.0 | 2026-04-21 | 同步 prototype 最新行為：範本/上傳設定檔移回 Step 2 左側；新增 config 檔上傳（YAML/YML/JSON）；code 未儲存阻擋下一步；預覽可勾選與任務別示例文本；Step 3 改為說明內容可編輯 + 上傳檔案分離；新增任務頁 sidebar i18n 補齊 |
| 1.7.0 | 2026-04-21 | 流程改為四步：新增 Step 3 啟動設定（成員管理 + Run 初始化），原標記說明改為 Step 4；同步更新流程圖、FR、SC、關鍵實體與導覽 |
| 1.7.1 | 2026-04-21 | 同步用詞本地化：將 Step 3 相關描述由 Run/Draft/dataset_total/Dry Run/Official Run 改為「執行初始化／試標抽樣／資料集總筆數／試標與正式標記」 |
| 1.8.0 | 2026-04-21 | 同步 Step 3 成員管理雙來源：新增 `platform-users`（僅 system role=user）與 `email-invite`（寄送邀請連結）規格；補充重複成員阻擋、email 驗證、mobile（375px）輸入列堆疊規則與對應 FR/SC |
