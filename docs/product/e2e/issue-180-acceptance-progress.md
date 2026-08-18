# Issue #180 — 跨角色 Playwright 生命週期驗收規劃（分階段執行進度）

Issue: https://github.com/singyichen/label-suite/issues/180
本輪範圍：`account` · `dashboard` · `task-management` · `annotation`（排除 dataset 分析模組）
本階段只產出規劃與驗收文件，不跑 Playwright 測試、不實作產品功能。

工作流報告（完成後提交至本目錄）：

- W1 規格與架構盤點 → `docs/product/e2e/issue-180/w1-spec-arch.md`
- W2 角色旅程與 UX 走查 → `docs/product/e2e/issue-180/w2-ux-journey.md`
- W3 Playwright 測試資產盤點 → `docs/product/e2e/issue-180/w3-playwright-qa.md`

## 階段一：三條平行盤點工作流（read-only）

- [ ] W1 規格與架構盤點（senior-ba 視角）：治理文件、核心 feature specs、產品文件、關鍵 ADR；驗證 issue 12.8 已知衝突並找出新衝突與 requirement gap
- [ ] W2 角色旅程與 UX 走查（senior-uiux 視角，以 prototype 程式碼閱讀方式走查三條角色旅程）
- [ ] W3 Playwright 測試資產與驗收設計盤點（senior-qa 視角）：既有測試覆蓋地圖、多身份模擬機制、跨角色 E2E 設計骨架
- [ ] 主 agent 重新驗證各工作流關鍵證據（抽查引用的檔案與行號）
- [ ] 階段一檢查點報告：completed · verified · remaining

## 階段二：整合與正典決策（需使用者 checkpoint）

- [ ] 整合三條工作流 → 需求追溯矩陣草稿（流程節點 × 角色 × Spec 來源 × Prototype 證據 × 判定）
- [ ] 彙整所有 Spec conflict，至少涵蓋 issue 12.8 已知項目：
  - [ ] reviewer model redesign vs 舊 PRD／story map 語意的正典優先序
  - [ ] 三步／四步建立任務流程描述
  - [ ] 試標是否產生 gold 的規則
  - [ ] 正式 E2E 目錄（ADR-009/012/014 `frontend/tests/` vs testing constitution `e2e/[module]/`）
  - [ ] ADR-022 `completed` 前置條件是否含 review／dispute／arbitration 完成
- [ ] 產出使用者決策清單 → **停下等使用者裁決**
- [ ] 依決策更新追溯矩陣與驗收條件

## 階段三：Playwright 驗收文件

- [ ] 撰寫 `docs/product/e2e/cross-role-task-lifecycle-playwright-plan.md`
- [ ] 正典旅程 Given/When/Then + 各角色獨立 BrowserContext/storage state
- [ ] deterministic fixture、scenario ID、清理與平行隔離策略
- [ ] 每個關鍵動作的 UI/URL/資料狀態/audit log 斷言
- [ ] 錯誤情境（重新整理、重複提交、逾時、失敗復原、多人同時操作）
- [ ] 證據保存規則（screenshot/trace/video）＋鍵盤/a11y/i18n/responsive 驗收
- [ ] 主 agent 統一檢查：traceability coverage、placeholder、內部連結、Mermaid、驗收條件二元可測性
- [ ] 必要時由 nlp-research-advisor 補充 IAA/試標抽樣/仲裁規則檢查

## 階段四：Finding triage 與建立 issues

- [ ] 建立 finding register（唯一 Finding ID、來源工作流、角色、流程節點、分類、嚴重度）
- [ ] 逐項查重 open/closed issues
- [ ] 依 issue #180 第 11 節對應表逐張建立 GitHub issue（Critical/High 安全發現改走私下 escalation，不建公開單）
- [ ] 每張回報 `ISSUE OPENED: <url> — <summary>`
- [ ] issue register 回填 #180，確認每項發現皆有處置

---
最後更新：2026-08-18 — 階段一已啟動（三個 sub-agent 平行執行中）
