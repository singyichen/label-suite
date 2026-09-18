# 設計決策：dataset-quality-entity-value-alignment（issue #783 第 3 點）

> 本文件存在的理由：本 change 修正的兩個關鍵實體會直接成為資料庫欄位與 CHECK 值域（issue #783「這三點會阻擋 dataset 模組的 schema 定案」）。依專案規則，觸及 DB schema 的 change 需要 design.md。

## 決策

### D1 `SharedMetrics` 欄位

| 欄位 | 來源 |
|------|------|
| `sentence_count` | `SHARED_METRICS`（`:42`） |
| `token_count` | 同上 |
| `completion_rate` | 同上；取代實體段舊名 `overall_completion_rate` |
| `submitted_sample_count` | 同上 |
| `avg_annotation_time_per_sentence` | 同上 |

欄位的計算定義不在本 change 範圍；本 change 只統一名稱與數量。

### D2 `AnnotatorRiskAssessment` 的「資料不足」表示法

| 情境 | `insufficient_data` | `risk_level` |
|------|---------------------|--------------|
| 已完成樣本數 `< ANNOTATOR_MIN_SAMPLE_THRESHOLD`（FR-026） | `true` | `null` |
| 其餘 | `false` | `normal` / `watch` / `high_risk` 之一 |

資料庫層**建議**（非決策，由後端實作時定案，見 Q2）以一條 CHECK 綁住兩欄：`(insufficient_data AND risk_level IS NULL) OR (NOT insufficient_data AND risk_level IN ('normal','watch','high_risk'))`，使「兩欄說法不一致」在 schema 層就不可能存在。

**理由**：`DIMENSION_RISK_AGGREGATION = max(risk_level across dimensions)`（`:79`）需要一個有序的三值集合；若把「資料不足」塞成第四個 enum 值，`max()` 會在它與 `high_risk` 之間給出無意義的排序結果。null 則自然被排除在比較之外。

### D3 prototype 的顯示鍵不受影響

`design/prototype/pages/dataset/dataset-analysis-detail.html:1501` 的 `data-risk-level` 有 `insufficient` 一鍵，這是畫面徽章的顯示狀態，對應 `insufficient_data = true`，不是 `risk_level` 的第四個值。本 change 不改 prototype。

### D4 FR-039 第 1 點補交叉引用（issue #783 Q9 裁定）

FR-039 自稱 IAA 閘門語意唯一來源，第 1 點寫「不得阻擋使用者進入正式標記」；正典 014 將新增「最新試標回合 IAA 計算未結束時，開始正式標記與新增試標回合停用」（姊妹 change `task-detail-iaa-precondition-and-override-scope`）。兩者字面上看似衝突，實際上前者談的是 IAA **結果**，後者談的是結果**尚未產生**。本 change 在第 1 點末尾補一句說明此區分並指向 014，不在 017 新增任何行為。

**版本判定維持 PATCH v3.0.1**：這一句只界定第 1 點的適用範圍，不新增 017 自己要實作的行為，也不改變任何 IAA 結果的呈現；停用按鈕的行為由 014 定義並由 014 的 change 承擔 MINOR。若維護者認為「017 承認存在一種不屬本點的阻擋」已超出釐清，應改判 MINOR，本文件不自行升版。

**引用方式**：新需求的 ID 在正典 014 回寫前並不存在，`scripts/check-sdd.sh` 的 SOURCE_VERIFY_ID 會拒絕在本 change 內引用尚未存在於正典的 ID，因此交叉引用以欄位名 `TrialRound.iaa_computation_status` 定位，gate 4 以 `grep` 驗證該欄位已存在於正典 014。

## 未決事項（維護者 2026-09-18 已全數處理）

- ~~**Q1**~~（**延後**，維護者 2026-09-18 裁定）：`multi_dim` 部分維度資料不足時 `max()` 聚合如何處理，等到真的引入逐維度樣本數判斷時再決定（YAGNI）。現行 FR-026 以標記員為單位判斷，各維度結果相同，不會出現此情境。
- ~~**Q2**~~（**已裁定** 2026-09-18）：兩欄 CHECK 交由後端實作定案；D2 的 CHECK 明確標示為建議，不是本 change 的決策。
