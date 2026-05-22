---
description: 本規格需定義 Help Button 的跨頁共用 UI 契約、導覽/工具入口、狀態持久化、i18n、可存取屬性與 RWD 行為。
scripts:
   sh: scripts/bash/check-prerequisites.sh --json --paths-only
   ps: scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly
---

# 功能規格：Help Button — 平台說明入口

**功能分支**:`feat/shared/018-help-button`
**建立日期**:2026-05-15
**版本**:1.1.1
**狀態**:Deferred（latest prototype baseline does not include Help button）
**需求來源**:Brainstorm session 1445-1778808850 — 評估平台是否需要 FAQ/說明入口

> **Prototype baseline（2026-05-19）**：最新 `design/prototype/pages/shared/sidebar.js` 僅提供語言切換、快捷鍵總覽、外觀切換與登出；尚未提供 `helpBtn` / `mobileHelpBtn` 或 `#help-modal`。本 spec 保留為後續候選需求，但不屬於目前 IA / prototype 對齊範圍，實作前需先更新 prototype。

## 輸入與生成規則

**輸入描述**：本規格需定義 Help Button 的跨頁共用 UI 契約、導覽/工具入口、狀態持久化、i18n、可存取屬性與 RWD 行為。

**產生規格時必須遵守**：

1. 先確認本規格範圍與需求來源一致：Brainstorm session 1445-1778808850 — 評估平台是否需要 FAQ/說明入口。
2. 若新增或改動角色權限、導頁、資料欄位、錯誤狀態、i18n、可存取屬性或響應式邊界，必須同步檢查使用者情境、功能需求、成功標準與規格相依性。
3. 若需求描述缺少角色、狀態、資料來源、權限、錯誤處理、導頁目標或量化門檻，需以待釐清標記記錄具體問題，不得自行假設。
4. 規格應描述使用者可觀察行為、業務規則與驗收條件；避免描述框架、檔案結構、API 實作或資料庫實作，除非該內容本身是已定義的產品契約。
5. 本規格若與 prototype、IA 或上游規格不一致，必須明確記錄差異、更新相依性，並新增 changelog。

**已釐清事項**：

- 本版以既有需求來源與本文件中的 流程圖、使用者情境、功能需求、成功標準 作為 scope baseline。
- 跨頁或跨模組共用行為需透過「規格相依性」追蹤，不在本文件中隱含建立未列出的依賴。
- 若後續新增實作層契約，需先確認是否構成行為變更；若是，必須依 SDD 流程更新 spec。

---

## 背景與問題

Dashboard 的「一般使用者」視圖已有 onboarding 三卡區塊，引導使用者了解平台的三個核心工作流程（建立標記專案 / 進行資料標記 / 進行標記審核）。
然而，當使用者切換至 Project Leader / Annotator / Reviewer 等角色視圖時，該 onboarding 區塊不再顯示，使用者沒有管道重新查閱操作說明。

**目標**：在 sidebar 加入一個常駐的 Help 入口（`?` 按鈕），讓使用者在任何時候、任何角色視圖下都能主動查閱平台操作說明。

---

## 規格常數

- `HELP_MODAL_ID = help-modal`
- `HELP_BTN_ID = helpBtn`
- `MOBILE_HELP_BTN_ID = mobileHelpBtn`
- `MOBILE_BP = 767px`
- `RWD_VIEWPORTS = 375px / 768px / 1440px`

---

## 範疇

### 目前 Prototype 範圍

- 不新增 Help 按鈕
- 不新增 Help Modal
- Sidebar utility row 維持最新 prototype：`shortcutHelpBtn` + `sidebarThemeToggleBtn`
- Mobile top bar 維持最新 prototype：`mobileLangToggle` + `mobileShortcutHelpBtn` + `mobileThemeToggleBtn` + `mobileLogoutBtn`

### 範圍內

> Deferred until prototype reintroduces Help entry.

- 桌面版 sidebar utility row 加入 `?` Help 按鈕
- 行動版頂部工具列加入 `?` Help 按鈕
- 點擊後顯示 Help Modal，內容為現有 onboarding 三卡區塊
- Modal 內三卡按鈕行為（導向對應頁面）

### 範圍外（另行排期）
- 步驟引導流程（Onboarding Walkthrough / Tour）
- 角色感知的客製化說明內容（目前三卡對所有角色顯示相同內容）
- 「已看過」flag 記錄（首次自動彈出）

---

## UI 元件規格

### 1. 桌面版 — Sidebar Utility Row

**位置**：`shared/sidebar.js` → `.sidebar-utility-row`
**放置方式**：在現有 `shortcutHelpBtn（⌨）` 左側加入 `helpBtn`，utility row 由原本 2 顆按鈕變 3 顆。

```
[ ? 說明 ] [ ⌨ ] [ ☀ ]
```

**按鈕規格**：

| 屬性 | 值 |
|------|-----|
| `id` | `helpBtn` |
| 顯示文字 | `? 說明` |
| 樣式 | 與 `shortcutHelpBtn` / `sidebarThemeToggleBtn` 一致（`.sidebar-utility-btn`） |
| 寬度 | 等分（`flex: 1`，與其他兩顆相同） |
| 出現條件 | 桌面版（viewport `> MOBILE_BP`） |

**3 顆按鈕擁擠緩解方式**：utility row 外容器 `gap` 維持現有值；`? 說明` 按鈕無額外特殊樣式，三顆等寬即可。若日後空間不足，可改為純圖示（`?`）並加 `title` tooltip。

---

### 2. 行動版 — 頂部工具列

**位置**：`shared/sidebar.js` → mobile top bar（`.brand-section`）
**放置方式**：在現有 `mobileShortcutHelpBtn（⌨）` 左側插入 `mobileHelpBtn`。

```
[ Logo ][ Label Suite ]          [ ZH ][ ? ][ ⌨ ][ ☀ ][ ↩ ]
```

**按鈕規格**：

| 屬性 | 值 |
|------|-----|
| `id` | `mobileHelpBtn` |
| 顯示內容 | `?`（純圖示，無文字，與其他 mobile icon btn 一致） |
| 樣式 | 與 `mobileShortcutHelpBtn` 一致（`.mobile-icon-btn`） |
| 出現條件 | 行動版（viewport `≤ MOBILE_BP`） |

> **實作模式依據**：keyboard shortcuts 已存在 `shortcutHelpBtn`（桌面）+ `mobileShortcutHelpBtn`（行動）的雙按鈕模式，Help 按鈕完全沿用同一模式。

---

### 3. Help Modal

#### 觸發行為

- `helpBtn`（桌面）點擊 → 開啟 `#help-modal`
- `mobileHelpBtn`（行動）點擊 → 開啟 `#help-modal`
- 點擊 Modal backdrop → 關閉
- 點擊 Modal 右上角 `×` → 關閉
- 按 `Escape` → 關閉

#### Modal 規格

| 屬性 | 值 |
|------|-----|
| `id` | `help-modal` |
| 呈現方式 | 置中彈出（Centered Modal Overlay） |
| 寬度 | `max-width: 900px`；行動版 `width: 95vw` |
| 高度 | `max-height: 90vh`；內容區可捲動 |
| 背景遮罩 | `rgba(0, 0, 0, 0.5)` |
| z-index | 與現有 keyboard shortcut modal 同層（確認現有值後對齊） |

#### Modal 內容

Modal 內容完整複製 Dashboard 「一般使用者」視圖的 onboarding 三卡區塊，結構如下：

```
┌─────────────────────────────────────────────────────────┐
│  說明中心                                          [ × ] │
│  了解如何在 Label Suite 中完成標記工作流程               │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │  👤           │  │  🏷️           │  │  📋         │  │
│  │  建立標記專案  │  │  進行資料標記  │  │  進行標記審核│  │
│  │               │  │               │  │             │  │
│  │  上傳資料、    │  │  查看待辦任務、│  │  檢查標記內容│  │
│  │  設定規則、    │  │  完成標記並    │  │  退回修正或  │  │
│  │  指派成員      │  │  提交結果      │  │  通過資料    │  │
│  │               │  │               │  │             │  │
│  │ [開始建立任務] │  │  [開始標記]   │  │  [開始審核]  │  │
│  └───────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
```

三卡的 HTML 結構、樣式、文案直接沿用 `dashboard.html` 中 `#onboarding-section`（或對應 class）的現有實作；**不另外維護一份副本**，避免日後內容分歧。

#### 三卡按鈕行為（Modal 內）

| 按鈕 | 行為 |
|------|------|
| 開始建立任務 | 關閉 Modal → 導向 `/task-new` |
| 開始標記 | 關閉 Modal → 導向 `/annotation-workspace`（或任務列表 `/task-list` 篩選 annotator 視圖） |
| 開始審核 | 關閉 Modal → 導向 `/task-list`（篩選 reviewer 視圖） |

> 導向目標路徑依前端 router 定義為準；prototype 中使用對應 `.html` 相對路徑。

---

## 實作影響範圍

| 檔案 | 變更類型 | 說明 |
|------|----------|------|
| `design/prototype/pages/shared/sidebar.js` | 修改 | 加入 `helpBtn`（desktop utility row）與 `mobileHelpBtn`（mobile top bar）；加入點擊事件觸發 modal |
| `design/prototype/pages/shared/sidebar.css` | 可能不需修改 | 沿用現有 `.sidebar-utility-btn` 與 `.mobile-icon-btn` 樣式 |
| `design/prototype/pages/dashboard/dashboard.html` | 修改 | 加入 `#help-modal` HTML 結構；onboarding 三卡區塊抽取為可重用片段（或直接複製） |
| 其他使用 `mountSidebar()` 的頁面 | 不需修改 | Help 按鈕由 sidebar.js 統一注入，所有頁面自動獲得 |

> **注意**：Help Modal 的 HTML 應放在哪個檔案？
> 選項 A：注入在 `sidebar.js` 生成的 HTML 字串中（modal 跟著 sidebar 走，所有頁面通用）
> 選項 B：僅放在 `dashboard.html`（modal 只在 dashboard 頁可用）
> **建議選項 A**：Help 按鈕的目的是讓使用者在任何頁面都能查閱說明，modal 應全域可用。

---

## Prototype 驗收條件

1. 桌面版 sidebar utility row 顯示三顆按鈕：`? 說明`、`⌨`、`☀`
2. 行動版（375px）頂部工具列顯示 `?` 圖示按鈕，位於 `⌨` 左側
3. 點擊 `? 說明` / `?`（行動版）→ 出現置中 Modal，內含三卡 onboarding 內容
4. Modal backdrop 點擊 / `×` / `Escape` 均可關閉
5. 三卡按鈕可正常導向（prototype 中導向對應 .html 頁面）
6. Modal 在 375px / 768px / 1440px 三個視窗寬度下皆可正常顯示，無截斷或溢出

---

## 審查與驗收清單

### 內容品質

- [x] 規格聚焦使用者可觀察行為、業務規則與驗收條件。
- [x] 所有必填章節已完成；不適用的內容已明確排除或未納入本版範圍。
- [x] 無未解決的待釐清標記殘留。
- [x] 需求、驗收情境與成功標準皆可測試。

### Label Suite 合規性

- [x] 功能分支格式符合 `feat/[module]/NNN-feature`。
- [x] 已檢查本規格未要求跨 feature import；跨模組共用行為需透過 shared contract 或規格相依性追蹤。
- [x] 本規格不新增 task type 邏輯；若後續接觸任務行為，需回到 config-driven task architecture 檢查。
- [x] 已檢查 annotator-facing API / UI 不得暴露 test-set answer、ground-truth 或等價特權資料。
- [x] Prototype / IA / 上游規格 source of truth 已列於需求來源或規格相依性。
- [x] 上下游規格相依性已列出；若本規格改版，需檢查 downstream 影響。

### 執行狀態

- [x] 輸入描述已解析。
- [x] 角色、互動、資料狀態與限制已萃取。
- [x] 模糊點已釐清或明確排除於本版範圍。
- [x] 使用者情境已定義。
- [x] 功能需求已定義。
- [x] 關鍵實體或狀態模型已定義。
- [x] Review checklist 已通過。

---

## 變更紀錄

| 版本 | 日期 | 說明 |
|------|------|------|
| 1.1.1 | 2026-05-21 | 補充輸入與產生規則、已釐清事項、審查清單與執行狀態；同步功能分支格式 |
| 1.1.0 | 2026-05-19 | 依最新 prototype baseline 標記為 Deferred：目前 sidebar 無 `helpBtn` / `mobileHelpBtn` / `help-modal`，不納入現行 IA 導覽契約 |
| 1.0.0 | 2026-05-15 | 初版建立（Brainstorm session 1445-1778808850） |
