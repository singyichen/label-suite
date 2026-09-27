## ADDED Requirements

<!-- `dashboard/012-dashboard` has never had a derived view under openspec/specs/ before this
     change (no prior OpenSpec-mediated modification touched this module), so `openspec archive`
     requires this delta to declare ADDED rather than MODIFIED for its bootstrap entry -- see
     `openspec validate`'s own INFO note. Against the CANONICAL spec (specs/dashboard/012-dashboard/
     spec.md), FR-011D already exists and is being revised in place (v2.12.0 -> v2.13.0, see that
     file's own Changelog); this ADDED heading only reflects the derived view's first-ever capture
     of FR-011D, not a claim that FR-011D is new to the canonical spec. -->

### Requirement: FR-011D 審核流程示範任務入口身分

**FR-011D**（v2.2.0 新增，審核流程示範任務專用）：審核流程示範任務（T014–T016；v2.12.0 修訂，issue #815：原為 T014–T017）的 Reviewer 任務列必須攜帶審核員身分 seed（prototype 欄位 `reviewerId`），列點擊與 `快速審核` 導頁網址皆須附帶 `reviewer_id` 參數（`annotation-list` 依 015 FR-049 續傳至工作區）；且其 `快速審核` 的 `sample_id` 依 FR-021 推導（v2.7.0 修訂：此前為固定指向該任務資料集第一筆樣本；`reviewer_id` 續傳規則不變，仲裁版面可達性改由 FR-021 的仲裁順位保證）。**本版修訂（issue #1003）**：此身分自本版起不再三個任務統一指向 `reviewer_chen`——**T014 指向 `reviewer_li`**、**T015 指向 `reviewer_wang`**、**T016 維持指向 `reviewer_chen`**（015 名冊中唯一具 `can_arbitrate` 旗標者）。理由：issue #956（PR #999）把工作區左欄收斂為「`specs/annotation/015-annotation-workspace/spec.md` FR-093 被指派單位 ∪ 同檔 FR-060 可仲裁之爭議單位」後，`reviewer_chen` 在 T014／T015 的 FR-093 指派單位數恆為 0（FR-060 把仲裁者排除於新指派池外），使這兩個任務除爭議單位外的一切狀態（待審、已定稿）自本入口皆不可達，僅剩仲裁一段可走，與本條原有理由「示範任務的目的為讓審核流程的各示範情境自儀表板一鍵可視」直接矛盾；issue #1000（annotation-015 v7.5.0）的永久黏著放寬雖使可見數各 +1，但不足以恢復主線可達性（T014／T015 現場量測仍有 11/15、2/4 個單位不可見，且皆缺待審狀態）。T014／T015 改採之身分皆為該任務 FR-093 實際指派、且指派單位涵蓋『待審』與『已定稿』狀態（T014 另涵蓋『爭議中』）的一般審核員，使示範者以單一入口身分即可走「待審 → 審核 → 定稿」主線；不得選用一個對該任務的 FR-093 指派單位全數已定稿、`findNextActionableReviewUnit()` 於當前示範資料下恆回傳 `null` 的審核員身分——這會使『快速審核』直接落到空狀態，同樣走不到待審。T016 之入口身分維持 `reviewer_chen` 不變，本條原有理由句（015 的仲裁版面僅對具仲裁資格者渲染，工作區預設審核員身分不具旗標，不帶身分參數則仲裁初始畫面自儀表板入口永不可達）逐字保留於 T016。本條僅適用示範任務列，一般任務列維持 FR-011B1／FR-011C 既有規則，不帶 `reviewer_id`。**本版修訂未變更、亦未放寬**annotation-015 FR-060（仲裁者排除於 FR-093 新指派池外）與 FR-093 之工作區左欄／導覽指派過濾（issue #956/#1000 收斂邏輯）——三個示範任務的 FR-093 指派結果與工作區左欄過濾行為本身不變，本條只改哪一個既有審核員身分作為儀表板入口。

#### Scenario: T014／T015 示範入口可走完整主線

- **GIVEN** T014 的儀表板 Reviewer 任務列以 `reviewer_li` 為入口身分、T015 以 `reviewer_wang` 為入口身分
- **WHEN** 該身分開啟工作區（列點擊或 `快速審核`）
- **THEN** 工作區左欄必須同時列出該身分在該任務被指派的『待審』與『已定稿』狀態單位（T014 另含『爭議中』）
- **AND** `快速審核` 必須導向一個可處理（`pending` 或該身分具仲裁資格之 `disputed`）的單位，不得因該身分之全部指派單位皆已定稿而落到空狀態

#### Scenario: T016 示範入口維持仲裁可達性

- **GIVEN** T016 的儀表板 Reviewer 任務列仍以 `reviewer_chen` 為入口身分
- **WHEN** 該身分開啟工作區
- **THEN** 具仲裁資格之爭議單位入口（仲裁版面）必須可達，與本條修訂前行為一致

#### Scenario: 示範入口身分變更未推翻 FR-060（`specs/annotation/015-annotation-workspace/spec.md`）仲裁者保留

- **GIVEN** T014／T015 之 `arbiterIds` 仍恆為 `['reviewer_chen']`，`reviewer_chen` 未出現於本條修訂後之任一示範入口身分
- **WHEN** 系統依 `specs/annotation/015-annotation-workspace/spec.md` FR-093 對 T014／T015 建立自動指派
- **THEN** `reviewer_chen` 的 FR-093（`specs/annotation/015-annotation-workspace/spec.md`）新指派單位數仍恆為 0，不因本條修訂而被重新納入指派池

#### Scenario: 示範入口身分變更未推翻 FR-093（`specs/annotation/015-annotation-workspace/spec.md`）左欄過濾

- **GIVEN** 一個未被指派某示範任務任一單位、且對該任務不具仲裁資格（或未對任一爭議單位送出仲裁票）的一般審核員身分
- **WHEN** 該身分開啟該任務的工作區
- **THEN** 未受派單位仍不出現於其左欄，與本條修訂前行為一致
