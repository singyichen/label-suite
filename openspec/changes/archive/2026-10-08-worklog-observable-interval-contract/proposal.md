# MVP 可觀測工時與 session 歸屬

對應 Spec: specs/task-management/014-task-detail/spec.md

## Why

014 的「加權平均速度」把標記 assignment、審核單位與爭議項相加，與 FR-010u 的不同單位不得相加衝突。登入時間與標記歷程耗時亦不足以推定實際工作時長。#1160 需要可追溯的未部署資料表候選，支撐任務詳情的工時紀錄。

## What Changes

- 定義 `task_work_interval` 可觀測前景工作區間，並由既有 `annotation_history_event` 補真實 session 來源；`WorkLogEntry` 維持唯讀投影。
- 依 session、task、run、membership、工作種類及台北報表日期分列；UTC 原始區間跨日只在查詢時裁切。
- 標記、審核、仲裁完成筆數分別去重，速度逐類顯示；未知工作時長與不可驗證登出均明示未知。
- session 歷史保留與認證有效性分離；普通硬刪採 RESTRICT 候選，個資最長保存及匿名化順序留待 migration 前裁決。

## Impact

- 正典：014 v9.0.0（MAJOR，移除混合單位速度）、015 v12.1.0、account-020 v1.3.0、ADR-021。
- 文件：候選欄位字典、盤點總帳與 NoteCraft Wiki／Diagram。
- 本變更沒有 ORM、migration、API 或已部署業務表；SQLite／PostgreSQL DB 約束與交易測試屬後續實作。

設計：[WorkLog 實體候選設計](../../../docs/superpowers/specs/2026-10-08-worklog-physical-design.md)。
