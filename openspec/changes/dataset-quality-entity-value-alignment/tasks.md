# 任務清單：dataset-quality-entity-value-alignment（issue #783 第 3 點）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 **OpenSpec schema validation** 結果，再執行 `scripts/check-sdd.sh` 取得 **Project SDD lint** 結果。兩者皆通過後必須停止，取得維護者明確確認才可進入 `/opsx:apply`。**主 session／team lead 是唯一可驗證證據與更新 checkbox 的角色**。
>
> **為何沒有 Red／Green 配對**：本 change 只修正正典 017 關鍵實體段與常數段的不一致，沒有任何 prototype 或後端程式行為改變（proposal.md「prototype」一項、design.md D3）；兩條情境描述的是資料形狀，於後端實作 schema 時撰寫測試。
>
> **拆分總則（憲法原則 X）**：0 個產品檔案，單一 PR 交付，該 PR 同時承載群組 1 的 archive 與正典回寫（ADR-033 Rule 1）。
>
> **套用順序（跨 change）**：與 issue #791 的 change 及姊妹 change `task-detail-iaa-precondition-and-override-scope` 皆無檔案重疊（僅共用 `specs/STATUS.md` 不同列）；但 FR-039 的新增句引用姊妹 change 新增的 `TrialRound.iaa_computation_status`，群組 1 須在姊妹 change 回寫正典 014 之後執行。

## 0. 前置

**故事目標**（SC-003、SC-014）：`specs/STATUS.md` 與正典 frontmatter 一致地反映 `dataset-017` 有一個開啟中的 OpenSpec change，使實體段修正有正確的流程狀態基準。

> **產品檔案（0）**：本組不動任何產品程式。

- [ ] 0.1 確認 `specs/STATUS.md` 之 dataset-017 列狀態為 change-open、分支欄與正典 017 frontmatter 功能分支欄逐字相同；若 apply 改在其他分支進行，兩處同步改為該分支名。驗證：`scripts/check-sdd.sh` 之 ACTIVE_CHANGE_SPEC 與 ACTIVE_CHANGE_STAGE 皆為 0 筆 [@main]

## 1. archive 與正典回寫（最終群組）

**故事目標**（SC-003、SC-014）：正典 017 自 v3.0.0 回寫為 v3.0.1 後，`SharedMetrics` 的五個欄位與 `risk_level` 的三值加 null 在常數段、FR、成功標準與關鍵實體段四處只有一種說法；FR-039 第 1 點與正典 014 對 IAA 計算未結束的處理不再字面衝突（SC-029）。

> **產品檔案（0）**：本組不動任何產品程式。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，並收集 Source-Verify 證據。
> **相依**：姊妹 change `task-detail-iaa-precondition-and-override-scope` 已回寫正典 014（`TrialRound.iaa_computation_status` 已存在於正典 014）。
> **版本判定**：**PATCH v3.0.1**。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 017 仍為 v3.0.0；若期間已被其他 change 推進，版本號須依合併目標重算，不得倒退。
> **原地改寫，不得追加**：FR-008 與 FR-025 以既有 ID 置於 delta 的 `## ADDED Requirements`；回寫正典時必須改寫原條文，正典中每個 ID 仍只能出現一次定義；SC-003、SC-014 原文不動，不配發新 AC 編號。

- [ ] 1.1 執行 `/opsx:archive dataset-quality-entity-value-alignment`，使衍生檢視收錄 FR-008 與 FR-025，並以修訂後全文取代 FR-039。驗證：`openspec/changes/archive/` 下出現本 change 之日期前綴目錄，且 `grep -n 'FR-025' openspec/specs/dataset/017-dataset-analysis-detail/spec.md` 命中 [@main]
- [ ] 1.2 修改正典 `specs/dataset/017-dataset-analysis-detail/spec.md`：原地改寫 FR-008 與 FR-025；關鍵實體段 SharedMetrics 改列五個欄位並採用 completion_rate，AnnotatorRiskAssessment 之 risk_level 改為三值且註明資料不足時為 null；於 FR-039 第 1 點末尾原地補上 delta 的釐清句；版本改為 v3.0.1 並新增 Changelog 列。驗證：`grep -n 'overall_completion_rate' specs/dataset/017-dataset-analysis-detail/spec.md` 只命中新 Changelog 列，且 `grep -n 'high_risk | insufficient_data' specs/dataset/017-dataset-analysis-detail/spec.md` 無輸出，且 `grep -n 'iaa_computation_status' specs/dataset/017-dataset-analysis-detail/spec.md` 命中 FR-039 [@main]
- [ ] 1.3 執行 Source-Verify：衍生檢視與正典中本 change 引入的每一個 FR／SC ID、常數名與 issue 編號皆可逐項 `grep` 定位（含 `grep -n 'iaa_computation_status' specs/task-management/014-task-detail/spec.md` 命中），並將 `specs/STATUS.md` 之 dataset-017 列於合併後改回 in-progress（正典留在模組目錄，先例 `2542e49c`）。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]

## 合併前注意

- PR 描述附 `Closes #783` 的條件：姊妹 change `task-detail-iaa-precondition-and-override-scope` 亦已合併；否則只寫 `Refs #783`。
