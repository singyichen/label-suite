## Purpose

正典：`specs/annotation/015-annotation-workspace/spec.md`（v4.55.0 → 4.58.0）。本變更（issue #552）修訂 FR-016A、FR-014I、FR-070 第 6 點、FR-083、AC-3.40、AC-3.47，新增 FR-084、AC-2.14、AC-3.48。

## MODIFIED Requirements

### Requirement: FR-016A 審計理由擴及所有退回

Reviewer 在 `dry_run` 與 `official_run` 執行修正／刪除**或判定退回（`decision = reject`）**時，系統 MUST 強制填寫審計理由並記錄。審核卡上該 outKey 按下「退回」後，MUST 於同一列作答面板下方展開必填理由欄 `ws-review-reject-reason`（帶 `data-outkey`）；「通過」或取消決策時 MUST 隱藏。理由 MUST 沿用既有審核提交持久化路徑（reviewer submission payload 之 `reasons` map），並隨 FR-014S 決策草稿持久化。`ReviewDecision.reason` 於 `decision = reject` 時 MUST 為必填。兩種 `run_type` 皆強制（FR-053 審核卡不得分流）。

#### Scenario: AC-3.48 退回展開必填理由欄並持久化
- **GIVEN** `role=reviewer` 進入可互動審核單位（任一 `run_type`）
- **WHEN** 對某 outKey 點擊「退回」
- **THEN** 該列出現 `ws-review-reject-reason[data-outkey=<outKey>]`；點「通過」或再次點「退回」取消後該欄隱藏；填入理由並 reload 後理由與決策一併還原；填入理由並送出後，reviewer submission `answers.reasons[<outKey>]` 等於所填理由

### Requirement: FR-014I 退回回退狀態並攜帶理由

`official_run` 下「目前標記員」列任一 outKey 於送出審核時被判定為 `退回`，系統 MUST 將樣本狀態回退為 `待標記` 並新增 `{action:'rejected', role:'reviewer'}` 歷程事件（既有機制不變）；該事件摘要 MUST 含逐 outKey 退回理由。退回理由的標記員側呈現依 FR-084。

#### Scenario: 退回歷程事件含理由
- **GIVEN** `run_type=official_run` reviewer 對 `single_label` 退回並填理由「情緒判讀有誤」後送出
- **WHEN** 讀取該樣本歷程
- **THEN** 最新事件 `action` 為 `rejected` 且 `summary` 含「情緒判讀有誤」

### Requirement: FR-070 第 6 點 `official_run` 文案說明理由可見性

`ws-review-note` 泡泡之 `official_run` 分支 MUST 於「全部通過則標記員狀態不變」之後陳述「退回理由會顯示給標記員」；`dry_run` 分支 MUST NOT 出現此句。zh／en 同步（FR-070 第 4 點）。AC-3.40 同步修訂。

#### Scenario: AC-3.40 official_run 文案含理由可見性
- **GIVEN** `role=reviewer`、`run_type=official_run`
- **WHEN** 檢視 `ws-review-note-bubble`
- **THEN** 文字含「退回理由會顯示給標記員」；切換 `run_type=dry_run` 後不含

### Requirement: FR-083 送出阻擋同時指名缺理由之退回

送出驗證 MUST 為「每個 outKey 一筆決策，且退回者皆有非空理由」。阻擋 toast MUST 指名全部阻擋之 outKey（多筆以「、」串接）：存在尚未決策者時沿用 `toastSelectDecision`；全部阻擋皆為缺理由時使用 `toastRejectReasonRequired`。兩類 outKey 之推導 MUST 與送出驗證共用同一份逐 outKey 判定，不得另建第二份計算。存在缺理由之退回時「送出審核」按鈕 MUST 帶 `aria-disabled="true"`。

#### Scenario: AC-3.47 缺理由阻擋送出並指名 outKey
- **GIVEN** `role=reviewer` 對 `single_label` 點「退回」但未填理由
- **WHEN** 點擊「送出審核」
- **THEN** 送出中止，toast 顯示「請填寫以下輸出類型的退回理由：single_label」，且 `ws-review-submit-btn` 之 `aria-disabled` 為 `true`；填入理由後再送出成功，`aria-disabled` 為 `false`

## ADDED Requirements

### Requirement: FR-084 標記員重標理由橫幅

`run_type=official_run` 之 annotator 開啟帶有重標待辦的樣本（樣本狀態為 `pending` 且最新歷程事件為 `rejected`）時，工作區 MUST 於 `#annotationPreview` 頂部渲染 `ws-rework-reasons` 橫幅，逐被退回 outKey 一列 `ws-rework-reason-row`（帶 `data-outkey`）列出理由、審核員帳號與時間（`formatHistoryTime()` 格式），並於被退回 outKey 之作答面板 `ws-output-panel-{outKey}` 加 `data-rework-rejected="true"`。理由來源 MUST 為 reviewer submission 之 `decisions`／`reasons`（`getReworkReasons()`），不得另存第二份。`dry_run` MUST NOT 渲染本橫幅；無重標待辦之樣本亦不渲染。歷程面板（FR-016B）不變。

#### Scenario: AC-2.14 official_run 重標待辦顯示退回理由
- **GIVEN** `official_run` reviewer 對 `single_label` 退回並填理由「情緒判讀有誤」後送出
- **WHEN** 該標記員開啟同一樣本
- **THEN** `ws-rework-reasons` 恰一個，含 `ws-rework-reason-row[data-outkey=single_label]` 且文字含「情緒判讀有誤」與審核員帳號；`ws-output-panel-single_label` 帶 `data-rework-rejected="true"`

#### Scenario: dry_run 不渲染橫幅
- **GIVEN** `dry_run` reviewer 退回並填理由後送出
- **WHEN** 該標記員開啟同一樣本
- **THEN** `ws-rework-reasons` 計數為 0
