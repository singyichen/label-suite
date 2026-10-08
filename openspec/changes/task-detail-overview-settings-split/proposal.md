---
對應 Spec: specs/task-management/014-task-detail/spec.md
對應 Issue: #1199
基準版本: 014 v11.0.0
目標版本: 014 v12.0.0
---

## Why

`task-detail` 的「任務概覽」分頁由上而下堆疊六個同權重區塊，導致四個問題（issue #1199）：標題固定為「任務詳情」而看不到任務名稱與狀態；靜態設定與需要行動的狀態混在一起；主要動作「啟動正式標記」在最底部；標記設定編輯時有兩個「儲存」按鈕（`settingsSaveBtn` 與 `saveCodeBtn`）；抽樣設定混入執行期狀態，與「任務狀態與執行控制」重複。issue #1199 附有 5a（概覽）與 5b（設定）的最終版設計稿，並取代 #1197 的 1c 版。

2026-10-08 維護者在 issue #1199 的裁定留言中，對照正典、`MASTER.md`、`tokens.css` 與現行 prototype 後，確認需求與正典有四處衝突並逐項裁定，且本單**不符合 Lightweight Path**：概覽區塊 2／4／5、SC-019、FR-019（新增 `settings` 分頁值與 `section` 參數，查詢參數總數改變）都涉及要求變更，並新增設定分頁與任務標頭。因此走完整 OpenSpec change。

**是否需要存在（YAGNI 檢查）**：需要。設計稿的每一項（共用標頭、分頁拆分、URL 同步、未儲存確認）都有對應驗收條件，且 SC-019 與 FR-019 的既有條文與新設計直接衝突，不改正典無法實作。

## What Changes

- **新增 FR-028（任務標頭）**：六個分頁共用的麵包屑 `任務管理 / {task_id}`、H1 任務名稱、H1 右側以一般文字顯示的階段狀態；標頭不放 CTA。
- **新增 FR-026（設定分頁）**：承載由概覽搬來的五個區塊（基本資料、標記設定、標記說明、抽樣設定、審核設定），左側文字導覽（active 底色用 `--color-slate-50`）、一次顯示一個區塊、`section` 網址同步、未儲存切換需確認、< 768px 水平捲動導覽。Code 模式保留明確按鈕並改名「套用」，只負責 Code→Visual；唯一送出為區塊標題列「儲存」。「設定檔版本」標籤改為「設定檔」。抽樣設定檢視移除「試標回合」「目前判定」「已用試標 / 可進正式」三列。`reviewer` 可見設定分頁但為唯讀、無「編輯」連結。
- **新增 FR-027（概覽分頁）**：沿用原區塊視覺樣式（2026-10-08 維護者裁定外觀還原），內容精簡為四張數字卡（刻意移除「已完成試標回合」）、樣本分配、達標條件列右側唯一主要 CTA（全站 `btn-primary`，`--color-cta`）、七欄試標回合表。
- **新增 FR-003（ADDED）**：頁籤由五個改為六個，名稱「任務概覽」改為「概覽」，順序為 概覽／設定／成員管理／標記進度／標記結果／工時紀錄。FR-003 不在衍生檢視，故置於 ADDED，回寫正典時原地改寫。
- **新增 SC-019（ADDED）**：改寫為標頭狀態文字是唯一的階段文字標示，stepper 只作流程示意（維護者裁定 1）。SC-019 不在衍生檢視，同樣置於 ADDED。
- **修訂 FR-019（MODIFIED）**：納入 `settings` 頁籤值與 `section` 參數，查詢參數總數由 15 個改為 16 個；`section` 無效值回退為 `basic`；`reviewer` 直連設定分頁合法。
- **修訂 FR-006（MODIFIED）**：補一句 `reviewer` 可見設定分頁但為唯讀。
- **FR 編號**：任務標頭原擬 FR-025，因正典 014 v11.0.0（issue #1160）已以 FR-025 定義稽核事件，改名 FR-028（維護者 2026-10-08 裁定）；FR-026、FR-027 不受影響。
- **新增驗收情境不預先編號**：AC 編號於 gate 4 回寫正典時續編。
- **不在本次範圍**：設定版本機制、欄位鎖定標示、修改者／時間紀錄（設計稿第 2、3 輪探索，系統目前不存在這些功能）。
- **非 FR 錨點同步**：標題「5 Tabs」、介面定義 Tab A 節（約 `:183`～`:225`）、`:194` 的「設定檔版本」、`:398` 的抽樣設定重複資訊，於 G4 回寫時一併更新；對應的 `design/system/pages/task-detail.md` 同步。

**BREAKING 判定**：**MAJOR**。分頁名稱「任務概覽」被改名、抽樣設定檢視的三列與數字列的「已完成試標回合」被移除、標頭取代固定標題，皆收回既有可見行為（比照 014 v4.0.0、v5.0.0 先例，移除既有需求一律 MAJOR）；版本號以合併目標 `origin/main` 的實際版本重算。

**delta 形式說明**：FR-003、SC-019 因衍生檢視未收錄而置於 `## ADDED Requirements`；FR-019、FR-006 已收錄，置於 `## MODIFIED Requirements` 並保留既有 scenario。

## Capabilities

### New Capabilities

（無——不引入新的 capability 路徑，全部落在 `task-management/014-task-detail`。）

### Modified Capabilities

- `task-management/014-task-detail`：新增 FR-028、FR-026、FR-027，原地改寫 FR-003、SC-019，修訂 FR-019、FR-006；其餘條文（含 FR-010p、FR-013）維持原文。

## Impact

**規格**

- 正典：`specs/task-management/014-task-detail/spec.md`（v11.0.0 → v12.0.0，**MAJOR**）。回寫前先 `git fetch` 並確認 `origin/main` 上 014 的實際版本，版本號依合併目標重算，不得倒退。
- 衍生檢視：`openspec/specs/task-management/014-task-detail/spec.md`（archive 時自動合併）。
- 下游：issue #1125、#1127、#1128、#1129、#1130 於本單完成後重新判定，#1127、#1128 預期被取代；#1126 的 stepper 無障礙修法依新版 SC-019 調整。013 的 Code 回填契約（`specs/task-management/013-task-new/spec.md`）不被修改，僅作行為對齊的依據。

**交付：一個 change、四組依序 PR**（維護者裁定 4；只有 G4 做 archive 回寫）

| 群組 | 範圍 | 預期產品檔案（不含測試與產生檔） |
|------|------|-----------------------------------|
| G1 | 任務標頭＋六個分頁列 | `design/prototype/pages/task-management/task-detail.html`、`design/prototype/pages/task-management/task-detail.panels/settings.html`（空殼） |
| G2 | 設定分頁搬移（五區塊、`section`、未儲存確認、reviewer 唯讀） | `task-detail.panels/settings.html`、`task-detail.panels/overview.html`、`task-detail.html` |
| G3 | 概覽重排（判定列、數字列、回合表、抽樣設定檢視去重） | `task-detail.panels/overview.html`、`task-detail.html` |
| G4 | Code「套用」按鈕＋Source-Verify＋archive 回寫 | `task-detail.panels/settings.html`、`task-detail.html`、`design/system/pages/task-detail.md`；回寫另含 `specs/**`、`openspec/**` |

每組皆預期低於 5 檔／300 行門檻（`specs/**`、`openspec/**`、測試、`design/system/screen-inventory.md` 等產生檔不計入）。`task-detail.html` 約 11800 行，G1～G4 都會改動它，故四組必須嚴格依序合併，後一組先 `git merge origin/main` 再動工。

## Constitution Check

- **Generalization-First（NON-NEGOTIABLE）**：設定區塊導覽與 `section` 合法值由區塊清單推導，不為特定任務類型硬編；標記設定摘要仍依 `task_type` schema 動態顯示，行為不變。
- **Data Fairness（NON-NEGOTIABLE）**：只調整版面與導覽，不改變標記答案、`declared_split` 或跨角色資料；`reviewer` 在設定分頁為唯讀，網址只承載檢視狀態（FR-019）。
- **Simplicity First / YAGNI**：沿用現有 `btn-primary`、`tokens.css` token 與 `modal-focus.js`，不新增元件庫；設定版本、欄位鎖定與修改紀錄明確排除。
- **PR 規模（Principle X）**：拆為四組依序 PR，各組產品檔案 ≤ 3 個。
