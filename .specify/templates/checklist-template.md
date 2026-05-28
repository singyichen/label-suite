---
功能分支: feat/[module]/NNN-feature
建立日期: YYYY-MM-DD
版本: 1.0.0
狀態: Draft
---

# [清單類型] 清單：[功能名稱]

**目的**: [此清單涵蓋的範圍]
**規格連結**: [`specs/[module]/NNN-feature/spec.md`](specs/[module]/NNN-feature/spec.md)

**注意**：此清單由 `/speckit.checklist` 指令自動產生，用於驗證需求品質，非實作測試計畫。

<!--
  ============================================================================
  重要：以下清單項目僅為示例說明。

  /speckit.checklist 必須根據以下內容產生實際項目：
  - 所請求的清單類型
  - spec.md 中的功能需求
  - plan.md 中的技術脈絡
  - tasks.md 中有助識別需求缺口的相關任務脈絡

  產生的清單檔案不得保留任何示例項目。
  清單項目必須驗證需求完整性、清晰度、一致性、可量化性與涵蓋範圍。
  不得驗證執行期行為、測試執行、框架行為或實作正確性。
  ============================================================================
-->

## 需求完整性

- [ ] CHK001 主要流程的所有使用者可見狀態是否明確定義？[Completeness, Spec §使用者情境與測試]
- [ ] CHK002 每個受保護動作的角色權限與拒絕存取結果是否定義？[Completeness, Gap]
- [ ] CHK003 每個功能介面的必要資料來源與所有權邊界是否記錄？[Completeness, Spec §需求規格]

## 需求清晰度

- [ ] CHK004 「快速」、「直觀」、「顯著」等模糊詞彙是否以具體標準量化？[Clarity, Ambiguity]
- [ ] CHK005 成功標準是否以獨立審查者可客觀判斷通過 / 失敗的方式撰寫？[Measurability, Spec §成功標準]
- [ ] CHK006 所有導頁進入點與離開點是否以明確路由或產品位置命名？[Clarity, Spec §使用者流程與導頁]

## 需求一致性

- [ ] CHK007 功能需求是否與每個使用者故事的驗收情境一致？[Consistency, Spec §功能需求]
- [ ] CHK008 原型、規格與需求來源的差異是否有記錄，而非靜默衝突？[Consistency, Spec §輸入與生成規則]
- [ ] CHK009 使用者故事、需求、實體與成功標準中的共用詞彙是否一致使用？[Consistency, Spec §需求規格]

## 情境涵蓋

- [ ] CHK010 規格是否涵蓋使用者可見的空白、載入、錯誤與部分資料狀態？[Coverage, Gap]
- [ ] CHK011 規格是否定義失敗使用者動作或不可用相依性的負向與恢復路徑？[Edge Case, Gap]
- [ ] CHK012 受影響的 UI 介面是否記錄了響應式、可存取性與在地化期望？[Coverage, Spec §邊界情況]

## 非功能需求

- [ ] CHK013 受影響的關鍵路徑是否以可量化閾值表達效能目標？[NFR, Spec §成功標準]
- [ ] CHK014 涉及使用者資料、權限或特殊權限答案時，安全性與隱私需求是否明確？[NFR, Spec §需求規格]
- [ ] CHK015 功能改變具重要操作意義的工作流程時，是否指定了可觀測性或稽核需求？[NFR, Gap]

## 憲章需求把關

- [ ] CHK016 若 task type 行為有變動，規格是否要求以 config-driven registry/schema/frozen task config 實現，而非硬編碼 task 邏輯？[Principle: II, Spec §需求規格]
- [ ] CHK017 若標注者端資料受影響，規格是否明確禁止暴露 ground-truth、評分鍵、答案路徑或隱藏標籤？[Principle: III, Spec §需求規格]
- [ ] CHK018 若 UI 受影響，規格是否參照了已核可的設計 token / 原型期望，並記錄任何有意的偏差？[Principle: VII, Spec §輸入與生成規則]
- [ ] CHK023 若 UI 受影響，互動元件的無障礙期望（鍵盤操作、螢幕閱讀器標記）是否納入規格的邊界情況或成功標準？[Principle: VII, Spec §邊界情況]
- [ ] CHK024 若功能涉及驗證流程、角色權限或使用者私密資料，規格是否定義未授權存取的預期行為，並要求相應的安全路徑測試情境？[Principle: XI, Spec §功能需求]
- [ ] CHK025 規格的需求範圍是否僅涵蓋請求功能本身，無預期外的重構、格式調整或相鄰功能變更？[Principle: X, Gap]

## 相依性與假設

- [ ] CHK019 上下游相依性與假設是否附有驗證期望？[Assumption, Spec §已釐清事項]
- [ ] CHK020 範圍外項目或延後決定是否明確列出，以免被誤認為需求？[Completeness, Gap]
- [ ] CHK021 需求是否具備足夠的可追蹤性，使任務可對應回使用者故事或 FR ID？[Traceability, Spec §功能需求]
- [ ] CHK022 功能目標是否已在 spec.md 中明確陳述，且 plan.md 的功能目標與其一致？[Traceability, Spec §功能目標]

## 備註

- 勾選已完成項目：`[x]`
- 對任何發現或問題新增行內注釋
- 連結相關資源或文件
- 項目以連續編號便於參照
- 至少 80% 的產生清單項目必須包含可追溯引用，例如 `[Spec §FR-001]`、`[Gap]`、`[Ambiguity]`、`[Conflict]` 或 `[Assumption]`
- 不得包含需要執行程式碼、運行測試、點擊 UI、驗證 API 狀態碼或確認實作行為的項目

## Changelog

| 版本 | 日期 | 變更摘要 |
|------|------|---------|
| 1.6.0 | 2026-05-28 | 新增 CHK024（Principle XI）：安全路徑測試情境驗證；新增 CHK025（Principle X）：需求範圍邊界確認（配合憲章 v1.9.0） |
| 1.5.2 | 2026-05-28 | 新增 CHK023：WCAG 2.1 AA 無障礙期望納入規格驗證（配合憲章 v1.6.2） |
| 1.5.1 | 2026-05-28 | CHK022 用詞改為功能目標（配合 spec/plan 章節名稱中文化） |
| 1.5.0 | 2026-05-28 | 新增 CHK022：Feature Goal 陳述與 spec/plan 一致性追蹤 |
| 1.4.0 | 2026-05-22 | 對齊 spec 實例格式：改為 --- frontmatter + H1，章節標題與清單項目全面中文化 |
| 1.3.0 | 2026-05-21 | Align checklist template with requirement-quality checklist semantics |
| 1.2.0 | 2026-05-21 | Add HTML meta-comment and two Notes rules |
| 1.1.1 | 2026-05-21 | Align feature spec link with module-based SDD directory structure |
| 1.1.0 | 2026-05-21 | 新增七八兩節與原則標籤 |
| 1.0.0 | [YYYY-MM-DD] | 初始版本 |
