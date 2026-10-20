# 任務清單：task-new-prefill-fields（issue #1430，PR-A）

> **Apply 前硬閘（兩道，互不替代）**：先執行 `openspec validate --changes --no-interactive` 取得 OpenSpec schema validation，再執行 `scripts/check-sdd.sh` 取得 Project SDD lint，兩者皆通過後才進入下方群組。
>
> **TDD 硬規則**：每個可觀察行為皆為 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對；Red 先 commit 並留下預期失敗證據，Green 才能開始，且不得弱化 Red 契約。只有主 session／lead 勾選 checkbox。
>
> **範圍**：單一 PR，產品檔案 4 個（`task-new.html`、`task-detail.html`、`task-detail.config.js`、`task-detail.data.js`）。本 change 不碰 `task-config.engine.js` 與 `annotation-workspace.*`（第二個 change 負責）。

## 0. 前置

**故事目標**（SC-002k，AC-1.15）：流程狀態檔反映本 change 對 task-management-013 的 in-flight 狀態。

- [x] 0.1 修改 `specs/STATUS.md` 的 task-management-013 列備註，加上本 change in-flight 的一句紀錄；不動其他列。 [@main]

## 1. 建立任務 payload（AC-1.15、SC-002k）

**故事目標**（SC-002k，AC-1.15）：精靈建立任務的 payload 帶 `prefill_fields: null`，既有 payload 其他鍵不變。

> **產品檔案（1）**：`design/prototype/pages/task-management/task-new.html`

- [ ] 1.1 新增 `design/prototype/tests/task-management/issue-1430-prefill-fields-config.spec.ts` 的 Red：建立任務 payload 含 `prefill_fields` 鍵且為 `null`，`dialogue_fields` 等既有鍵不變；既有斷言 payload 完整形狀的規格同步更新。 [@senior-qa]
- [ ] 1.2 （Green）修改 `task-new.html`：state 預設 `prefillFields: null`，`persistCreatedTask` 寫入 `prefill_fields: state.prefillFields ?? null`。 [@senior-frontend]

## 2. 任務詳情載入、種子與儲存（AC-1.15、AC-1.16）

**故事目標**（AC-1.15、AC-1.16）：T008 宣告的來源欄位帶入任務詳情，缺鍵與缺子鍵視同 `null`，儲存不丟失。

> **產品檔案（3）**：`task-detail.html`、`task-detail.config.js`、`task-detail.data.js`
> **相依**：群組 1。

- [ ] 2.1 修改 `issue-1430-prefill-fields-config.spec.ts`，補 Red：T008 的任務資料與設定狀態 `prefill_fields` 為 `{ entities: 'entities', triples: null }`；T010、T013 與其他任務為 `null`；儲存設定後 T008 宣告仍在。 [@senior-qa]
- [ ] 2.2 （Green）修改 `task-detail.data.js`（T008 宣告）、`task-detail.html`（載入與儲存帶出）、`task-detail.config.js`（`state.prefillFields` 種子）。 [@senior-frontend]

## 3. 回歸與審查

**故事目標**（AC-1.15、AC-1.16、SC-002k）：以外部工具與獨立審查確認既有行為不變。

- [ ] 3.1 執行 typecheck、test:node 與範圍限定的 Playwright（新 spec、所有引用 `dialogue_fields` 或 payload 形狀的規格），皆 exit 0。 [@main]
- [ ] 3.2 senior-code-reviewer 獨立審查 Generalization-First、Data Fairness 與 Principle X。 [@senior-code-reviewer]

## 4. Source-Verify 與 archive

**故事目標**（SC-002k）：正典引用可定位，並完成 archive 寫回。

> **最終群組**：否（堆疊 PR 的第一個 change；archive 因維護者派工裁定隨本 change 完成，PR-B 以另一個 change 堆疊其上）。

- [ ] 4.1 Source-Verify 預掃，衍生檢視每一則正典引用皆可 grep 定位。 [@main]
- [ ] 4.2 執行 openspec archive，正典 013 寫回 8.6.2 至 8.7.0（MINOR）並新增 Changelog，同步衍生檢視 Purpose 版號，STATUS.md 只改自己那列。 [@main]
