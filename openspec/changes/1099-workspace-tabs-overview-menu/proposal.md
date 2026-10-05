---
對應 Spec: specs/shared/019-workspace-tabs/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/1099
基準版本: 1.1.0
目標版本: 1.2.0
---

## Why

工作頁籤（issue #1075，`specs/shared/019-workspace-tabs/spec.md` v1.1.0）已交付頁籤列本身，但缺乏管理能力：開了多個頁籤後無法一次總覽或篩選、誤關或被 `TAB_CAP`（FR-011）自動淘汰的頁籤救不回來、沒有一次清空的方法，且視覺上作用中頁籤整圈外框、寬度隨標題變動、沒有頁面種類圖示，與其他頁籤的差異不夠清楚。issue #1099 參考 NoteCraft 分頁機制（頁籤列右端「N ˅」選單含篩選／逐列關閉／重開剛關閉的／全部關閉；頁籤固定寬度、標題截斷、前置圖示、整條貼齊頂端），經維護者 2026-10-02 問答裁定 D1–D6（詳見 issue 本文）補齊這些管理能力與視覺一致性。

維護者並於同日補充視覺要求：現行作用中頁籤使用 `--color-surface`（Violet 50）整圈外框過於突兀，要求改採低彩度中性色表面銜接（參考 NoteCraft 圖二），且已實測確認 `#1098`（儀表板頁籤列掛載位置跑版）與本次配色問題各自獨立，不互相代管。

本次變更**不**包含 D6（儀表板頁籤列掛載位置，歸 #1098）。issue 本文「尚未經問答、建議值」四項中，固定寬度數值已由 G1 直接在 `design/system/MASTER.md` 新增語意 token 定案（視覺調整不算需求裁定，詳見 `design.md`）；其餘三項（重開快捷鍵、篩選比對範圍、選單鍵盤模型）原以 `待維護者確認` 標記，已於 2026-10-02 由主 session 轉達維護者裁定**全數採納**，詳見下方「維護者裁定補充」，並已併入本 delta 之 `FR-023`、`FR-024A`、`FR-024B`，以及本次一併新增之 `specs/shared/008-sidebar-navbar-shared/` MODIFIED delta。

## What Changes

- 新增 **FR-023 群**（總覽選單，D1／D2）：桌面頁籤列右端與行動版共用同一個總覽選單元件，觸發按鈕顯示目前頁籤數 N；內容為篩選輸入框 → 頁籤清單（圖示＋標題＋關閉鈕，作用中頁籤標示；2026-10-05 維護者裁定移除第二行次要說明）→ 底部「重開剛關閉的」與「全部關閉」；清單列點擊沿用既有 FR-017 `replaceState()` 切換路徑。篩選比對頁籤標題與頁面種類名稱（不比對網址參數）、不分大小寫；選單開啟時焦點移至篩選框，上下方向鍵在清單項目間移動反白／焦點，`Enter` 切換至反白頁籤並關閉選單，`Esc` 關閉選單並將焦點還給觸發按鈕（已採納裁定，詳見下方「維護者裁定補充」）。
- **MODIFIED FR-002／使用者故事 6**：行動版「已開啟 N 頁」下拉選單由上述共用總覽選單元件取代；既有 AC-6.1～AC-6.3（切換、逐列關閉、375px 無水平捲動）行為必須保留。
- 新增 **FR-024 群**（重開剛關閉的頁籤堆疊，D3／D5）：手動關閉、全部關閉、`FR-011` 自動淘汰皆推入堆疊（LIFO，上限 10，超過丟棄最舊）；重開依 `FR-006` 去重鍵判定，命中既有頁籤僅切換、不產生重複頁籤；重開仍受 `TAB_CAP` 與 `FR-011` 淘汰／阻擋規則約束；堆疊為空時按鈕停用。
- 新增 **FR-024A**（重開快捷鍵，已採納裁定）：`Alt+Shift+T`（`event.code` `KeyT`），焦點位於可輸入元素時不攔截；不攔截、不覆寫瀏覽器原生 `Ctrl/⌘+Shift+T`（不同按鍵組合）；觸發行為同 `FR-024` 之「重開剛關閉的」。新增 **FR-024B**：上述快捷鍵列入 `shared-008` 快捷鍵總覽（比照既有 `FR-013`／`FR-014` 分工模式，本規格僅宣告事實，顯示格式由 `shared-008` 定義）。
- **MODIFIED `shared-008` `FR-016H`**：快捷鍵總覽「頁籤」section 新增第三列「重開剛關閉的頁籤」（`Alt+Shift+T`），與既有兩列（`Alt+1…8`／`Alt+W`）同規則呈現（獨立成列、獨立 keycap、既有緊湊密度）。
- **MODIFIED FR-011**：自動淘汰的頁籤新增「推入重開堆疊」之附帶效果（不改變既有淘汰判定本身）。
- **MODIFIED FR-018**：登出清空範圍新增 `TAB_REOPEN_STORAGE_KEY`（原僅清空 `TAB_STORAGE_KEY`／`TAB_SCROLL_STORAGE_KEY`）。
- 新增 **FR-025**（全部關閉，D4）：關閉所有無未儲存變更的頁籤，跳過有未儲存變更者並提示跳過數量；不另立第二套確認機制（與既有 `FR-012` 一致）；作用中頁籤被關閉時之焦點規則比照 `shared-008` `FR-022`。
- 新增規格常數：`TAB_REOPEN_STORAGE_KEY`、`TAB_REOPEN_CAP = 10`。
- 新增對應上述四組 FR 之可觀測驗收標準，於 G3 正典回寫時手寫進「## 成功標準」（編號接續正典當下最大值，比照既有 SC-014 前例，不透過 delta 的 Requirement 宣告）。
- 視覺對齊（G1，**不新增 FR**，屬樣式調整，比照既有「原型僅能模擬」慣例不入 FR/AC）：頁籤固定寬度＋標題截斷＋`title` 完整標題、頁面種類圖示（Lucide，ADR-030，沿用側欄 L0 既有圖示對照）、作用中頁籤改用低彩度中性色底取代整圈外框、頁籤列變薄貼齊頂端；`FR-010` 階段徽章截斷後仍須可辨識；若缺少對應中性色 token，於 `design/system/MASTER.md` 與 `design/prototype/assets/tokens.css` 同步新增語意 token（light／dark 皆補齊），不在單頁硬寫色碼。

### 維護者裁定補充（2026-10-02 二次確認，取代原「尚待確認事項」1–3）

主 session 轉達維護者裁定：issue 本文「尚未經問答、建議值」四項中的前三項**全數採納**；G2／G3 已解除封鎖，但仍維持嚴格序列（G1 PR 合併 → G2 → G3 → archive，每群組 PR 前皆交由主 session 確認）。

1. **重開快捷鍵（已採納）**：`Alt+Shift+T`（比照 `FR-013` 用 `event.code` `KeyT`），輸入框內不攔截；不攔截瀏覽器原生 `Ctrl/⌘+Shift+T`（不同按鍵組合，本規格不要求也不得攔截該瀏覽器原生開新分頁快捷鍵）。已新增 `specs/shared/008-sidebar-navbar-shared/` 的 MODIFIED delta（本次 propose 已含此 delta）。
2. **篩選比對範圍（已採納）**：比對頁籤標題＋頁面種類名稱、不比對網址參數、大小寫不敏感。已併入 `FR-023` 第 3 點與新增 Scenario `AC-023.3`。
3. **選單鍵盤操作模型（已採納）**：開啟時焦點進篩選框、上下鍵移動、`Enter` 切換、`Esc` 關閉並還焦點給觸發按鈕（`FR-020` 無障礙延伸）。已併入 `FR-023` 第 3 點與新增 Scenario `AC-023.4`～`AC-023.7`。
4. **固定寬度數值與截斷規則**：交由 `design/system/MASTER.md` token 決定——已由 G1 直接定案（純屬 G1 視覺實作細節，非 G2/G3 行為裁定，與本次三項裁定無關）。

## Capabilities

### New Capabilities

無（既有 `shared/019-workspace-tabs` capability 擴充）。

### Modified Capabilities

- `shared/019-workspace-tabs`：新增 FR-023 群、FR-024 群、FR-024A／FR-024B、FR-025 與對應新成功標準；MODIFIED FR-002、FR-011、FR-018。
- `shared/008-sidebar-navbar-shared`：MODIFIED FR-016H（快捷鍵總覽「頁籤」section 新增重開快捷鍵列）。

## Impact

- `specs/shared/019-workspace-tabs/spec.md`：新增上述 FR/SC，版本 1.1.0 → 1.2.0（MINOR，僅新增與澄清，未推翻既有 FR/AC）。
- **流程註記**：`specs/shared/019-workspace-tabs/spec.md` 自建立以來從未經過 OpenSpec 管理，`openspec/specs/shared/` 無其衍生檢視；`openspec validate` 確認「只有 ADDED 對新規格有效」。因此 spec delta 檔案將 FR-002／FR-011／FR-018 三條（對正典而言是修訂既有條文）與 FR-023 群／FR-024／FR-025（對正典而言是全新條文）一律以 `## ADDED Requirements` 宣告修訂後全文，比照 `openspec/specs/task-management/014-task-detail/spec.md` 首次收錄 `align-014-review-model` 時的既有前例；此為 OpenSpec 工具限制，不影響正典回寫時 Changelog 對「新增」與「修訂」的正確區分。
- `specs/shared/008-sidebar-navbar-shared/`：本次 propose 已建立 MODIFIED delta（`FR-016H` 新增重開快捷鍵列），版本回寫與 Changelog 於 G3 最終群組與 `shared/019-workspace-tabs` 同 PR 完成（ADR-033 Rule 1）。
- `design/system/MASTER.md`：新增頁籤視覺 token 小節（固定寬度、截斷規則、中性色表面語意 token）。
- `design/prototype/assets/tokens.css`：視 G1 判定新增語意 token（light／dark）。
- `design/prototype/pages/shared/sidebar.js`／`sidebar.css`：G1（視覺）、G2（總覽選單）、G3（重開堆疊＋全部關閉）三群組分別異動。
- `design/prototype/tests/shared/`：新增 `workspace-tabs-visual.spec.ts`（G1）、總覽選單與重開堆疊／全部關閉對應測試檔（G2／G3，待確認事項解決後另行命名與撰寫）。
- 不影響 API 契約、DB schema；不改變既有去重鍵、`TAB_CAP`、未儲存保護語意（除 FR-011 新增「推入重開堆疊」附帶效果外，判定邏輯本身不變）。
- 預估超過單一 PR 門檻，依 issue 本文拆為堆疊 PR 群組：propose → G1（視覺）→ G2（總覽選單，待確認事項解決後）→ G3（重開堆疊＋全部關閉，待確認事項解決後）→ archive（最終群組含正典回寫）。

## Constitution Check

- **Generalization-First**：總覽選單、重開堆疊、全部關閉與視覺調整皆為通用頁籤殼層行為，不含任何任務 ID 或頁面專屬分支；頁面種類圖示對照沿用既有側欄 L0 圖示對照表，非新增專屬邏輯。
- **Data Fairness**：不涉及任何測試集答案或 ground-truth 顯示邏輯。
- 未觸及 API 契約或 DB schema，`design.md` 依 schema 規則為非必要項，但因本次涉及共用元件架構決策，仍附一份供後續群組參照。
