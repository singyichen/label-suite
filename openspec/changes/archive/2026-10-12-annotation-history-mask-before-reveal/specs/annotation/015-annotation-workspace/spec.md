## MODIFIED Requirements

### Requirement: FR-090 歷程分層遮蔽

- **FR-090**（v4.61.0 新增，對應 AC-4.51，issue #578）：**歷程分層遮蔽**。歷程事件之呈現必須分兩層：事件列（操作者角色與 `actor_id`、時間、`action`）對所有可檢視該樣本者可見；`result_snapshot` 與 `reason` 必須依檢視者角色遮蔽——(1) `role=annotator`：可見自己 `actor_id` 之事件的快照與理由；其他標記員之事件不得進入該檢視者的歷程輸出——**含事件列**（理由是事件列依 FR-016B 承載「對應輸出類型作答摘要」，該摘要即答案內容，僅遮蔽 `result_snapshot` 與 `reason` 仍會經摘要外洩，與 FR-062 相衝突；此處之「標記員不得經任何路徑讀取他人作答內容」為本條**新確立**之規則，正典 v4.60.0 以前並無同名的跨標記員隔離條文可資沿用，其依據為憲章 NON-NEGOTIABLE 之 Data Fairness 與歷程供給層既有以 `identity.annotatorId` 分 bucket 取事件的實作事實）。(2) `role=reviewer`：可見自身審核單位範圍內（同一 `run_id × assignment_id`）全部事件之快照與理由。(3) 具 `can_arbitrate` 之審核員於爭議單位：可見該樣本全部標記員之快照與理由。遮蔽必須於資料供給層完成，不得僅以樣式隱藏——被遮蔽的內容不得存在於該檢視者可取得的呈現輸出中。本條與 FR-062 盲審隔離為疊加關係：一筆事件必須同時通過 FR-062（未提交之審核判斷僅本人可見）與本條，方得呈現其快照與理由。

**v12.2.0 修訂（issue #1268，試標回合揭露前之遮蔽）**：第 (1) 點另加一道揭露時點閘門——`role=annotator` 於 `run_type=dry_run` 檢視某樣本，而該樣本所屬試標回合尚未依 FR-096 揭露時，歷程輸出 MUST 僅含該標記員本人 `actor_id` 之事件；審核員、仲裁、例外池等其他角色之事件 MUST NOT 進入其歷程輸出——事件列、`result_snapshot` 與 `reason` 皆然（事件列依 FR-016B 承載作答摘要，僅遮蔽快照與理由仍會外洩修正後之答案）。回合揭露與否 MUST 與 FR-096 試標歷史回饋採同一判定：逐回合判定，某回合進入 `waiting_iaa_confirmation` 後即揭露且不收回，無法判定所屬回合之提交於任務處於 `dry_run_in_progress` 時視為未揭露（fail closed）。本閘門 MUST 於資料供給層完成，與 FR-062 及本條其餘遮蔽為疊加關係。回合揭露後與 `run_type=official_run` 維持本條原規則。依據為 FR-096 之 Data Fairness 條文：歷程頁籤是審核判斷之另一條讀取路徑，揭露前讀到即構成同輪答案洩漏。上文「事件列對所有可檢視該樣本者可見」逐字保留為沿革，其適用範圍受本修訂限縮。

#### Scenario: AC-4.51 標記員不得經歷程取得他人答案
- **GIVEN** `run_type=dry_run` 之某樣本已有標記員 A 與標記員 B 各自提交
- **WHEN** 標記員 A 檢視該樣本 `歷程` 頁籤
- **THEN** 標記員 B 之事件完全不出現於 A 可取得的任何呈現輸出中——事件列、`result_snapshot` 與 `reason` 皆然
- **AND** reviewer 於 A 與 B 各自的審核單位檢視同一樣本時，兩人之快照與理由皆可見
- **AND** 一筆其他審核員尚未提交之審核草稿事件，即使檢視者為具 `can_arbitrate` 之審核員，仍依 FR-062 完全不納入清單

#### Scenario: 試標回合揭露前標記員之歷程只含本人事件
- **GIVEN** 某 `run_type=dry_run` 任務之進行中回合內，標記員 A 已提交某樣本，且該樣本已有審核員之決策事件（含修正後之 `result_snapshot` 與 `reason`）
- **WHEN** 標記員 A 於該回合進入 `waiting_iaa_confirmation` 之前檢視該樣本 `歷程` 頁籤，或其 `annotation-list` 之「最後動作」彙總
- **THEN** A 可取得之歷程輸出 MUST 僅含 A 本人之事件，審核員、仲裁與例外池事件之事件列、`result_snapshot` 與 `reason` 皆 MUST NOT 出現
- **AND** 該回合進入 `waiting_iaa_confirmation` 之後，同一審核事件 MUST 依本條原規則對 A 可見
