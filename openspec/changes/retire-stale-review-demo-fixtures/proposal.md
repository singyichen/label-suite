---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
---

## Why

Issue #815。四個審核流程示範任務（T014–T017）的種子列建於 v4.11.0，當時的審核模型是「每筆樣本湊滿 `min_reviewers` 位審核員後多數決收斂」。v5.0.0（issue #596，BREAKING）把模型換成三層單人接力：`REVIEW_ASSIGNMENT_GRANULARITY` 的 `official_run: per_unit` 規定每個審核單位恰有一位指派審核員（FR-093），`MIN_REVIEWERS_DEFAULT` 與 `DISPUTE_CONVERGENCE_RULE` 同版廢止。**種子列沒有跟著遷移**，於是示範資料成了現行規則的反例而非見證。

逐列複驗 `annotation-workspace.data.js` 的 `REVIEWER_MOCK_ROWS`（`:3137`–`:3161`），失效的是四列，不是整組：

| 種子列 | 形狀 | 現行模型可否產生 |
| --- | --- | --- |
| T016 `ofm-04-majority-converged` | 三位審核員（wang／li／lin）同審一個 `official_run` 單位，註解寫 `neutral 2 > 3/2` | **否**——違反 FR-093「每個審核單位恰有一位指派審核員」，且多數決收斂規則已廢止 |
| T016 `ofm-05-all-divergent` | 三位審核員同審一個單位，1/1/1 分歧 | **否**——同上 |
| T017 `oft-04-unanimous-gold` | 兩位審核員（wang／li）同審一個單位 | **否**——同上 |
| T017 `oft-05-pending-review` | `rejectBy` 模擬審核員層級的「退回」決策 | **否**——`REVIEW_DECISIONS = approve \| modify \| bypass`（015:59）自 v5.0.0 起不含 `reject`；`reject` 僅存於 `ARBITRATION_OUTCOMES`（015:61），是仲裁者的裁定值 |

其餘各列（`ofm-01`／`ofm-02`／`ofm-03`／`oft-01`／`oft-02`／`oft-03`，以及 T014／T015 全部）在單人接力模型下皆為合法形狀——單一審核員 `通過` 即定稿、單一審核員 `修正` 即爭議中、經仲裁採 A／採 B 後定稿。**grep 命中數在此嚴重高估工作量**：`min_reviewers` 與「多數決」出現在大量註解與 id 命名裡，真正無法被資料模型產生的只有上表四列。

**與 #828 的關係**：`ofm-02-approved-interim`／`ofm-03-modified-interim` 這兩個 id 承載的是 v5.0.0 已移除的過渡態語彙（`approved`／`modified`），但**列本身合法**，屬改名而非汰換，已由 #828（#627 第 3 項）承接。本單以 #828 為前置，兩單不重疊。

**四個示範任務只剩三個仍有獨立示範價值**：T017（`review-flow-official-tie`）的整組立意是「`min_reviewers = 2` 的偶數平手」——單人接力下一個單位只有一位審核員，平手在結構上不存在，這個立意無法被翻譯成現行模型的任何形狀。其 `oft-02`／`oft-03` 與 T016 的 `ofm-02`／`ofm-03` 同形，移除不損失覆蓋。

**但 T017 的 `oft-01-final-exception` 必須被保住。** 它是全庫**唯一**示範 FR-061 第 3 點仲裁「兩者皆非」→ 進入最終例外池（FR-095）的種子（`arbReject` 於 `annotation-workspace.data.js` 全檔僅此一處命中）。整組刪除 T017 會連帶刪掉這段覆蓋，正好與本單的目的相反。因此本單把它的示範內容遷入 T016 空出的 `ofm-05` 槽位，任務整組移除但覆蓋不減。

**真正的零覆蓋在兩處**，本單一併補上：

1. **決策值 `bypass`（無法判定）零種子**——`REVIEW_DECISIONS` 三值中只有 `approve` 與 `modify` 有種子列；`bypass` 在整份 `REVIEWER_MOCK_ROWS` 零命中。空出的 `ofm-04` 槽位承接它。
2. **例外池的「出池」零種子**——`oft-01` 示範的是單位**進入**例外池，而四個處置動作（`adopt_annotator`／`adopt_reviewer`／`custom_answer`／`exclude_from_dataset`，`EXCEPTION_POOL_ACTIONS`）的結果只存在 localStorage（`labelsuite.wsExceptionPool.`），零種子資料。進池與出池是兩層，本單明確只補進池那層，出池留給後續（見非目標）。

**第二個獨立缺陷：示範資料有兩份副本且已漂移。** `docs/product/example-data/review-flow-*.json` 與 prototype 的 `REVIEWER_MOCK_ROWS` 是同一份資料的兩個手寫副本，20 列中有 2 列的 id 已經不一致（`ofm-01`：docs 寫 `ofm-01-unanimous-gold`／prototype 寫 `ofm-01-reviewer-corrects-b`；`oft-01`：docs 寫 `oft-01-even-tie`／prototype 寫 `oft-01-final-exception`）。**目前沒有任何閘門比對這兩份**，所以漂移可以無聲存在。prototype 是實際渲染的來源，取為基準。

不走 Lightweight Path：T016／T017 寫進 AC-1.22／AC-1.23／AC-1.24／AC-4.39／AC-4.40 的 **Given 前提**，示範任務數量寫進 SC-004W 與 015`:21` 的示例基線宣告，移除 T017 會改動這些條文而非僅釐清；且本單新增「示範資料必須是現行模型的見證」與「兩份副本一致性」兩條先前不存在的規則。

## What Changes

- **修訂 FR-044（審核列的呈現與 seed 來源）**：補上示範 seed 的合法性約束與雙份副本一致性規則——示範 fixture MUST 只示範現行模型可產生的形狀，且 `docs/product/example-data` 與 prototype 種子 MUST 逐列一致，以 prototype 為基準，並由一道可執行的檢查守住。
- **修訂 FR-093（審核指派粒度）**：補一則 scenario，把「每個審核單位恰一位指派審核員」這條規則的約束對象明確擴及示範種子資料本身。
- **新增兩則 AC**（gate 4 回寫正典時編號，接續各章現行最大者）：一則釘住示範種子的合法性與決策值覆蓋、一則釘住雙份副本一致性檢查。
- **種子汰換**：`ofm-04-majority-converged` 改為 `bypass` 決策示範、`ofm-05-all-divergent` 改為承接 `oft-01` 的仲裁「兩者皆非」→ 最終例外池示範（兩者皆改名），T017／`review-flow-official-tie` 整組移除。
- **消費端同步**：6 份 prototype 種子登錄檔各刪一列 T017 登錄。
- **任務設定文案**：四份 `docs/product/task-configs/review-flow-*.json` 的 `typical_tasks` 字串移除 `min_reviewers=N`、「多數決」、「偶數平手」等已廢止語彙。
- **一致性閘門**：新增一支比對 `docs/product/example-data` 與 prototype 種子的檢查腳本，並依 CLAUDE.md 的兩向契約同時登錄 `scripts/ci-jobs.tsv` 與 CI job。
- **正典回寫**：015 為主（FR-044、FR-093、兩則新 AC、`:21` 示例基線、`:1031` 種子來源註、SC-004W、AC-1.22／AC-1.23／AC-1.24／AC-4.39／AC-4.40 的 Given 前提），010（示例基線表與筆數）與 `specs/dashboard/012-dashboard/spec.md`（FR-011D／FR-011E／SC-024 的 T014–T017 範圍）為下游同步，三份各自 bump 版號與補 Changelog 一列。

**非目標**：

- **不改 `ofm-02`／`ofm-03` 的 id**——屬 #828（#627 第 3 項），本單以其為前置。兩單零檔案重疊於 propose 階段；apply 階段同動 `annotation-workspace.data.js`，故本單的 apply MUST 在 #828 apply 落地之後。
- **不補例外池「出池」種子**——四個 `EXCEPTION_POOL_ACTIONS` 的處置結果只存在 localStorage，種子化需要另設一層 storage 種子機制，屬獨立設計題。本單補進池那層即止，出池覆蓋另開單。
- **不處理 T014 `dry-05-pending-review` 的 `rejectBy`**——它與本單移除的 `oft-05` 同根因（審核員層級 `reject` 隨 v5.0.0 廢止），但 `dry_run` 的退回行為由 issue #502 另行定義，是否連帶失效需獨立裁定。本單只登記不處置，建議另開 Bug 單。
- **不改 FR-051 三態狀態機、不改 FR-092 三向決策、不改 FR-061 仲裁規則本身**——本單只換示範資料使其符合這些既有條文，條文本身不動。
- **不改任何審核狀態語彙或決策值文案**——屬 #810／#809／#807／#811 語彙群組。
- **不動「不得硬編任務 ID」條文（015`:858`／FR-099 第 8 點／FR-100 第 8 點）的 `T014–T017` 字樣**——該三處為否定式列舉（「MUST NOT 對 T014–T017 或任何任務 ID 分流」），移除 T017 後語句仍然成立且無害，改寫只會製造沿革噪音。
- **不動 `specs/_archive/014-task-detail/spec.md`**——其 3 處 T017 命中全在 Changelog 沿革列，且封存檔唯讀。（issue #815 附註稱「兩份正典位於 `specs/_archive/`」與事實不符：`specs/_archive/` 只有 `001-project-sdd-lint` 與 `014-task-detail`，010 與 015 皆為 active，無須取回或重新封存。）

## Capabilities

`annotation` — 審核示範種子資料的合法性與一致性。
