---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1403
基準版本: 014 v12.3.0
目標版本: 014 v13.0.0
---

## Why

issue #1403：概覽「任務狀態與執行控制」目前由三塊拼成——達標條件 pill、直向動作欄、阻擋原因清單。三塊各講一部分，多數狀態下互相矛盾：草稿時還沒有任何回合卻顯示 IAA「尚無法計算」；正式標記中仍顯示試標用的 pill，與數字卡、回合表的 IAA 結果不一致；阻擋項用紅色 ✗，看起來像錯誤。維護者已裁定（2026-10-14）：改為單一張「下一步」卡片，條件清單跟著該狀態的按鈕走，停用按鈕一律灰底。

FR-027(1)「達標條件沿用原 pill 呈現」與 FR-027(4)「達標條件 pill 與主要 CTA 位於同一橫列」被移除，屬移除既有規定，SemVer 為 **MAJOR**（014 v12.3.0 → v13.0.0）。維護者已在派工時預先核准 MAJOR，不再停下。本單只修訂既有 FR／AC，不新增也不刪除 FR／AC 編號，但移除條文本身使 Lightweight Path 不適用，走完整 OpenSpec change。

**FR-022 查證（issue 指定 propose 前查證）**：FR-022 只規定 `開始正式標記` 的發布阻擋，以及第 (3) 點 `draft` 階段的提前揭露；它**不**要求 `dry_run_in_progress` 下「新增下一個試標回合」檢查正式標記池。下一回合的池限制由 FR-010d（每次 Dry 發布前驗證累計上限，超過即拒絕並提示剩餘可用筆數）與 FR-010e（每次試標發布須保留至少 1 筆正式標記池）負責，皆在發布當下驗證。因此依正典，`dry_run_in_progress` 期間正式標記池不可能為 0；且該狀態下「新增試標回合」本來就因本回合未結束而停用（FR-013(1)）。**結論：`dry_run_in_progress` 的條件清單不加資料池列。** 示範資料 T014 在 `dry_run_in_progress` 時正式池為 0，與 FR-010e 不一致，屬示範資料問題，不在本單範圍，延後至 #1429。

**與 issue 文字的兩處落差（已依正典處理）**：

1. `official_run_in_progress` 的「標記完成需要」清單，issue 列了四項；FR-008b 另有第 (5) 項「品質指標就緒」（issue #1141）。卡片條件清單沿用 FR-008b 全部五項——少列第 (5) 項會讓按鈕停用而清單全打勾。
2. `dry_run_in_progress` 的清單沿用 FR-008a 的同一個判定來源（標註提交、必要審核、必要仲裁、最終例外池），不另寫第二份條件。

**是否需要存在（YAGNI 檢查）**：需要。三塊拼裝的資訊互相矛盾是已觀察到的缺陷，不是推測需求；移除 pill 並把條件併入同一張卡片是能同時解掉三個矛盾的最小作法。不新增按鈕、不新增狀態、不改任何啟用條件的判定來源。

**Generalization-First（NON-NEGOTIABLE）**：條件清單的每一列都由既有推導函式產生（FR-008a／FR-008b 的同一個 reducer、FR-010t 成員人數、FR-010f-3 剩餘池、FR-010o-4 計算狀態），不依任務類型或 profile 硬編列數或文字。

**Data Fairness（NON-NEGOTIABLE）**：卡片只顯示人數、筆數、計算狀態與 IAA 數值，不顯示任何標記答案；IAA 計算中不得顯示數值或判定（FR-010o-4(2)）。

**Frontend Ready Gate 九項紀錄**

1. 通過：014 正典有 `## 功能目標`、FR／AC／SC 與依賴。
2. 通過：014 Prototype Traceability 已連到 `task-detail.html` 與 `task-detail.panels/overview.html`，以及 `task-detail-overview-layout.spec.ts` 等測試。
3. `N/A`：不新增 route，沿用 `task-detail` 既有 route 與角色白名單（`project_leader` 可操作、`reviewer` 唯讀）。
4. 通過：五種任務狀態、`reviewer` 唯讀、IAA 計算中／失敗、正式池為 0、成員不足皆有定義（見下方 What Changes 與 delta 的 FR-027(4)(6)）。
5. 通過：沿用 `#publishActionRow`、`#publishDryRunBtn`、`#publishOfficialRunBtn`、`#publishCompleteBtn`、`#retryIaaComputationBtn`、`#publishPoolReason`、`#publishIaaReason`、`#publishUndeterminedNote` 等既有 selector；新增 `#nextStepCard` 與條件列 `data-cond`，契約寫在 `tasks.md` 群組 1。
6. `N/A`：不改 API 契約與資料形狀；條件值皆由既有前端推導函式得出。
7. 通過：卡頭狀態句、條件文字與提醒文字皆走 zh／en i18n；圖示附文字，不只靠顏色（FR-022(5)）。
8. 通過：只動 `task-detail` 頁內元件，無新增 shared 元件；Storybook 不適用（prototype 階段）。
9. 通過：按鈕成功後去向不變（沿用既有發布流程）；`design/system/user-path-map.html` 無 F3／F4 命中新增。

## What Changes

- **MODIFIED FR-027**（概覽分頁）：
  - (1) 移除「達標條件沿用原 pill 呈現」。
  - (4) 由「達標條件與主要 CTA 同列」改寫為「下一步卡片」：卡頭左側為「下一步：…」狀態句與一行說明，右側為動作按鈕（最多兩顆，只有 `waiting_iaa_confirmation` 有兩顆，唯一主要 CTA 為「開始正式標記」）；卡身為「這個動作需要」條件清單，每列為「圖示＋條件＋目前值」，圖示只用 ✓（`--color-success`）、○ 未完成（`--color-ink-muted`）、ⓘ 提醒（`--color-warning`），不得使用紅色 ✗。各狀態的條件清單依本 delta 逐一列出；任一「需要」列未滿足時對應按鈕停用，`aria-describedby` 指向未滿足的列。
  - (6) 保留 v12.2.4 的 `reviewer` 與 `completed` 規則，並明定 `reviewer` 卡片不顯示條件清單；停用按鈕改為中性灰底、`--color-text-soft` 文字、不降低透明度、主按鈕停用時不保留綠色，範圍只限這張卡片的動作區，不得改全站 `.btn:disabled`。
  - 情境「主要 CTA 與達標條件同列」改寫為下一步卡片情境；新增各狀態的情境。
- **AC-3.69 修訂**：改為驗收 `waiting_iaa_confirmation` 的卡片結構（卡頭按鈕兩顆且只有「開始正式標記」為 `--color-cta`、畫面不存在達標條件 pill）。編號不變。
- **MODIFIED FR-013**：首句「按鈕必須與『達標條件』位於同一操作列」改為「按鈕位於下一步卡片卡頭右側（FR-027(4)）」；`dry_run_in_progress` 的原因句改為卡頭說明，未完成項逐列列於條件清單；第 (8) 點（v12.2.4 直向動作欄）改寫為條件清單呈現方式。不改任何發布阻擋條件與狀態轉移；`draft` 成員人數不足（FR-010t 既有阻擋）改以停用按鈕加條件列呈現，發布 handler 內的檢查不變。
- **MODIFIED FR-010o-4**：第 (2) 點「達標條件 pills 的 IAA 項」改為「下一步卡片的條件清單與提醒列」；第 (5)(6) 點「按鈕旁以可見文字說明原因」明定為同一張卡片的條件列。
- **正典非 delta 同步（archive 寫回時一併改寫，不改條件）**：spec:191–192 介面定義的 pill 與「同一橫列」描述、FR-010o-3 的「達標條件 pills 中的 IAA 項」、Prototype Traceability 中 `overview.html` 列的「goal-condition pills」。這些條文不在衍生檢視中，只改措辭使其與 FR-027 一致。
- **不處理**：FR-010t、FR-022、FR-008a、FR-008b 的條件與文字不變；`waiting_iaa_confirmation` 的成員人數檢查仍於點擊時執行（沿用既有 toast），不加列於卡片；T002 回合表 R1 顯示「進行中」的疑似 FR-027(5) 問題不在本單（issue 已註明為相鄰問題）。

## 草圖元素對照表

草圖：https://claude.ai/artifact/KSPSu2Mh6siHJkeHjNqXTW（Main／OtherStates／Conflicts 三張畫板）

| 元素 | 草圖位置 | 處置 |
|---|---|---|
| 卡頭狀態句＋說明 | Main 狀態 A／B／C | 做：FR-027(4)、AC-3.69 |
| 卡頭右側按鈕（最多兩顆、單一 CTA） | Main 狀態 C | 做：FR-027(4)、AC-3.69 |
| 條件清單「圖示＋條件＋目前值」 | Main、OtherStates 各節 | 做：FR-027(4) |
| 「兩個動作都需要／『開始正式標記』另外需要」分組 | Main 狀態 B、OtherStates T018 | 做：FR-027(4)、FR-010o-4、FR-022 |
| IAA 琥珀提醒列（不阻擋） | Main 狀態 C | 做：FR-027(4)、FR-010o-3、AC-3.15 |
| 計算中不顯示 IAA 值 | Main 狀態 B | 做：FR-010o-4(2)、AC-3.17 |
| 計算失敗＋列內「重試計算」 | OtherStates T018 | 做：FR-010o-4(3)、AC-3.18、AC-3.20 |
| 草稿條件清單（池／標記者／審核員） | OtherStates T001、T013 | 做：FR-027(4)、FR-022(3)、FR-010t、AC-3.10 |
| 正式標記「標記完成需要」清單 | OtherStates T016 | 做：FR-027(4)、FR-008b、AC-3.9（另含 FR-008b 第 (5) 項，見 Why） |
| 停用按鈕：草圖畫的是降低不透明度的淡綠 | Main、OtherStates | 不做：改中性灰底，FR-027(6) |
| reviewer 版卡片顯示條件清單 | OtherStates reviewer 節 | 不做：沿用 FR-027(6) v12.2.4，不顯示清單、AC-3.72 |
| completed 卡片 | OtherStates 共通問題節 | 做：FR-027(6)「任務已完成，無待執行動作」 |
| 方括號佔位值（`[n]`、`[α 值]`） | 各畫板 | 不做：以實際資料推導，FR-027(4) |

## Capabilities

- 修改：`task-management/014-task-detail`（MODIFIED FR-027、FR-013、FR-010o-4；修訂 AC-3.69；無新增或刪除 FR／AC 編號）。

## Impact

- 產品檔案（預估 2 個）：`design/prototype/pages/task-management/task-detail.html`（CSS、`renderPublishActions()`、移除 pill 渲染、i18n）、`design/prototype/pages/task-management/task-detail.panels/overview.html`（以 `#nextStepCard` 取代 `#execStopRow` 與 pills）。
- 文件：`design/system/pages/task-detail.md` 的 stop-pill 描述同步；`design/system/screen-inventory.md` 重新產生。
- 測試：重寫或改目標 `task-detail-overview-stop-pill-non-color-cue.spec.ts`、`task-detail-overview-annotator-pill-active-derivation.spec.ts`、`issue-1348-exec-action-column.spec.ts`、`task-detail-disabled-button-token.spec.ts`、`task-detail-overview-layout.spec.ts` 等引用 pill 或動作欄結構的規格。
- 正典 014 於 archive 時寫回 v12.3.0 → v13.0.0（MAJOR：移除 FR-027(1)(4) pill 規定）。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：條件列由既有推導函式產生，無任務類型硬編。
- **Data Fairness（NON-NEGOTIABLE）**：不顯示標記答案；計算中不顯示 IAA 值與判定。
- **Simplicity First / YAGNI**：不新增狀態、按鈕或判定來源；只重組呈現。
- **PR 規模（Principle X）**：產品檔案 2 個（≤ 5）；若 Green 後產品 diff 超過 300 行，拆成堆疊 PR 並於 PR 說明揭露。
- **可及性**：圖示附可見文字；停用按鈕的原因以可見文字呈現並以 `aria-describedby` 連結（FR-022(5)）。
