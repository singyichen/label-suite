---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #581
基準版本: 015 v5.0.0
目標版本: 015 v6.0.0
---

> **2026-09-04 範圍拆分（維護者決議）**：issue #581 橫跨 9 份 canonical spec，而 Project SDD lint 限制「一個 active change 恰對應一份 canonical spec」。維護者裁定拆成三個依序執行的核心 change。本 change 是三者中的第二個，只處理 **annotator/reviewer 作業面**：
>
> | 順序 | change | 對應正典 | 狀態 |
> |------|--------|---------|------|
> | ① | `seq-tagging-span-config` | `specs/task-management/013-task-new/spec.md` | 群組 1、2 已實作（PR #642 已合併），群組 3 待辦 |
> | ② 本 change | `seq-tagging-span-workspace` | `specs/annotation/015-annotation-workspace/spec.md` | 本次 propose |
> | ③ 後續 | 待命名 | `specs/dataset/017-dataset-analysis-detail/spec.md` | 指標改 span-level、Krippendorff u-α、匯出層 BIO 推導 |
>
> 措辭同步性質的 `dashboard/012` 與 `task-management/014` 引用依 CLAUDE.md「Lightweight Path」併入本 change 處理，不另開 change、不留 `deferred/`。

## Why

change ① 已把 `sequence_tagging` 的**建立面**（013 Step 2 設定與標記預覽）由 Token 網格改為拖曳圈選字元 offset。作業面（015）目前仍是 token 座標系，兩者已不一致。

實作 change ① 群組 2 時暴露出一項 propose 階段未預見的事實，也是本 change 必須緊接著執行的直接原因：**`task-config.engine.js` 的 `sequence_tagging` 預覽是 013 與 015 共用的單一 runtime 契約**。`annotation-workspace.config.js` 的 `patchSequenceTaggingPanel` 直接消費該預覽——以 `previewState.sequence_tagging.tokens` 是否為陣列作為守衛，並查詢引擎產生的 `[data-testid="sequence-token"]` 節點再改標為 `ws-seq-token`。change ① 群組 2 移除 Token 網格後，工作區的序列標註卡片即無法渲染，六個既有測試已於該 PR 標為跳過並註明由本 change 還原。

此耦合與資料形狀無關：即使 T006 樣本保留 `tokens` 與 `pre_tags` 欄位，引擎已不再渲染 Token 網格，工作區一樣空白。一支引擎、三個 host（task-new Step 2、task-detail Overview 編輯模式、標記工作區），該介面只能整體遷移。

除此之外，015 自身的 token 座標系規則亦承載 change ① 已論證過的三項代價（切換單位破壞既有標記、預標記數量硬約束、標記受 token 邊界限制），且多出一項 015 專屬的：

- **審核差異比對與答案序列化綁死 token 位置**。FR-052 規定 `sequence_tagging` 採「逐 token 位置比對」；CompactAnswer 以 `{ text, tag }` pairs 序列化，反向重建（審核合併後回填標記員答案）靠**逐一比對 token 文字**推測位置。此機制在文字重複時只能以「左至右依序消耗」近似還原——`annotation-workspace.config.js` 的既有註解即明載它如何處理「台」在 T006 樣本 index 0 與 13 重複出現的情況。span 模型自帶 offset，可使此還原改為精確定位而非猜測。

## What Changes

- **Annotator 標記介面由 Token 網格改為拖曳圈選（BREAKING）**：FR-024A 改為「顯示未經切分的原始文本作為單一圈選面，使用者拖曳圈出一段文字後點選標籤類型完成標記」，產出 `spans[]`（`{ start, end, label }`，半開字元 offset）。原本的「先依 `tagging_scheme` 選定完整 tag 再點擊 Token」互動、Token 網格、依方案產生的完整 tag 按鈕列全部移除。
- **後端權威 Token 邊界契約整組退場（BREAKING）**：FR-024A-1 所述「正式 Token 邊界為後端計算之單一權威來源、engine/version 於任務建立時凍結、workspace 不得以前端邏輯重新切分」隨 ADR-031 一併作廢。改為前端 `Intl.Segmenter` 的**選取吸附**：吸附只影響滑鼠落點、不影響儲存值，因此不存在權威來源問題，也不需要凍結任何版本。
- **提交前的數量一致性驗證移除（BREAKING）**：FR-024A-2 的「tag 數量必須等於正式 Token 數量、否則阻擋提交」失去對象。改為 span 層級的合法性驗證：`start`／`end` 超出文本長度或 `start >= end` 者為錯誤。
- **提交 payload 改為 span 形狀（BREAKING）**：FR-024A-3 的 `tokens[]`／`tags[]`／`scheme`／`unit` 改為 `spans[]`／`snap_unit`；`bypass` 與 `version` 保留。BIO 序列不再是儲存形式，改由匯出層推導（契約見 change ③ 的 `dataset/017`）。
- **CompactAnswer 的 `sequence_tagging` 形狀新增 offset（BREAKING）**：由 `{ text, tag }` 改為 `{ text, label, start, end }`。保留 `text` 使 `annotation-list.html` 的 official_run 單列渲染與 `REVIEWER_MOCK_ROWS` 的既有呈現路徑不需改寫；新增 `start`／`end` 使反向重建改為依 offset 精確定位，**移除靠比對 token 文字左至右依序消耗的近似還原**。`tag` 更名為 `label` 是因為值本身不再帶 `B-`／`I-` 前綴。
- **審核差異比對改 span-level（BREAKING）**：FR-052 的 `sequence_tagging` 由「逐 token 位置比對」改為「以 `(start, end, label)` 為合併鍵的順序無關集合比對」，與 `entity_recognition` 一致；`CONSENSUS_MERGE_KEYS` 的 `sequence_tagging` 鍵定義同步改版。**此變更同時修正一項既有缺陷**：逐 token 比對會把一個三字實體的型別更動計為三個差異項，而集合比對計為一項（改型即拆為「原項移除」與「新項新增」兩項，沿用 FR-052 對集合型的既有語意）。
- **`SEQ_MAJORITY_INVALID_BIO_FALLBACK` 標為廢止**：該常數服務 v3.0.0 的逐 token 多數決（FR-035），而 FR-035 已於 v4.0.0 隨共識模型廢止，常數自此為孤兒。本版明訂廢止並保留 ID 不重用，避免 span 模型下再被誤引用。
- **Reviewer 審查呈現措辭同步**：FR-024L 的 `sequence_tagging` 由「tag 出現次數」改為「標籤出現次數」；AC-3.12 標記分布統計盒同步。統計主體由「帶 BIO 前綴的 tag」改為「不帶前綴的標籤類型」，實體數量統計因此與 `entity_recognition` 一致。
- **成功標準 SC-008 措辭同步**：SC-008 現行列舉的標記控制項含「Token 網格」，隨本版一併改為 span 圈選面。SC-004（8 種輸出類型皆可完成標記）之判準不變，僅 `sequence_tagging` 的達成方式改變。
- **Open Question 註銷**：「word-mode 分詞引擎選型（CKIP／Jieba／PyICU）尚未定案」隨 ADR-031 決策 6 作廢——吸附改由前端 `Intl.Segmenter` 執行，無後端分詞引擎選型需求。
- **`Intl.Segmenter` 缺席時的標註者端降級（新增）**：change ① 的 013 設定契約已規範「設定值不得因瀏覽器能力改變」，但把標註者端的降級呈現明確交由 015 承接（其需求條文原文載明「標註者端的降級提示由 `annotation/015-annotation-workspace` 承接」）。本版新增規則：執行環境缺少 `Intl.Segmenter` 時，該標註者端退回「不吸附」並於標記卡顯示一行提示，**任務設定值不得變動**。因吸附結果不進資料，降級產出的 `spans[]` 與其他標註者完全相容，**MUST NOT 對此類資料做任何事後修正**——此點須明文寫入，避免日後被誤判為資料瑕疵而「修復」。本規則併入 FR-024A-1 條文，不另立新 FR ID。

## Capabilities

### New Capabilities

- `annotation/015-annotation-workspace`：**標註者端吸附能力降級的資料相容性保證**——本版以前不存在「同一任務的不同標註者可能以不同吸附行為作業」的情境（token 邊界由後端統一提供）。改為前端吸附後必須明訂此情境不影響資料可比性，否則 IAA 計算會被誤認為受污染。

### Modified Capabilities

- `annotation/015-annotation-workspace`：`sequence_tagging` 的 annotator 標記介面與提交 payload 整體改版（FR-024A、FR-024A-1、FR-024A-2、FR-024A-3）、CompactAnswer 形狀與審核差異比對改 span-level（FR-052、`CONSENSUS_MERGE_KEYS`）、reviewer 審查呈現措辭同步（FR-024L、AC-3.12）、`SEQ_MAJORITY_INVALID_BIO_FALLBACK` 廢止、驗收情境 AC-2A.5／AC-3.12／AC-4.11 改寫、`sequence_tagging` 相關邊界情境兩條改寫或移除、成功標準 SC-008 措辭同步、上游依賴表對 013 的引用同步。

## Impact

**規格**

- 正典：`specs/annotation/015-annotation-workspace/spec.md`（v5.0.0 → **v6.0.0**，MAJOR：標記介面、提交 payload、CompactAnswer 形狀、差異比對鍵四項皆為 BREAKING）
- 衍生檢視：`openspec/specs/annotation/...`（archive 時自動合併）。**delta 路徑沿用 change ① 已記錄的偏離**：置於 `specs/015-annotation-workspace/spec.md`（capability 單層），因 `@fission-ai/openspec` v1.4.1 的 delta 探索只認單層目錄，雙層路徑會被靜默略過並使 gate 1 回報 `Change must have at least one delta`（issue #639）。
- 下游（本 change 不修改，由 change ③ 承接）：`specs/dataset/017-dataset-analysis-detail/spec.md`
- 走 Lightweight Path 併入本 change：`specs/dashboard/012-dashboard/spec.md` 與 `specs/task-management/014-task-detail/spec.md` 之措辭同步（各 1–3 處引用，不新增或移除任何 FR／AC）
- 流程同步：`specs/STATUS.md` 之 `annotation-015` 列（`spec-ready` → `change-open` → v6.0.0）

**產品文件**

- `docs/product/` 敘述層同步待 change ③ 落地後以單一文件同步 PR 一次處理，避免同一段敘述被三個 change 反覆改寫

**原型程式（Principle X 之產品檔案盤點）**

| 檔案 | 變更 |
|------|------|
| `design/prototype/pages/annotation/annotation-workspace.config.js` | `patchSequenceTaggingPanel` 退場；`getSequenceTokenTexts`／`buildSequencePairsFromTags`／`buildSequenceTagsFromPairs` 改 span 形狀；答案讀寫路徑改 `spans[]` |
| `design/prototype/pages/annotation/annotation-workspace.data.js` | `REVIEWER_MOCK_ROWS` 的 `sequence_tagging` 答案改 `{ text, label, start, end }`；`convertSubmissionAnswer` 介面同步 |
| `design/prototype/pages/annotation/annotation-list.html` | official_run 單列答案摘要的 `sequence_tagging` 分支同步 |
| `design/prototype/pages/task-management/task-config.engine.js` | 移除 `getSequencePreviewTokens` 與 `tokenizeSequenceText`（change ① 群組 2 刻意保留，因工作區仍呼叫） |

共 4 個手寫產品檔案（未達 5 檔上限），但答案序列化層改寫的 diff 行數可能超過 300 行，依 Constitution Principle X 於 `tasks.md` 規劃分組。

**測試**

- 解除 change ① 群組 2（commit `ff5cb02f`）加上的六個跳過標記並改寫：`annotation-workspace-sequence-tagging.spec.ts`（整個 describe，4 個測試）、`annotation-workspace-reviewer.spec.ts`（registry 迴圈的 `sequence_tagging` 案例）、`annotation-workspace-submit-validation.spec.ts`（T006 案例）

## Constitution Check

| 原則 | 檢核 |
|------|------|
| **Generalization-First（NON-NEGOTIABLE）** | ✅ 通過，且**強化**。`patchSequenceTaggingPanel` 是工作區唯一為單一輸出類型存在的 DOM 後處理函式，其存在理由是把引擎的逐 tag 晶片轉成型別晶片並自動推導 `B-`／`I-` 前綴；改用 span 後引擎本身即為型別層級，該硬編路徑整段消除。差異比對亦由 `sequence_tagging` 專屬的逐 token 分支併入既有的集合比對語意。 |
| **Data Fairness（NON-NEGOTIABLE）** | ✅ 通過。本 change 不改變 annotator 可見資料的界線：FR-024A-3 的「annotator 可見資料不得包含 ground truth」原文保留，payload 僅改形狀。 |
| **Principle X（PR 規模）** | ⚠️ 需注意。4 個手寫產品檔案未達上限，但序列化層改寫 diff 可能 > 300 行；`tasks.md` 依此規劃分組。 |
| **TDD** | ✅ 每項可觀察行為皆配對 `[@senior-qa]` Red 任務與 Green 實作任務。六個跳過標記的解除本身即為 Red 證據來源。 |
| **PR Single Purpose** | ⚠️ **已知偏離（維護者裁定）**：維護者指示本 change 的實作不另開分支，直接接續 change ① 群組 2 的分支 `feat/issue-581-span-preview`。因此該分支的 PR 將同時承載 change ① 與 change ②，偏離 ADR-033 Rule 1「一個 PR 對應一個 OpenSpec change」。取捨為：換得六個跳過標記可在同一分支內直接解除、不需跨 PR 接力，代價是該 PR 的 review 面涵蓋兩個 change。PR 描述須明載此點。 |
| **Simplicity First** | ✅ 本 change 淨移除的規格條文多於新增：後端權威 token 邊界契約、engine/version 凍結、提交前數量一致性驗證、逐 token 差異比對、`SEQ_MAJORITY_INVALID_BIO_FALLBACK` 全部消失，換入一條吸附降級相容性規則。 |
