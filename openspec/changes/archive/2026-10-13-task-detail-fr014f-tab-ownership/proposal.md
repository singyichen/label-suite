# 任務詳情 FR-014f 區塊歸屬與分頁常數對齊 FR-026／FR-027

對應 Spec: specs/task-management/014-task-detail/spec.md

## Why

Issue #1305（2026-10-13 主 session 裁定列為進入正式開發前必做）。

#1199（014 v12.0.0）把設定類區塊搬到設定分頁，但留下三處與新分頁結構矛盾的條文：

1. **FR-014f** 仍寫「Overview 必須以 5 區塊雙模式呈現：基本資料、標記設定、說明文件上傳、抽樣設定、任務狀態與執行控制」。其中「任務狀態與執行控制」現在由 FR-027 規範概覽分頁，另外四個區塊與審核設定在 FR-026 的設定分頁；清單與兩條新條文互相矛盾，開發端照哪一條做都會錯一半。
2. **規格常數 `TASK_TABS`**（spec.md 規格常數段）只列五個值，缺 `settings`，與 FR-003 的六個分頁矛盾。
3. **FR-010u** 寫「`task-detail` 五個頁籤（`TASK_TABS`）」，實際指的是會呈現衍生計數的五個分頁（不含設定）；常數補上 `settings` 後，這個字樣會變成錯指。

v12.0.4（issue #1243）已明載 FR-014f 的矛盾「改字樣會改變條文範圍，不在 PATCH 內調整，另開 OpenSpec change」，本 change 即為該出口。

**為什麼不走 Lightweight Path**：FR-014f 區塊歸屬是條文範圍的更動，且 v12.0.4 已裁定另開 change。

**分級：MINOR。** 刪除 FR-014f 清單中的「任務狀態與執行控制」只是讓它與 FR-027 一致，該需求仍由 FR-027 規範，沒有移除或推翻任何 FR／AC；FR-010u 的計數規則、聚合單位與五個分頁的範圍完全不變。已查證沒有任何 AC 引用舊的五區塊清單，也沒有測試或 prototype 依賴 `TASK_TABS` 只有五個值（唯一出現處是 `task-detail-cross-tab-source.spec.ts` 的註解文字）。

## What Changes

- **修訂 FR-014f**（正典補 v12.2.0 修訂段，原文逐字保留）：區塊清單改為與 FR-026 一致的設定分頁五區塊（基本資料、標記設定、標記說明、抽樣設定、審核設定；`標記說明` 即原「說明文件上傳」，雙角色結構仍見 FR-014f-1）；`任務狀態與執行控制` 移出本條，由 FR-027 規範；匯出仍在 `annotation-results`。
- **修訂規格常數 `TASK_TABS`**：改為 `overview | settings | member-management | annotation-progress | annotation-results | work-log`，順序依 FR-003。
- **修訂 FR-003**：補一句要求 `TASK_TABS` 與六個分頁的值與順序一致，使常數修訂在衍生檢視可追溯。
- **修訂 FR-010u**：「五個頁籤（`TASK_TABS`）」改為「會呈現衍生計數的五個分頁（概覽、成員管理、標記進度、標記結果、工時紀錄；不含設定）」。計數規則不變。
- **修訂 Prototype Traceability**：`overview.html` 列的 Responsibility 由舊的「task metadata, sampling settings, review settings, isolation risk state」改為概覽分頁現況（任務狀態與執行控制）。此列不是需求，只在正典修訂，不進衍生檢視。
- **正典回寫**：版號 12.1.0 → 12.2.0，Changelog 加一列；`specs/STATUS.md` 補一列。不新增 FR／AC。

**非目標**：

- 不改 prototype 程式碼與測試；prototype 已是六個分頁、概覽只有狀態與執行控制。
- 不改 FR-026、FR-027、SC-013（SC-013 的「5 區塊」指設定分頁，現況成立）。
- 不改 Changelog 既有列、FR-014f-1 與其他歷史沿革文字。

## Capabilities

`task-management` — 任務詳情分頁與區塊歸屬。
