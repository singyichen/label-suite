---
對應 Spec: specs/foundation/002-user-path-map-freshness-check/spec.md
對應 Issue: https://github.com/singyichen/label-suite/issues/906
基準版本: 2.0.0
目標版本: 3.0.0
---

## Why

GitHub issue #906 指出：freshness checker 目前只比對畫面清單指紋，因此「內容已過期」仍會通過。這不是實作疏漏，而是 v2.0.0 刻意寫死的不變式——FR-004 規定 Stage 2 監看來源「必須且只包含」screen IDs 與 view IDs，FR-005 規定記錄值必須且只能來自唯一的 `path-map-screen-fingerprint` meta。兩條合起來的後果是：任何不增減畫面／視圖 ID 的變更都不會改變指紋。

實際踩到的情境是 prototype 行為修正：#719（審核送出後自動前進）與 #722（仲裁進度計數）都只改 `annotation-workspace.config.js` 的既有行為，沒有新增或移除任何畫面／視圖 ID，因此指紋不動，`user-path-map.html` 第 12 節即使整段描述已經與 prototype 相反，checker 仍回報 `PATH_MAP_FRESH`。要讓這種情況變紅，就必須修訂 FR-004／FR-005 的來源集合，所以不能走 Lightweight Path，必須開 OpenSpec change。

**Stage 3 的判準選擇**：新增的判準必須可由「路徑圖自己指名的來源」機械重算，且延續 FR-005 的禁令（不得引入 git revision、mtime、日期或任何時間戳）。本變更採兩族規則：

1. **引用可解析性**——路徑圖內文中出現的 `檔案:行號` 引用，其檔案必須仍能解析到實際檔案，且行號必須仍在該檔行數範圍內。
2. **grep 宣稱複驗**——路徑圖以 `grep` 命令當證據所陳述的計數（`<檔案> = <N>`、`<目錄> → <N> 行`），必須由 checker 在程序內重新計算並逐一相符；寫得出 `grep` 卻無法解析出計數者，視為無法判斷而 fail closed。

第 2 族是真正能抓到上述情境的機制：prototype 行為一改，被指名檔案的命中數就會變，路徑圖若沒同步就紅。

**issue #906 原文建議的第 1 條規則不成立，故未採用**：它假設「回歸測試存在 ⇒ 該 issue 已解決」，可用 `design/prototype/tests/task-management/issue-724-task-new-step1-preset.spec.ts` 反證——該檔存在，但第 12 節第 6 列正確記錄 #724 的摩擦「仍在」（那是回退測試）。若再要求每張被追蹤 issue 的列都引用其正典 spec 檔，#724、#755、#766 今天就會誤判為紅。

**刻意偏離 issue #906 的一點**：#906 建議把「引用指向已不存在的東西」歸為 configuration failure。本變更改判為 exit `1`（stale），因為 FR-002 把 exit `2` 保留給真正無法判定的狀態；引用指不到檔案是已證實的分歧，不是無法判定。真正無法判定的是「有 `grep` 宣稱但語法無法解析」與「宣稱目標無法唯一解析」，這兩者維持 exit `2`。

## What Changes

- 修訂 FR-004 的監看來源集合：除既有的 screen IDs 與 view IDs 外，新增「`design/system/user-path-map.html` 內文自己指名的檔案、行號與 `grep` 計數宣稱所指向的來源」。Stage 2 的來源集合與行為完全不變。
- 修訂 FR-005：記錄值的唯一來源仍是 `<head>` 的指紋 meta；Stage 3 的比較對象改為「路徑圖內文自陳的值」與「checker 由被指名來源即時重算的值」。仍不得使用 git revision、mtime、日期或任何 fallback。
- 評估順序固定為 Stage 2 先、Stage 3 後：指紋不符時直接 exit `1` 回報 `PATH_MAP_STALE_FINGERPRINT`，不再進行 Stage 3，確保 Stage 2 既有行為零回歸。
- 新增穩定 rule ID：`PATH_MAP_CITATION_UNRESOLVED`（exit `1`）、`PATH_MAP_CLAIM_COUNT_MISMATCH`（exit `1`）、`PATH_MAP_CLAIM_UNDECIDABLE`（exit `2`）。
- AC-2.5 negative control 的前提隨之收窄：未增減 ID 的 prototype 編輯僅在「未觸及路徑圖任何引用或宣稱」時才維持 fresh。既有測試依此改寫斷言，不刪除。
- 不修改 `design/system/user-path-map.html`、prototype 頁面、screen inventory、API、DB schema、產品 runtime 或 dependency。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `foundation/002-user-path-map-freshness-check`：freshness 判定由單一指紋擴充為「指紋 ＋ 被指名來源完整性」兩段式。

## Impact

- 影響 `scripts/check-user-path-map-freshness.mjs` 與 `scripts/speckit-tests.sh`；`scripts/ci-jobs.tsv`、`.github/workflows/ci.yml` 與 `CLAUDE.md` 的既有 mapping 不變，production job 與本機命令維持同一個 entry point。
- production gate 啟用後，任何讓路徑圖既有引用失效或既有 `grep` 計數改變的變更都會阻擋合併，必須同步更新路徑圖內文。
- 不影響 API、DB schema、產品 UI runtime 或 dependency。

## Constitution Check

- **I. Spec-First**：先修訂 FR-004／FR-005 的來源集合，再實作；每個 task 皆追溯既有 FR／AC／SC。
- **IV. Test-First**：`[@senior-qa]` 先提交並執行 Stage 3 Red contract，主 session 驗證 expected failure 後才派 paired Green；Green 不得改寫 Red。
- **X. Change Scope Discipline**：只處理 freshness 判準；不重繪路徑圖、不動 prototype、不動 screen inventory。
- **XVII. CI/CD Quality Gates**：沿用既有 `user-path-map-freshness` job 與本機命令，不新增或放寬 gate。
- **XIX. Environment & Configuration Integrity**：無法解析的宣稱一律 fail closed，不以時間、`HEAD` 或 mtime 猜測。
- **XX. Source of Truth & Contract Governance**：所有新判準都由路徑圖自己指名的來源重算，路徑圖仍是唯一的記錄值來源，不另建別名或 fallback。
- **II. Generalization-First（NON-NEGOTIABLE）**：不觸及 NLP task type、registry 或 task runtime。
- **III. Data Fairness（NON-NEGOTIABLE）**：不讀取、輸出或新增 dataset、annotation、gold answer 或 scoring metadata。
