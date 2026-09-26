# Tasks

## 1. Red：新增測試

**故事目標**：對應 SC-006——Annotator 與 Reviewer 主要流程（標記/審查/提交/返回）端到端可完成，且關鍵操作皆有歷程可追溯；本階段以 Red 測試釘住「歷程可讀」這一環。

- [x] 1.1 於 `design/prototype/tests/annotation/issue-992-decision-summary-readable.spec.ts` 新增測試，涵蓋 (a) 一筆真實審核送出的顯示層中文化文案（zh 與 en 各一）、(b) 持久化事件摘要仍為原內部格式字串、(c) 需理由之決策其理由仍正確附加；執行 `PW_PORT=8987 pnpm playwright test issue-992-decision-summary-readable` 記錄預期失敗證據 [@senior-qa]
- [x] 1.2 更新 `design/prototype/tests/annotation/issue-881-history-reason-dedup.spec.ts` 現行 :111（zh）與 :125（en）之精確比對斷言為新文案，其餘既有斷言不變；執行 `PW_PORT=8987 pnpm playwright test issue-881-history-reason-dedup` 記錄預期失敗證據 [@senior-qa]

## 2. Green：實作顯示層轉換

**故事目標**：對應 SC-006——關鍵操作之歷程可追溯，且追溯所見文字須為可讀文案；本階段使 Red 測試轉綠。

> 依 design.md D1/D2/D3：僅修改 `historySummaryForDisplay()`，不得修改 `handleReviewSubmit()` 之送出流程或 `#wsReviewHistory`。

- [x] 2.1 於 `design/prototype/pages/annotation/annotation-workspace.config.js` 之 `historySummaryForDisplay()` 新增逐行顯示轉換，套用既有輸出類型與決策標籤對照；驗證：任務 1.1、1.2 之 Playwright 測試轉為通過 [@senior-frontend]

## 3. 正典寫回與收尾

**故事目標**：對應 SC-006——本階段確認端到端流程與既有回歸測試皆可完成，並完成正典寫回。

- [x] 3.1 執行 `openspec validate --changes --no-interactive` 與 `scripts/check-sdd.sh`，確認 Gate 1、Gate 2 皆 0 error [@main]
- [x] 3.2 執行 `pnpm typecheck`、候選 Playwright 測試集、`gen-screen-inventory.mjs --check`、`inventory-tests.sh`、`check-spec-artifacts.sh`、`check-user-path-map-freshness.mjs`，確認 Gate 3 全數通過 [@main]
- [x] 3.3 獨立審查（`senior-code-reviewer`，非實作者）確認持久化路徑未變、顯示／持久化路徑乾淨拆開、未新建跨模組人名對照、既有測試僅預期兩處值位移 [@main]
- [x] 3.4 執行 `/opsx:archive` 完成正典版本 bump 與 Changelog 寫回，並同 PR 更新 `specs/STATUS.md` 的 annotation-015 一列，確認 Gate 4 Source-Verify 通過 [@main]
