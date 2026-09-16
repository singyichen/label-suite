---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #742
基準版本: 014 v3.1.0
目標版本: 014 v3.2.0
---

## Why

`dataset/017` v3.0.0 已把「自 `spans[]` 推導序列標記」訂為跨模組唯一權威（`dataset/017` FR-041），並把詞級 tokenizer metadata 與對齊擴張報告一併定義完成（`dataset/017` FR-042）；純函式層也已落地為 `design/prototype/pages/shared/span-tagging-export.js`。但那個 change 的維護者裁決 D3 明文「本 change 不做 UI」，因此整套契約目前**在畫面上完全不存在**：`task-detail` 的 `annotation-results` 只有「匯出 JSON」與「匯出 JSON-MIN」兩顆按鈕，沒有任何地方能選標註方案或詞元單位，也沒有任何地方會顯示擴張摘要或阻擋原因。

更具體的缺口有三層，每一層都可被現況直接證實：

- **沒有任何頁面載入該模組**。`grep -rn 'span-tagging-export' design/prototype/pages/` 目前只命中模組自身，唯一的消費者是測試檔 `design/prototype/tests/dataset/dataset-analysis-detail-span-to-bio.spec.ts`。換言之推導契約有測試、有實作，卻沒有使用者可以觸發它的路徑。
- **`sequence_tagging` 任務匯出的是錯的東西**。`buildTaskSpecificExportFields()`（`design/prototype/pages/task-management/task-detail.html:9058`）依 `LEGACY_TASK_TYPE_EXPORT_ENUM` 推導出的 `sequence_labeling` 分流，只認 `value.aspects` 與 `value.entities` 兩種形狀；`spans[]` 形狀既不命中前者也不命中後者，會落進 `entities` 分支輸出空陣列。使用者拿到的是一個宣稱「這是序列標記結果」卻沒有序列的檔案。
- **正典 014 沒有對應條文**。FR-015i-3 寫的是「`sequence_labeling`（實體型結果）匯出結果欄位必須至少包含 `entities[]`」——那是 ADR-029 遷移前、`sequence_tagging` 仍為 token 座標系時寫下的條款，013 v7.0.0 與 015 v6.0.0 把 `sequence_tagging` 改為 `spans[]` 之後，014 這一側從未補上。

issue #742 就是為了補這三層而開。它承接的是 `dataset/017` 使用者故事 5 中屬於畫面的子句——`dataset/017` AC-5.1 的 metadata 呈現與重複匯出、`dataset/017` AC-5.3 的擴張摘要、`dataset/017` AC-5.4 的阻擋提示——而 `dataset/017` 自身已於第 389–390 行明文把這些子句移交本規格，本 change 是那份移交的落點。

## What Changes

- **新增 FR-020：`sequence_tagging` 匯出對話框**。`annotation-results` 的匯出入口在任務 `outputs[]` 含 `sequence_tagging` 時，必須先開啟一個對話框讓使用者選擇標註方案（`BIO` / `BIOES` / `IOB2`）與詞元單位（`character` / `word`），再產生檔案。選項值域與預設值一律取自 `dataset/017` 的 `EXPORT_TAGGING_SCHEMES`、`EXPORT_DEFAULT_TAGGING_SCHEME`、`EXPORT_TOKEN_UNITS`、`EXPORT_DEFAULT_TOKEN_UNIT` 四個常數，本規格不另立第二份清單。
- **推導一律呼叫共用模組，本頁不得自備第二套轉換邏輯**。這是本 change 最硬的一條界線：`dataset/017` FR-041 第 1 點已把此推導訂為 SSoT，014 頁只做接線與呈現。實作上唯一允許的推導入口是 `LabelSuiteSpanTaggingExport.deriveSequence()`；頁面內不得出現任何自行拼接 `B-` / `I-` / `E-` / `S-` / `O` 前綴、自行判斷 span 邊界或自行複製方案轉換表的程式碼。此條同時寫成 delta 的驗收子句與 tasks.md 的 Red 契約，不只寫在說明文字裡。
- **匯出檔 metadata 新增四到五個欄位**。字元級寫入 `tagging_scheme` 與 `token_unit`；詞級額外寫入 `tokenizer`（`engine` + `version`）、`alignment_mode` 與 `expanded_span_count`。字元級**不得**寫入 tokenizer 相關欄位——`dataset/017` FR-042 第 5 點明文禁止一個檔案宣稱它用過其實沒用過的切詞引擎。metadata 的實際形狀與 `schema_version` 的處置見 design.md 裁決 D1／D2（兩者均已於 2026-09-16 由維護者定案：巢狀 `tokenizer.engine`、`schema_version` 升 `1.1.0`）。
- **詞級匯出完成後顯示擴張摘要**。摘要文案為「N 段標記因對齊被擴張」，`N = 0` 時不顯示；可展開，逐筆列出原始標記文字、擴張後文字與起訖 offset 差值。三項欄位直接取自模組回傳的 `expansions[]`，本頁不重算。
- **詞級缺 tokenizer 版本時阻擋該次匯出**。阻擋必須顯示可理解的原因且不得產生任何檔案；使用者改回字元級後匯出必須正常完成、不含 tokenizer metadata、不顯示擴張摘要。
- **不修訂任何既有條文；FR-015i-3 的適用邊界寫在 FR-020 第 6 點**。FR-020 自述它僅適用 `spans[]` 型結果，`entities[]` 型結果不套用序列推導、匯出欄位全文依 FR-015i-3；並反向言明 FR-015i-3 不涵蓋 `spans[]`（`LEGACY_TASK_TYPE_EXPORT_ENUM` 不含 `sequence_tagging`，結果欄位分流依 FR-015i 所定「依標記結果實際結構決定」）。

  採此承載方式而非 `## MODIFIED Requirements`，是因為 `openspec archive` 把 delta 套用在 `openspec/specs/` 衍生檢視上，而該檢視只累積歷來 OpenSpec change 碰過的條文；FR-015i-3 從未進過此流程，對它下 MODIFIED 會在 archive 階段硬中止並回報 `MODIFIED failed for header ... - not found`（`openspec validate` 對此無任何訊號，已實測確認）。邊界規則併入新條文後，正典回寫只需新增 FR-020、不動既有條文，也免除回寫者誤 append 重複條文的風險。

無 **BREAKING**：其餘七種輸出類型的匯出欄位、兩種匯出格式的結構、匯出記錄表與重新下載的條件快照語意皆不變；`entity_recognition` 任務（T010）的匯出行為逐欄位不動。

## Capabilities

### New Capabilities

（無——本變更不引入新的 capability 路徑。）

### Modified Capabilities

- `task-management/014-task-detail`：新增 FR-020（`sequence_tagging` 匯出對話框）、AC-1.10、AC-1.11、AC-1.12、AC-1.13 與 SC-045。既有匯出條文（FR-009、FR-009a、FR-010i、FR-010i-1、FR-010i-2、FR-015e、FR-015g、FR-015h、FR-015i、FR-015i-3、FR-015j～FR-015l）全部維持原文，本 change 不修訂任何既有條文。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v3.1.0 → v3.2.0，**MINOR**，維護者 2026-09-16 裁定）。純新增 FR-020／AC-1.10／AC-1.11／AC-1.12／AC-1.13／SC-045，零既有條文修訂。判為 MINOR 的理由：`LEGACY_TASK_TYPE_EXPORT_ENUM`（正典 :44）根本不含 `sequence_tagging`，FR-015i-3 自身括號又限定「實體型結果」，故 `spans[]` 從來就不在其承諾範圍內——本版是補上一塊從未被涵蓋的空白，沒有任何既有行為被推翻，`entity_recognition` 任務的匯出結果逐欄位不變。
- 該正典原封存於 `specs/_archive/014-task-detail/`，本 change 開立前已依 issue #648 取回至 `specs/task-management/014-task-detail/`（`scripts/check-sdd.sh` 之 `ACTIVE_CHANGE_SPEC` 只接受 `specs/<module>/NNN-feature/spec.md` 形狀）；合併後再依 #726／PR #768 先例歸位。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併）。
- 上游：`dataset/017` 為推導契約與欄位語意的 SSoT，本 change **不修改** 017 任何條文。014 的「規格相依性」上游表目前對 017 只登錄了 IAA 相關內容，本次須補上匯出推導契約一列（正典回寫時處理）。
- 下游：不修改。

**原型程式（Principle X 之產品檔案盤點）**

| 檔案 | 用途 | 群組 |
|------|------|------|
| `design/prototype/pages/task-management/task-detail.html` | 對話框行為、模組接線、匯出 payload 欄位、i18n 鍵 | 1、2 |
| `design/prototype/pages/task-management/task-detail.panels/annotation-results.html` | 對話框 DOM 與擴張摘要 DOM | 1、2 |
| `design/prototype/pages/task-management/task-detail.data.js` | T006 的 `spans[]` 形狀標記結果種子、切詞引擎與 token 邊界種子 | 1、2 |

合計 3 個產品檔案，低於 5 檔上限。行數預估 280–330 行，**跨越 300 行門檻**，故依 Constitution Principle X 拆為兩個 stacked PR 群組（拆法與理由見 tasks.md 群組 1／群組 2）。issue #742 的巡查留言亦已預判此拆分需求。

**既有機制交互**

- **`buildTaskSpecificExportFields()`（`design/prototype/pages/task-management/task-detail.html:9058`）**：現行依 `TASK_DATA.taskTypeKey` 的 legacy enum 分流，`sequence_labeling` 分支再依 `value.aspects` / `value.entities` 決定形狀。`sequence_tagging` 的新分支必須加在同一處，不得另建第二個欄位組裝入口。
- **`buildJsonExportPayload()`（`:9145`）與 `buildJsonMinExportPayload()`（`:9194`）**：兩者各自組裝 `manifest`；新增的匯出選項 metadata 必須同時出現在兩種格式，否則 JSON-MIN 匯出的檔案無法被重現。
- **`downloadArExport(format)`（`:9233`）**：現行為「按鈕點擊即直接產檔」。對話框介入後，此函式必須改為接受匯出選項，且在被阻擋時不得走到產檔那一步——`dataset/017` AC-5.4 的「未產生任何匯出檔」是可觀察的斷言對象。
- **`renderArExportHistory()`（`:9257`）與 FR-010i-2 的條件快照**：匯出記錄列必須把方案與單位一併存入快照，否則重新下載會拿到與原檔不同的序列。
- **模組載入**：`design/prototype/pages/shared/span-tagging-export.js` 目前未被任何頁面引入，須於 `task-detail.html` 既有的 `pages/shared/` script 區塊（`:2225-2226`）加入。
- **`ANNOTATION_RESULTS_BY_TASK`（`:4305`）**：T006（`sequence_tagging`）目前與 T010（`entity_recognition`）共用同一份 `AR_SAMPLES_NER` 種子，其標記值為 `{ entities: [{ type, text }] }`、**不帶任何字元 offset**。`dataset/017` FR-041 第 1 點明文禁止 `entity_recognition` 套用本推導，且沒有 offset 就無從呼叫模組，故 T006 必須改指一份 `spans[]` 形狀的新種子，T010 原封不動。詳見 design.md 裁決 D4。

**範圍界線（明示排除，供審閱者確認）**

- **不修改 `dataset/017` 任何條文**。推導規則、常數、metadata 欄位語意皆以 017 為準；本 change 若發現 017 條文有誤，處置是另開 issue，不是就地改寫。
- **不在本頁實作切詞演算法**。詞級路徑所需的 `tokens[]` 由資料層提供（design.md 裁決 D3），本 change 不引入任何斷詞函式庫、不自行實作斷詞——否則 014 會成為第二個「切詞結果從哪來」的權威來源。
- **不改變 `entity_recognition`（T010）的匯出行為**。
- **不把匯出選項寫入任務 config**。`dataset/017` FR-041 第 3 點明文禁止，且這是 `dataset/017` AC-5.1 末句的斷言對象。
- **不改動匯出記錄表的既有欄位與分頁行為**，僅在條件快照內新增兩個欄位。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：方案與單位的選項清單必須自模組匯出的 `EXPORT_TAGGING_SCHEMES` 與 `EXPORT_TOKEN_UNITS` 常數渲染，不得在 HTML 或 JS 內硬編 `<option>` 字面量；對話框的出現與否必須依 `outputs[].type` 是否含 `sequence_tagging` 判定，不得以 task id 白名單分流。這正是本 change 的 DRY 核心：多一份方案清單，就多一個 `E-` 的定義。
- **Data Fairness（NON-NEGOTIABLE）**：本變更只改變匯出檔的欄位組成與對話框呈現，不改變任何角色可見的資料範圍；`reviewer` 的唯讀邊界（SC-029）與被排除標記作業不得出現於結果列的規則（FR-015l）皆不受影響。擴張摘要顯示的是使用者自己剛匯出的內容，不揭露跨角色資料。
- **Simplicity First / YAGNI**：只做 issue #742 列出的三項 UI 行為與兩個選擇器。不做匯出選項的記憶（跨 session 保存）、不做批次多方案一次匯出、不做擴張結果的回寫或修正介面——`dataset/017` FR-042 第 4 點本就禁止回寫。
- **可追溯性**：匯出檔自本版起自帶方案、單位與（詞級時）切詞引擎版本，使任一份匯出結果可被第三方逐字元重現，這是 `dataset/017` FR-041 第 2 點決定性要求在使用者端的兌現。
- **PR 規模（Principle X）**：3 個產品檔案、預估 280–330 行，超過 300 行門檻，拆為兩個 stacked PR 群組；archive 與正典回寫落在最終群組（ADR-033 Rule 1）。
