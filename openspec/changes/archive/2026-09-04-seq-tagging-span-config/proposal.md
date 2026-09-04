---
對應 Spec: specs/task-management/013-task-new/spec.md
對應 Issue: #581
基準版本: 013 v6.9.6
目標版本: 013 v7.0.0
---

> **2026-09-04 範圍拆分（維護者決議）**：issue #581 橫跨 9 份 canonical spec，而 Project SDD lint 限制「一個 active change 恰對應一份 canonical spec」。維護者裁定**拆成三個依序執行的核心 change**，而非沿用 issue #596 的「單一 change + `deferred/`」模式（該模式已留下一筆至今未還的 companion change 技術債）。本 change 是三者中的第一個，只處理 **producer-side（013 任務建立時的設定契約與 Step 2 預覽）**：
>
> | 順序 | change | 對應正典 | 範圍 |
> |------|--------|---------|------|
> | ① 本 change | `seq-tagging-span-config` | `specs/task-management/013-task-new/spec.md` | Step 2 設定欄位與標記預覽改拖曳圈選；ADR-031 標為 Superseded |
> | ② 後續 | 待命名 | `specs/annotation/015-annotation-workspace/spec.md` | 標記工作區拖曳圈選、`spans[]` 儲存契約、審核差異比對 |
> | ③ 後續 | 待命名 | `specs/dataset/017-dataset-analysis-detail/spec.md` | 指標改 span-level、Krippendorff u-α、匯出層 BIO 推導 |
>
> 措辭同步性質的四份正典（`010-task-list`、`dashboard/012`、`014-task-detail`、`dataset/016`）每份僅 1–3 處引用，改動不新增或移除任何 FR／AC，依 CLAUDE.md「Lightweight Path」併入其語意所屬的 change 內處理，不另開 change、不留 `deferred/`。

## Why

`sequence_tagging` 目前採「Token 網格 + 逐 token 指定完整 tag」介面，標記結果以 `tokens[]` 與 `tags[]` 逐位對齊儲存（013 FR-003d-1）。橫向調研六個主流開源標註系統後確認，除 Argilla 外全部採用「拖曳圈選 + 字元 offset」座標系：Label Studio、doccano、brat、INCEpTION、Prodigy 皆以字元 offset 為儲存值，粒度設定只影響**選取吸附**而不影響儲存。

token 座標系在 013 造成三項具體代價：

1. **切換標記單位會破壞既有標記**——`tokenization.unit` 由 `character` 改 `word` 會改變 Token 邊界，既有 tag 全數錯位。013 為此長出一整套防護規則（切換後清除暫存 tag、依新 Token 數重新驗證、數量不一致時阻擋進入 Step 3、預標記與另一單位對齊時提供「切回該單位」或「改用符合目前單位的預標記」兩條出路）。這些規則沒有一條在字元 offset 座標系下需要存在。
2. **預標記數量硬約束**——tag 數量必須等於 Token 數量，不一致即阻擋提交。使用者的資料只要斷詞方式與平台不同就無法使用，而他當初並沒有做錯任何事。
3. **標記受 token 邊界限制**——無法任意起訖。

維護者已於 2026-08-31 與 2026-09-01 兩則 issue 留言逐項拍板全部待決事項（見 issue #581），本 change 據以執行 producer-side 部分。

**本 change 推翻 `docs/adr/031-sequence-tagging-tokenization-contract.md`（Status: Accepted, 2026-07-28）的全部六項決策**——該 ADR 的六項決策全數依附 token 座標系，且其 Alternatives Rejected 一節明文否決字元 offset 方案。維護者已裁定將該 ADR 標為 Superseded。

## What Changes

- **`tagging_scheme` 自任務設定移除（BREAKING）**：`BIO`／`BIOES`／`IOB2`／`SINGLE` 前綴是 token 序列的表示法，在 span 模型下沒有對應物。Step 2 不再出現「標記方案」欄位，`SEQUENCE_TAGGING_SCHEMES` 自 013 規格常數移除。BIO 序列改為**匯出時由 span 決定性推導**，其契約由 change ③ 於 `dataset/017` 定義；013 只負責不再產出該設定欄位。
- **`tokenization` 契約自任務設定移除、改為選取吸附（BREAKING）**：`tokenization`（`{ unit, mode, punctuation, version }`）整組退場，改為單一設定 `snap_unit`。其語意由「切分依據」改為「選取吸附單位」：`character` = 不吸附、`word` = 吸附至詞界。**吸附只影響滑鼠選取的落點，不影響儲存值**，因此切換吸附單位不會使任何既有標記失效。`SEQUENCE_TOKEN_UNITS` 更名為 `SPAN_SNAP_UNITS`（涵蓋 `sequence_tagging` 與 `entity_recognition` 兩者，原名的 `SEQUENCE_` 前綴與 `TOKEN` 語意皆已不成立），`SEQUENCE_TOKENIZATION_VERSION` 與 `SEQUENCE_TOKENIZATION_MODE` 移除。
- **Step 2 標記預覽由 Token 網格改為拖曳圈選（BREAKING）**：預覽以原始文本為單一呈現面，使用者拖曳圈出一段文字後選擇標籤類型，產生 `spans[]`（`{ start, end, label }`，字元 offset）。原本的「先選完整 tag 再點擊 Token」互動、Token 網格、依方案產生的完整 tag 按鈕列（`B-X`／`I-X`／`E-X`／`S-X`／`O`）全部移除。
- **預標記數量硬約束與其兩條出路整組退場（BREAKING）**：可見預標記不再需要與 Token 數量一致，因此「數量不一致即阻擋進入 Step 3」、「錯誤訊息點名另一單位並提供兩條出路」、「切換單位後自資料重新初始化」三條邊界規則一併移除。預標記改以字元 offset 直接落位，落在文本範圍外的 span 才是唯一的錯誤情境。
- **`sequence_tagging` 強制扁平、`entity_recognition` 保留重疊（新約束）**：兩型別改用同一套拖曳圈選 UI 後，可執行的區分規則收斂成一個布林旗標——`sequence_tagging` 的 `allow_overlapping` **鎖死為 `false`**（不是可設定欄位，是型別不變式），保證任何時候都能無損壓成扁平 BIO 序列；`entity_recognition` 維持可設定的 `allow_overlapping`。新增規格常數 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE` 使此規則可被引用與測試。Step 2 欄位數因此為 `sequence_tagging` 三欄（標籤類型／選取吸附／允許無法判定）、`entity_recognition` 四欄（多一個「允許重疊與巢狀」）。
- **`entity_recognition` 新增選取吸附欄位**：兩型別共用同一套圈選元件，吸附行為對 `entity_recognition` 同樣適用；FR-003d-3 同步新增 `snap_unit`。
- **吸附引擎改前端 `Intl.Segmenter`**：`granularity: 'word'`，零後端依賴、零版本凍結需求。ADR-031 決策 6（CKIP／Jieba／PyICU 選型）註銷。不支援時**在標註者端**退回「不吸附」並顯示提示，**任務設定值不得被修改**——吸附是任務屬性而非本機屬性，且吸附結果不進資料，降級產出的 `spans[]` 與其他標註者完全相容。013 為 producer-side，本 change 只規範「設定值不因瀏覽器能力改變」，標註者端的降級提示由 change ② 於 015 承接。

## Capabilities

### New Capabilities

- `task-management/013-task-new`：**span 重疊政策的型別級不變式**（`SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE`）——本版以前 `sequence_tagging` 與 `entity_recognition` 的區分靠「一個逐 token、一個逐 span」的介面差異隱含表達，沒有任何可寫入 spec 或寫成測試的判準。改用同一套 UI 後若不明訂此不變式，兩型別將只差一個顯示名稱。

### Modified Capabilities

- `task-management/013-task-new`：`sequence_tagging` 設定契約與 Step 2 專屬預覽整體改版（FR-003d-1）、`entity_recognition` 新增選取吸附欄位並明訂重疊能力為其專屬（FR-003d-3）、Step 2 預覽互動方式表與設定欄位表的對應列改寫（FR-003c 所屬表格）、規格常數改版（`SEQUENCE_TAGGING_SCHEMES`／`SEQUENCE_TOKENIZATION_VERSION`／`SEQUENCE_TOKENIZATION_MODE` 移除、`SEQUENCE_TOKEN_UNITS` 更名為 `SPAN_SNAP_UNITS`、新增 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE`）、驗收情境 10／11 改寫、`sequence_tagging` 相關邊界情境六條改寫或移除、SC-003x 改寫。

## Impact

**規格**

- 正典：`specs/task-management/013-task-new/spec.md`（v6.9.5 → **v7.0.0**，MAJOR：`tagging_scheme` 與 `tokenization` 契約移除、預標記數量硬約束移除、Step 2 預覽互動全面改寫）
- 衍生檢視：`openspec/specs/013-task-new/spec.md`（archive 時自動合併）。**與既有慣例的偏離（已知並刻意）**：本 change 的 delta 置於 `specs/013-task-new/spec.md`（capability 單層），而非既有封存 change 慣用的 `specs/<module>/<NNN-feature>/spec.md`（雙層）。原因是實測 `@fission-ai/openspec` v1.4.1 的 delta 探索**只認單層 capability 目錄**，雙層路徑會被靜默略過並回報 `Change must have at least one delta`，導致 gate 1 無法通過。此為 repo 既有債而非本 change 引入——把任一封存 change（例如 `2026-09-01-zh-history-action-labels`）複製回 `openspec/changes/` 後執行 `openspec change show <id> --json --deltas-only`，同樣回 `deltaCount: 0`。另行開 `[Bug]` issue 追蹤全庫 delta 路徑遷移與衍生檢視目錄調整；本 change 先採能實際通過 gate 1 的單層路徑。
- 下游（本 change 不修改，由 change ②／③ 承接）：`specs/annotation/015-annotation-workspace/spec.md`（標註者端的 span 標記與審核契約）、`specs/dataset/017-dataset-analysis-detail/spec.md`（指標定義與匯出層 BIO 推導）
- 下游（本 change 不修改，走 Lightweight Path 併入 change ②／③）：`specs/task-management/010-task-list/spec.md`、`specs/dashboard/012-dashboard/spec.md`、`specs/task-management/014-task-detail/spec.md`、`specs/dataset/016-dataset-analysis-list/spec.md` 之措辭同步
- `specs/_shared/constants.md`：經查證**不含**任何 `SEQUENCE_TOKEN_UNITS`／`SEQUENCE_TAGGING_SCHEMES`／`IAA_THRESHOLD_TOKEN` 定義（issue #581 表格所列該列為誤記），本 change 不修改該檔
- 流程同步：`specs/STATUS.md` 之 `task-management-013` 列。**附帶校正**：該列現寫 `spec v6.9.4`，與正典 frontmatter 的 `6.9.5` 不符（v6.9.5 於 2026-08-27 合併時漏更 STATUS），本 change 一併校正至 v7.0.0

**ADR**

- `docs/adr/031-sequence-tagging-tokenization-contract.md`：Status `Accepted` → **`Superseded`**（決策 1–6 全數依附 token 座標系；決策 6 由本 change 的 `Intl.Segmenter` 取代）
- `docs/adr/029-output-type-composition.md`：L111 catalog 之 `sequence_tagging` 的 Annotation UI 與 Scoring Metrics（`token_f1`／`token_accuracy`）——由 **change ③** 一併改為 span-level 後的最終狀態，本 change 不動，避免同一行被三個 change 反覆改寫

**產品文件**

- `docs/product/task-configs/sequence-tagging.json`：範例 config schema 隨設定契約改寫（本 change）
- `docs/product/` 其餘八份文件（`decision-log.md`、`prd.md`、`functional-map/*`、`ia/*`、`milestones.md`、`baseline/*`、`visual-overview/*`、`e2e/issue-180/*`）：敘述層同步，待 change ③ 落地後以單一文件同步 PR 一次處理，避免同一段敘述被三個 change 反覆改寫

**原型程式（Principle X 之產品檔案盤點）**

| 檔案 | 變更 |
|------|------|
| `design/prototype/pages/task-management/task-config.data.js` | `sequence_tagging` 預設 config 移除 `tagging_scheme`／`tokenization`、新增 `snap_unit`；`entity_recognition` 新增 `snap_unit`；示範資料改 `spans[]` |
| `design/prototype/pages/task-management/task-new.html` | Step 2 設定面板欄位數與標題調整 |
| `design/prototype/pages/task-management/task-config.engine.js` | `renderTokenClassPreview`／`getSequencePreviewTokens`／`tokenizeSequenceText` 由拖曳圈選預覽取代 |
| `docs/adr/031-sequence-tagging-tokenization-contract.md` | 標為 Superseded |
| `docs/product/task-configs/sequence-tagging.json` | 範例 config |

共 5 個手寫產品檔案，但預覽渲染改寫的 diff 行數必然超過 300 行，依 Constitution Principle X 拆為三個 stacked PR（詳見 `tasks.md` 的分組與分割計畫）。

**測試**

- `design/prototype/tests/task-management/task-new-output-type-preview.spec.ts`（Token 網格斷言全面重寫）
- 連帶檢查：`task-detail-config-parity` 相關 spec（014 Overview「標記設定」編輯模式經共用引擎同步生效）

**共用引擎的連帶影響**：`task-config.engine.js` 由 `task-new` 與 `task-detail`（014 Overview「標記設定」編輯模式）共用，本 change 的預覽改寫會同步改變 014 的 parity surface。這是既有的共用設計（013 v6.5.0／v6.6.0／v6.8.0 皆同此路徑），非本 change 引入；014 的正典措辭同步依 Lightweight Path 於 change ② 處理。

## Constitution Check

| 原則 | 檢核 |
|------|------|
| **Generalization-First（NON-NEGOTIABLE）** | ✅ 通過，且**強化**。改版後 `sequence_tagging` 與 `entity_recognition` 共用同一套圈選元件與同一組指標，差異收斂為單一 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE` 布林規則，由 registry 驅動。原先「逐 token 網格」是 `sequence_tagging` 專屬的硬編介面路徑，本版將其消除。`snap_unit` 為 config 欄位而非硬編任務邏輯。 |
| **Data Fairness（NON-NEGOTIABLE）** | ✅ 通過。本 change 僅改任務建立時的設定契約與 Step 2 預覽，不觸及 test-set ground-truth 的可見性界線；Step 2 預覽沿用既有的「只取用角色為 Input／Output 的欄位」規則（FR-003g-5），不新增資料讀取路徑。 |
| **Principle X（PR 規模）** | ⚠️ 需拆分。5 個手寫產品檔案已達檔案數上限，且預覽改寫 diff 必然 > 300 行 → 拆為三個 stacked PR，計畫寫入 `tasks.md`。 |
| **TDD** | ✅ 每項可觀察行為皆配對 `[@senior-qa]` Red 任務與 Green 實作任務，Red 須先提交並留下預期失敗證據。 |
| **PR Single Purpose** | ✅ 三個 PR 各自單一目的：PR A =「移除 `tagging_scheme` 與 `tokenization`、改為 `snap_unit` 設定欄位」；PR B =「Step 2 預覽改為拖曳圈選」；PR C =「ADR-031 標為 Superseded 並回寫正典」。 |
| **Simplicity First** | ✅ 本 change 淨移除的規格條文多於新增：`tagging_scheme` 欄位、`tokenization` 四欄契約、預標記數量硬約束、切換單位的三條防護規則、兩條出路的錯誤訊息分支全部消失，換入一個 `snap_unit` 欄位與一條重疊政策。 |
