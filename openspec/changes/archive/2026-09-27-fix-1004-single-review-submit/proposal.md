---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1004
基準版本: 7.4.0
目標版本: 8.0.0
---

## Why

維護者於 T015 reviewer 畫面（`?task_id=T015&sample_id=ofs-04-pending-review&role=reviewer&run_type=official_run&reviewer_id=reviewer_wang&annotator_id=kioleemg12`）發現：決策完成後畫面上同時存在兩顆視覺文案完全相同的「送出審核」——決策列旁的 `ws-review-quick-submit-btn`（issue #928 新增）與底部 action bar 的 `ws-review-submit-btn`（既有）。兩者呼叫同一個 `handleReviewSubmit()`，是同一個動作的兩個入口。

維護者裁示：**送出入口統一為一個，保留底部 action bar 那顆，移除決策列旁的 quick-submit**。本裁示明知代價——issue #928 的修復（決策列到送出鈕實測 389px，每審一筆需長距離游標移動）會因此被撤銷，並在裁示前提供了成本更低的替代方案（兩顆都留、底部那顆降為次要樣式，零規格影響）。維護者回覆「就按照我的決定處理，不要 D」，明知代價仍維持原裁示。

**分類判定：不符 Lightweight Path，走完整 OpenSpec change flow**。移除 `ws-review-quick-submit-btn` 會廢止正典既有 **AC-3.63**（v6.23.0 新增，issue #928）並移除 **FR-014P 第 (6) 點**「鄰近送出」——這是移除既有 MUST 敘述，不是澄清，不符 Lightweight Path「無 FR／AC 增刪，只做澄清」之條件。

**分級為 MAJOR（v7.4.0 → v8.0.0）**：本次廢止一則既有 AC（AC-3.63）並移除一則既有 FR 之整點（FR-014P(6)），比照 issue #920 廢止 AC-4.56／AC-4.57 之先例分級為 MAJOR。維護者已於派工前明確授權本分級與其代價（見 issue #1004 checkpoint 留言），本 change 不再為 MAJOR 本身停下。

**issue 內文未涵蓋、但屬同一變更必然後果的規格影響**：issue #1004 開立後，**issue #930（PR #1007）已合併**，為 `ws-review-quick-submit-btn` 新增了後果提示 `ws-review-quick-submit-consequence`（正典 **FR-102**，對應 **AC-3.64**、**AC-3.65**，issue #930）。FR-102 明文規定送出前後果提示要出現在「兩個送出入口」旁；移除其中一個入口（決策列）後，該入口的後果提示元素 `ws-review-quick-submit-consequence` 同樣失去存在理由，必須一併移除（否則構成死碼）；FR-102 條文本身「兩個送出入口」之敘述必須同步修訂為「送出入口」（單一入口）。**AC-3.65**（決策列送出鈕之提示與 footer 同源同步）之驗收情境整體以「兩個入口逐字同步」為前提，該前提隨第二入口移除而不復存在，比照 AC-3.63 之作法**一併廢止，ID 保留不重用**。**AC-3.64**（固定 footer 提示依決策與 run_type 即時切換）之驗收情境本身只描述 footer 單一入口，不涉及「兩個入口」敘述，不需修訂。

**單一目的判斷（`.claude/rules/git-workflow.md`）**：移除決策列旁重複的送出入口，與同步修訂描述該入口存在的規格條文（FR-014P(6)、AC-3.63、FR-102、AC-3.65），是同一個變更動作在程式與規格兩個層面的必然映照——規格若不同步修訂，會與程式現況矛盾，不構成獨立的第二個目的。單一句描述：「移除決策列旁重複的送出入口，並同步移除規格中對該已移除入口的描述」。維持單一 PR，不拆分。

## What Changes

- **移除** `buildReviewQuickSubmit()` 整段（含其 `reviewDecisionRefreshers.push(refresh)` 註冊）及其唯一呼叫點 `preview.appendChild(buildReviewQuickSubmit())`。
- **移除** i18n key `reviewQuickSubmitAriaLabel`（zh／en）及其上方描述 A11Y-05 雙同名按鈕問題的註解——該問題隨本次移除消失。
- **移除** CSS 規則 `.rv-quick-submit-row`。
- **廢止 AC-3.63**（ID 保留不重用，比照 issue #920 廢止 AC-4.56／AC-4.57 之作法）。
- **修訂 FR-014P**：移除第 (6) 點「鄰近送出」，其餘 (1)~(5) 點逐字保留不改寫。
- **修訂 FR-102**：「兩個送出入口」改為「送出入口」（單一入口，僅 `ws-review-submit-btn`），移除全部對 `ws-review-quick-submit-btn`／`ws-review-quick-submit-consequence` 的引用；推導規則（第 1～4 點）、footer 側之四個驗收分支與 PR 審查發現之答案比對邏輯**逐字保留不改寫**。
- **廢止 AC-3.65**（ID 保留不重用，同一先例）——其驗收情境之前提（第二入口存在並與第一入口同步）隨本次移除消失。
- **AC-3.64 不修訂**——其驗收情境僅涉及 footer 單一入口。
- 改寫既有測試 `issue-928-submit-near-decision.spec.ts`（整支前提消失，改為驗證「決策列旁不存在第二顆送出鈕」等正向斷言，保留檔案與其中與 quick-submit 無關的既有斷言）、`issue-925-keep-modify-decision.spec.ts:88-89`（點擊目標由 `ws-review-quick-submit-btn` 改為 `ws-review-submit-btn`，主旨〔#925 的決策存活〕不變）、`issue-930-submit-consequence-hint.spec.ts`（quick-submit 部分改寫為單一入口的正向斷言，footer 側既有覆蓋不動）。
- **不得更動**：`ws-review-submit-btn` 的既有位置與右對齊契約（issue #563）、仲裁送出 `ws-arbitration-submit` 共用同一條 action bar 的安排（issue #568）、`Ctrl/Cmd+Enter` 綁定（指向 `wsReviewSubmitBtn`）。
- 收尾：本 PR 合併後於 issue #928 留言說明撤銷原因與本 issue 連結（Ratchet Principle：既有修復不得被默默回退）。

## Capabilities

### Modified Capabilities

- `annotation/015-annotation-workspace`：廢止 AC-3.63、AC-3.65；修訂 FR-014P（移除第 6 點）、FR-102（單一入口敘述）。

### Removed Capabilities

無——本次為既有 Requirement 內部點位與 AC 之廢止，非整個 Requirement 移除，FR-014P／FR-102 本身仍存在（以 MODIFIED 表達）。

## Impact

- `design/prototype/pages/annotation/annotation-workspace.config.js`：`buildReviewQuickSubmit()` 整段移除、唯一呼叫點移除、i18n key 移除。
- `design/prototype/pages/annotation/annotation-workspace.html`：CSS `.rv-quick-submit-row` 移除。
- `specs/annotation/015-annotation-workspace/spec.md`：AC-3.63、AC-3.65 廢止（ID 保留不重用）；FR-014P、FR-102 修訂；版本 7.4.0 → 8.0.0（MAJOR，實際號碼由主 session 於合併時確認），Changelog 新增一列。
- 改寫 Playwright 契約測試：`issue-928-submit-near-decision.spec.ts`、`issue-925-keep-modify-decision.spec.ts`、`issue-930-submit-consequence-hint.spec.ts`。
- 不影響 API 契約、DB schema、annotator 側行為、其他模組；不影響 footer 送出入口（`ws-review-submit-btn`）之既有位置、可見性邏輯或既有測試覆蓋。

## Constitution Check

- **Generalization-First**：移除的是重複入口，不涉入任務 ID 或輸出類型專屬分支；不新增任何硬編碼邏輯。
- **Data Fairness**：不涉及測試集答案外洩路徑。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則列為選用；本變更為單一 UI 元素移除＋規格同步修訂，互動模型未變更（送出行為、驗證、`handleReviewSubmit()` 皆不變），故省略 `design.md`。
