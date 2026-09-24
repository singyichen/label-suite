# 任務清單：pl-exception-disposal-screen-shell

> **範圍硬閘**：只得修改 `design/prototype/**`、本 change 與正典／治理檔；不得修改 `backend/**`、`frontend/**` 或 root `e2e/**`。Apply 前執行 OpenSpec schema validation 與 Project SDD lint。

## 1. PR-907A — 最終例外處置畫面改用例外池專屬外殼

> **相依與平行性**：1.1 → 1.2 → 1.3 → 1.4 → 1.5 嚴格依序；1.2 與 1.3 集中於 `annotation-workspace.config.js` 與 `annotation-workspace.html` 的內嵌樣式段落，不可與其他動同檔的 change 並行 apply。

**故事目標**：延伸 SC-004W 所建立的「工作區版面與該單位資料層推導值一致」標準至專案負責人視角——專案負責人開啟最終例外處置畫面時，看到的 MUST 是例外池佇列與待處置計數，而非整份資料集的標記樣本、標記提交進度與永不前進的自動儲存狀態；並能就地看到仲裁理由與排除動作的風險提示。本畫面尚無對應 SC，其可量測成功標準於 1.5 的 archive 回寫時新增。

- [ ] 1.1 以 `design/prototype/tests/annotation/issue-907-exception-pool-screen-shell.spec.ts` 建立 committed Red：以專案負責人身分開啟 T016 正式標記的最終例外處置畫面，斷言左側清單筆數等於該任務該回合的待處置例外項數且不含標記進度狀態、進度文字不含「已提交」、自動儲存狀態列不存在、每一例外項呈現仲裁者與仲裁理由、排除動作具備危險樣式類名。記錄 expected failure。 [@senior-qa]
- [ ] 1.2 Green：於 `design/prototype/pages/annotation/annotation-workspace.config.js` 將專案負責人自標記員的樣本清單、樣本導覽與自動儲存分支抽離，左側佇列改消費既有的 `listReviewPoolItems()` 待處置例外項，進度改以待處置例外項計數，並於每列呈現仲裁者與仲裁理由；不得弱化 1.1。 [@main]
- [ ] 1.3 於 `design/prototype/pages/annotation/annotation-workspace.html` 既有迷你按鈕樣式段落，為自資料集排除的操作項加上與其餘三個採用型處置可區辨的危險樣式，沿用設計系統既有 danger 色階 token。 [@main]
- [ ] 1.4 執行 prototype typecheck、issue #907 定向 Playwright、全量 prototype Playwright、screen inventory 重生、使用者到達路徑圖時效檢查、Project SDD lint 與測試盤點；全部通過後才開 PR，CI 全綠後 merge。 [@main]
- [ ] 1.5 正典 015 MINOR bump，修訂 FR-095 加入畫面外殼段落並新增一條可量測成功標準；delta 中的新情境於 archive 時接續對應使用者故事現行最大 AC 編號，補 Changelog；archive 後逐條 Source-Verify。 [@main]

## 非本 change 範圍

issue #907 預期結果第 4 點後半（底部改為「尚未選擇最終處置」＋「確認處置」）另立 issue 與 change：該改動會取代 AC-4.56／AC-4.57 已驗證的「一鍵完成」互動契約，屬互動模型變更而非畫面外殼。
