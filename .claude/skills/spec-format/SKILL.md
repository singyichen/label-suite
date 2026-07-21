---
name: speckit-spec-format
description: Use when writing or reviewing a spec.md file for the label-suite project via /speckit.specify. Describes required section structure, heading language, field naming, and canonical reference example.
---

# speckit-spec-format

## 總覽

label-suite spec.md 的撰寫規範。所有大標題必須用**繁體中文**，格式以 `specs/account/005-profile-settings/spec.md` 為標準參考。

---

## 檔案位置

```
specs/[module]/[###-feature-name]/spec.md
```

模組名稱對應 `features/` 目錄：`account` · `dashboard` · `task-management` · `annotation` · `dataset` · `admin`

---

## 必填欄位（檔案開頭）

```markdown
# 功能規格：[中文功能名稱]

**功能分支**：`[###-feature-name]`
**建立日期**：YYYY-MM-DD
**狀態**：Draft
**需求來源**：IA v7 Spec 清單 #[編號] — [中文說明]
```

---

## 必要章節與中文標題

| 章節 | 標題寫法 | 備註 |
|------|----------|------|
| 流程圖（選填）| `## 流程圖 *(如有跨角色流程)*` | 單純頁面可省略 |
| 使用者情境 | `## 使用者情境與測試 *(必填)*` | 至少 2 個 User Story（P1 必填）|
| 每個 Story | `### User Story N — [中文標題]（優先級：P1/P2/P3）` | |
| Story 子欄位 | `**此優先級原因**：` `**獨立測試方式**：` `**驗收情境**：` | 驗收情境條目使用 `AC-1.1`、`AC-1.2` … ID |
| 邊界情況 | `### 邊界情況` | |
| 需求規格 | `## 需求規格 *(必填)*` | |
| 功能需求 | `### 功能需求` | `FR-001`、`FR-002` … |
| 導覽流程 | `### User Flow & Navigation` | 保持英文（唯一例外）|
| 關鍵實體 | `### 關鍵實體` | 有資料模型時才填 |
| 成功標準 | `## 成功標準 *(必填)*` | `SC-001`、`SC-002` … |

---

## 驗收情境格式

```markdown
**驗收情境**：

1. **AC-1.1**：**Given** [初始條件]，**When** [動作]，**Then** [預期結果]
2. **AC-1.2**：**Given** [初始條件]，**When** [動作]，**Then** [預期結果]
```

`Given` / `When` / `Then` 保持英文，其餘內容繁體中文。

**AC ID 規則**：格式為 `AC-<故事編號>.<序號>`（例：`AC-2.3` = 故事 2 第 3 條）。ID 一經發布即穩定——後續插入新情境時沿用字尾字母（例：`AC-1.2A`），不得重編既有 ID（比照 `FR-004A` 慣例）。

---

## 功能需求格式

```markdown
- **FR-001**：系統必須 [具體能力]。
- **FR-002**：只有 [role] 才可以 [操作] — 透過 RoleGuard 強制執行。
```

有角色限制時必須明確列出允許的角色，不可依賴隱性繼承。

---

## 常見錯誤

- **大標題用英文**：`## Requirements` → 應改為 `## 需求規格 *(必填)*`
- **缺少 Process Flow 但強行加入**：單純提示頁、靜態頁無需流程圖區塊
- **`User Flow & Navigation` 譯成中文**：此小節例外，保持英文標題
- **FR 未指明角色**：凡有 RoleGuard 限制，FR 必須明確寫出允許角色
- **驗收情境缺少 AC ID**：條目只有清單序號 → 應加上 `**AC-N.N**：` 前綴，否則 changelog 與 traceability matrix 無法穩定引用

---

## 參考範例

`specs/account/005-profile-settings/spec.md` — 最完整的標準範例，涵蓋三個 User Story、邊界情況、FR、Navigation flowchart、關鍵實體與 SC。
