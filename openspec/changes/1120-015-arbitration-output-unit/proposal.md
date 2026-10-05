---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #1120
基準版本: 015 v10.0.0
目標版本: 015 v10.1.0
---

## Why

issue #1120 的 OpenSpec change `1120-task-lifecycle-alignment`（已 archive 為 `openspec/changes/archive/2026-10-05-1120-task-lifecycle-alignment/`）在 `design.md` D2 盤點 `task-detail` 各頁籤的衍生計數時，發現「仲裁輸出項目」是五個概念中唯一「機制已定義、可顯示之計數單位未明文」的一個：015 FR-061 定義了逐爭議項裁定與 `ARBITRATION_OUTCOMES`，FR-059 定義了爭議項的推導與識別，但沒有任何條文說明「仲裁進度」的計數要以什麼為一筆。`specs/task-management/014-task-detail/spec.md` FR-010u 第 (4) 點要求 014 讀取 015 的既有定義、不得另建第二份；第 (5) 點要求三種聚合單位不得相加。014 已依此不自行定義，該 change 的 `tasks.md` 把這個定義列為 015 擁有的跨 owner 待辦，維護者已授權由本單 lead 在群組 5 合併後提一份獨立的單一目的 PR。

本提案只補上這一個計數單位定義，不改動任何既有 FR／AC 條文，也不改動任何版面。

**粒度更正（相對於 1120 `design.md` D2 的描述）**：D2 把聚合單位寫成「爭議項（審核單位 × 輸出類型）」。這比正典粗：015 FR-059 第 2 點以 `outKey × 合併鍵` 為爭議項識別，第 4 點規定集合型輸出逐合併鍵各一項、`sequence_tagging` 逐 token 位置、`multi_dim` 逐維度。原型 `listReviewPoolItems()`（`design/prototype/pages/annotation/annotation-workspace.data.js`）也是以 `outKey::key` 逐項計數。因此本提案以 FR-059 的爭議項為單位，不沿用 D2 的較粗描述。`specs/task-management/014-task-detail/spec.md` FR-010u 第 (5) 點的括號註記「爭議項（審核單位 × 輸出類型）」同樣較粗，但那屬 014 的條文，不在本提案範圍內，改列為後續待辦（見下方「不在範圍內」）。

**沒有 Red 的理由**：原型已依 `outKey × 合併鍵` 逐項計數，依新條文撰寫的任何測試在條文改動前就已通過，沒有可寫的失敗契約（同 issue #864 前例）。本提案改以一支釘住測試加上突變探針作為證據：測試涵蓋目前沒有任何既有測試涵蓋的情境——同一輸出類型內多個合併鍵——並以暫時把計數改成「每個 outKey 一筆」的突變確認測試會失敗，再還原。

## What Changes

- 修改 `annotation/015-annotation-workspace` FR-061：新增「仲裁輸出項目之計數單位」一點，定義仲裁進度計數的聚合單位為 FR-059 之爭議項，並定義分子、分母、`待仲裁` 的判定與範圍，明文不得以審核單位或輸出類型合併，也不得與審核單位數或標記 assignment 數相加或共用分母。
- 新增一條驗收情境（gate 4 回寫時才編號）：同一 `multi_label` 輸出內兩個合併鍵差異時，`待仲裁` 計數為 2 而非 1。
- 新增釘住測試 `design/prototype/tests/task-management/issue-1120-arbitration-output-unit.spec.ts`。
- 正典 015 回寫為 v10.1.0（MINOR：新增 MUST 條文與新 AC，未移除或取代既有 FR／AC）。

**不在範圍內**：

- `specs/task-management/014-task-detail/spec.md` FR-010u 第 (5) 點括號註記「爭議項（審核單位 × 輸出類型）」與本定義的粒度不一致，需另提 014 的釐清變更。
- 最終例外池紀錄在原型中以 `outKey` 定址（`exceptionPool[item.outKey]`），同一 outKey 內多個 `reject` 項目會被一筆收尾一併解決；這屬 FR-095 的收尾粒度問題，另案追蹤。
- 任何版面或文案調整。
