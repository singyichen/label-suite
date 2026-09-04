# 任務清單：sequence_tagging 座標系改字元 offset — producer-side（issue #581 change ①）

> **拆分總則（憲法原則 X）**：本變更觸及 5 個手寫產品檔案（已達 5 檔上限），且 Step 2 預覽渲染改寫的 diff 必然超過 300 行，故拆為 **2 組實作 stacked PR ＋ 1 組最終 archive PR**。每組宣告其涵蓋的 FR、觸及的產品檔案、Red 任務與 Green 任務。**只有最終群組執行 `/opsx:archive` 與正典回寫**；群組 1–2 於 OpenSpec change 保持開啟的狀態下先行合併。
>
> **TDD 硬規則**：每個可觀察行為皆為一組 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，Green 任務才能開始；Green 任務不得為了讓測試通過而改寫 Red 契約。任務 checkbox 僅由主 session 勾選。
>
> **產品檔案計數**：測試檔、`specs/**`、`openspec/**`、工具設定檔不計入 5 檔上限。
>
> **群組間相依**：群組 1 → 2 → 3 嚴格序列。群組 1 的設定欄位是群組 2 預覽渲染的輸入；群組 3 的正典回寫需在前兩組的行為全部落地後才具備 Source-Verify 依據。群組內未以 `<!-- parallel:start -->` 標註者一律序列執行。
>
> **本 change 之後的 change**：change ②（`annotation/015`）與 change ③（`dataset/017`）不在本清單範圍內，於本 change archive 後另行 propose。

## 0. 前置

**故事目標**：`specs/STATUS.md` 如實反映 013 已有一個開啟中的 OpenSpec change，使後續 SC-003x 的改版有正確的流程狀態基準。

- [x] 0.1 於 `specs/STATUS.md` 將 `task-management-013` 的狀態由 `in-progress` 更新為 `change-open`，填入本 change 名稱，並把 branch 欄位校正為正典 frontmatter 所載的 `feat/task-list-output-types`（先前誤填 v6.9.3 的暫時測試分支）。驗證：`scripts/check-sdd.sh` 不再回報 `ACTIVE_CHANGE_STAGE` [@main]

## 1. PR 群組 1 — Step 2 設定欄位契約（FR-003d-1 設定面／FR-003d-3 設定面）

**故事目標**（SC-003x／SC-003o）：建立任務時，`sequence_tagging` 的設定面板只剩三欄且不再出現「標記方案」，`entity_recognition` 為四欄且兩者共用同一個「選取吸附」欄位；`sequence_tagging` 的 `allow_overlapping` 在 UI 與序列化 config 兩處皆不可及。

> **產品檔案（2）**：`design/prototype/pages/task-management/task-config.data.js`、`design/prototype/pages/task-management/task-config.engine.js`
> **apply 階段修正**：`task-new.html` 實際無需改動——Step 2 面板全由 registry 渲染，該頁本身不含任何 tokenization 標記或文案（任務 1.4 已以 `grep` 確認）。改以 `task-config.engine.js` 承接任務 1.6 的驗證掛勾：registry 的 `validateConfig` 宣告不變式，Code 模式儲存路徑泛型呼叫之，引擎不特判型別。
> **最終群組**：否。本組不執行 archive。
> **相依**：任務 0.1。

- [x] 1.1 撰寫 Red 測試覆蓋 `sequence_tagging` 三欄設定與 `tagging_scheme` 退場（新增 `design/prototype/tests/task-management/issue-581-seq-tagging-config-fields.spec.ts`）：Step 2 依序顯示「標籤類型」「選取吸附」「允許無法判定」；畫面不存在「標記方案」欄位與任何 `BIO`／`BIOES`／`IOB2`／`SINGLE` 選項；序列化 config 不含 `tagging_scheme`、`tokenization` 與 `allow_overlapping` 三個鍵。驗證：`PW_PORT=8891 corepack pnpm playwright test tests/task-management/issue-581-seq-tagging-config-fields.spec.ts` 全數失敗，失敗原因為現行面板仍渲染「標記方案」與 `tokenization` 契約 [@senior-qa]
- [x] 1.2 撰寫 Red 測試覆蓋 `entity_recognition` 四欄設定與共用吸附欄位（新增 `design/prototype/tests/task-management/issue-581-entity-recognition-snap.spec.ts`）：Step 2 依序顯示「標籤類型」「選取吸附」「允許重疊與巢狀」「允許無法判定」；其「選取吸附」選項與 `sequence_tagging` 完全相同；同時選取兩型別時兩個手風琴面板各自持有可獨立設定的吸附值。驗證：執行該檔全數失敗，失敗原因為 `entity_recognition` 尚無 `snap_unit` 欄位 [@senior-qa]
- [x] 1.3 （Green）於 `design/prototype/pages/task-management/task-config.data.js` 改寫兩型別的 registry 與預設 config：`sequence_tagging` 的 `fields` 移除 `tagging_scheme` 與 `tokenization`、新增 `snap_unit`（`select`，`character`／`word`，預設 `character`）；`entity_recognition` 的 `fields` 新增同一個 `snap_unit`；新增匯出常數 `SPAN_SNAP_UNITS` 與 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE`，並移除 `SEQUENCE_TAGGING_SCHEMES`、`SEQUENCE_TOKENIZATION_VERSION`、`SEQUENCE_TOKENIZATION_MODE`；示範資料的 `sequence_tagging` 預標記由 `tags[]` 改為 `spans[]`。驗證：`node --check design/prototype/pages/task-management/task-config.data.js` 退出碼 0，且該檔不再出現 `tagging_scheme` 字串 [@senior-frontend]
- [x] 1.4 （Green）於 `design/prototype/pages/task-management/task-new.html` 調整 Step 2 設定面板：依 registry 渲染新的欄位集合，移除「標記方案」欄位的頁內樣式與文案（zh／en 皆須移除），並使 `sequence_tagging` 面板不渲染「允許重疊與巢狀」。驗證：`PW_PORT=8891 corepack pnpm playwright test tests/task-management/issue-581-seq-tagging-config-fields.spec.ts tests/task-management/issue-581-entity-recognition-snap.spec.ts` 全綠 [@senior-frontend]
- [x] 1.5 撰寫 Red 測試覆蓋 Code 模式的重疊政策防線（新增 `design/prototype/tests/task-management/issue-581-overlap-policy-code-mode.spec.ts`）：於 Code 模式貼上帶 `allow_overlapping: true` 的 `sequence_tagging` config 並套用時，顯示可定位驗證錯誤且阻擋進入 Step 3，且該值不得被靜默改寫為 `false`。驗證：執行該檔全數失敗，失敗原因為驗證器尚未認識該規則 [@senior-qa]
- [x] 1.6 （Green）於 `design/prototype/pages/task-management/task-config.data.js` 的 `sequence_tagging` registry 加入 `validateConfig`（帶 `allow_overlapping` 鍵即為驗證錯誤），並於 `design/prototype/pages/task-management/task-config.engine.js` 的 Code 模式儲存路徑泛型呼叫該掛勾；檢查對象為未正規化的原始 payload，否則正規化會先移除該鍵而使拒絕退化為靜默改寫。驗證：`PW_PORT=8891 corepack pnpm playwright test tests/task-management/issue-581-overlap-policy-code-mode.spec.ts` 全綠 [@senior-frontend]
- [ ] 1.7 執行群組 1 回歸：`cd design/prototype && corepack pnpm typecheck && PW_PORT=8891 corepack pnpm playwright test tests/task-management`，記錄既有測試中因 `tagging_scheme`／`tokenization` 移除而失效的斷言清單，於群組 2 修正。驗證：typecheck 退出碼 0，playwright 失敗項目全部可歸因於尚未改版的預覽渲染層 [@main]

## 2. PR 群組 2 — Step 2 標記預覽改拖曳圈選（FR-003d-1 預覽面與落點拒絕）

**故事目標**（SC-003x／SC-003n／SC-003b）：Step 2 預覽以原始文本為單一呈現面，拖曳圈選產生字元 offset 的 `spans[]`；切換選取吸附不影響任何既有標記；預標記不再受數量一致性硬約束；`sequence_tagging` 拒絕相交落點。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-config.engine.js`
> **最終群組**：否。本組不執行 archive。
> **相依**：群組 1 全數合併後開始（本組讀取群組 1 建立的 `snap_unit` 與 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE`）。
>
> **apply 階段修正（來自任務 1.7）**：任務 1.3 所述「示範資料的預標記由 `tags[]` 改為 `spans[]`」不在 `task-config.data.js` 內——BIO 預標記樣本實際位於 `docs/product/example-data/sequence-tagging.json`（`tokens` ＋ `pre_tags`）與 `design/prototype/pages/task-management/task-detail.data.js`。兩者屬預標記載入路徑，改由群組 2 的任務 2.5 一併改為 `spans[]`，本組不動。群組 2 產品檔案因而為 3 個（仍在 5 檔上限內）。
>
> **共用引擎連帶影響**：`task-config.engine.js` 由 `task-new` 與 `task-detail`（014 Overview「標記設定」編輯模式）共用，本組改寫會同步改變 014 的 parity surface。這是既有共用設計（013 v6.5.0／v6.6.0／v6.8.0 皆同此路徑），非本 change 引入。任務 2.9 負責確認 014 parity 測試同步轉綠。

- [ ] 2.1 撰寫 Red 測試覆蓋拖曳圈選與吸附語意（新增 `design/prototype/tests/task-management/issue-581-span-select-preview.spec.ts`）：預覽不存在 Token 網格與任何 `B-`／`I-`／`E-`／`S-` 前綴按鈕；於「字元」吸附下自「積」拖曳至「電」產生 `{ start: 1, end: 3 }`；切換為「詞」後既有 span 的 offset 與顯示位置維持不變且不出現數量不一致錯誤；於「詞」吸附下同一拖曳產生涵蓋「台積電」的 `{ start: 0, end: 3 }`。驗證：執行該檔全數失敗，失敗原因為預覽仍渲染 Token 網格 [@senior-qa]
- [ ] 2.2 撰寫 Red 測試覆蓋預標記以 offset 落位且無數量檢查（新增 `design/prototype/tests/task-management/issue-581-span-prefill.spec.ts`）：3 筆 span 對 20 字元文本正常落位且「下一步」可用；`{ start: 18, end: 25 }` 之越界 span 被拒絕並列於錯誤清單，其餘正常載入且不阻擋前進。驗證：執行該檔全數失敗，失敗原因為現行預標記路徑仍執行數量一致性檢查 [@senior-qa]
- [ ] 2.3 撰寫 Red 測試覆蓋 `sequence_tagging` 拒絕相交 span（新增 `design/prototype/tests/task-management/issue-581-overlap-rejection.spec.ts`）：既有 `{0,3}` 時圈選 `{2,5}` 色條轉錯誤色且不建立、清單維持 1 筆；圈選相鄰的 `{3,5}` 正常建立、清單為 2 筆。驗證：執行該檔全數失敗，失敗原因為預覽尚無 span 相交判定 [@senior-qa]
- [ ] 2.4 （Green）於 `design/prototype/pages/task-management/task-config.engine.js` 以拖曳圈選預覽取代 `renderTokenClassPreview`，並移除 `getSequencePreviewTokens` 與 `tokenizeSequenceText`：`sequence_tagging` 改用與 `entity_recognition` 相同的圈選元件；選取吸附為詞時以 Intl.Segmenter 的 word granularity 修正選取起訖點，執行環境不支援時退回不吸附且保留原設定值。驗證：`PW_PORT=8892 corepack pnpm playwright test tests/task-management/issue-581-span-select-preview.spec.ts` 全綠 [@senior-frontend]
- [ ] 2.5 （Green）於 `design/prototype/pages/task-management/task-config.engine.js` 改寫預標記載入路徑：span 依字元 offset 直接落位，移除數量一致性檢查與兩條出路的錯誤分支；越界或 `start >= end` 的 span 列入錯誤清單但不阻擋前進。驗證：`PW_PORT=8892 corepack pnpm playwright test tests/task-management/issue-581-span-prefill.spec.ts` 全綠 [@senior-frontend]
- [ ] 2.6 （Green）於 `design/prototype/pages/task-management/task-config.engine.js` 加入落點相交判定：依 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE` 決定是否拒絕相交落點，相鄰而不相交者放行。驗證：`PW_PORT=8892 corepack pnpm playwright test tests/task-management/issue-581-overlap-rejection.spec.ts` 全綠 [@senior-frontend]
- [ ] 2.7 改寫既有預覽測試 `design/prototype/tests/task-management/task-new-output-type-preview.spec.ts`：移除 Token 網格、完整 tag 按鈕列、切換單位重建、預標記數量不一致與兩條出路的全部斷言，改以 span 預覽的等價斷言承接原有測試主體。驗證：`PW_PORT=8892 corepack pnpm playwright test tests/task-management/task-new-output-type-preview.spec.ts` 全綠 [@senior-qa]
- [ ] 2.8 移除已失效的 `sequence_tagging` tokenization 專屬測試檔（依任務 1.7 清單逐檔判定：斷言主體僅為 token 切分規則者刪除，含其他主體者於原檔改寫）。驗證：`PW_PORT=8892 corepack pnpm playwright test tests/task-management` 全綠 [@senior-qa]
- [ ] 2.9 執行群組 2 完整回歸：`cd design/prototype && corepack pnpm typecheck && PW_PORT=8892 corepack pnpm playwright test`，特別確認 014 Overview「標記設定」編輯模式的 parity 測試同步轉綠。驗證：typecheck 退出碼 0、playwright 全綠 [@main]

## 3. PR 群組 3 — ADR 處置、範例 config、正典回寫與 archive（最終群組）

**故事目標**（SC-003x）：ADR-031 標為 Superseded、範例 config 與新契約一致，正典 013 回寫 v7.0.0 並完成 Source-Verify 與 archive。

> **產品檔案（2）**：`docs/adr/031-sequence-tagging-tokenization-contract.md`、`docs/product/task-configs/sequence-tagging.json`
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫（驗證關卡 4）。
> **相依**：群組 2 全數合併後開始。

- [ ] 3.1 於 `docs/adr/031-sequence-tagging-tokenization-contract.md` 將 Status 由 `Accepted` 改為 `Superseded`，並新增註記說明取代來源為 issue #581 與本 change、決策 6 由前端 Intl.Segmenter 取代；決策 1–6 的原文原樣保留以維持決策脈絡可追溯。驗證：`/usr/bin/grep -n '^\*\*Status\*\*' docs/adr/031-sequence-tagging-tokenization-contract.md` 回傳 `Superseded` [@senior-technical-writer]
- [ ] 3.2 於 `docs/product/task-configs/sequence-tagging.json` 依新契約改寫範例：移除 `tagging_scheme` 與 `tokenization`、新增 `snap_unit`，示範標記改為 `spans[]`。驗證：`python3 -c "import json;json.load(open('docs/product/task-configs/sequence-tagging.json',encoding='utf-8'))"` 退出碼 0，且該檔不含 `tagging_scheme` 字串 [@senior-technical-writer]
- [ ] 3.3 回寫正典 `specs/task-management/013-task-new/spec.md`：frontmatter 版本由 6.9.5 升為 7.0.0；套用本 change 的 MODIFIED 條文（FR-003d-1、FR-003d-3）；規格常數區移除 `SEQUENCE_TAGGING_SCHEMES`／`SEQUENCE_TOKENIZATION_VERSION`／`SEQUENCE_TOKENIZATION_MODE`、將 `SEQUENCE_TOKEN_UNITS` 更名為 `SPAN_SNAP_UNITS`、新增 `SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE`；驗收情境 10／11 改寫；`sequence_tagging` 相關邊界情境六條改寫或移除；SC-003x 改寫，並為本 change 新增的四個情境配發後續 SC ID；新增 v7.0.0 Changelog 條目。驗證：`/usr/bin/grep -c 'tagging_scheme' specs/task-management/013-task-new/spec.md` 僅剩 Changelog 中的歷史敘述 [@main]
- [ ] 3.4 執行 Source-Verify 關卡：逐一 `grep` 本 change 引用的每個 FR／SC ID、檔案路徑、ADR 編號與 issue 編號，確認皆可於其宣稱來源中定位；任一不可定位者必須修正或移除，不得近似。驗證：逐項記錄 grep 指令與命中行號於 PR 描述 [@main]
- [ ] 3.5 執行 `openspec archive seq-tagging-span-config`，確認衍生檢視 `openspec/specs/013-task-new/spec.md` 已合併且不殘留任何 `## ADDED Requirements`／`## MODIFIED Requirements` 標題。驗證：`/usr/bin/grep -c '^## \(ADDED\|MODIFIED\|REMOVED\) Requirements' openspec/specs/013-task-new/spec.md` 回 0 [@main]
- [ ] 3.6 於 `specs/STATUS.md` 將 `task-management-013` 更新為 v7.0.0 並結束 `change-open`，於變更紀錄新增本 change 條目。驗證：`scripts/check-sdd.sh` 退出碼 0 [@main]
- [ ] 3.7 執行四道驗證關卡的完整證據收集：關卡 1 `openspec validate --changes --no-interactive`；關卡 2 `scripts/check-sdd.sh`；關卡 3 `cd design/prototype && corepack pnpm typecheck && PW_PORT=8893 corepack pnpm playwright test`；關卡 4 為任務 3.4／3.5 之產出。驗證：四項皆退出碼 0，證據貼於最終 PR 描述 [@main]
