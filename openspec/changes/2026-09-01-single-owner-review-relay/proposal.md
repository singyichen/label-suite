---
對應 Spec: specs/annotation/015-annotation-workspace/spec.md
對應 Issue: #596
基準版本: 015 v4.63.0
目標版本: 015 v5.0.0
---

> **2026-09-01 範圍收斂(維護者決議)**:Project SDD lint 限制一個 active change 恰對應一個 canonical spec,本變更原並載的 `task-management/014-task-detail` 側工作(delta 與任務)整批移至 [deferred/](deferred/README.md) 暫存,待 015 主體完成後以獨立 companion change 提案。下文對 014 行為的描述維持原敘述以保留完整決策脈絡,但其正典修改與實作任務**不在本 change 範圍內**。

## Why

2026-08-31 與指導教授的審核流程原型展示會議定案了一項大方向調整：**「每一份樣本、每一個階段，只交給一個人處理」**。現行規格建立在「多審核員並行 + 定稿門檻 + 逐項嚴格多數決」之上——014 以 `min_reviewers` 數字欄與 `REVIEW_ASSIGNMENT_MODES` 二選一設定審核指派，015 以 `REVIEW_UNIT_STATUS` 五態、`DISPUTE_CONVERGENCE_RULE` 逐項嚴格多數決、逐位審核員票數脈絡（FR-074）與投票明細（FR-069）表達收斂——這整套機制在單人接力模型下沒有第二位審核員可資比對，全部失去運作對象。

同時，舊模型有兩個出口在新模型中被判定為錯誤設計：審核員層級的「退回 + 退回理由」使標記員被迫重標（教授明確要求兩種 `run_type` 皆不重標），而「仲裁解不了就永遠卡在 `disputed`」使任務無法收斂。本變更以「審核員單一三向決策 → 仲裁二選一 → 最終例外池由專案負責人收尾」取代之，並補上舊模型完全沒有的最終例外池與試標歷史回饋兩項能力。

三張流程圖已依定案模型重繪並通過三方一致性稽核（branch `docs/review-flow-diagrams-596`，`5cbea993`），為本變更的權威呈現基準；本變更不再重畫，只讓 spec 與原型對齊該基準。

## What Changes

- **審核設定改名冊勾選（**BREAKING**）**：014 移除「每筆資料審核員數」（`min_reviewers`）數字欄與「自動輪派／手動指派」二選一（`REVIEW_ASSIGNMENT_MODES`），改為審核員名冊勾選——勾選即為指派對象，系統一律自動把資料平均分給被勾選的審核員。仲裁者沿用同一套勾選邏輯（`arbiter_ids`）。`agreement_auto_finalize` 與 `arbitration_enabled` 兩個開關一併退場（會後確認）。
- **審核單位狀態機由五態收斂為三態（**BREAKING**）**：`REVIEW_UNIT_STATUS` 由 `pending | approved | modified | disputed | finalized` 改為 `pending | disputed | finalized`。`approved`／`modified` 兩個「已作答但未達門檻」的過渡態在單審核員模型下結構上不可達，隨門檻概念一併消失。
- **審核員決策改三向、退回機制退場（**BREAKING**）**：審核員只有 `approve`（通過 → 直接定稿）、`modify`（直接改答案 → 進爭議池，修改不直接生效）、`bypass`（標成無法判定 → 進爭議池）三個出口。審核員層級的「退回 + 退回理由」與其 `official_run` 重標迴路（FR-014I 的 `markSampleRejected()` 路徑）整組移除；兩種 `run_type` 皆不退回重標。
- **逐項嚴格多數決與票數脈絡整組退場（**BREAKING**）**：`DISPUTE_CONVERGENCE_RULE`、`MIN_REVIEWERS_DEFAULT`、FR-069 逐位審核員投票明細、FR-074 仲裁前票數脈絡與未收斂原因分類全部移除——單一審核員沒有票數可計。
- **仲裁版面三出口**：仲裁者逐項在 A（標記員原答案）／B（審核員的答案）之間二選一，不得寫第三種答案、不得重標；B 依來源動態渲染（來源 = 修正 → 顯示審核員改成的值；來源 = Bypass → 顯示「審核員 Bypass（無法判定）」，採 B 即定案為無法判定）。新增第三出口「兩者皆非（Reject）」——理由必填，該項落入最終例外池。
- **最終例外池（新能力）**：入口為 014 `annotation-progress` 分頁的待辦卡；專屬處理畫面由專案負責人逐筆收尾——採 A／採 B 一鍵定案、自訂答案（僅 `official_run`，展開原始標記介面之 config-driven 作答元件、僅限合法答案空間、定案理由必填）、自資料集排除。**試標的例外池沒有自訂答案出口**（會後確認：試標不產生定案答案）。例外池清空為任務結案條件之一。
- **純文字定稿卡 + 微型衝突歷程**：已定稿審核單位以純文字唯讀結果卡呈現（不再渲染 disabled 控件），卡上附一行灰字微型衝突歷程（`歷程：標記 A ➔ 審核 B（修正）➔ 仲裁 B`，hover 展開完整帳號），取代 FR-069 的逐位投票明細列。
- **歷程加詳**：沿用工作區右欄「說明與檔案｜歷程」頁籤卡片式設計，逐卡加詳事件敘述（動作、值變化、耗時），呈現「標記 → 審核 → 仲裁」責任鏈；`HISTORY_ACTIONS` 移除 `rejected`、新增 `bypassed` 與例外池收尾動作。
- **試標歷史回饋（新能力）**：標記員視角新增列表——被修改筆數、我的答案 → 定案結果、定案來源、原因（附指南段落引用），承接「不退回重標」的學習閉環。
- **審核指派粒度明文化**：試標＝同筆資料由多位標記員各標一次，審核**以樣本為單位**指派（同筆的全部標記交同一位審核員）；正式標記＝每筆固定 1 標記員 + 1 審核員，系統平均分派。**不存在「審核員不能審自己標的」這條規則**（會後確認：先前流程圖誤植，已刪除）；只有仲裁者有非當事人限制。
- **任務完成前置條件更新**：`official_run_in_progress → completed` 的條件改為「全部正式標記提交 + 全部審核單位已定稿 + 最終例外池清空 + 品質指標可用」，移除 `min_reviewers` 語意。
- **示範任務改寫**：T016（三人多數決）與 T017（雙人平手）兩個示範情境在新模型下不成立，改寫為新模型的示範情境（審核員修正 → 仲裁採 B、仲裁 Reject → 例外池 → PL 收尾）。

## Capabilities

### New Capabilities

- `task-management/014-task-detail`（**已延後至 companion change**，見 deferred/）：**最終例外池入口**——`annotation-progress` 分頁的區塊入口、待處置清單與逐筆導頁；收尾畫面本身由 `015` FR-095 承接。此概念在本版以前完全不存在，仲裁無法解決的爭議在舊模型中永遠停留於 `disputed`。
- `annotation/015-annotation-workspace`：**試標歷史回饋列表**（FR-096）——標記員視角的「我被改了哪幾項、最後由誰定案、為什麼」列表。本版以前試標的品質回饋只有任務層級的 IAA 與被修改率，個別標記員沒有任何自我對齊入口。
- `annotation/015-annotation-workspace`：**審核員三向決策**（FR-092）——本版以前審核員只有通過／退回兩個出口，沒有「我判斷不了、交給下一關」的 Bypass 表達方式，也沒有「修正不立即生效、一律進爭議池」的語意。
- `annotation/015-annotation-workspace`：**審核指派粒度**（FR-093）——試標以樣本為單位、正式標記平均分派，本版以前散落於 `014` 的 `review_assignment_mode` 而未在工作區規格中定義。
- `annotation/015-annotation-workspace`：**純文字定稿結果卡與微型衝突歷程**（FR-094）——取代 FR-069 的逐位投票明細，改以責任鏈呈現。
- `annotation/015-annotation-workspace`：**最終例外池的逐筆收尾**（FR-095）——專案負責人的四動作處置畫面（試標僅三動作），本版以前不存在。
- `annotation/015-annotation-workspace`：**歷程事件的責任鏈加詳**（FR-097）——逐卡呈現動作、值變化、耗時與決策者。

### Modified Capabilities

- `task-management/014-task-detail`（**已延後至 companion change**，見 deferred/）：審核設定改名冊勾選、審核指派區塊改為系統自動平均分派下的唯讀呈現、發布前成員人數檢查改單審核員模型、`completed` 前置條件改為含例外池清空、規格常數與 `TaskDetail` 實體欄位改版——涉及之 014 需求條目編號詳見 `deferred/014-task-detail-delta.md`。
- `annotation/015-annotation-workspace`：審核決策控件三向化（FR-014B）、修正與 Bypass 的必填理由（FR-016A）、審核列控制項改版（FR-044）、審核單位狀態機三態化（FR-051）、審核卡三向決策與純文字定稿卡（FR-053）、決策快捷鍵改版（FR-054）、清單狀態篩選三態（FR-055）、仲裁資格措辭對齊名冊勾選（FR-060）、仲裁版面三出口與多數決退場（FR-061）、盲審隔離理由改寫（FR-062）、`official_run` gold 產出納入例外池路徑（FR-063）、脈絡橫幅移除定稿門檻與狀態軌三節點（FR-064）、審核說明 tooltip 文案對齊三向決策（FR-070）、送出阻擋文案改對應三向決策（FR-083）、歷程動作集合改版與加詳（FR-086）；移除 FR-014I（退回回退機制）、FR-069（逐位投票明細）、FR-074（仲裁前票數脈絡）與 FR-085（標記員重標理由橫幅）。

## Impact

**規格**

- 正典：`specs/annotation/015-annotation-workspace/spec.md`（v4.63.0 → v5.0.0，**MAJOR**：`REVIEW_UNIT_STATUS` 五態改三態、FR-069／FR-074 移除、退回機制移除）
- 正典（**延後至 companion change**）：`specs/task-management/014-task-detail/spec.md`（v2.11.1 → v3.0.0，**MAJOR**：`REVIEW_ASSIGNMENT_MODES`、`MIN_REVIEWERS_RULE` 等常數與四個設定欄位移除）——delta 暫存於 `deferred/014-task-detail-delta.md`
- 衍生檢視：`openspec/specs/annotation/015-annotation-workspace/spec.md`（archive 時自動合併）
- 上游（本次不修改，僅確認相容）：`specs/dataset/017-dataset-analysis-detail` 之 IAA 計算正典不受影響——試標仍以標記員原始答案計算 IAA，本變更只改審核路徑不改標記路徑。
- 下游（本次不修改，僅確認相容）：`specs/dashboard/*` 的「快速審核」入口沿用既有網址參數；`specs/account/008-*` 共用側欄快捷鍵總覽需隨 FR-054 調整，屬 008 的下游同步，本變更於 Impact 記錄不於 delta 修改。

**原型程式（Principle X 之產品檔案盤點）**

- `design/prototype/pages/task-management/task-detail.panels/overview.html`：審核設定區塊欄位改版
- `design/prototype/pages/task-management/task-detail.panels/member-management.html`：審核指派區塊與爭議池／例外池列
- `design/prototype/pages/task-management/task-detail.panels/annotation-progress.html`：最終例外池待辦卡與收尾畫面
- `design/prototype/pages/task-management/task-detail.html`：i18n 字典與設定表單接線
- `design/prototype/pages/task-management/task-detail.data.js`：`minReviewers` 等 seed 欄位改版、T016／T017 示範情境改寫
- `design/prototype/pages/annotation/annotation-workspace.html`：審核卡／仲裁版面／定稿卡／歷程卡片版型
- `design/prototype/pages/annotation/annotation-workspace.config.js`：三向決策、仲裁三出口、狀態軌、橫幅、tooltip 渲染
- `design/prototype/pages/annotation/annotation-workspace.data.js`：狀態機推導、爭議項推導、例外池資料、示範 seed
- `design/prototype/pages/annotation/annotation-list.html`：三態篩選與試標歷史回饋入口
- `design/prototype/pages/shared/annotation-history.js`：`HISTORY_ACTIONS` 集合與徽章對應

合計 10 個產品檔案，遠超 Principle X 之 5 檔上限，必須拆為多組 stacked PR（拆分計畫見 `tasks.md`）。

**既有機制交互**

- **FR-014I／`markSampleRejected()`**：`official_run` 的退回回退機制是本變更移除面最大的既有路徑，其呼叫點散落於審核送出與仲裁送出兩處（FR-061 第 3 點的「維持退回」語意亦隨之失效），移除時必須同時清掉 FR-085／FR-083／FR-016A 一系列退回理由相關條文的落地點。
- **FR-062 盲審隔離**：規則本身在新模型下仍必要（仲裁者與 PL 不得看到審核員未提交的草稿），但其原有理由「獨立審核，一式 N 份」已不成立，條文理由段需改寫而規則不變。
- **FR-052 差異比對**：本變更不改差異比對契約——爭議項仍由標記員答案與審核員答案的差異推導（`DISPUTE_ITEM_SOURCE` 不變），只是 `reviewer_values` 的來源收斂為單一審核員，且新增 Bypass 這個「非替代值」的差異來源。
- **issue #551 純退回語意**：`DISPUTE_CONVERGENCE_RULE` 的「純退回恆不收斂」與 FR-061 第 2 點的「審核員退回（無替代值）」B 選項，隨退回機制移除而失去標的；其在新模型中的對應物是 Bypass，語意不同（Bypass 是「無法判定」，可被仲裁者採納為定案值；純退回是「這不對」，不是可採納的值），不得直接沿用舊條文。
- **issue #578 歷程模型**：`HISTORY_ACTIONS` 才於 v4.61.0 常數化，本變更立即修改其取值集合（移除 `rejected`、新增 `bypassed` 與例外池動作），需沿用 FR-086「集合外舊值以中性徽章呈現」的相容規則處置既有 `rejected` 事件。

## Constitution Check

依 `specs/_governance/constitution.md` 逐項檢核與本變更相關的設計時原則：

- **Generalization-First（NON-NEGOTIABLE）**：最終例外池的「自訂答案」必須展開原始標記介面之 config-driven 作答元件（重用 `OUTPUT_TYPE_REGISTRY` 驅動的 annotator 控件），不得為例外池另建一套作答 UI，亦不得逐 task 硬編合法答案空間。仲裁版面 B 選項的動態渲染同樣由決策來源（`modify`／`bypass`）驅動，不得逐輸出類型硬編分支。狀態機三態、審核員三向決策與例外池四動作皆必須由單一常數集合驅動，篩選選單與徽章不得硬編狀態清單（沿用 014 `AR_REVIEW_STATUS` 與 015 `REVIEW_UNIT_STATUS` 的既有推導規則）。
- **Data Fairness（NON-NEGOTIABLE）**：試標歷史回饋列表對標記員揭露「我的答案 → 定案結果」，其揭露時機必須在該輪試標全部提交、任務轉入 `waiting_iaa_confirmation` 之後——若於試標作答期間即可見，標記員可據以回頭對齊，直接污染同輪 IAA。最終例外池的自訂答案僅限 `official_run`，本身即是「試標不產生定案答案」的防漏設計。FR-062 盲審隔離規則在新模型下不得放寬。
- **可追溯性**：仲裁 Reject 與例外池自訂答案／排除皆為理由必填；微型衝突歷程必須逐筆呈現「標記 → 審核 → 仲裁」責任鏈，使定案值可回溯至具名決策者。
- **Simplicity First / YAGNI**：本變更的淨效果是**大幅刪減**——移除門檻、兩個過渡態、多數決、票數脈絡、投票明細、退回迴路與兩個設定開關；新增能力僅三項（Bypass、例外池、試標回饋），皆為教授會議明確要求且有對應流程圖節點。不引入任何舊模型的相容層或雙軌開關。
- **PR 規模（Principle X）**：10 個產品檔案、跨兩份正典 spec，拆為七個實作 PR 群組加一個最終 archive 群組（見 `tasks.md`），每組獨立通過驗證後合併，OpenSpec change 保持開啟至最後一組執行 archive 回寫。
