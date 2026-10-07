> 正典：`specs/annotation/015-annotation-workspace/spec.md`。此 delta 為 issue #1160 V1 規劃契約；八張候選表尚未部署，歷史沿革保留。

## MODIFIED Requirements

### Requirement: FR-014S reviewer 草稿失權隔離

- **FR-014S**（v4.15.0 新增，issue #196、CONT-03，對應 AC-6.10）：工作區 reviewer 視圖的逐筆 `REVIEW_DECISIONS = approve | modify | bypass` 三向決策（FR-014B／FR-092；`A`／`B` 可依 FR-054 設定整單位的通過／無法裁決，`R` 不產生決策，修正不綁快捷鍵）在「送出審核」之前，每次變更皆必須即時寫入一個與提交紀錄分離的草稿儲存區——不得寫入 `SUBMISSION_BUCKET_DIMENSIONS`（FR-049）定址的提交 bucket，亦不得產生任何歷程事件——使審核員在完成送出前重新整理頁面時，尚未送出的逐列決策仍能還原，與標記員儲存草稿的既有行為（FR-013）維持角色對稱（issue #196 現況調查所建議的產品決策）。草稿儲存區的正式持久化鍵為 `run_id × assignment_id × reviewer_id`（v11.0.1，沿用 FR-051 審核單位與 FR-049 審核員隔離）；舊 `sample_id × annotator_id × run_type × reviewer_id` 僅為 prototype bucket，不得用於正式跨 cycle 的草稿還原，一位審核員的草稿不得外溢至另一位審核員或另一位受審標記員。送出審核成功後，該審核單位的草稿必須清除，不得殘留舊決策供下次進入時誤還原。草稿本身不得構成 FR-062 所稱的盲審污染——不得以任何形式（含「已有動作」的事實）對其他審核員可見；本條涵蓋逐列三向決策及其取消狀態，不涵蓋直接修正控件內尚未送出的文字/數值編輯（該部分沿用既有的記憶體內狀態，reload 遺失，不在本次範圍）。 **V1 失權隔離**：reviewer membership 停用、移除或指派／候選變動時，未提交草稿同交易失效，僅供受限稽核；重新獲權不自動還原，其他角色連草稿存在與否皆不可見，失效草稿不構成 sticky 提交。

#### Scenario: 失權後草稿不還原

- **GIVEN** 同一 run／assignment 的有效當事者與目前來源
- **WHEN** 依 FR-014S 進行讀寫或推導
- **THEN** 身分、版本、授權、原子性與不可變邊界須符合上述完整條文

### Requirement: FR-059 span 爭議項推導

- **FR-059**（v4.6.0 新增，對應 AC-4.19 ~ AC-4.21）：爭議池的爭議項（`DisputeItem`，見關鍵實體）必須於每次讀取時由 FR-052 之差異比對**推導**而得，不得實體化儲存（`DISPUTE_ITEM_SOURCE`）——與 `ReviewUnit.status`（FR-051）同一哲學：推導使爭議池在結構上不可能與審核單位狀態機漂移，仲裁投票與定案值才是僅有的寫入狀態（欄位已於實體定義，其寫入行為屬後續 PR 範圍）。推導規則：
  1. **輸入**：該審核單位（`run_id × assignment_id`，FR-051）之標記員已提交答案與**所有**審核員已提交決策（沿用 FR-049 身分維度定址）；標記員未提交或尚無任何審核員提交時，爭議項清單為空。
  2. **項目識別**：以 `outKey × 合併鍵`（FR-052 差異項之 `key`）為爭議項識別；同一識別跨審核員合併為單一爭議項，依 `TaskProfile.outputs[]` 順序、再依差異項出現順序穩定排序。
  3. **A/B 值**：`annotator_value` 取 FR-052 差異項之標記員側值（僅存在於審核員側者為空值）；`reviewer_values` 以 `reviewer_id` 為鍵逐審核員保存其差異側值——**與標記員一致的審核員不得出現於其中**（沒有差異即沒有立場），故完全一致的審核單位推導結果為空清單。
  4. **拆解粒度沿用 FR-052**：集合型（`multi_label` / `entity_recognition` / `relation_identification`）逐合併鍵各一項——實體改型即拆為兩項（原鍵 `annotator_value` 有值、審核員側空值；新鍵相反）；`sequence_tagging` 逐 `(start,end,label)` span 合併鍵（同文字不同 offset 不合併；改 label 形成舊鍵移除與新鍵新增兩項）、`multi_dim` 逐維度（僅有差異的維度成項）、`single_label` / `single_dim` / `free_text` 整個 outKey 至多一項。

  本條僅定義資料模型與推導契約，不改變任何版面呈現；仲裁介面、A/B 投票與多數決收斂見 FR-061（v4.8.0）。

  **V1 鍵穩定性**：正式 `item_key` 須保存輸出型別與編碼版本，不得裸字串拼接三元組；精確編碼及碰撞測試須在 migration 前固定。`entity_recognition` CompactAnswer 的位置落差仍依 FR-052 待決。

#### Scenario: 同文字不同 offset 不碰撞

- **GIVEN** 同一 run／assignment 的有效當事者與目前來源
- **WHEN** 依 FR-059 進行讀寫或推導
- **THEN** 身分、版本、授權、原子性與不可變邊界須符合上述完整條文

### Requirement: FR-061 全量單批一次仲裁

- **FR-061**（v4.8.0 新增，v4.54.0 修訂，**v5.0.0 修訂，BREAKING**，對應 AC-4.22 ~ AC-4.24、AC-4.54，issue #147／#551／#596；**v9.0.0 修訂，MAJOR**，issue #1053：新增當事審核員已有自己提交時之 FR-103 例外；**v10.1.0 修訂**，對應 AC-4.83，issue #1120：新增第 7 點仲裁輸出項目之計數單位）：工作區 reviewer 視圖必須為爭議池提供**逐項仲裁版面**，切換條件為「該審核單位狀態為 `爭議中`（FR-051）**AND** 目前審核員具仲裁資格（FR-060 之兩條件）」——條件成立時整張審核卡切換為仲裁版面，不成立時，若目前審核員在該單位已有自己的提交，改依 FR-103（**v9.0.0 修訂**，issue #1053）呈現其唯讀摘要版面，其餘情形維持 FR-053 審核卡，三者互斥、不得混渲染：
  1. **仲裁者選邊、不重新標記**：仲裁版面呈現標記員答案的唯讀摘要（一致項的脈絡）與逐爭議項的 A／B 選擇；修正控件與 FR-014B 決策控件一律不渲染——仲裁的產出是「採哪一側」，不是第三份新答案。仲裁不得觸發任何形式的重標。
  2. **A／B 取值與 B 的動態渲染**：A ＝ `annotator_value`（標記員原答案）。B ＝ 該單位審核員的答案，其呈現必須依決策來源動態決定——來源為 `modify` 時呈現 `B · 審核員修正值`（附該審核員之必填理由，FR-016A），採 B 即以該修正值定案；來源為 `bypass` 時呈現 `B · 審核員：無法裁決`（**v6.8.0 修訂**，issue #811：與來源 `modify` 同一組字規則，冒號後為 FR-092 所定之決策值文案，不得含 `Bypass` 字樣——舊標籤把答案值與決策值兩個概念的名字疊在同一個標籤裡；其後「定案為無法判定」描述的是定案後的值，不在本版改名範圍），採 B 即**定案為無法判定**，該項定案值記為無法判定，**不得**回填標記員原答案。一個審核單位恰有一位審核員（FR-093），故每個爭議項恰有一個 B 選項，不存在多個 B 或需合併相同值的情形。（**v6.20.0 釐清**，issue #913）萬一因遺留資料而出現 FR-093（1）明文禁止之同一單位多位審核員提交（例如 v6.17.0 送出閘門前留下的舊紀錄），B 值與其動態渲染所讀取之「該單位審核員」，必須沿用 FR-093（1）已定義之 sticky 擁有者（`getStickyReviewers()`），不得依儲存掃描順序（如 bucket key 字典序）挑選——後者可能選中與標記員答案一致、未產生爭議項之提交者，使 B 值誤讀為未定義。（**v7.4.0 釐清**，issue #975）同一原則亦適用於 `adjudicated` 歷程事件之 `result_snapshot`（`arbitrationFinalizedSnapshot()` 之 `adopt_b` 分支，`annotation-workspace.data.js`）——該讀取點取「該單位審核員」提交時，同樣須沿用 sticky 擁有者、不得依儲存掃描順序挑選，確保 `result_snapshot` 與同一次仲裁之 `finalized_value` 描述同一位審核員；此前僅 B 值（`finalized_value` 路徑，issue #913）已修正，`result_snapshot` 路徑係本版補上。
  3. **第三出口：兩者皆非**：仲裁者判定 A 與 B 皆不可採時必須可選 `兩者皆非`（`ARBITRATION_OUTCOMES.reject`），**理由必填**；送出後該爭議項必須落入最終例外池（FR-095），該單位維持 `爭議中` 直到例外池收尾。
  4. **送出與寫入**：所有爭議項皆已裁定（採 A／採 B／兩者皆非）方可送出，未完成時必須阻擋且不得寫入任何狀態。送出時逐項寫入 `votes[]`（`arbiter_id`、`choice`、`voted_at`）與 `finalized_value` / `finalized_by`——此為 `DisputeItem` 僅有的寫入狀態（FR-059、`DISPUTE_ITEM_SOURCE`）；`choice` 取值必須為 `ARBITRATION_OUTCOMES = adopt_a | adopt_b | reject`。仲裁狀態以**審核單位**定址（`run_id × assignment_id`；單位內再以 `outKey × 合併鍵` 區分爭議項），不得寫入任何 reviewer bucket——爭議屬於單位本身，任何仲裁者的定案必須對該單位的所有檢視者可見。**V1 單次裁定**：當前單位全部爭議鍵須同一 `decision_batch_id` 與交易各寫一張不可變票，每鍵至多一票；同 batch key 與相同內容重送回原結果，異內容或第二票拒絕。每票保存來源 revision／digest，來源變更或並發競爭使 digest 不符時整批拒絕，不選較新的票或覆寫；`reject` 票由 FR-095 獨立收尾。
  5. **仲裁效果說明**（v5.0.0 自 FR-074 第 4 點逐字移入，該條已整組移除）：版面必須載明仲裁的效果為「逐爭議項選定定稿值、不重新標記」。
  6. **狀態機延伸**（修訂 FR-051）：`爭議中` 不是終態——該單位所有爭議項皆已解決（仲裁定案或例外池收尾）時，狀態推導為 `已定稿`；仍有未解決項時維持 `爭議中`。
  7. **仲裁輸出項目之計數單位**（**v10.1.0 新增**，對應 AC-4.83，issue #1120）：凡呈現仲裁進度之計數——含 `task-detail` 進度頁籤之 `待仲裁` 計數，以及 `task-management/014-task-detail` FR-010u 第 (5) 點所稱之「爭議項」聚合層級（issue #1120 OpenSpec change `1120-task-lifecycle-alignment` 稱之為「仲裁輸出項目」）——必須以 FR-059 推導之爭議項（`DisputeItem`）為聚合單位，本點為該計數單位之唯一定義。(a) **單位**：每個爭議項計為 1；其完整識別為 `run_id × assignment_id × outKey × 合併鍵`（所屬審核單位依 FR-051）（FR-059 第 2 點），拆解粒度依 FR-059 第 4 點（集合型逐合併鍵、`sequence_tagging` 逐 `(start,end,label)` span 合併鍵、`multi_dim` 逐維度、其餘整個 outKey 至多一項）；不得以審核單位或輸出類型將同一單位內的多個爭議項合併為一筆計數。(b) **分子與分母**：分母為查詢範圍內之爭議項總數；分子為其中已裁定之爭議項數——即唯一裁定為 `reject`，或已有合法仲裁定案（`finalized_value`／`finalized_by`，本條第 4 點）者。(c) **待仲裁**：尚未解決（既無仲裁定案、亦無最終例外池收尾，同 FR-051 之解決判定）且唯一裁定不是 `reject` 之爭議項數；唯一裁定為 `reject` 而尚未收尾者屬最終例外輸出項目（FR-095），不得計入待仲裁。(d) **範圍**：查詢範圍由呼叫端之查詢上下文決定（例如 014 FR-010u 第 (1) 點），本點不另定範圍；不同 `run_id` 之爭議項必須分別計數，即使 `run_type` 與回合顯示號相同亦不得混合。(e) **不得相加**：本計數不得與審核單位數或標記 assignment 數相加，亦不得與兩者共用分母（014 FR-010u 第 (5) 點）。本點係 OpenSpec change `1120-015-arbitration-output-unit` 回寫，補上 issue #1120 OpenSpec change `1120-task-lifecycle-alignment` 列為 015 擁有之跨 owner 待辦；該 change `design.md` D2 以「審核單位 × 輸出類型」描述此單位，較 FR-059 粗，本點以 FR-059 為準。

  **v5.0.0 移除**：逐項多數決收斂（`DISPUTE_CONVERGENCE_RULE`）、未表態審核員之隱含同意票、偶數平手與全數分歧之不收斂情境，以及 issue #551 之「純退回恆不收斂」與「維持退回」語意全部移除——單一審核員沒有票數可計，且退回機制已不存在（FR-092）。爭議項必須全數由仲裁者逐項裁定，不存在自動收斂路徑。

#### Scenario: 同 batch 冪等且無半套票

- **GIVEN** 同一 run／assignment 的有效當事者與目前來源
- **WHEN** 依 FR-061 進行讀寫或推導
- **THEN** 身分、版本、授權、原子性與不可變邊界須符合上述完整條文

### Requirement: FR-065 V1 仲裁重送與不可變票

- **FR-065**（v4.15.0 新增；V1 修訂，issue #1160）：同一 `run_id × assignment_id` 的全部目前爭議項由合格仲裁者在單一 batch 原子裁定；每個 `outKey × item_key` 在此單位最多一張不可變票，不因尚有其他未解決項而允許改票。
  1. **唯一與原子**：提交時驗證全部當前爭議鍵、來源 revision／digest、非當事資格與即時權限；任何一項失敗都不留部分票。資料庫 UNIQUE 防止同鍵第二票，`votes[]` 在 V1 讀取形狀為零或一筆。
  2. **冪等重送**：`decision_batch_id` 及完整正規化內容 digest 相同，回傳原 batch 結果；同 key 異內容、不同 key 的第二 batch 或已存在票的改投均拒絕，相同重送不可轉成更新既有票的操作。正式 API 若提供此操作，其契約須區分相同重送與衝突，不以此規劃宣稱端點已實作。
  3. **留痕**：`voted_at`、來源 revision、決定者及歷程事件於首次成功提交時固定，不得更新時間或抹除原票；`reject` 的後續收尾寫 FR-095 的獨立 resolution。
  4. **讀取推導**：`ReviewUnit.status` 與定案值仍由唯一票及可能的唯一例外 resolution 讀取時計算；不存在「最新一票」選取、改票觸發快取重算或刪票解鎖。未來若需重新仲裁，須另立明示補償與版本契約。

#### Scenario: 重送不能變成改票

- **GIVEN** 一個單位已成功提交含全部爭議鍵的仲裁 batch
- **WHEN** 相同 batch key／內容重送，或同 key 以不同內容／新 key 再投
- **THEN** 相同內容回既有結果；異內容或第二票拒絕，既有票、時間及來源 revision 均不變（AC-7.6；FR-065）

### Requirement: FR-095 reject 唯一例外收尾

- **FR-095**（**v5.0.0 新增**，對應 AC-4.56、AC-4.57，issue #596）：**最終例外池的逐筆收尾**。仲裁者對某爭議項裁定 `兩者皆非`（`ARBITRATION_OUTCOMES.reject`，FR-061 第 3 點）時，該項必須落入**最終例外池**，由專案負責人逐筆收尾，收尾動作取自 `EXCEPTION_POOL_ACTIONS`：（1）`adopt_annotator` — 採標記員原答案定案；（2）`adopt_reviewer` — 採審核員答案（修正值或「無法判定」）定案；（3）`custom_answer` — 填入自訂答案定案，**僅適用 `run_type = official_run`**（`dry_run` 不產出最終答案，自訂答案沒有落點——此為本規格中合法的 `run_type` 分流，見 FR-077 §4）；（4）`exclude_from_dataset` — 該筆自資料集排除，**不產生 gold**（FR-063）。（**v6.20.0 釐清**，issue #913）`adopt_reviewer` 所稱「審核員答案」，於出現 FR-061 第 2 點本版釐清所述之遺留多提交形狀時，同樣取 FR-093（1）之 sticky 擁有者，理由同 FR-061 第 2 點。（**v6.21.0 釐清**，issue #914）「全數收尾後推導為已定稿」之「收尾」，於狀態推導（`getReviewUnitStatus()`）與定稿值取用（`getFinalizedOverwrites()`／`getFinalizationSourceKeys()`）兩側先前各自認定寬嚴不一：前者僅檢查仲裁 `finalized_by` 是否存在、或例外池 `action` 是否非 `exclude_from_dataset`，未如後者要求該筆紀錄真正持有合法 `finalized_value`，使一筆缺少或不合法 `finalized_value` 之紀錄仍可讓單位誤判為 `已定稿`。本版統一為單一判準：紀錄須持有 `finalized_value` 屬性；`custom_answer` 額外要求該值不得為 `null`——專案負責人未於重用之作答控件選取任何答案時之落空值，AC-4.56「輸入合法值並填妥理由後可定案」本即隱含此要求，該值不合法時不得判為已定稿。（本版新增段落之 AC-4.72/AC-4.75 承接「輸入合法值」與「理由必填」兩項要求，AC-4.56 之原文引用因該 AC 於 v7.0.0 廢止而僅存歷史意義，實質要求不變，見下方新增段。）`adopt_b`（FR-061 第 2 點）與本條第（2）點 `adopt_reviewer` 之 `finalized_value: null` 不受此限——兩者承接審核員 `bypass` 決策時，`null` 是設計既有之「無法判定」定案語意（design.md D3），非缺陷，仍須判為已定稿且不得回填標記員原答案。`listReviewPoolItems()`（任務詳情頁例外池佇列與本條第（一）點之左側清單共用來源）同步套用同一判準，使經此收緊後改判為 `爭議中` 之單位得以在佇列中重新浮現，不致無從收尾。例外池為爭議池之後的**最後一道**出口，不得再有第四層轉送；收尾必須附理由並寫入歷程事件（`exception_resolved` 或 `excluded`，FR-086），其責任鏈併入 FR-097。該單位在其所有例外項皆收尾前維持 `爭議中`，全數收尾後推導為 `已定稿`（FR-061 第 6 點）。（**v6.16.0 新增**，issue #907，對應 AC-4.69）**最終例外處置畫面的外殼**：專案負責人視角之最終例外處置畫面必須使用例外池專屬外殼，不得沿用標記員工作區的樣本導覽外殼。具體而言：（1）**佇列即左側清單**——左側清單必須列出該 `task_id × run_type` 之最終例外池全部待處置項目（每列一個待處置爭議項），並必須與任務詳情頁的例外池計數推導自同一個來源，兩處不得對「還有幾項待處置」產生分歧；該清單不得列出一般標記樣本，亦不得對其列套用標記進度狀態（待標記／已儲存／已提交）。（2）**計數單位為例外項**——畫面進度必須以待處置例外項為單位呈現，不得使用標記提交進度（`{done} / {total} 已提交`）文案，專案負責人在本畫面不執行標記提交。（3）**無自動儲存狀態**——自動儲存狀態列不得呈現於本畫面；專案負責人於本畫面無草稿儲存路徑（其儲存與送出入口必須隱藏），該狀態永遠不會前進，呈現即為誤導。（4）**仲裁理由就地可見**——每一待處置項必須呈現使其落入例外池的仲裁理由與裁定者身分（FR-061 第 3 點之必填理由），使處置決定不需離開本畫面即可查證。（5）**排除動作的危險樣式**——`exclude_from_dataset` 之操作項必須在視覺上與其餘三個採用型處置可區辨（危險樣式），該動作不產生定案答案且不可於本畫面復原。本段僅規範畫面外殼，不得改變上列四個處置動作的集合、run_type 分流或各自的資料寫入契約（AC-4.56、AC-4.57 已於 v7.0.0 廢止，其一鍵語意由下方新增段落取代）。（**v6.25.0 釐清**，issue #922）上述「不得沿用標記員工作區的樣本導覽外殼」之範圍，明文化亦涵蓋畫面頂部的進入點麵包屑（`renderEntryBreadcrumb()`）：該元件於專案負責人視角下對「當前處置項」的標示，同屬樣本導覽外殼之一部分，不得沿用標記員分支之資料集樣本序號語意（`crumbSamplePosTpl`，對 `datasetRecords` 計數，例如「樣本 5 / 5」），而須與左側清單、中欄計數同源，改以待處置例外項之 `sample_id × annotator_id` 識別當前項——此為對上述已存在之一般性禁止（「不得沿用...樣本導覽外殼」）的具體適用範圍釐清，非新增獨立約束；AC-4.69 既有五點列舉逐字不改寫，本版於其末尾追加一句 `And` 可測條件（麵包屑之 `sample_id`／`annotator_id` 識別語意），使本條釐清有對應之可測驗收條件、補上可追溯性缺口，SC-011 不修訂。（**v7.0.0 新增，BREAKING，issue #920**）**先選取、後確認的處置互動模型**：收尾畫面的四個處置動作必須拆分為「選取」與「確認」兩個獨立步驟，取代 v5.0.0 原「開啟收尾畫面即以單步呈現處置結果」之契約：（1）**選取不寫入**——點擊任一處置動作（含 `custom_answer` 展開之原始作答控件內的作答選取）僅標記該處置為目前選取狀態，不觸發定稿值寫入或任何歷程事件；使用者可自由切換選取的處置，切換前既有輸入（理由文字）不因此清空。（2）**彙整列**——畫面必須提供彙整區塊：未選取任何處置時顯示「尚未選擇最終處置」；選取後必須顯示所選處置名稱，`adopt_annotator`／`adopt_reviewer` 與已於作答控件選定合法值之 `custom_answer` 必須額外顯示其定稿值，`exclude_from_dataset` 不顯示定稿值。（3）**理由必填擴及四種處置**——四個處置動作必須皆要求填寫理由（本條「收尾必須附理由」之既有規則本次明文擴及 `adopt_annotator`／`adopt_reviewer` 兩者，修正其現行缺陷——issue #913 所記錄之 `reason: ''`）；理由欄位為空時，「確認處置」控件必須為停用狀態（disabled），不採本規格別處（如 FR-061 第 3 點之仲裁送出）之「blocked-not-disabled」提示阻擋慣例；**切換至另一個處置時，即使理由欄位仍留有前一個已選處置填入的文字，「確認處置」按鈕仍先回到停用狀態，須理由欄位再次觸發輸入事件才重新可用**——避免某處置所填的理由被靜默沿用為另一處置的理由。（4）**單一寫入點**——「確認處置」為本畫面唯一的資料寫入入口；點擊後才依已選取之處置與已填理由執行本條前段所定義之資料寫入契約（定稿值、歷程事件），寫入前的選取與作答皆不產生副作用。（**v7.6.0 釐清**，issue #985）v6.21.0 之單一判準 `hasLegitimateFinalizedValue()` 當時僅套用於狀態推導（`getReviewUnitStatus()`）與 `listReviewPoolItems()`；工作區渲染層（`annotation-workspace.config.js`）之 `finalizedAnswers()`（定稿摘要卡答案）、`finalizedBasisLabels()`（定稿依據徽章）、`renderArbitrationCard()` 開放項過濾、`exceptionPoolQueue()` 四處仍沿用舊有寬判準（僅檢查 `finalized_by`／例外池紀錄是否存在，未驗證該紀錄是否持有合法 `finalized_value`）。本版將同一判準延伸套用至此四處，使定稿摘要卡答案、定稿依據徽章、仲裁列表開放項渲染、最終例外處置佇列，與既有狀態推導、清單頁三者對「是否已合法定稿」的認定完全一致，不得各寫一套。`exceptionPoolQueue()`、`finalizedAnswers()` 之例外池分支、`finalizedBasisLabels()` 之例外池分支三處之判準額外要求 `exclude_from_dataset` 短路（該動作依本條第（4）點本就不持有 `finalized_value`），與既有例外池分支語意一致，非新規則；`renderArbitrationCard()` 讀取的仲裁狀態（`arbState`）從無 `action` 欄位，其開放項過濾之合法值檢查不涉此短路。`exceptionPoolQueue()` 之佇列成員判準仍以仲裁側 `finalized_by` 是否存在為準（不額外要求該仲裁紀錄本身合法）：一筆 `finalized_by` 為真但不合法之仲裁紀錄，其正確復原路徑是交由仲裁者於 `renderArbitrationCard()` 重新裁定（本版已使該紀錄改渲染為開放投票列），而非導向專案負責人之例外池佇列——該佇列僅承接仲裁者裁定「兩者皆非」之項目，若同時放寬佇列判準會使同一項目在仲裁開放列與例外池佇列並存，兩角色皆誤判為己方待處理。（**v8.1.0 釐清**，issue #994）v6.16.0 之上位 MUST「不得沿用標記員工作區的樣本導覽外殼」與 v6.25.0（issue #922）已明文涵蓋 `renderEntryBreadcrumb()` 對「當前處置項」之標示（第三層），本版進一步涵蓋同一函式渲染之第一層——工作區標籤：該標籤原僅以 `crumbWorkAreaReviewer`／`crumbWorkAreaAnnotator` 二元分流，`project_leader` 落入 `crumbWorkAreaAnnotator`（顯示「標記作業」），與其在本畫面實際進行之最終例外處置語意不符，同屬「不得沿用標記員工作區外殼」之具體適用範圍——此為對既有一般性禁止的進一步範圍釐清，非新增獨立約束。AC-4.69 既有六點列舉逐字不改寫，本版於其末尾追加第七個 `And` 可測條件（工作區標籤須為專案負責人專屬文案），SC-011 不修訂。（**v9.1.0 新增**，issue #1060）第（1）點「佇列即左側清單」之呈現層級明文化：左側清單項目必須依 `sampleId` 分組呈現——分組表頭必須顯示該樣本 ID、該樣本待處置例外項數，以及 `getRecordPreviewText(record, fieldRoleMap)` 產出之文本摘要（每樣本群組僅呈現一次；摘要不可得時必須省略，不得以其他欄位或 ground truth 頂替）；分組內每個待處置例外項仍須各自渲染一個 `ws-exception-queue-item` 原生按鈕，不得合併不同 `annotatorId` 或 `outKey` 之項目；分組數（樣本數）與全欄列項數（例外項數）為兩種不同計數。每個待處置例外項之次要資訊必須使用 `OUTPUT_TYPE_REGISTRY[outKey][state.lang]` 之人類可讀輸出類型名稱取代原始 `outKey` 鍵名（原始值僅留於資料屬性／內部識別），並必須同時呈現「待處置」之 zh/en 文字狀態標示（不得僅靠顏色區辨），與一般標記進度狀態文案（待標記／已儲存／已提交）明確區隔。本版不改變第（1）點「每列一個待處置爭議項」與第（2）點「計數單位為例外項」之既有規則，僅新增分組呈現層級、人類可讀輸出類型名稱與「待處置」文字狀態標示。AC-4.69 既有七點列舉逐字不改寫，本版於其末尾追加第八至十個 `And` 可測條件，SC-011 不修訂。

  **V1 單次收尾**：每個 `reject` 爭議鍵最多一筆已確認 resolution；確認時驗唯一 reject 票、來源 digest、PL 即時權限與動作合法性，同交易寫歷程。相同處置重送可回既有結果，異內容或覆寫終局排除拒絕；`exclude_from_dataset` 僅排除輸出項目，不刪公開 `dataset_item` 或 assignment。

#### Scenario: reject 只收尾一次

- **GIVEN** 同一 run／assignment 的有效當事者與目前來源
- **WHEN** 依 FR-095 進行讀寫或推導
- **THEN** 身分、版本、授權、原子性與不可變邊界須符合上述完整條文

### Requirement: FR-101 首次審核後鎖住標記來源

- **FR-101**（**v6.19.0 新增**，對應 AC-2.27，issue #908；**v10.0.0 修訂**，issue #1082）：**標記員定稿鎖定**。`official_run` 審核單位一旦依 FR-051 推導為 `已定稿`，且該推導成立之前提——受審標記員存在真實已儲存提交（FR-051 判定式首句：標記員未提交 → 不成立審核單位，推導為 `null`）——已滿足時，該標記員自身之後續寫入必須被鎖定，不得再變更已定稿之作答，亦不得使單位狀態翻回 `爭議中` 或 `待審`。**範圍限定**：本條僅適用 `official_run`；`dry_run` 因 `submissionBucketKey()` 無 round 維度，本條鎖定範圍不得涵蓋 `dry_run`，試標之後續回合不受影響。**觸發條件（不得誤觸的邊界）**：本條不得對僅由 FR-044a 示範標記員答案遞補、標記員本人尚無任何真實儲存提交的審核單位觸發鎖定。此類單位之 `getReviewUnitStatus()` 依 FR-051 判定式首句恆推導為 `null`，不成立「已定稿」狀態，本條鎖定天然不觸發；標記員本人之首次提交必須正常送出，不得因該單位已有示範列遞補或既有審核員決策而顯示定稿鎖定提示。本條鎖定判定必須沿用（或等價於）`getReviewUnitStatus()` 既有之判定式，使「存在真實已提交紀錄」這項前提結構性地成立，不得另立第二套不要求真實提交存在的判定捷徑（例如直接查詢審核決策記錄或 `REVIEWER_MOCK_ROWS` 遞補列本身是否存在）。**寫入側守衛**：`markSampleSubmitted()`、`markSampleSaved()`、`appendSampleTimelineEvent()`（`annotation-workspace.data.js`）三個標記員寫入點，於執行寫入前，當呼叫之 `role` 為 `annotator` 時，必須先以寫入前（pre-write）狀態呼叫上述判定；判定為 `已定稿` 時，必須直接回傳 `false`、不得寫入任何欄位、不得追加任何歷程事件，既有 bucket 內容維持原狀；未鎖定時必須回傳 `true` 並維持既有寫入行為不變。判定所需之 outKeys 必須由 `resolveTaskProfile(taskId).outputs`（`annotation-workspace.data.js:51`）內部推導取得，三個函式之既有簽章不得因本條新增參數。審核員或仲裁者之寫入路徑不屬本條範圍（FR-094、AC-3.39 已規範），不受本條三個函式之守衛約束於其 `role` 非 `annotator` 之呼叫。標記員自身促成單位轉為已定稿的那一筆提交，因寫入前狀態尚未轉為已定稿，必須正常寫入、不被本條擋下。**呈現**：鎖定生效時，畫面必須渲染鎖定提示（testid `ws-annotator-finalized-notice`），文案為「此標記結果已定稿，無法再修改或提交」（en: "This annotation is finalized and can no longer be edited or submitted."）；視覺必須沿用 FR-094 唯讀卡之語言慣例，但色階必須採資訊色（`--color-info`／`--color-info-bg`／`--color-info-border`），不得沿用 FR-094 之錯誤色——定稿是終態，不是錯誤。作答控制與**儲存草稿／提交**兩個既有控件（`wsSaveBtn`、`wsSubmitBtn`；**v10.0.0 修訂**，issue #1082：原列舉三個既有控件含 `wsSkipBtn`，該控件隨跳過功能整組移除，本點改為兩個既有控件）必須保留在畫面上並套用原生 `disabled` 屬性與 `aria-disabled="true"`，不得自 DOM 移除或隱藏，不得以非原生互動元素（例如 `div`）取代原生控件；兩者既有觸控高度不得因本條縮減。定稿當下已選定之作答必須維持可辨識，不得使已選與未選選項套用相同的視覺結果（例如整排轉灰致無法分辨曾選定何值）。自動儲存狀態列（`ws-autosave-status`）鎖定生效時必須改顯示「已定稿，不再自動儲存」（en: "Finalized — autosave stopped."），不得沿用鎖定前之 INITIAL／DIRTY／SAVED 三態文案。**不引入定稿快照**：本條判定必須沿用 FR-072(3) 既有之讀取時計算、不快取原則，不得引入任何持久化之定稿快照欄位。**不提供解鎖入口**：本條不得新增任何一般解鎖操作；重啟流程（FR-016A 審計理由）延後至後端階段，原型不提供任何解鎖入口。 **V1 來源完整性鎖**：除了既有 Official finalized 終態鎖，第一次 reviewer 正式提交後，同一 `run_id × assignment_id` 的 annotator 儲存與提交皆拒絕；Dry／Official 同樣適用，不同 Dry run 不互鎖。與首次審核競爭時序列化同一 assignment，僅先提交者成功，另一方回衝突。

#### Scenario: 標記與首次審核競爭

- **GIVEN** 同一 run／assignment 的有效當事者與目前來源
- **WHEN** 依 FR-101 進行讀寫或推導
- **THEN** 身分、版本、授權、原子性與不可變邊界須符合上述完整條文

### Requirement: FR-103 有票後改判凍結

- **FR-103**（**v9.0.0 新增**，對應 AC-4.81、AC-4.82，issue #1053）：**當事審核員重入爭議單位之唯讀摘要與改判入口**。`annotation-workspace` reviewer 視角，當一個審核單位狀態為 `爭議中`（FR-051 `REVIEW_UNIT_STATUS.DISPUTED`）、且目前審核員**不具**仲裁資格（FR-060／`isArbiterCandidate()`，即該審核員恰為當事人，非仲裁者），但目前審核員在此單位**已有自己的 `reviewer` 提交**（`getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 對目前審核員之 `identity` 非空）時，`reviewUnitBlockReason()`（`annotation-workspace.config.js`）必須回傳新的攔截值 `REVIEW_UNIT_BLOCK.SUBMITTED_DISPUTED`，切換為本條所定義的唯讀摘要版面，不得再落回 FR-053 之互動審核卡。本判定必須緊接於既有 `ARBITRATION` 分支（FR-061）之後、`FINALIZED`（FR-094）分支之前，不得改變 `ARBITRATION`、`FINALIZED`、`OFF_ROSTER`（FR-093）、`NOT_ASSIGNED`（FR-093）、`EMPTY`（FR-053）五個既有分支的判定順序或渲染行為——本條與既有五個分支互斥，同一時刻恰一個成立。**唯讀摘要版面**（testid `ws-review-submitted-card`，比照 `renderFinalizedCard()` 之 `.rv-finalized-summary` 呈現語彙，必須重用同一 CSS class，不得另立第二套摘要樣式）：（1）逐 outKey 呈現標記員原答案（沿用既有 `getAnnotatorSubmission()`）與目前審核員自己的決策（`approve`／`modify`／`bypass`）、修正值（`modify` 時）與裁定理由（`modify`／`bypass` 時），三者內容必須與 `getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 之實際回傳值（`answers.previewState`／`decisions`／`reasons`）逐字一致，不得從其他來源（如當前未提交草稿 `reviewRowDecisions`）取值。（2）「送出審核」（`ws-review-submit-btn`，固定 footer）與其後果提示（`ws-review-submit-consequence`，FR-102）必須隱藏（沿用既有 `reviewSubmitBtn.classList.add('hidden')` 寫法），不得停留於視覺遮蔽而 DOM 仍可被 `Ctrl/Cmd+Enter`（FR-058）等既有送出捷徑觸發——`setupActionShortcuts` 略過 hidden 按鈕的既有機制必須在本分支下同樣生效。（3）版面底部必須渲染一顆次要按鈕「修改我的審核」（`ws-review-edit-my-decision-btn`）。**改判入口**：按下「修改我的審核」後，必須切換為既有 FR-053 互動審核卡（含決策列、理由欄、送出按鈕），且必須以目前審核員自己的提交（`getSubmission(taskId, 'reviewer', runType, sampleId, identity)`）而非標記員原答案播種下列三者：（1）修正面板（correction panel）之初始可編輯值——`seedReviewRow()` 必須補一個可選的播種來源參數（或等效之新呼叫路徑），使本分支呼叫時可傳入審核員自己的提交作為 `seedReviewState()` 之來源，不得直接複用既有無條件呼叫（`seedReviewRow(outKey, submission)` 於互動分支仍以 `getAnnotatorSubmission()` 為來源，該既有行為不得變動）。`reviewRowOriginals`（供畫面顯示「原答案：」比對用）之來源必須維持為標記員原答案，不得因本次改判入口而改為審核員自己的提交——兩者用途不同，不得混用同一份資料。（2）決策按鈕（`ws-review-row-approve`／`ws-review-row-modify`／`ws-review-row-bypass`）之初始選取狀態，必須對應審核員自己提交之 `decisions[outKey]`。（3）裁定理由欄，必須帶回審核員自己提交之 `reasons[outKey]`。版面必須額外渲染一顆「取消，維持原決策」按鈕（`ws-review-cancel-edit-btn`），按下後必須退回唯讀摘要版面（重新渲染本條第一段之唯讀摘要），不得寫入任何變更（不呼叫任何提交或草稿持久化函式）。**i18n**：本條新增之顯示文字必須提供 zh／en 成對之 i18n 鍵，不得僅提供單一語言。**寫入側殘留路徑守衛**（`handleReviewSubmit()`）：呈現層隱藏送出控件不足以防止經殘留呼叫路徑（如快捷鍵或未來的呼叫變更）繞過而直接寫入——`markSampleSubmitted()` 對 `reviewer` 角色寫入路徑無護欄（FR-101 之寫入鎖僅適用 `annotator` 角色），且寫入為整筆覆寫 `answers`（含 `decisions`／`reasons`），`getReviewUnitStatus()`／`getDisputeItems()` 正是讀取該欄位推導單位狀態；若無守欄，當事審核員經殘留路徑重新送出 `approve` 會抹除自己原先造成爭議之 `modify`／`bypass` 決策，使一個仍待仲裁的單位被當事人單方面消解出爭議池。`handleReviewSubmit()` 必須在既有 issue #307（空單位）與 issue #308（已定稿）兩道進入時護欄之後，新增第三道進入時護欄：當「該單位狀態為 `DISPUTED`」**AND**「目前審核員在該單位已有自己的 `reviewer` 提交（`getSubmission(taskId, 'reviewer', runType, sampleId, identity)` 非空）」**AND**「畫面目前**不在**已按下『修改我的審核』後的編輯態」三者同時成立時，直接 `return`，不得寫入任何欄位、不得追加任何歷程事件。本守衛不得阻擋符合 V1 條件之「修改我的審核」入口：僅當單位仍為 `disputed` 且全單位沒有仲裁票時，原 reviewer 在編輯態可依版本鎖送出新修訂；不符合條件時，即使直接呼叫 handler 亦須拒絕。**V1 有票凍結**：原 reviewer 只有單位仍 `disputed` 且全單位無仲裁票時可依版本鎖改判；首票後改判入口只顯示唯讀原因，直接呼叫 handler 亦須拒絕，不能刪票解鎖。已 `finalized` 仍依 FR-094 唯讀。**不改變的部分**：本條不改變 FR-051 狀態機、FR-094 已定稿唯讀卡、FR-093 指派與離冊閘門、`getSubmission()`／`isArbiterCandidate()`／`isRosterReviewer()` 等既有資料層函式之行為與簽章；本條之唯讀摘要與改判入口為工作區呈現分支；正式提交修訂的持久化、來源凍結與並發約束依 FR-105。FR-060（仲裁資格判定本身）與 FR-093（指派與離冊閘門）之判定邏輯不變；FR-061 與 AC-4.22 之版面切換判定已於本版一併修訂。（**v9.0.1 釐清**，issue #1058）本條第（1）點所述之裁定理由呈現方式明文化：裁定理由不得拼接於決策文字列尾端，必須另起一組 `.rv-finalized-summary-label`／`.rv-finalized-summary-value` 標籤／內容列，作為 `section` 之獨立子元素，與決策列共用同一版面之 grid 對齊語彙、左側對齊，不得停留於視覺上緊貼決策文字的拼接寫法。

> **v2.0.0 移除項目**：原 `FR-004D`（保留次分類路由參數）與原 `FR-025`（任務分類 localStorage fallback 機制）隨 taxonomy 遷移一併移除，不再適用；詳見 Changelog。

#### Scenario: reviewer 改判與首票競爭

- **GIVEN** 同一 run／assignment 的有效當事者與目前來源
- **WHEN** 依 FR-103 進行讀寫或推導
- **THEN** 身分、版本、授權、原子性與不可變邊界須符合上述完整條文

## ADDED Requirements

### Requirement: FR-105 V1 annotation／review 寫入完整性

正式答案須依釘住 config 驗證 `OutputAnswer[]`；`sequence_tagging` payload 使用 `spans: [{start,end,label}]`、`snap_unit`、`bypass`、`version`，不用舊 `tokens/tags/scheme/unit`。審核提交全量驗證 outKey、保存不可變 revision／歷程並清除有效草稿。仲裁首票後 submission／revision 永久凍結，不得刪票解鎖。未提交標記 slot 退回時舊草稿轉 `abandoned` 並保留原作者，繼任者由空白紀錄開始；reviewer 失權草稿失效且不自動還原。所有讀寫驗 active membership、task role、assignment、roster／candidate 與資源條件；歷史 membership 不授權。一般路徑不讀或外洩 `dataset_item_private`、gold/test 旗標或隱藏答案。此為規劃契約，不宣稱 ORM、migration、API 或雙庫測試已存在。

#### Scenario: 首次審核後標記來源不可改

- **GIVEN** reviewer 已首次正式提交
- **WHEN** annotator 在同一 run／assignment 儲存或提交
- **THEN** 寫入拒絕，A/B 來源與 revision 不漂移；另一 Dry run 不受舊 run 鎖定

### Requirement: AC-7.4 span 爭議鍵不碰撞

同一輸出類型的 `sequence_tagging` span 爭議鍵使用 `(start,end,label)` 與編碼版本；相同文字但不同 offset 不合併，改 label 產生舊項移除與新項新增，不把整段文字或 token 位置當作權威鍵。

#### Scenario: AC-7.4 span 爭議鍵不碰撞

- **GIVEN** 同文字位於不同 offset，另有一個 span 改 label
- **WHEN** 推導爭議鍵
- **THEN** 不同 offset 不合併，改 label 形成舊項移除與新項新增

### Requirement: AC-7.5 來源提交與改判競爭

同一 assignment 上的 annotator／reviewer 提交競爭、reviewer revision／仲裁首票競爭，依同一交易鎖與版本檢查序列化；首審凍結標記來源，首票凍結審核 revision，落敗寫入回衝突且不得留下指錯來源的票。

#### Scenario: AC-7.5 來源提交與改判競爭

- **GIVEN** annotator、reviewer 或仲裁者同時寫同一 assignment
- **WHEN** 第一個交易提交
- **THEN** 後續依版本與凍結條件成功或衝突，不得留下指錯 revision 的票

### Requirement: AC-7.6 仲裁只有一次完整 batch

同一單位的全部爭議鍵只接受一次完整仲裁 batch；每鍵唯一票與不可變時間由同交易保證，相同 `decision_batch_id`／digest 重送冪等回原結果，異內容或半套 batch 拒絕。

#### Scenario: AC-7.6 仲裁只有一次完整 batch

- **GIVEN** 單位的全部爭議鍵及合法來源 digest
- **WHEN** 仲裁者提交完整 batch 並重送
- **THEN** 每鍵恰一票、同內容冪等、異內容拒絕，失敗不留部分票

### Requirement: AC-7.7 reject 例外一次收尾

唯一 `reject` 票只可有一筆已確認 resolution；同內容重送回既有紀錄，異內容拒絕。`exclude_from_dataset` 排除該輸出項目而不刪公開 item 或 assignment。

#### Scenario: AC-7.7 reject 例外一次收尾

- **GIVEN** 一張待處置 reject 票
- **WHEN** PL 確認合法處置並重送
- **THEN** 同內容回既有 resolution、異內容拒絕，排除不刪公開 item

### Requirement: AC-7.8 失權草稿不可跨人還原

未提交 annotator 草稿在重派時轉 `abandoned` 並保留前任責任；繼任者不可讀且從空紀錄開始。失權 reviewer 的私有草稿失效，重新獲權不自動還原，其他角色不得看到其存在。

#### Scenario: AC-7.8 失權草稿不可跨人還原

- **GIVEN** 前任 annotator／reviewer 有未提交草稿
- **WHEN** membership 失權、slot 重派或 reviewer 候選變動
- **THEN** 繼任者看不到前任草稿，重新獲權不自動恢復，其他角色看不到 reviewer 草稿存在

