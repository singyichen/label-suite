# 任務清單：strengthen-path-map-cited-source-freshness

## 1. PR-1 Stage 3 被指名來源判定

> **相依與平行性**：單一 PR，無前置 change；Red 與 Green 嚴格序列，不可平行。

**故事目標**：SC-004 — 讓 checker 在路徑圖引用的來源已不再支持其陳述時變紅，而不只是確認畫面清單未改。

- [ ] 1.1 在 `scripts/speckit-tests.sh` 補 Stage 3 Red 回歸，涵蓋計數不符、引用失效、無法判斷與 fingerprint 優先 [@senior-qa]
- [ ] 1.2 在 `scripts/check-user-path-map-freshness.mjs` 實作 Stage 3 判定使 Red 轉綠 [@senior-devops]
- [ ] 1.3 執行四道驗證指令並蒐集 Red／Green 證據 [@main]
