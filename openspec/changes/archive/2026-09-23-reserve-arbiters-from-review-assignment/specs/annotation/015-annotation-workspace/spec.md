## MODIFIED Requirements

### Requirement: FR-060 仲裁資格與清單入口

`annotation-list` reviewer 視圖中，狀態為 `爭議中`（FR-051）的審核單位列，對具仲裁資格的審核員 MUST 將列動作按鈕由 `編輯` 換為 `仲裁`（testid `list-arbitrate-entry`）。仲裁資格 MUST 同時符合：

1. 目前審核員的 `user_id` 存在於該任務 `arbiter_ids`；該欄位是 `can_arbitrate = true` 的唯一任務層來源，系統 MUST NOT 只以全域示範名冊或其他任務的旗標授權；
2. 目前審核員於該審核單位沒有自己的已提交審核（FR-049 reviewer bucket 查無提交）。

不符資格者維持 `編輯`；非 `爭議中` 列不得出現 `仲裁`。`仲裁` 與 `編輯` 導向同一工作區網址並攜帶完整審核單位身分，MUST NOT 新增任何網址參數。非當事人限制只適用仲裁，不得用來排除審核員對自己標記資料的審核指派。

#### Scenario: 任務仲裁名冊覆蓋全域示範旗標

- **GIVEN** 任務 profile 的 `arbiter_ids` 只含 reviewer L，而全域示範名冊另將 reviewer C 標為可仲裁
- **WHEN** L 與 C 分別檢視一個兩人皆未參與的爭議單位
- **THEN** L 具仲裁資格且 C 不具仲裁資格

#### Scenario: AC-4.53 仲裁資格兩條件

- **GIVEN** 審核員 X 已被勾選進仲裁者名冊且未對某 `爭議中` 單位提交過審核
- **WHEN** X 檢視該列
- **THEN** 該列動作按鈕為 `仲裁`
- **AND** 對該單位已提交審核的審核員 Y（同樣具名冊勾選）看到的是 `編輯`

### Requirement: FR-093 審核指派粒度

審核工作 MUST 由系統自動指派；`dry_run` 以樣本為粒度，`official_run` 以審核單位為粒度。新審核工作的有效分派名冊 MUST 為該任務 `reviewer_ids - arbiter_ids`，且集合差 MUST 保留 `reviewer_ids` 原順序。所有指定於 `arbiter_ids` 的人都 MUST 自新分派池排除，不得只保留第一位或依人員身分硬編例外。有效名冊中的新單位仍依既有位置性規則平均分配。

issue #824 的黏住規則 MUST 優先於本次保留規則：已有已提交審核的單位仍黏住原提交者，即使該人目前位於 `arbiter_ids`；該人依 FR-060 仍不得仲裁自己參與的單位。`arbiter_ids` 為空時，有效分派名冊 MUST 等於完整 `reviewer_ids`。所有 reviewer 同時也是 arbiter 的零分派池形狀由 companion change `validate-reviewer-arbiter-role-separation` 在 014 儲存時阻擋，annotation 不得私自把仲裁者加回分派池。

指派 MUST NOT 提供手動模式；每個審核單位恰有一位指派審核員。`dry_run` 採 per-sample 粒度，同一樣本的所有審核單位由同一人承接；`official_run` 採 per-unit 粒度。平均分配的差距規則只計尚無已提交審核的待分配池，已黏住單位不參與差距判定。示範種子同樣不得替一個 `official_run` 單位登錄多位 reviewer。黏住 MUST 由既有提交推導，不得另存第二份指派表，且不得依 task、sample 或帳號硬編分流。離冊審核員仍可唯讀檢視自己已提交的單位與歷程，但不得再送出審核；其仲裁資格仍依 FR-060 判定。

#### Scenario: 唯一仲裁者不再收到新審核單位

- **GIVEN** 任務 `reviewer_ids = [W, L, C, N]` 且 `arbiter_ids = [C]`
- **WHEN** 系統對尚無提交的審核單位建立自動指派
- **THEN** 新單位只在 W、L、N 間平均分配，C 的新分派數為 0
- **AND** 爭議由 W、L 或 N 的提交產生時，C 仍符合 FR-060 的非當事人條件並可仲裁

#### Scenario: 多位指定仲裁者全部保留

- **GIVEN** `reviewer_ids = [W, L, C, N]` 且 `arbiter_ids = [C, N]`
- **WHEN** 系統建立新指派
- **THEN** 有效分派名冊恰為 `[W, L]`，不得把 N 當作備用審核員加入

#### Scenario: 歷史黏住優先於新角色保留

- **GIVEN** C 過去已對單位 U 提交審核，之後 C 被加入 `arbiter_ids`
- **WHEN** 系統重新推導指派
- **THEN** U 仍指派給 C，不得改寫歷史責任鏈
- **AND** C 對 U 不具仲裁資格，但對自己未參與的其他爭議單位仍可仲裁

#### Scenario: 未指定仲裁者時不縮小審核池

- **GIVEN** `arbiter_ids` 為明確空陣列
- **WHEN** 系統建立新指派
- **THEN** 有效分派名冊等於完整 `reviewer_ids`
- **AND** 系統不得以全域示範名冊偷偷排除任何人

#### Scenario: 試標以樣本為單位指派

- **GIVEN** 一份試標樣本由三位標記員各標一次，任務勾選了兩位審核員
- **WHEN** 系統建立審核指派
- **THEN** 該樣本產生的三個審核單位全部指派給同一位審核員

#### Scenario: 正式標記平均分派且不排除標記員本人

- **GIVEN** `official_run` 有 7 筆樣本、勾選 2 位審核員，其中一位同時是部分樣本的標記員
- **WHEN** 系統建立審核指派
- **THEN** 兩位審核員的分派筆數差距不超過 1
- **AND** 該審核員仍可能被指派到自己標記的樣本，系統不因此排除或重新分派

#### Scenario: 示範種子不得讓多位審核員並行審同一個正式標記單位

- **GIVEN** 任一 `run_type = official_run` 的示範審核單位種子列
- **WHEN** 讀取該列所登錄的審核員集合
- **THEN** 該集合 MUST 恰含一位審核員；含兩位以上者 MUST 視為與本條文直接衝突的失效種子並汰換
- **AND** 該單位若需示範定稿前的第二個判斷，MUST 循 FR-060 的仲裁路徑表達（一位審核員 + 一位非當事人仲裁者），MUST NOT 以並列多位審核員表達

#### Scenario: 已審單位不因名冊異動而改派

- **GIVEN** `official_run` 任務勾選了數位審核員，其中審核員 X 已對某審核單位提交審核
- **WHEN** 專案負責人變更 `reviewer_ids` 勾選（新增或移除一位審核員）後重新列舉指派
- **THEN** 該單位的指派審核員仍為 X
- **AND** 該單位若因仲裁而被推翻判定或已定稿，指派審核員亦仍為 X

#### Scenario: 離冊審核員對其審過的單位唯讀可見

- **GIVEN** 審核員 X 已對某審核單位提交審核，其後被移出該任務的 `reviewer_ids` 名冊
- **WHEN** X 開啟 `annotation-list` reviewer 清單與該單位的工作區
- **THEN** 清單仍列出該單位，工作區導覽仍含該單位，歷程仍可開啟
- **AND** 工作區不渲染任何可送出的審核控件，X 無法再對該單位提交審核決策

#### Scenario: 平均分配只約束尚未被審核的單位

- **GIVEN** `official_run` 共 6 個審核單位，其中 4 個已由同一位審核員提交審核，名冊勾選 3 位審核員
- **WHEN** 系統建立審核指派
- **THEN** 那 4 個單位全部仍指派給該提交者
- **AND** 其餘 2 個單位在 3 位審核員之間分配，該 2 筆的分派差距不超過 1，且 4 個已黏住的單位不計入差距判定

#### Scenario: 試標樣本內任一單位已被審核即整個樣本黏住

- **GIVEN** `dry_run` 某樣本由三位標記員各標一次，審核員 X 已對其中一個單位提交審核
- **WHEN** 系統重新建立審核指派（名冊已異動）
- **THEN** 該樣本的三個審核單位全部指派給 X

### Requirement: FR-073 審核員快速入口必須導向下一個可處理審核單位

`findNextActionableReviewUnit(task_id, run_type, reviewer_id)` MUST 沿用 FR-093 的有效分派名冊。位於任務 `arbiter_ids` 的保留仲裁者對新 `pending` 單位一律不是被指派人，因此該單位不得成為其第 1 順位候選；保留仲裁者只可依 FR-060 把自己未參與的 `disputed` 單位視為可處理。非仲裁審核員的 `pending` 候選與既有第 1 順位不變；issue #824 已黏住給現任仲裁者的歷史提交亦不得因此改派。

#### Scenario: 保留仲裁者不會被快速入口送進待審單位

- **GIVEN** reviewer C 位於任務 `arbiter_ids`，任務同時有一個指派給 reviewer W 的 `pending` 單位與一個 C 可仲裁的 `disputed` 單位
- **WHEN** 系統為 C 推導下一個可處理單位
- **THEN** 回傳該 `disputed` 單位
- **AND** 不得回傳指派給 W 的 `pending` 單位

#### Scenario: 快速入口以可處理單位為目標

- **GIVEN** 任務同時包含可處理與不可處理的審核單位
- **WHEN** 審核員由快速入口進入工作區
- **THEN** 目標必須由 `findNextActionableReviewUnit()` 依登入身分與既有優先序推導

### Requirement: FR-099 審核單位送出後的自動前進

未使單位定稿的成功送出仍 MUST 共用 `findNextActionableReviewUnit()`。審核員送出後既有 `pending` 優先序不變；仲裁者送出後因 FR-093 角色保留而不擁有任何新 `pending` 單位，故系統 MUST 在其具資格的 `disputed` 候選中選擇下一個目標。若 `兩者皆非` 使目前單位維持 `disputed` 且沒有列舉順序更前的其他可仲裁爭議，目前單位 MAY 再次成為目標，以保留 FR-065 改票能力。系統不得以全任務存在其他 reviewer 的 `pending` 單位為由，把仲裁者導入未指派的審核工作。

1. **單一目標來源**：審核決策與仲裁送出 MUST 共用 `findNextActionableReviewUnit(task_id, run_type, reviewer_id)`，其列舉、優先序與資格判定沿用 FR-073，MUST NOT 改用標記端 `findNextPendingUnit()` 或另立第二套判定。
2. **頁內切換與網址同步**：取得下一個單位後 MUST 在同一工作區切換，並同步 `sample_id` 與 `annotator_id`；不得以導向新工作區網址代替。網址同步由 FR-057 單一 writer 承擔。
3. **全域最高優先序**：目標為所有可處理單位中優先序最高且列舉最前者，不採自目前位置向後繞行。
4. **不得以排除目前單位的特例取代資格判定**：審核送出後，提交者因已成為該單位當事人而自然不具仲裁資格；仲裁送出 `reject` 後未寫入 reviewer bucket，若單位仍爭議且無更前候選，目前單位仍可再次成為目標。指定仲裁者不擁有其他 reviewer 的 `pending` 指派，該類單位不得成為其目標。
5. **無可處理項目**：推導為空時 MUST 經既有 `buildListReturnUrl()` 返回 `annotation-list`，保留 FR-081 檢視狀態與 FR-049 身分參數，附 `notice=no_actionable_review`，且不得攜帶 `sample_id` 或回退至唯讀單位。
6. **驗證失敗不導覽**：被 FR-083、FR-089、空單位或已定稿守衛阻擋而未寫入的送出不得切換或導頁。
7. **定稿送出留在原單位**：送出使單位定稿時 MUST 就地重渲染 FR-094 唯讀定稿卡，不得前進或導頁。
8. **Generalization-First**：目標推導不得對任何 task id、sample id 或帳號硬編例外。

#### Scenario: 仲裁送出後忽略屬於審核員的待審單位

- **GIVEN** reviewer C 是保留仲裁者，正在處理爭議單位 D，且任務另有指派給 reviewer W 的 `pending` 單位 P
- **WHEN** C 對 D 送出 `兩者皆非`，D 仍為 `disputed`
- **THEN** 下一個可處理單位不得是 P
- **AND** 若沒有其他更前的可仲裁爭議，工作區停留於 D

#### Scenario: AC-3.55 未定稿的審核送出成功後自動前進至下一個可處理審核單位

- **GIVEN** `role = reviewer` 進入某任務一個 `待審` 審核單位，且該任務尚有其他 `待審` 單位
- **WHEN** 成功送出一次未使單位定稿的審核決策
- **THEN** 工作區 MUST 於同一頁面切換至 `findNextActionableReviewUnit()` 選出的單位，網址之 `sample_id` 與 `annotator_id` MUST 同步為該單位，且不得發生跳離工作區的導頁
- **AND** 剛送出的單位不得成為切換目標；無可處理單位時返回清單並保留檢視狀態與 `notice=no_actionable_review`
- **AND** 定稿或驗證失敗的送出不得前進

#### Scenario: AC-3.56 仲裁送出共用同一套前進規則

- **GIVEN** `role = reviewer` 且依 FR-060 具仲裁資格，進入某 `爭議中` 單位之仲裁版面
- **WHEN** 成功送出未使單位定稿的仲裁
- **THEN** 前進行為 MUST 與審核送出共用同一個目標推導函式與返回網址建構器
- **AND** 指定仲裁者不得前進至其他 reviewer 的 `pending` 單位；目前單位仍可處理且無更前候選時，畫面 MUST 停留於該仲裁版面
- **AND** 定稿或驗證失敗的仲裁不得產生前進導覽

#### Scenario: SC-004Y 送出後去向的完整性與一致性

- **GIVEN** 一位審核員在同一任務內連續送出，直到該任務已無其可處理單位
- **WHEN** 逐次觀察每次送出後的落點
- **THEN** 被前進到的不可處理單位數 MUST 為 0，定稿送出發生前進或導頁的次數 MUST 為 0
- **AND** 審核與仲裁兩條路徑的目標推導與返回網址建構器 MUST 完全相同，工作區內「哪些單位可處理」的判定實作恰為 1 份
- **AND** 最後返回清單的網址同時含 FR-081 檢視狀態與 `notice=no_actionable_review`，且不含 `sample_id`
