# deferred/ — 014 側工作暫存區

2026-09-01 維護者決議:Project SDD lint(`specs/_archive/001-project-sdd-lint/spec.md`,FR-003/AC-1.4)限制一個 active change 恰對應**一個** canonical spec,而本變更原同時攜帶 `task-management/014-task-detail` 與 `annotation/015-annotation-workspace` 兩份 delta。依決議,本 change 的 `對應 Spec` 收斂為 015,014 側工作**整批延後**、待 015 主體完成後以獨立 companion change 提案。

本目錄不在 lint 的掃描範圍(lint 只驗證 `proposal.md`、`design.md`、`tasks.md` 與 `specs/**/spec.md`),用於原樣保存 014 側的已完成規劃,避免 companion change 提案時重寫:

- `014-task-detail-delta.md` — 原 `specs/task-management/014-task-detail/spec.md` delta,逐字保留
- `014-tasks.md` — 原 `tasks.md` 中的 014 側任務(原群組 5 全部、原 6.4–6.7、原 8.3),逐字保留

companion change 提案時,需一併處理 canonical 014 的 lint 合規(`## 功能目標` 標題、STATUS 列、`功能分支` frontmatter 對齊)。
