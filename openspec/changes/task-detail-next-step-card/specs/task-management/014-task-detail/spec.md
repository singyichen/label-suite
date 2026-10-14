# Task Detail — 概覽執行控制改為「下一步」卡片（issue #1403）

## Purpose

本 delta 把概覽「任務狀態與執行控制」的達標條件 pill、直向動作欄與阻擋原因清單，合併為單一張「下一步」卡片：卡頭為狀態句、說明與動作按鈕，卡身為依任務狀態決定的條件清單。**移除 FR-027(1)「達標條件沿用原 pill 呈現」與 FR-027(4)「達標條件 pill 與主要 CTA 位於同一橫列」**（MAJOR），並同步修訂 FR-013、FR-010o-4 中引用 pill 與「同一操作列」的措辭；AC-3.69 隨之修訂。不改任何發布阻擋條件與狀態轉移；唯一的呈現差異是 `draft` 成員人數不足（FR-010t 既有阻擋）改以停用按鈕加條件列呈現，不再等點擊後才以 toast 告知。不新增或刪除 FR／AC 編號。

## MODIFIED Requirements

### Requirement: FR-027 概覽分頁沿用原區塊樣式並精簡內容

`概覽` 分頁 MUST 沿用原「任務狀態與執行控制」區塊的視覺樣式，使其與其他頁面一致（2026-10-08 維護者裁定：外觀還原、內容留新版），由上而下依序呈現：流程 stepper（SC-019）、判定框、數字卡、樣本池分配、「下一步」卡片、試標回合表；MUST NOT 再包含已移至設定分頁的五個設定區塊。

**(1) 視覺樣式**。區塊外層為白色卡片容器；判定標題與說明置於原判定框；數字以原摘要卡樣式呈現；樣本池分配沿用原分配條與圖例 chip。所有顏色 MUST 取自 design token。**v13.0.0 移除**（issue #1403）：原「達標條件沿用原 pill 呈現」規定已移除，概覽 MUST NOT 再顯示達標條件 pill（IAA、標準差、最少標記者）。

**(2) 數字卡**。四張：目前回合、最新 IAA、已用試標、正式標記池，值使用等寬數字（`tabular-nums`）。「已用試標」的值為「已用試標筆數 / 資料總筆數」（例如 `20 / 100`）。**刻意移除**原摘要卡中的「已完成試標回合」；其資訊由標頭狀態文字與試標回合表承擔。

**(3) 樣本池分配**。沿用 `dataSplitBar` 資料；配色規則沿用 FR-010p，MUST NOT 變更。

**(4) 「下一步」卡片與主要 CTA（v13.0.0 改寫，issue #1403）**。執行控制 MUST 以單一張「下一步」卡片呈現，取代原「達標條件 pill 與主要 CTA 同列」的版面：

- **卡頭**：左側為「下一步：…」狀態句與一行說明；右側為該狀態的執行按鈕，沿用 `publishActionRow` 與既有防連點機制（issue #198）。同一時間 MUST 最多兩顆按鈕，只有 `waiting_iaa_confirmation` 有兩顆；主要 CTA MUST 使用全站 `btn-primary` 樣式（`--color-cta`，與 `MASTER.md` 一致），且同一狀態 MUST 只有一個主要 CTA：`waiting_iaa_confirmation` 時為「開始正式標記」（`publishOfficialRunBtn`），其餘按鈕使用次要樣式。
- **卡身**：「這個動作需要」條件清單，每列為「圖示＋條件＋目前值」，目前值 MUST 由實際資料推導，MUST NOT 顯示佔位值。圖示 MUST 只使用三種，且皆附可見文字、不只靠顏色：✓ 已滿足（`--color-success`）、○ 未滿足（`--color-ink-muted`）、ⓘ 提醒（`--color-warning`）；MUST NOT 使用紅色 ✗ 或 `--color-error` 表示未滿足。任一「需要」列未滿足時，對應按鈕 MUST 停用，且其 `aria-describedby` MUST 指向每一個未滿足的列；提醒列 MUST NOT 使任何按鈕停用。
- **各狀態的條件清單**（列的判定一律沿用既有推導來源，MUST NOT 另建第二份判定）：
  - `draft`：發布 R1 需要「抽樣後正式標記池有剩餘」（FR-022(3)、FR-010f-3）、「啟用中標記者 ≥ `min_annotators`」與「啟用中審核員 ≥ 1」（FR-010t，未滿足時目前值 MUST 含「還差 N 位」）。IAA 只以底部提醒列呈現，寫明第一回合結束後才會計算。
  - `dry_run_in_progress`：卡頭說明 MUST 為「本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合」；新增下一回合需要的列 MUST 沿用 FR-008a 的同一個判定來源（標註全部提交、必要審核完成、必要仲裁完成、最終例外池已處置）。不列資料池：下一回合的池限制由 FR-010d、FR-010e 於發布當下驗證，FR-022 不適用於此狀態。
  - `waiting_iaa_confirmation`：最新回合 IAA 計算中或計算失敗時，MUST 有「兩個動作都需要」分組，列出「IAA 計算完成」；計算失敗時「重試計算」MUST 位於該列右側（FR-010o-4(3)）。「『開始正式標記』另外需要」分組 MUST 列出「正式標記池有剩餘」（FR-022）。IAA 未達標 MUST 只以琥珀色提醒列呈現並寫明「不阻擋」，MUST NOT 放進任何「需要」分組（FR-010o-3）；IAA 已計算但結果為無法判定時，以提醒列說明兩個按鈕各自的意義（FR-013(8)）。計算中 MUST NOT 顯示任何 IAA 數值或達標判定（FR-010o-4(2)）。
  - `official_run_in_progress`：「標記完成」需要的列 MUST 沿用 FR-008b 的同一個判定來源（作業全數提交、審核單位全部定稿、爭議都已仲裁、最終例外池都已處置、品質指標就緒）；MUST NOT 列出試標的 IAA 或標記者人數條件。
  - `completed`：見第 (6) 點。

**(5) 試標回合表**。試標回合歷程以表格呈現，欄位依序為回合、筆數、標記者、IAA、Std、結果、完成時間，每個回合一列；結果欄以文字色區分（通過 `--color-success`、未通過 `--color-error`）。每回合備註不在表格中顯示。`draft` 狀態 MUST NOT 顯示任何回合列。

**(6) 權限與狀態**。執行控制的狀態對應與權限（FR-013、`reviewer` 顯示 disabled 並附 tooltip「僅 project leader 可操作」）MUST 維持不變。`reviewer` 的卡片結構與 `project_leader` 相同，按鈕名稱跟隨任務狀態並標示唯讀、全部停用，按鈕下方有可見的同句說明「僅 project leader 可操作」，MUST NOT 顯示條件清單。`completed` 狀態卡片 MUST 顯示「任務已完成，無待執行動作」，MUST NOT 顯示條件清單或按鈕。停用按鈕 MUST 使用中性灰底與 `--color-text-soft` 文字，MUST NOT 降低透明度，主要按鈕停用時 MUST NOT 保留 `--color-cta` 綠色；此停用樣式 MUST 只限這張卡片的動作區，MUST NOT 改動全站 `.btn:disabled`。

#### Scenario: 主要 CTA 與達標條件同列且為全站主要按鈕樣式

> 情境標題沿用既有名稱，供 archive 對應同一情境（OpenSpec MODIFIED 不允許以改名方式丟棄既有情境）；內容依 v13.0.0 改寫為下一步卡片（AC-3.69，issue #1403），已不再有達標條件 pill。

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新回合 IAA 已計算完成
- **WHEN** `project_leader` 開啟概覽分頁
- **THEN** 「下一步」卡片的卡頭左側為「下一步：…」狀態句與說明，右側恰有兩顆執行按鈕
- **AND** 只有「開始正式標記」使用 `--color-cta` 背景，另一顆為次要樣式
- **AND** 畫面不存在達標條件 pill

#### Scenario: 草稿卡片列出發布 R1 需要的條件

- **GIVEN** 一個 `draft` 任務，`min_annotators = 3` 但只有 2 位啟用中標記者
- **WHEN** `project_leader` 開啟概覽分頁
- **THEN** 條件清單列出正式標記池剩餘、啟用中標記者與啟用中審核員三列，標記者列為 ○ 且目前值含「還差 1 位」
- **AND** `新增試標回合 R1` 為停用，`aria-describedby` 指向標記者列
- **AND** IAA 只以 ⓘ 提醒列呈現，寫明第一回合結束後才會計算

#### Scenario: IAA 未達標只是提醒，不放進需要分組

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新回合 IAA 已計算完成但未達目標門檻，正式標記池有剩餘
- **WHEN** `project_leader` 開啟概覽分頁
- **THEN** IAA 以 ⓘ 琥珀色提醒列呈現並寫明「不阻擋」，且不在任何「需要」分組中
- **AND** 兩顆執行按鈕皆可點擊

#### Scenario: 正式標記卡片列出標記完成需要的條件

- **GIVEN** 任務處於 `official_run_in_progress`，仍有審核單位未定稿
- **WHEN** `project_leader` 開啟概覽分頁
- **THEN** 條件清單依 FR-008b 列出提交、定稿、仲裁、最終例外池與品質指標各列，未定稿列為 ○
- **AND** 不出現試標 IAA 或標記者人數的列，`標記完成` 為停用

#### Scenario: 停用樣式為中性灰底且不使用紅色 ✗

- **GIVEN** 任一狀態下卡片內有停用的執行按鈕
- **WHEN** 檢視該按鈕與條件清單
- **THEN** 按鈕為中性灰底、`--color-text-soft` 文字、不透明度為 1，主要按鈕停用時不是 `--color-cta` 綠色
- **AND** 條件清單沒有紅色 ✗，全站其他位置的 `.btn:disabled` 樣式不變

#### Scenario: 數字卡四張且不含已完成試標回合

- **GIVEN** 任務已完成兩個試標回合
- **WHEN** 檢視數字卡
- **THEN** 僅有目前回合、最新 IAA、已用試標、正式標記池四張
- **AND** 「已用試標」顯示為「已用筆數 / 總筆數」
- **AND** 畫面上沒有「已完成試標回合」

#### Scenario: 試標回合以七欄表格呈現

- **GIVEN** 任務已有兩個試標回合
- **WHEN** 檢視試標回合表
- **THEN** 表頭為 回合／筆數／標記者／IAA／Std／結果／完成時間，每個回合一列
- **AND** 通過回合的結果文字為 `--color-success`，未通過為 `--color-error`

#### Scenario: reviewer 概覽的執行按鈕維持停用

- **GIVEN** `task_role = reviewer`
- **WHEN** 開啟概覽分頁
- **THEN** 執行按鈕為 disabled 並附 tooltip「僅 project leader 可操作」，按鈕下方有同句可見說明
- **AND** 卡片不顯示條件清單

#### Scenario: 已完成任務的卡片無待執行動作

- **GIVEN** 任務處於 `completed`
- **WHEN** `project_leader` 開啟概覽分頁
- **THEN** 卡片顯示「任務已完成，無待執行動作」
- **AND** 不顯示條件清單或任何執行按鈕

### Requirement: FR-013 執行控制按鈕依任務狀態顯示，新增試標回合僅自待 IAA 確認狀態發起

Overview「任務狀態與執行控制」的執行控制按鈕 MUST 與任務狀態一一對應，且按鈕 MUST 位於「下一步」卡片卡頭右側（FR-027(4)，v13.0.0 改寫，issue #1403；原「與『達標條件』位於同一操作列」已隨達標條件 pill 移除）：

| 任務狀態 | 顯示的執行控制按鈕 |
|----------|--------------------|
| `draft` | `新增試標回合 R1` |
| `dry_run_in_progress` | `新增試標回合 R{trial_round+1}` 以**停用**狀態顯示，並以可見文字顯示原因「本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合」 |
| `waiting_iaa_confirmation` | `開始正式標記` 與 `新增試標回合 R{trial_round+1}` 兩者並列 |
| `official_run_in_progress` | `標記完成` |
| `completed` | 不顯示執行控制按鈕，只顯示說明文字「任務已完成，無待執行動作」 |

**(1) 回合必須先結束才能開下一回合**。`dry_run_in_progress` 表示目前回合仍在進行；此狀態下 `新增試標回合 R{trial_round+1}` MUST 維持可見但停用，點擊 MUST NOT 建立回合、MUST NOT 改變任務狀態，原因文字 MUST 以可見文字呈現（MUST NOT 只放在 tooltip）。下一個回合只能在目前回合依 FR-008a 完成、任務自動進入 `waiting_iaa_confirmation` 之後發起。此停用的依據是「本回合尚未結束」，與 IAA 是否達標無關，因此不違反 FR-010o-3。

**(2) 待 IAA 確認是唯一的決策點**。`waiting_iaa_confirmation` 狀態 MUST 同時提供 `開始正式標記` 與 `新增試標回合 R{trial_round+1}`：兩者是同一決策點上的互斥選項，任一成功後任務即轉入新狀態、操作列改依新狀態的對照表呈現，因此不構成「語意衝突的操作」。本需求不改變 FR-010o-3——IAA 達標與否仍只是顧問性警示，兩個按鈕 MUST NOT 因 IAA 未達標而停用或隱藏。

**(3) 新狀態轉換**。自 `waiting_iaa_confirmation` 成功建立 `新增試標回合 R{n}`（`n >= 2`）時，任務狀態 MUST 轉為 `dry_run_in_progress`；該回合清單建立（FR-010f-2）與狀態轉換 MUST 視為同一動作，MUST NOT 出現「清單已建立但狀態仍為 `waiting_iaa_confirmation`」或「狀態已轉換但清單尚未建立」的可觀察中間狀態。轉換後 MUST NOT 在新回合任何一筆標記提交之前，就因 FR-008a 的完成條件立即轉回 `waiting_iaa_confirmation`——FR-008a 對新回合的評估 MUST 涵蓋本回合剛建立的標記作業。

**(4) 修訂紀錄必填檢查不變**。點擊 `新增試標回合 R{n}`（`n >= 2`）時，若未通過 FR-017 之修訂紀錄必填檢查，系統 MUST 阻擋建立並逐欄列出缺項提示，阻擋樣式比照 FR-010t（逐項顯示未滿足條件，不得靜默忽略點擊）；被阻擋時任務狀態 MUST 維持 `waiting_iaa_confirmation`。

**(5) 狀態機來源**。本需求新增之 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，MUST 同步列入 `docs/adr/022-task-state-machine-location.md` 的 Transition Table 與 `ALLOWED_TRANSITIONS` 白名單；`dry_run_in_progress → dry_run_in_progress`（進行中另開回合）MUST NOT 列入。

**(6) 揭露時點不變**。`annotation/015-annotation-workspace` FR-096 之試標歷史回饋揭露規則不因本需求修改：R{n+1} 只能在 R{n} 已進入 `waiting_iaa_confirmation` 之後建立，因此 R{n} 的揭露前提在 R{n+1} 建立前即已成立；R{n+1} 進行中其本身資料仍一律不揭露。

**(7) 回溯轉換不是跳階（釐清，維護者 2026-09-18 裁定）**。正典使用者故事 3 行為規則「狀態轉換必須符合 `TASK_STATUSES` 順序，不允許跳階」與 SC-004「任務狀態轉換遵循定義順序」的「順序」，MUST 以 `docs/adr/022-task-state-machine-location.md` 的轉換表判定：合法轉換以 ADR-022 轉換表為準；表列的回溯轉換（含本需求新增的 `waiting_iaa_confirmation → dry_run_in_progress`）不視為跳階。gate 4 回寫時於該行為規則與 SC-004 原地補上此句，不新增任何 FR／AC／SC 編號。

**(8) 原因呈現方式（v13.0.0 改寫，issue #1403；取代 v12.2.4 直向動作欄）**。停用按鈕的原因 MUST 呈現在同一張「下一步」卡片卡身的條件清單（FR-027(4)），每個條件只出現一次（同一條件被兩顆按鈕共用時放在「兩個動作都需要」分組），各停用按鈕的 `aria-describedby` MUST 指向其所屬的每一個未滿足條件列；`dry_run_in_progress` 的原因句為卡頭說明，未完成的各項逐列列於條件清單。`waiting_iaa_confirmation` 且 IAA 已完成計算、結果為無法判定時，卡片 MUST 有一句可見提醒（可直接開始正式標記，或再試標一回合），兩顆按鈕仍可點擊。僅改變呈現方式，不改變任何發布阻擋條件與狀態轉移；`draft` 成員人數不足（FR-010t）改以停用按鈕加條件列呈現，發布 handler 內的 FR-010t 檢查維持不變。

**本次修訂（issue #1120，BREAKING）**：第 (1) 點之停用原因文字自「本回合全部提交並完成 IAA 後才能新增下一回合」改為涵蓋審核與仲裁——`dry_run_in_progress` 下 `新增試標回合 R{trial_round+1}` MUST 維持可見但停用，其可見原因文字 MUST 說明本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合。該停用依據仍為「本回合尚未結束」，與 IAA 是否達標無關，MUST NOT 被視為違反 FR-010o-3。其餘各點文字不變。

#### Scenario: AC-3.12 自待 IAA 確認新增第二回合須先填修訂紀錄

- **GIVEN** 任務已完成 R1 試標且處於 `waiting_iaa_confirmation`
- **WHEN** `project_leader` 點擊 `新增試標回合 R2` 但未填寫 `prior_round_findings` 與 `guideline_change_summary`、也未勾選 `no_change`
- **THEN** 系統阻擋建立並逐欄提示缺項，任務狀態維持 `waiting_iaa_confirmation`
- **AND** 補齊必填欄位（或勾選 `no_change` 並填寫 `no_change_reason`）後方可成功建立 R2，任務狀態轉為 `dry_run_in_progress`，且新建立的 `TrialRound.sampling_value` 等於本輪實際建立之試標清單筆數（FR-017、FR-010f-2）

#### Scenario: 試標進行中的新增試標回合按鈕停用並顯示原因

- **GIVEN** 任務處於 `dry_run_in_progress`（不論目前是 R1 或其後任一回合）
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 「下一步」卡片顯示停用狀態的 `新增試標回合 R{trial_round+1}`，卡片內可見原因文字「本回合的標註、必要審核與必要仲裁全部完成後才能新增下一回合」，且不出現其他執行控制按鈕
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `dry_run_in_progress`

#### Scenario: 待 IAA 確認同時提供開始正式標記與新增試標回合

- **GIVEN** 任務處於 `waiting_iaa_confirmation` 且已完成 R1，最新回合 IAA 未達目標門檻
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 卡頭同時顯示 `開始正式標記` 與 `新增試標回合 R2`，兩者皆可點擊
- **AND** IAA 未達標只以警示樣式呈現，不停用或隱藏任一按鈕（FR-010o-3）

#### Scenario: 新回合建立後在任何提交前不會自動轉回待確認

- **GIVEN** 任務自 `waiting_iaa_confirmation` 成功建立 R2，任務狀態已轉為 `dry_run_in_progress`，且 R2 尚無任何標記提交
- **WHEN** 系統依 FR-008a 評估試標完成條件
- **THEN** 任務狀態 MUST 維持 `dry_run_in_progress`，直到 R2 的標記作業依 `DRY_RUN_COMPLETION_RULE` 全部完成才轉為 `waiting_iaa_confirmation`

#### Scenario: SC-047 每個試標回合都經過待確認決策點

- **GIVEN** `TASK_STATUSES` 五種任務狀態各一個以 `project_leader` 開啟的任務
- **WHEN** 逐一檢視 Overview「任務狀態與執行控制」的卡頭按鈕
- **THEN** 可點擊的 `新增試標回合` 按鈕恰只出現在 `draft`（顯示 R1）與 `waiting_iaa_confirmation`（顯示 R{trial_round+1}）兩種狀態，`dry_run_in_progress` 只出現停用狀態的該按鈕並附原因文字，五種狀態逐一比對 5／5 符合 FR-013 對照表
- **AND** 任一任務自 `draft` 起經歷 N 個試標回合（N >= 2），每一個 R{n}（`n >= 2`）的建立都恰對應一次 `waiting_iaa_confirmation → dry_run_in_progress` 轉換，不存在任何在 `dry_run_in_progress` 期間建立的回合

#### Scenario: 停用原因涵蓋審核與仲裁

- **GIVEN** 一個 `dry_run_in_progress` 任務，其標註已全數提交但仍有審核或仲裁未完成
- **WHEN** `project_leader` 檢視「下一步」卡片
- **THEN** `新增試標回合` 按鈕可見且停用，卡片內可見原因文字提及必要審核與必要仲裁，未完成的審核或仲裁列為 ○
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `dry_run_in_progress`

### Requirement: FR-010o-4 待 IAA 確認頁顯示試標回合 IAA 計算狀態，計算未結束不得呈現為 IAA 未達標

IAA 為非同步計算。任務依 FR-008a 進入 `waiting_iaa_confirmation` 時，最新試標回合的 IAA 可能尚未算完或計算失敗；本需求規定這兩種情況在畫面上的呈現，以及它們與「IAA 未達標」的區別。

**(1) 計算狀態欄位**。`TrialRound` MUST 具備 `iaa_computation_status`，值域恰為 `pending | done | failed`：回合建立時為 `pending`；該回合每一個需計算 IAA 的輸出類型都得到確定結果時為 `done`；計算執行錯誤時為 `failed`。「確定結果」指一個數值，或 `dataset/017-dataset-analysis-detail` FR-039 第 4 點定義的「無法計算」（`De = 0`）；後者 MUST 記為 `done`（與該規格 AC-3.16「不阻擋使用者進入正式標記」一致）。`IAA_GATE_EXCLUDED_TYPES` 不需計算，不列入判斷。本欄位只描述計算是否結束，MUST NOT 承載達標與否。

**(2) 計算中**。最新回合為 `pending` 時，Overview「任務狀態與執行控制」MUST 顯示「IAA 計算中」狀態；「下一步」卡片的條件清單與提醒列（FR-027(4)，v13.0.0 改寫，issue #1403；原為「達標條件 pills 的 IAA 項」）、判定 banner 與試標回合歷程 MUST NOT 顯示任何 IAA 數值或達標／未達標判定。

**(3) 計算失敗與重試**。最新回合為 `failed` 時，同一區塊 MUST 顯示計算失敗狀態並提供「重試計算」操作；該操作 MUST 只提供給 `project_leader`。重試後該回合 MUST 回到 `pending` 並重新排入計算；重試 MUST NOT 改變任務狀態、MUST NOT 建立新回合。

**(4) 計算未結束不是 IAA 未達標**。`pending` 與 `failed` MUST NOT 以 IAA 未達標的方式呈現（MUST NOT 使用未達標警示樣式、MUST NOT 顯示「R{n} 未通過」類判定標題），亦 MUST NOT 被任何邏輯當作未達標處理。FR-010o-3 的顧問性警示只適用於 `done` 且得到數值的結果。

**(5) 開始正式標記的前置條件**。最新回合不為 `done` 時，`開始正式標記` MUST 以停用狀態顯示，並以同一張「下一步」卡片的條件列可見說明原因（計算中或計算失敗），系統 MUST NOT 執行 `waiting_iaa_confirmation → official_run_in_progress`（`docs/adr/022-task-state-machine-location.md` Transition Table）。最新回合為 `done` 後，`開始正式標記` 依 FR-010o-3 不因 IAA 未達標而停用；此處的停用依據是「計算尚未結束」，不屬於 FR-010o-3 所禁止的「因 IAA 未達標停用」。

**(6) 新增試標回合的前置條件**。最新回合不為 `done` 時，`waiting_iaa_confirmation` 狀態下的 `新增試標回合 R{trial_round+1}` 同樣 MUST 以停用狀態顯示，並以同一張「下一步」卡片的條件列可見說明原因（計算中或計算失敗）；系統 MUST NOT 執行 `waiting_iaa_confirmation → dry_run_in_progress`（`docs/adr/022-task-state-machine-location.md` Transition Table）。停用依據同樣是「計算尚未結束」，與 IAA 是否達標無關；最新回合為 `done` 後，該按鈕依 FR-013 第 (2) 點可點擊。

#### Scenario: IAA 計算中不呈現為未達標且暫不能開始正式標記

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = pending`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 畫面顯示「IAA 計算中」，條件清單與提醒列不顯示任何 IAA 數值、不顯示未達標警示或「未通過」判定
- **AND** `開始正式標記` 為停用狀態，卡片內可見說明計算中的條件列，點擊後任務狀態維持 `waiting_iaa_confirmation`

#### Scenario: IAA 計算失敗可由專案負責人重試

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合 `iaa_computation_status = failed`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」並點擊「重試計算」
- **THEN** 點擊前畫面顯示計算失敗狀態，「重試計算」位於「IAA 計算完成」條件列右側，且不以未達標樣式呈現
- **AND** 點擊後該回合回到 `pending`、畫面改為「IAA 計算中」，任務狀態維持 `waiting_iaa_confirmation`，試標回合數不變

#### Scenario: 無法計算視為計算已結束，不阻擋開始正式標記

- **GIVEN** 任務處於 `waiting_iaa_confirmation`，最新試標回合某輸出類型因有效標記員數 `< 2` 而為「無法計算」（`De = 0`），其餘需計算的輸出類型皆已得到數值
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** 該回合 `iaa_computation_status = done`，畫面不顯示「IAA 計算中」或計算失敗狀態
- **AND** `開始正式標記` 與 `新增試標回合 R{trial_round+1}` 皆可點擊

#### Scenario: IAA 計算未結束時新增試標回合同樣停用

- **GIVEN** 任務處於 `waiting_iaa_confirmation` 且已完成 R1，最新試標回合 `iaa_computation_status` 為 `pending` 或 `failed`
- **WHEN** `project_leader` 檢視 Overview「任務狀態與執行控制」
- **THEN** `新增試標回合 R2` 為停用狀態，「兩個動作都需要」分組可見說明計算中或計算失敗的條件列
- **AND** 點擊該按鈕不建立任何回合，任務狀態維持 `waiting_iaa_confirmation`
