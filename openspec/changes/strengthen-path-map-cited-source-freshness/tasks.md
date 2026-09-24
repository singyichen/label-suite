# 任務清單：strengthen-path-map-cited-source-freshness

## 1. PR-1 Stage 3 被指名來源判定

> **相依與平行性**：單一 PR，無前置 change；Red 與 Green 嚴格序列，不可平行。
>
> **commit 順序說明**：本分支的 commit 依序為 Red `15ab2fde` → propose `fc66050f` → Green `45451025`，propose 落在 Red 之後。**刻意不以 rebase 重排**——重寫 SHA 會讓本檔與 PR 內文引用的三個證據 SHA 全部成為孤兒。
>
> **前置**：`design/system/user-path-map.html` 第 10 節 G7／P1 兩段過期陳述由 PR #917 先行修正（已合併，merge commit `cbc0d373`），本分支以 `git merge origin/main` 納入，同樣不 rebase，理由同上。

**故事目標**：SC-004 — 讓 checker 在路徑圖引用的來源已不再支持其陳述時變紅，而不只是確認畫面清單未改。

- [x] 1.1 在 `scripts/speckit-tests.sh` 補 Stage 3 Red 回歸，涵蓋計數不符、引用失效、無法判斷與 fingerprint 優先 [@senior-qa]
- [x] 1.2 在 `scripts/check-user-path-map-freshness.mjs` 實作 Stage 3 判定使 Red 轉綠 [@senior-devops]
- [x] 1.3 執行四道驗證指令並蒐集 Red／Green 證據 [@main]
