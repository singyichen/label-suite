---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/925
基準版本: 6.25.0
目標版本: 6.26.0
---

## Why

issue #925 回報：審核員選「修正」後，若再點選另一個答案 chip（把原答案改成正確值），畫面會把剛選的「修正」決策與其理由欄一併清掉，送出時才被 toast 擋下。這個操作順序（先選修正、再點答案）是審核員最自然的動線，卻被現行重置規則靜默懲罰。

現行重置邏輯在 `syncDecisionsWithCorrections()`（`design/prototype/pages/annotation/annotation-workspace.config.js:3755`）：任一 outKey 已有決策時，若當前答案與該決策做出當下的快照（`reviewDecisionAnswers[key]`）不同，一律清空決策（`reviewRowDecisions[key] = null`）、清掉快照、顯示 toast。這條規則的正典依據是 `specs/annotation/015-annotation-workspace/spec.md:413` AC-3.42 之 v4.55.0 撤銷附註第 (2) 點：「決策綁定判定當下答案值、修正後即時重置——`syncDecisionsWithCorrections()` 續存，行為與 toast 文案不變」——AC-3.42 本身雖已於 v4.55.0 整組撤銷（送出前確認區不再渲染），但該撤銷附註明文承接了這一條重置規則，使其成為目前仍生效的正典文字。

維護者裁定（2026-09-26）：**採方向 A，保留決策**。「決策不是 `modify` 時才重置」——理由是這條規則對 `approve`／`bypass` 是正確的：答案一改，原本的「通過」或「無法裁決」就不再成立，必須重置。但對 `modify` 是錯的：**改答案本身就是「修正」這個動作的內容**，重置等於懲罰正確操作。因此這是把 AC-3.42 該撤銷附註第 (2) 點收窄到它原本該有的適用範圍，不是推翻它——AC-3.42 不移除，編號與其餘條件（(1)(3)(4) 三項移轉內容）都保留。

**方向 B（未選決策時點答案直接視為修正）不採用**：它解不掉本 issue 回報的操作序列（先選修正、再點答案），且屬推測性的便利功能，無使用者回報，依 `.claude/rules/general.md` YAGNI 不納入；若日後真有人回報該路徑，另開 issue。

**分級為 MINOR，不觸發 MAJOR 閘門**：AC-3.42 之編號與其餘三項移轉內容皆保留，本次僅收窄第 (2) 點的重置條件（新增排除子句），不移除任何既有 MUST 敘述所涵蓋的行為——`approve`／`bypass`／`無法裁決` 三向決策改答案後仍重置的既有行為維持不變，故不構成既有需求之移除，不需要額外的維護者授權即可走到 archive 與正典回寫。

**流程分類為完整 OpenSpec change flow，不走 Lightweight Path**：雖然只改動 1 個生產檔（`annotation-workspace.config.js`），但這是既有 AC 撤銷附註所載行為規則的修訂，而非單純澄清條文文字用語——是否屬 CLAUDE.md Lightweight Path 所定義的「only clarified」存在解讀空間，依同節「若任一條件不確定，預設走完整流程」處理。

## What Changes

**衍生檢視錠點說明**：AC-3.42 之母體 FR-077 已於 v4.55.0 整組撤銷，`openspec/specs/` 衍生檢視內無對應 `### Requirement:` 段落可供本次 `## MODIFIED Requirements` 合併（`openspec validate --changes --no-interactive` 對此僅回報 INFO，非 schema 錯誤，但明言 `openspec archive` 屆時會拒絕合併）。本次 delta 之衍生檢視錠點改為 **FR-092（審核員三向決策）**——該條現為 `REVIEW_DECISIONS` 三向語彙唯一的正典居所，新增之失效規則正是三向決策各自語意的延伸；正典 `specs/.../spec.md` 的手動回寫仍直接編輯 **AC-3.42** 撤銷附註第 (2) 點（詳見下方），兩者描述同一條規則，僅衍生檢視與正典回寫的落點不同。

- 修訂 **AC-3.42**（`specs/annotation/015-annotation-workspace/spec.md:413`）v4.55.0 撤銷附註第 (2) 點：重置條件由「答案變更即一律重置」收窄為「決策不是 `modify` 時，答案變更才重置」。決策為 `modify` 時，答案變更視為該修正動作本身的內容，**保留**決策與理由欄，並把快照 `reviewDecisionAnswers[key]` 更新為新答案值（使該決策繼續綁定「當前」答案），不觸發 `toastReviewDecisionResetOnEdit` toast。`approve`／`bypass`／`無法裁決`（`reject`）三向決策改答案後**仍須**一律重置並顯示既有 toast——這一側的既有行為不變。
- 對應修改 `syncDecisionsWithCorrections()`（`annotation-workspace.config.js:3755`）：在既有的「快照存在且與當前答案不同」判定成立後，新增一層分流——決策為 `modify` 時只更新快照、不清空決策、不計入本輪 `reset` 旗標（因此不觸發既有的清空決策／toast 重置路徑；但仍會觸發 `reviewDecisionRefreshers` 與一次 `persistReviewDraft()`，用途是讓 `ws-review-quick-submit-btn` 等派生 UI 依當前仍生效的決策即時重新計算）；非 `modify` 時維持既有清空決策、刪快照、標記 `reset = true` 的行為，不改動。

**不變更**：AC-3.42 撤銷附註第 (1)(3)(4) 三項移轉內容、FR-077（已整組撤銷，本次不觸及）、`reviewDecisionRequiresReason()` 之理由必填判定（`modify` 本就在必填理由的決策集合中，本次未改動該判定，理由欄之保留是「決策未被清空」的自然結果，不是新增規則）、`persistReviewDraft()` 之草稿持久化契約本身（`modify` 分支寫入之 decision/reason 值本身不變，僅 `corrected` 欄位可能隨新答案改變——這是 `isRowCorrected()` 既有比對邏輯的自然結果，`modify` 分支仍會多呼叫一次 `persistReviewDraft()` 以反映該值）、`approve`／`bypass`／`無法裁決` 三向決策的既有重置與 toast 行為、任何其他 AC 或 FR。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `annotation/015-annotation-workspace`：修訂 AC-3.42 撤銷附註第 (2) 點之重置條件收窄。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`syncDecisionsWithCorrections()` 新增 `decision === 'modify'` 分流分支。
- `specs/annotation/015-annotation-workspace/spec.md`：修訂 AC-3.42 第 (2) 點；版本 bump 至 6.26.0，Changelog 新增一列。
- 新增 Playwright 契約測試（`design/prototype/tests/annotation/issue-925-keep-modify-decision.spec.ts`）。
- 不影響 API 契約、DB schema、annotator 側行為、其他模組。

## Constitution Check

- **Generalization-First**：分流僅依 `REVIEW_DECISIONS` 既有的三向詞彙值（`modify`）判斷，不新增任何任務 ID 或輸出類型專屬分支，`approve`／`bypass` 兩者的既有通用重置路徑不變。
- **Data Fairness**：不涉及測試集答案外洩路徑，僅為審核員自身修正決策之 UI 保留行為。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用，本變更省略。
