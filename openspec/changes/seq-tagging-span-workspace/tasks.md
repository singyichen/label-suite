# 任務清單：sequence_tagging 作業面遷移至 span 座標系（issue #581 change ②）

> **拆分總則（憲法原則 X）**：本變更觸及 4 個手寫產品檔案（未達 5 檔上限），但預覽渲染層與答案序列化層的改寫 diff 合計必然超過 300 行，故拆為 **2 組實作群組 ＋ 1 組最終 archive 群組**。每組宣告其涵蓋的 FR、觸及的產品檔案、Red 任務與 Green 任務。**只有最終群組執行 `/opsx:archive` 與正典回寫**。
>
> **分支與 PR 偏離（維護者裁定，2026-09-04）**：維護者指示本 change 的實作不另開分支，直接接續 change ① 群組 2 所在的分支。因此該分支的 PR 將同時承載 change ① 與 change ②，偏離 ADR-033 Rule 1「一個 PR 對應一個 OpenSpec change」。**PR 描述必須明載此點**，並分段列出兩個 change 各自的 Red／Green 證據。
>
> **TDD 硬規則**：每個可觀察行為皆為一組 Red（`[@senior-qa]`）＋ Green（`[@senior-frontend]`）配對。Red 任務必須先 commit 並執行、留下預期失敗證據，Green 任務才能開始；Green 任務不得為了讓測試通過而改寫 Red 契約。任務 checkbox 僅由主 session 勾選。
>
> **繼承自 change ① 的待清償項**：change ① 群組 2 的 commit `ff5cb02f` 為了取得可信的回歸結果，將 6 個工作區測試標為跳過並註明由本 change 還原。**本 change 的完成定義包含這 6 個跳過標記全數解除**——分佈為序列標註工作區規格檔整個 describe（4 個）、提交驗證規格檔的全 O 網格案例（1 個）、審核員規格檔 registry 迴圈的 `sequence_tagging` 案例（1 個）。
>
> **產品檔案計數**：測試檔、`specs/**`、`openspec/**`、工具設定檔不計入 5 檔上限。
>
> **群組間相依**：群組 1 → 2 → 3 嚴格序列。群組 1 的 span 標記介面是群組 2 答案序列化的輸入；群組 3 的正典回寫需在前兩組行為全部落地後才具備 Source-Verify 依據。群組內一律序列執行。

## 0. 前置

**故事目標**（SC-004）：`specs/STATUS.md` 如實反映 015 已有一個開啟中的 OpenSpec change，使 `sequence_tagging` 的作業面改版有正確的流程狀態基準。

- [ ] 0.1 於 `specs/STATUS.md` 將 `annotation-015` 的狀態由 spec-ready 更新為 change-open 並填入本 change 名稱。驗證：`scripts/check-sdd.sh` 不再回報 ACTIVE_CHANGE_STAGE [@main]

## 1. 群組 1 — annotator 標記介面改拖曳圈選（FR-024A／FR-024A-1／FR-024A-2）

**故事目標**（SC-004／SC-008）：標記工作區的 `sequence_tagging` 卡片以原始文本為單一圈選面，拖曳產生字元 offset 的 `spans[]`；吸附只影響落點；相交落點被拒絕；空 span 阻擋提交；缺少 `Intl.Segmenter` 時降級但資料照常參與計算。

> **產品檔案（2）**：`design/prototype/pages/annotation/annotation-workspace.config.js`、`design/prototype/pages/task-management/task-config.engine.js`
> **最終群組**：否。本組不執行 archive。
> **相依**：任務 0.1。

- [x] 1.1 撰寫 Red 契約：解除 `design/prototype/tests/annotation/annotation-workspace-sequence-tagging.spec.ts` 的 describe 跳過標記，並將其測試由 token 座標系改寫為 span 契約——卡片顯示未切分文本且無 Token 網格與任何 `B-` 前綴按鈕；預標記 span 以已標記清單呈現；拖曳圈選後點選標籤類型新增一筆 span 並落在正確字元位置；自清單刪除一筆 span 會同步移除其反白；bypass 後標籤類型鈕與清單刪除鈕皆停用。原第 3 個測試（跨樣本往返保存）依賴 CompactAnswer 形狀，改由群組 2 承接。驗證：`PW_PORT=8921 corepack pnpm playwright test tests/annotation/annotation-workspace-sequence-tagging.spec.ts` 全數失敗，失敗原因為工作區尚未提供 span 介面的測試錨點 [@senior-qa]
- [x] 1.2 （Green）修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：移除 `patchSequenceTaggingPanel` 及其於輸出卡片渲染分派處的呼叫，改由引擎的拖曳圈選預覽直接承接；同步移除依前一 Token 標籤推導 `B-` 前綴的邏輯與 `ws-seq-tag-btn` 系列測試錨點的產生路徑，改為 span 介面的對應錨點。驗證：`PW_PORT=8921 corepack pnpm playwright test tests/annotation/annotation-workspace-sequence-tagging.spec.ts` 全綠 [@senior-frontend]
- [x] 1.3 撰寫 Red 契約覆蓋吸附與降級：新增 `design/prototype/tests/annotation/issue-581-workspace-snap-degrade.spec.ts`——`snap_unit` 為 word 時起訖點吸附至詞界；以 stub 移除 Intl.Segmenter 後同一拖曳不吸附、標記卡顯示一行提示、任務設定值不變。驗證：`PW_PORT=8921 corepack pnpm playwright test tests/annotation/issue-581-workspace-snap-degrade.spec.ts` 出現失敗，失敗原因為工作區尚無降級提示（吸附本身已由引擎的共用預覽承接，故該項於撰寫時即為綠燈）[@senior-qa]
- [x] 1.4 （Green）修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：依任務設定的 `snap_unit` 決定放開滑鼠時的落點吸附，詞界判定使用前端 `Intl.Segmenter`；該 API 缺席時退回不吸附並於標記卡顯示一行操作說明提示。驗證：`PW_PORT=8921 corepack pnpm playwright test tests/annotation/issue-581-workspace-snap-degrade.spec.ts` 全綠 [@senior-frontend]
- [x] 1.5 撰寫 Red 契約覆蓋提交驗證：解除 `design/prototype/tests/annotation/annotation-workspace-submit-validation.spec.ts` 的單一跳過標記，並將全 O 網格案例改寫為 span 版本——無 span 且未 Bypass 時提交被阻擋，建立任一 span 後阻擋解除，越界預標記列為錯誤而其餘正常落位。驗證：`PW_PORT=8921 corepack pnpm playwright test tests/annotation/annotation-workspace-submit-validation.spec.ts` 全數失敗，失敗原因為提交驗證仍比對 tag 與 Token 數量 [@senior-qa]
- [x] 1.6 （Green）修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：提交前驗證由「tag 數量等於 Token 數量」改為 span 合法性驗證（起點不小於終點、起點為負、終點超出文本長度三者為錯誤），保留「未建立任何 span 且未 Bypass 時阻擋提交」語意。驗證：`PW_PORT=8921 corepack pnpm playwright test tests/annotation/annotation-workspace-submit-validation.spec.ts` 全綠 [@senior-frontend]
- [x] 1.7 執行群組 1 回歸。驗證：`cd design/prototype && corepack pnpm typecheck && PW_PORT=8931 corepack pnpm playwright test tests/annotation` — typecheck 退出碼 0、playwright 736 passed / 0 failed / 1 skipped；唯一的 skip 是任務 2.5 要解除的審核員 registry `sequence_tagging` 案例，故本組未留下任何待群組 2 修復的失效斷言 [@main]

## 2. 群組 2 — CompactAnswer 形狀與審核呈現改 span-level（FR-024A-3／FR-052／FR-024L）

**故事目標**（SC-004R／SC-004H）：提交 payload 為 `spans[]` 形狀；CompactAnswer 改為帶 offset 的四鍵形狀使審核回填改為精確定位；差異比對以起訖點與標籤為合併鍵做集合比對；統計盒以不帶前綴的標籤類型計數。

> **產品檔案（4）**：`design/prototype/pages/annotation/annotation-workspace.config.js`、`design/prototype/pages/annotation/annotation-workspace.data.js`、`design/prototype/pages/annotation/annotation-list.html`、`design/prototype/pages/task-management/task-config.engine.js`
> **最終群組**：否。本組不執行 archive。
> **相依**：群組 1 全數落地後開始（本組序列化的來源是群組 1 建立的 `spans[]`）。

- [x] 2.1 撰寫 Red 契約覆蓋 CompactAnswer 形狀與精確回填：新增 `design/prototype/tests/annotation/issue-581-compact-answer-spans.spec.ts`——提交 payload 含 span 陣列、吸附單位、Bypass 與版本四鍵而不含 token 陣列、tag 陣列、標記方案與單位；審核員開啟一筆標記員答案時，重複出現的相同文字（T006 樣本的「台」於兩個不同 offset）各自回填至其原本 offset。驗證：`PW_PORT=8922 corepack pnpm playwright test tests/annotation/issue-581-compact-answer-spans.spec.ts` 全數失敗，失敗原因為序列化仍為兩鍵形狀且回填仍靠文字比對。實際證據：Red commit `4d70a639` 兩案例全數失敗（序列化仍為兩鍵形狀、回填仍靠文字比對）；commit `9e58e4aa` 修正其中的 Bypass 斷言（原型僅在實際勾選時才於 `previewBypass` 寫入該型別鍵，故一般作答不應斷言鍵存在），並改以第三個 Bypass 往返案例覆蓋該子句 [@senior-qa]
- [x] 2.2 （Green）修改 `design/prototype/pages/annotation/annotation-workspace.config.js`：將取得 token 文字、由 tag 建立答案對、由答案對重建 tag 三個函式改建於 `spans[]` 之上，正向序列化輸出帶 offset 的四鍵形狀，反向重建依起訖點精確定位並移除靠文字比對依序消耗的近似邏輯。驗證：`PW_PORT=8922 corepack pnpm playwright test tests/annotation/issue-581-compact-answer-spans.spec.ts` 全綠。實際證據：Green commit `0a7ec2c6`，3 passed / 0 failed；回填另需將整片 slice 的 `textKey` 留在 null，否則 `seedSpanTaggingPreview()` 會判定文字已變更而重新以資料集欄位覆寫，剛回填的答案會在面板渲染前被清空 [@senior-frontend]
- [ ] 2.3 撰寫 Red 契約覆蓋差異比對與統計盒：新增 `design/prototype/tests/annotation/issue-581-span-diff-and-stats.spec.ts`——審核員更動一個 3 字實體的類型時差異項為 2 項而非 3 項，未更動時回報相同；統計盒顯示不帶前綴的標籤類型計數且不因實體橫跨多字元而重複計數。驗證：`PW_PORT=8922 corepack pnpm playwright test tests/annotation/issue-581-span-diff-and-stats.spec.ts` 全數失敗，失敗原因為比對仍為逐 token 位置且統計仍計帶前綴的 tag [@senior-qa]
- [ ] 2.4 （Green）修改 `design/prototype/pages/annotation/annotation-workspace.data.js`：審核員模擬資料列的 `sequence_tagging` 答案改為帶 offset 的四鍵形狀，答案轉換函式的該型別分支與差異比對合併鍵改用起訖點加標籤。驗證：`PW_PORT=8922 corepack pnpm playwright test tests/annotation/issue-581-span-diff-and-stats.spec.ts` 全綠 [@senior-frontend]
- [ ] 2.5 撰寫 Red 契約覆蓋審核員操作與列表呈現：解除 `design/prototype/tests/annotation/annotation-workspace-reviewer.spec.ts` registry 迴圈中 `sequence_tagging` 案例的跳過標記並將其作答動作由點擊 Token 改為拖曳圈選，同時補上列表頁單列答案摘要顯示標記文字的斷言。驗證：`PW_PORT=8922 corepack pnpm playwright test tests/annotation/annotation-workspace-reviewer.spec.ts` 全數失敗，失敗原因為審核員直接修正路徑仍走 Token 網格 [@senior-qa]
- [ ] 2.6 （Green）修改 `design/prototype/pages/annotation/annotation-list.html`：正式標記回合單列答案摘要的 `sequence_tagging` 分支改讀標籤鍵，並保持既有以文字鍵呈現標記內容的路徑不變。驗證：`PW_PORT=8922 corepack pnpm playwright test tests/annotation/annotation-workspace-reviewer.spec.ts` 全綠 [@senior-frontend]
- [ ] 2.7 移除 `design/prototype/pages/task-management/task-config.engine.js` 中 change ① 群組 2 為避免工作區即刻崩潰而刻意保留的兩個 token 切分輔助函式（`getSequencePreviewTokens` 與 `tokenizeSequenceText`）；其最後的呼叫端是本組改寫的答案序列化層（`getSequenceTokenTexts`），故本任務排在任務 2.6 之後而非群組 1；回歸覆蓋由任務 2.9 的全套回歸提供。驗證：`/usr/bin/grep -rn "getSequencePreviewTokens\|tokenizeSequenceText" design/prototype/pages` 無輸出 [@senior-frontend]
- [ ] 2.8 確認 6 個繼承自 change ① 的跳過標記全數解除。驗證：`/usr/bin/grep -rn "seq-tagging-span-config group 2" design/prototype/tests` 無輸出 [@main]
- [ ] 2.9 執行全套原型回歸。驗證：`cd design/prototype && corepack pnpm typecheck && PW_PORT=8922 corepack pnpm playwright test` — typecheck 退出碼 0、playwright 0 failed 且無新增 skipped [@main]
- [ ] 2.10 執行螢幕清單重新產生。驗證：`node scripts/gen-screen-inventory.mjs` 後 `scripts/check-sdd.sh` 不回報 INVENTORY_FRESHNESS [@main]

## 3. 群組 3 — Source-Verify、archive 與正典回寫（最終群組）

**故事目標**（SC-004C）：015 正典升版至 6.0.0 並帶完整 Changelog，衍生檢視合併本 change 的 delta，任意合法輸出組合仍可在不新增 workspace 分支邏輯的前提下完成標記與審查流程。

> **產品檔案（0）**。本組僅動 `specs/**` 與 `openspec/**`。
> **最終群組**：是。本組執行 `/opsx:archive` 與正典回寫，完成驗證關卡 4。
> **相依**：群組 2 全數落地。

- [ ] 3.1 更新 `specs/annotation/015-annotation-workspace/spec.md`：回寫本 change 的六項 MODIFIED 需求，版本由 5.0.0 升至 6.0.0（MAJOR：標記介面、提交 payload、CompactAnswer 形狀、差異比對鍵四項皆為 BREAKING），並新增對應 Changelog 條目 [@main]
- [ ] 3.2 更新 `specs/annotation/015-annotation-workspace/spec.md` 的規格常數與成功標準：`SEQ_MAJORITY_INVALID_BIO_FALLBACK` 標為本版正式廢止且 ID 不重用，SC-008 列舉的標記控制項由 Token 網格改為 span 圈選面，word-mode 分詞引擎選型的 Open Question 移除，上游依賴表對 013 的 tokenization 契約引用改為 span 契約 [@main]
- [ ] 3.3 措辭同步（Lightweight Path）：更新 `specs/dashboard/012-dashboard/spec.md` 的 `sequence_tagging` token 與 tag 措辭為 span 與標籤，PATCH 升版並補 Changelog。驗證：該檔不再出現 tagging_scheme 與 tokenization 字串 [@main]
- [ ] 3.4 措辭同步（Lightweight Path）：更新 `specs/task-management/014-task-detail/spec.md` 的 `sequence_tagging` token 與 tag 措辭為 span 與標籤，PATCH 升版並補 Changelog。驗證：該檔不再出現 tagging_scheme 與 tokenization 字串 [@main]
- [ ] 3.5 執行 Source-Verify：逐一驗證衍生檢視中每個正典引用（FR 與 AC 編號、章節、檔案路徑、ADR 與 issue 與 PR 編號）皆可定位。驗證：`grep` 逐項命中，無漏無誤 [@main]
- [ ] 3.6 執行 archive 合併衍生檢視。驗證：`openspec archive seq-tagging-span-workspace` 後 `openspec validate --changes --no-interactive` 退出碼 0 [@main]
- [ ] 3.7 更新 `specs/STATUS.md` 將 `annotation-015` 標為 archived 並記錄 6.0.0。驗證：`scripts/check-sdd.sh` 回報 0 error [@main]
