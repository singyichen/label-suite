# 任務清單：1412-dataset-analysis-labelpath-unit（issue #1412 PR-A，正典 017 側）

> **Apply 前硬閘（兩道，互不替代）**：先 `openspec validate --changes --no-interactive`，再 `scripts/check-sdd.sh`。**主 session／lead 是唯一可驗證證據與更新 checkbox 的角色**。
>
> **為何沒有 Red／Green 配對**：本 change 只在正典 017 新增 FR-045 的計數單位定義，沒有任何程式行為改變；017 原型 partial 為扁平固定標籤夾具（等同長度 1 的 `LabelPath`），未實作階層 `multi_label` 統計或 IAA（`grep -rni 'labelpath' design/prototype/pages/dataset/` 無命中），因此沒有可寫的 Red。
>
> **拆分總則（憲法原則 X）**：0 個產品檔案；archive 與正典回寫在同一 PR（ADR-033 Rule 1）。014 設定檢視與 013 延後條文改為已完成屬 #1412 PR-B，等 #1403 合併後另開，不在此範圍。

## 0. 前置

**故事目標**（SC-037）：流程狀態檔反映本 change 對 dataset-017 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md`，於 dataset-017 列追加本 change 的 in-flight 說明（append-only，只改本列與變更紀錄新增一列）。 [@main]

## 1. archive 與正典回寫（最終群組）

**故事目標**（SC-037）：正典 017 自 v3.1.2 回寫為 v3.2.0，FR-045 與其對應 SC 只有一種說法，FR-009G、FR-012G、`IAA_LABEL_MIN_POSITIVE` 與 `OUTPUT_TYPE_IAA_REGISTRY` 的 `multi_label` 列有可 `grep` 的交叉引用。

> **產品檔案（0）**：本組不動任何產品程式。
> **版本判定**：**MINOR v3.2.0**。回寫前須先 `git fetch` 並確認 `origin/main` 上正典 017 仍為 v3.1.2。
> **FR-045 於回寫時新增**（正典目前不存在該 ID）；成功標準段同時新增一條對應 SC，編號取當時最大值加一。

- [ ] 1.1 執行 `/opsx:archive 1412-dataset-analysis-labelpath-unit`，使衍生檢視收錄 FR-045。 [@main]
- [ ] 1.2 修改正典 `specs/dataset/017-dataset-analysis-detail/spec.md`：功能需求段新增 FR-045（逐字取自 delta）、成功標準段新增對應 SC、FR-009G／FR-012G／`IAA_LABEL_MIN_POSITIVE`／`multi_label` registry 列／`MultiLabelStats` 就地補交叉引用、版本改為 v3.2.0 並新增 Changelog 列。 [@main]
- [ ] 1.3 執行 Source-Verify：本 change 引入的 FR／SC ID、常數名、spec 路徑與 issue 編號皆可逐項 `grep` 定位，並逐條驗證衍生檢視的正典引用；`specs/STATUS.md` 之 dataset-017 列於合併後改回 in-progress（正典留在模組目錄）。 [@main]
