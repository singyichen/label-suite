---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1341
基準版本: 015 v12.6.0
目標版本: 015 v12.7.0
---

## Why

issue #1337（複雜樣本顯示）的根因之二：標記工作區中央「整合預覽」只吃單一字串，物件陣列 Input（如 T013 的 `utterances[]`）被攤平成一段文字，看不出發言者與發言邊界；工作區 `seedEngineState` 又把首列值為物件／陣列的 Input 角色從 `fieldRoleMap` 刪除，所以 T013 只剩與 `utterances` 重複的 `text` 欄位可顯示。反白座標也沒有「屬於哪一則發言」的資訊。T013 種子本身違反 specs/task-management/013-task-new/spec.md 的 FR-002c-2（`single_item` 恰好 1 個 Input）。

本單是 #1337 四張子單的 D（前置 #1339、#1340 皆已合併）：讀取 #1340 存下的任務設定鍵 `dialogue_fields`（specs/task-management/013-task-new/spec.md FR-002c-10），讓整合預覽以 2-A 對話串呈現、反白座標記成 `{utt_id, start, end}`（該則內半開區間 `[start, end)`，對齊 FR-098／FR-024A-3），並把 T013 種子修正為合規。座標格式屬資料契約，需 `design.md`。新增 FR／AC 與行為，不符合 Lightweight Path，走完整 OpenSpec change。

**是否需要存在（YAGNI 檢查）**：需要。維護者 2026-10-13 已裁定 2-A 與座標格式（#1337）；spec 目前沒有任何對話串渲染或 `utt_id` 座標條文，不寫入正典就無法驗收。

**Data Fairness（NON-NEGOTIABLE）**：對話串與原始 JSON 後備只渲染角色為 Input 的欄位；Output（如 `gold_triplets`）與 Evidence 不得因新渲染路徑外露（FR-023、FR-024M-1）。

**範圍外**：既有 `task-config.engine.js` 含端點寫法（`end: idx + selText.length - 1`，非對話路徑）——與 FR-098 不一致，母單已記錄、另開 Bug 單處理，本單不碰；task-new／task-detail 的 Step 2 預覽（#1340 已完成）；跨發言關聯的資料模型（交給關係識別）。

## What Changes

- **新增 FR-107**：整合預覽對話串呈現（2-A）、`{utt_id, start, end}` 半開區間座標、跨發言反白拒絕、無對話設定退回可摺疊等寬字原始 JSON（2-C）、Input-only，以及 T013 種子合規（`text`→不使用、`utterances` 為唯一 Input、`dialogue_fields` 補齊）。
- **新增 AC-2.31 ~ AC-2.35、SC-029**：驗收一則一列、座標格式、跨發言拒絕、原始 JSON 後備、Data Fairness 與 T013 種子。
- **原型行為**：工作區不再刪除物件陣列 Input 角色；改以明確的通用規則只剔除會讓文字預覽失真的非純量形狀（純值陣列與純物件）。
- **不修訂既有條文**：全部以 `## ADDED Requirements` 承載（衍生檢視 `openspec/specs/` 不含 FR-024I、FR-013E 等條文，MODIFIED 會使 archive 硬中止）；FR-107 內明文述及與 FR-013E、FR-024I、FR-098 的關係。

## Capabilities

- 修改：`annotation/015-annotation-workspace`（新增 FR-107）。

## Impact

- 產品檔案（預估 4 個）：`task-config.engine.js`（對話串列可注入文字、整合預覽對話分支與關係識別傳遞 `utt_id`）、`annotation-workspace.config.js`（Input 角色保留規則、帶入 `dialogue_fields`、reviewer 文本與示範答案定位）、`annotation-workspace.data.js`（`resolveTaskProfile` 帶出 `dialogue_fields`）、`task-detail.data.js`（T013 種子）。
- 正典 015 於 archive 時寫回 v12.6.0 → v12.7.0（MINOR：純新增條文）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：對話結構來自任務設定 `dialogue_fields`，Input 保留規則依值的形狀判斷，不依任務編號或欄位名稱硬編（T013 僅是種子資料）。
- **Data Fairness（NON-NEGOTIABLE）**：只渲染 Input；AC-2.35。
- **Simplicity First / YAGNI**：沿用 #1340 的 `renderDialogueThread`（加注入點，不另寫一份）；不做回覆縮排與連結線（資料模型無回覆關係欄位，草圖細節留待有欄位時另案）。
- **PR 規模（Principle X）**：產品檔案 4 個，預估 ≤ 250 行。
