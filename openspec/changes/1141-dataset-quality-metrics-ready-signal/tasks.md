# 任務清單：1141-dataset-quality-metrics-ready-signal（issue #1141，正典 017 側）

> **Apply 前硬閘（兩道，互不替代）**：先 `openspec validate --changes --no-interactive`，再 `scripts/check-sdd.sh`。**主 session／team lead 是唯一可驗證證據與更新 checkbox 的角色**。
>
> **為何沒有 Red／Green 配對**：本 change 只在正典 017 新增 FR-044 的定義，沒有任何程式行為改變；可執行的 Red／Green 在姊妹 change `1141-task-detail-quality-metrics-gate`。
>
> **拆分總則（憲法原則 X）**：0 個產品檔案，與姊妹 change 同一 PR 交付，該 PR 承載 archive 與正典回寫（ADR-033 Rule 1）。

## 1. archive 與正典回寫（最終群組）

**故事目標**：正典 017 自 v3.0.1 回寫為 v3.1.0，FR-044 與其成功標準只有一種說法（SC-029「無法計算」不阻擋的語意不變），`specs/task-management/014-task-detail/spec.md` FR-008b 第 5 項有可 `grep` 的對應定義。

> **產品檔案（0）**：本組不動任何產品程式。
> **版本判定**：**MINOR v3.1.0**。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 017 仍為 v3.0.1。
> **FR-044 於回寫時新增**（正典目前不存在該 ID）；成功標準段同時新增一條對應 SC，編號取當時最大值加一。

- [ ] 1.1 執行 `/opsx:archive 1141-dataset-quality-metrics-ready-signal`，使衍生檢視收錄 FR-044。驗證：`openspec/changes/archive/` 下出現本 change 之日期前綴目錄，且 `grep -n 'FR-044' openspec/specs/dataset/017-dataset-analysis-detail/spec.md` 命中 [@main]
- [ ] 1.2 修改正典 `specs/dataset/017-dataset-analysis-detail/spec.md`：功能需求段新增 FR-044（逐字取自 delta）、成功標準段新增對應 SC、版本改為 v3.1.0 並新增 Changelog 列。驗證：`grep -n 'QUALITY_METRICS_READY_RULE' specs/dataset/017-dataset-analysis-detail/spec.md` 命中 FR-044 與 Changelog [@main]
- [ ] 1.3 執行 Source-Verify：本 change 引入的 FR／SC ID、常數名與 issue 編號皆可逐項 `grep` 定位（含 `grep -n 'iaa_computation_status' specs/task-management/014-task-detail/spec.md` 命中）；`specs/STATUS.md` 之 dataset-017 列於合併後改回 in-progress（正典留在模組目錄）。驗證：`scripts/check-sdd.sh` exit 0 且 `openspec validate --changes --no-interactive` exit 0 [@main]
