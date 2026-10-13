# 標記員 V1 來源完整性鎖的正典對齊

對應 Spec: specs/annotation/015-annotation-workspace/spec.md

## Why

Issue #1328。015 v12.0.0 起，審核員第一次正式提交後，同一 `run_id × assignment_id` 的標記員儲存與提交皆被拒絕（FR-101 段末「V1 來源完整性鎖」，Dry／Official 同樣適用）。但正典內有三處與此矛盾或缺漏：

1. FR-101「範圍限定」與 AC-2.27 的 `dry_run` 子句仍寫「Dry 不受影響、不受任何額外阻擋」，與同條 V1 來源完整性鎖互相衝突。
2. AC-2.27 v12.1.2（issue #1247）寫鎖定提示為「warning 語氣」，與 FR-101 要求的資訊色（`--color-info*`）矛盾。
3. V1 來源完整性鎖（審核中）對標記員的畫面呈現沒有任何條文，原型只能自行發明文案。

維護者裁定（2026-10-13，issue #1328）：

- A：Dry 也鎖。FR-101「範圍限定」改為只描述定稿終態鎖限 `official_run`；AC-2.27 Dry 子句改為「Dry 不觸發定稿終態鎖，但仍受 V1 來源完整性鎖約束」；不同 Dry run 互不影響。
- B：已定稿提示色改回資訊色（`--color-info*`），更正 AC-2.27 的「warning 語氣」。
- C1：新增審核中鎖的標記員呈現條文（標題「此標記已進入審核」、說明、狀態列「審核中，不再自動儲存」、提醒色），不得透露爭議中、等待仲裁、例外池或審核員決策內容。
- C2：testid 沿用 `ws-annotator-finalized-notice`，加 `data-lock-reason="finalized|under_review"`；兩種鎖同時成立時顯示 finalized。

**為什麼不走 Lightweight Path**：新增一則 AC 並新增 FR-101 的一項 MUST（審核中鎖呈現），屬新增需求，不是只釐清。

**分級：MINOR。** 新增一則 AC；FR-101 與 AC-2.27 為子句修訂，沿革以 v12.5.0 修訂標註保留。沒有移除或推翻任何 FR／AC，V1 來源完整性鎖本身的功能契約不變。

## What Changes

- **修訂 FR-101**：
  - 「範圍限定」改寫為只描述定稿終態鎖限 `official_run`，並明載 `dry_run` 仍受 V1 來源完整性鎖約束。
  - 呈現段補「不得採 warning 色階」與 `data-lock-reason` 屬性。
  - V1 來源完整性鎖段補審核中鎖之標記員呈現（文案、提醒色、狀態列、Data Fairness 限制、兩鎖並存優先序）。
- **修訂 AC-2.27**：視覺呈現段由「warning 語氣」更正為資訊色並帶 `data-lock-reason="finalized"`；`dry_run` 子句改為「Dry 不觸發定稿終態鎖，但仍受 V1 來源完整性鎖約束」，刪除「不受任何額外阻擋」。
- **新增一則 AC**：審核中鎖之標記員呈現；編號於 gate 4 回寫正典時配發，接續第 2 章現行最大者 AC-2.29。
- **正典回寫**：版號 12.4.1 → 12.5.0，Changelog 加一列，`specs/STATUS.md` annotation-015 列前置新版摘要。

**非目標**：

- 不改 `design/prototype/**`（原型段由 #1330 承接）。
- 不改 V1 來源完整性鎖本身的功能契約（AC-7.5）與 FR-105。
- 不改既有 Changelog 列（含 12.1.2 的原文）。

## Capabilities

`annotation` — 標記員在 V1 來源完整性鎖（審核中）與定稿終態鎖下的工作區呈現。
