# 設計文件：三層單人接力審核模型

## Context

動機與範圍見 `proposal.md` 之 `## Why` / `## What Changes`。本文件只寫「怎麼做」。

現況約束：

- 本專案仍在 prototype 階段，`design/prototype/` 為靜態 HTML + 純 JS 資料層，沒有後端。本次沒有真實 HTTP API，但**有等價的資料契約**——`annotation-workspace.data.js` / `task-detail.data.js` 匯出的資料結構與 `annotation-workspace.config.js` 的常數表，就是後端 API 落地時的 schema 前身。本文件依 `openspec/config.yaml` 之「design.md 於觸及 API 契約或資料模型時必要」規則，將該契約明文化。
- 審核狀態、爭議池、仲裁投票目前皆存放於 `localStorage`，以 `task_id × run_type × annotator_id × sample_id` 為鍵。既有鍵不可直接改名，否則使用者本機既有示範資料全部失效。
- 三張流程圖（branch `docs/review-flow-diagrams-596`，commit `5cbea993`）為本設計的權威呈現基準：`specs/annotation/015-annotation-workspace/diagrams/review-flow-overview.html`、`review-flow-dry-run.html`、`review-flow-official-run.html`。本次實作 MUST 與其一致，且**不得修改這三張圖**。

## Goals / Non-Goals

### Goals

- 定出 `REVIEW_UNIT_STATUS` 三態的**單一推導函式**，使 014 的審核狀態 badge、015 的清單篩選、脈絡橫幅、狀態軌四處呈現同源。
- 定出審核決策、仲裁結果、例外池處置三組常數與其持久化形狀，讓歷程（FR-086／FR-097）能純推導、不另存第二份。
- 定出舊資料（五態、`rejected` 歷程、`votes[]` 多筆）的相容策略，使既有 `localStorage` 內容不炸畫面。
- 把 10 個產品檔案的改動切成符合憲法原則 X 的 stacked PR 順序。

### Non-Goals

- **不**設計後端 REST 端點與 DB migration——foundation 尚未實作，提前訂 endpoint 會是憑空猜測（YAGNI）。本文件只定資料形狀，端點命名留待 foundation 階段。
- **不**重畫流程圖。
- **不**設計「已定稿後重啟流程」的解鎖入口（015 FR-053 明定延後至後端階段）。
- **不**處理 IAA 計算方式——正典在 `dataset/017` FR-039，本次不動。

## Decisions

### D1：狀態機收斂為三態，且以單一述詞函式推導

**決定**：`REVIEW_UNIT_STATUS = pending | disputed | finalized`。推導集中於 `getReviewUnitStatus(taskId, runType, annotatorId, sampleId)` 單一函式，輸入為「該單位指派審核員之已提交決策」＋「該單位之仲裁裁定」＋「該單位之例外池處置」，輸出三態或 `null`（標記員未提交）。`getReviewUnitLane()` 與其共用同一組讀取，MUST NOT 各自重算。

推導表：

| 條件 | 狀態 |
|---|---|
| 標記員無提交 | `null`（畫面顯示 `尚無標記提交`） |
| 指派審核員未送出 | `pending` |
| 已送出且全部 outKey `approve` | `finalized` |
| 已送出且任一 outKey `modify` / `bypass`，仍有爭議項未裁定或未收尾 | `disputed` |
| 全部爭議項經仲裁（`adopt_a` / `adopt_b`）或例外池（採 A／採 B／自訂答案）解決 | `finalized` |
| 經例外池 `exclude_from_dataset` | 排除記號（**不是** `finalized`） |

**替代方案**：保留 `approved` / `modified` 兩態作為「已審但未定稿」。**否決理由**：門檻已移除，這兩態的存活條件（`n < min_reviewers`）在結構上不可能成立，留著只會產生永遠推導不出來的狀態值與對應死碼。

**替代方案**：`exclude_from_dataset` 也算 `finalized`，另加旗標。**否決理由**：`finalized` 在 015 FR-063 直接等同「產生 gold」，被排除的樣本沒有 gold，混進去會讓匯出集合的判定條件變成「`finalized` 且未被排除」，把一個布林拆成兩處判斷。

### D2：決策、仲裁、例外池三組常數與其持久化形狀

三組互不重疊的封閉集合，皆置於 `annotation-workspace.config.js`，渲染端一律由集合推導（禁止硬編分支，憲法 Generalization-First）：

```js
REVIEW_DECISIONS      = ['approve', 'modify', 'bypass']
ARBITRATION_OUTCOMES  = ['adopt_a', 'adopt_b', 'reject']
EXCEPTION_POOL_ACTIONS= ['adopt_annotator', 'adopt_reviewer', 'custom_answer', 'exclude_from_dataset']
```

持久化形狀（`localStorage`，鍵沿用現有 `task_id × run_type × annotator_id × sample_id`）：

```
reviewSubmission = {
  reviewer_id, submitted_at,
  decisions: { [outKey]: 'approve' | 'modify' | 'bypass' },
  values:    { [outKey]: <修正後的值> },   // 僅 decision = 'modify' 時存在
  reasons:   { [outKey]: string }          // decision ∈ {modify, bypass} 時必填（FR-016A）
}

arbitration = {
  [outKey]: { arbiter_id, choice: 'adopt_a'|'adopt_b'|'reject',
              finalized_value?, reason?, voted_at }
}

exceptionPool = {
  [outKey]: { resolver_id, action: <EXCEPTION_POOL_ACTIONS>,
              finalized_value?, reason, resolved_at }
}
```

**關鍵決定：`bypass` 不存值。** `values[outKey]` 於 `bypass` 時 MUST 不存在，仲裁版面的 B 側據此判定要渲染「審核員 Bypass（無法判定）」而非某個具體值。**替代方案**是存一個 `null` 或哨兵字串——否決，因為哨兵值會在匯出、diff 比較（FR-052）、歷程值變化（FR-097）三處都需要特判。「欄位不存在」是天然的哨兵。

**仲裁寫入位置**：寫在**審核單位**下，不寫進任何 reviewer bucket。這是既有 FR-061 已有的規則，本次沿用——爭議屬於單位本身，任何仲裁者的定案必須對該單位所有檢視者可見。

### D3：`bypass` 進爭議池，B 側可被採納為「無法判定」

`bypass` 的爭議項，其 B 側代表的是「審核員明確表示判不了」。仲裁者採 B 時，該項的定案值記為「無法判定」，**不回填標記員原答案**。

**替代方案**：`bypass` 直接送例外池、跳過仲裁。**否決理由**：仲裁者是這條流程裡第一個「非當事人」的判斷者，把 Bypass 直接送到專案負責人會讓 PL 的例外池塞滿本來仲裁就能解決的案子；流程圖也明確畫成三層接力，Bypass 走的是同一條爭議池。

### D4：例外池的自訂答案重用原始標記控件

FR-095 的 `custom_answer` MUST 重用 `OUTPUT_TYPE_REGISTRY` 驅動的作答控件渲染函式（與標記員工作區同一支），並套用該 outKey 的 `outputs[].config` 作為合法答案空間。

**替代方案**：例外池自建一個自由文字輸入。**否決理由**：直接違反 Generalization-First——會出現一條繞過 task config 的作答路徑，且產生的值可能不在該輸出類型的合法值域內，污染匯出資料。流程圖上也逐字寫了「要用原本的標記畫面，只能填合法答案」。

`dry_run` 的例外池 MUST NOT 渲染 `custom_answer`（試標不產生定案答案，沒有可寫入的標的）——這是本次**唯一**新增的 `run_type` 分流呈現，其餘一律同版面。

### D5：試標歷史回饋的揭露閘門（Data Fairness NON-NEGOTIABLE）

FR-096 的資料 MUST 以任務狀態為閘門：僅當該試標回合已滿足 `DRY_RUN_COMPLETION_RULE`、任務進入 `waiting_iaa_confirmation` 之後才對標記員開放；回合進行中查詢 MUST 回傳空集合並顯示說明，而**不是**回傳資料後在 UI 隱藏。

**替代方案**：一律開放、由 UI 遮蔽。**否決理由**：資料一旦進到前端就等於已洩漏；而且標記員只要看到「我這題被改了」就會回頭對齊，同一輪 IAA 立刻失去統計意義。閘門必須在資料層。

### D6：舊資料相容——不遷移、只相容

既有 `localStorage` 中的五態值、`rejected` 歷程事件、多筆 `votes[]` 一律**不做資料遷移**：

- 五態值 → 由 D1 的推導函式重新推導，舊存的狀態欄位不再被讀取（狀態本來就是推導值，不是儲存值）。
- `rejected` 歷程事件 → 保留原樣，依 FR-086 的集合外值規則以中性徽章呈現。
- 多筆 `votes[]`（舊多數決留下的）→ 讀取時取**最新一筆**作為該爭議項的裁定，其餘保留於歷程。

**替代方案**：寫一支遷移腳本清 `localStorage`。**否決理由**：prototype 的 `localStorage` 是示範資料，不是使用者資產；寫遷移腳本要為一次性情境維護一支只跑一次的程式，違反 KISS/YAGNI。「推導優先、集合外值中性呈現」已經足夠。

### D7：014 與 015 的職責切線

- **014 擁有設定與閘門**：兩份名冊的勾選（FR-010s-1）、審核指派區塊的唯讀呈現（FR-005j）、爭議池／例外池的計數列（FR-005k）、例外池的清單與導頁（FR-018）、結案閘門（FR-008b）。
- **015 擁有作業畫面**：審核卡、仲裁版面、定稿卡、例外池的**處置畫面**（FR-095）、試標歷史回饋（FR-096）。

**依據**：014 是控制面、015 是作業面，這是既有切線。例外池若把處置畫面放在 014，就得在 task-detail 內重建一整套 `OUTPUT_TYPE_REGISTRY` 作答控件（D4 明確禁止）。

## Risks / Trade-offs

- **[大量刪除誤傷既有測試]** 本次移除四條 FR 與整組多數決機制，現有 Playwright 測試中有相當比例直接斷言 `已同意`／`已修改`／退回按鈕／票數表 → **緩解**：每個 PR 群組的 Red 任務先以新契約寫測試並確認紅燈，Green 任務同時刪除失效斷言；每組結束跑完整 `pnpm playwright test`，不允許帶紅進下一組。
- **[三態推導函式成為單點]** `getReviewUnitStatus()` 被四處呈現共用，改錯一處全錯 → **緩解**：第一組 PR 只做資料層（config + data）與其單元測試，介面組建立在已綠的資料層之上。
- **[例外池不清空導致任務永遠結不了案]** 若任務未勾選仲裁者，爭議項會堆在爭議池、永不進例外池，`completed` 永遠被擋 → **緩解**：FR-010t 於發布確認顯示「未指定仲裁者將導致無法結案」警示（不阻擋發布，因為 `draft` 階段可能還沒決定人選）。
- **[testid 廢棄後被重用]** `ws-finalized-vote`、`ws-arbitration-*`、`ws-rework-*` 等 testid 隨 FR 移除而失效 → **緩解**：規格中已逐一標註「保留不重用」，避免日後新功能撿走同名 testid 造成測試語意錯亂。
- **[T016/T017 示範任務改寫使既有截圖/文件失效]** → **緩解**：改寫排在最後一組實作 PR，一次改完並同步 `design/prototype/` 相關說明。

## Migration Plan

1. **無資料庫 migration**（prototype 階段無 DB）。
2. **`localStorage` 相容**：依 D6，不清除、不轉檔；新程式以推導取代讀取舊狀態欄位。
3. **示範資料**：T016（三人多數決）與 T017（雙人平手）的種子資料在新模型下不成立，於最後一組實作 PR 改寫為「審核員修正 → 仲裁採 B」與「仲裁 Reject → 例外池 → 專案負責人收尾」兩條示範路徑。
4. **回滾**：每組 stacked PR 皆可獨立 revert；資料層組（第一組）被 revert 時介面組必然一併 revert，順序即回滾順序的反向。
5. **正典回寫**：僅最後一組（archive 組）執行 `/opsx:archive`，回寫 `specs/task-management/014-task-detail/spec.md`（v3.0.0）與 `specs/annotation/015-annotation-workspace/spec.md`（v5.0.0），各自加 Changelog；合併後更新 `specs/STATUS.md`。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：三組決策常數皆為封閉集合並由單一來源驅動渲染；例外池自訂答案重用 `OUTPUT_TYPE_REGISTRY` 作答控件（D4），不另建作答路徑；仲裁 B 側呈現由 `decisions[outKey]` 的值決定，非以任務 ID 或帳號硬編。
- **Data Fairness（NON-NEGOTIABLE）**：試標歷史回饋以任務狀態為資料層閘門（D5）；FR-062 盲審隔離不放寬，仲裁者與專案負責人皆看不到未提交草稿；`custom_answer` 僅 `official_run` 提供，試標不產生任何定案答案。
- **原則 X（PR 規模）**：10 個產品檔案，拆為 7 組實作 PR ＋ 1 組 archive PR，每組 ≤ 5 個產品檔案（見 `tasks.md`）。
- **KISS / YAGNI**：本次淨效果是大幅刪除（4 條 FR 移除、多數決整組退場、兩個開關退場）；不預先設計後端端點與 DB schema。
- **可追溯性**：每個定稿值皆記錄來源與決策者（FR-063），歷程逐卡呈現責任鏈（FR-097），定稿卡附微型衝突歷程（FR-094）。

## 已確認決策（2026-09-01，維護者裁示）

Planner 提出的四項待確認缺口已全數獲得裁示，皆照提案採納，delta 無須改動設計，僅 FR-054 之論述措辭修正（見第 1 項）：

1. **FR-054 快捷鍵**：採 `A` = 通過、`B` = 無法判定，`修正` 不綁鍵。惟原論述「修正必然伴隨必填理由，一次按鍵無法完成」不成立——`bypass` 依 FR-016A 同樣必填理由，照此論述 `B` 也該排除。真正的分野是**快捷鍵作用於當前單位的全部 outKey**：修正的替代值因 outKey 而異，單一按鍵無法表達；無法判定則是全單位一致的決策。FR-054 條文已改用此論述。
2. **FR-010t 發布閘門**：審核員 ≥ 1 才可發布（硬擋），仲裁者名冊為空僅警示不擋。可行性依據：`arbiter_ids` 屬 `OVERVIEW_EDITABLE_FIELDS`，發布後仍可編輯，爭議項堆積時維護者隨時能補人，死路可逃脫。
3. **例外池切線**：入口與清單在 014（FR-018），逐筆處置畫面在 015（FR-095），維持 014＝控制面／015＝作業面的既有切線。
4. **FR-096 試標歷史回饋**：落在 `annotation-list.html` 標記員視角，不另開畫面。

## Open Questions

以下為可在實作期間安全決定、不影響規格與任務拆分的細節：

1. 微型衝突歷程（FR-094）的分隔符號採 `➔` 或 `→`——待 `design/system/MASTER.md` 既有用法確認後統一。
2. 例外池清單的預設排序（落池時間新→舊，或依樣本 ID）——不影響行為契約。
3. 試標歷史回饋（FR-096）的分頁筆數預設值——沿用 `annotation-list` 既有預設即可。
