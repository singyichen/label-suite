# 任務清單：align-lead-time-summation-caliber

> **Apply 前硬閘**：先執行 `openspec validate align-lead-time-summation-caliber --type change` 與 `scripts/check-sdd.sh`，分別回報 OpenSpec schema validation 與 Project SDD lint。兩者都通過才可進入 `/opsx:apply`。主 session／team lead 是唯一可以驗證證據並更新 checkbox 的角色。

> **單一群組**：本變更只改正典條文，生產碼 0 檔、新測試 0 則，遠低於單一 PR 5 檔上限，不拆群組。propose、apply、archive 放在同一個 PR。
>
> **沒有 Red／Green 配對，理由必須先講清楚**：本變更不是「條文先行、實作跟上」，而是**實作先行、條文落後**——`totalLeadTime()`（`design/prototype/pages/shared/annotation-history.js:295`）早於 issue #606 就已採作業階段去重，本變更只是把 FR-091 的文字追上它。因此不存在可寫的失敗契約：任何按新條文寫的測試在修改條文之前就是綠的。既有回歸 `issue-606-lead-time-dedup.spec.ts` 已把三條分支全數釘死，本次以它作為「條文所述口徑確實成立」的證據，並於 1.2 逐則列出對應關係。若日後有人把實作改回純相加，該檔會立刻紅——條文與實作的綁定由它維持，不由本次新增的測試維持。
>
> **序列前提**：本變更寫正典 015 的 Changelog，接續 issue #866（v6.12.0）之後。不動 `design/prototype/pages/`，因此無須重生 `design/system/screen-inventory.md`。本 worktree 專屬 `PW_PORT=8983`。

---

## 1. PR-864 — 累計耗時彙總口徑之條文對齊

> **相依與平行性**：嚴格依序 1.1 → 1.2 → 1.3 → 1.4，不使用 parallel markers。本群組不改任何生產碼、不改 FR-088 的 `lead_time` 本身口徑（該次開啟之頁面可見時間累計）、不改 014 `work-log` 的工時匯總、不改 FR-090 的可見性分層規則。

**故事目標**：SC-006 — 關鍵操作皆有歷程可追溯；但「累計耗時」的彙總口徑在正典與實作之間分岔，照 FR-091 條文驗收的人會得到和 `annotation-list` 畫面不一樣的數字，追溯因此失效。

- [x] 1.1 執行 `openspec validate align-lead-time-summation-caliber --type change` 與 `scripts/check-sdd.sh`，分別記錄 OpenSpec schema validation 與 Project SDD lint 之 exit code。兩者皆 exit 0 才可進入 1.2。 [@main]
  - 閘門 1 → exit **0**（`Change 'align-lead-time-summation-caliber' is valid`）。
  - 閘門 2 → exit **0**，0 error／13 warning（皆為既有 legacy 與 review 類：`LEGACY_SPEC_HEADING`、`STATUS_EXTERNAL_STATE`、`GOAL_SEMANTIC_REVIEW` 等，非本變更引入）。
- [x] 1.2 執行 `design/prototype/tests/annotation/issue-606-lead-time-dedup.spec.ts`（於 `design/prototype/` 下帶本 worktree 專屬 `PW_PORT=8983`），確認三則皆綠，並逐則對應到新條文的三條分支規則。 [@main]
  - 對應關係（這是本項的重點，不是只看綠燈）：
    - 「一次送出寫入的信封與三筆決策事件只計一次工時」→ 規則（1）同一作業階段（同 `actor_id` 且同 `started_at`）取其中最大值，不逐筆相加。
    - 「同一位審核員在同一樣本上分兩次送出，兩段工時必須相加」→ 規則（2）`started_at` 不同即為不同作業階段，各自計入。
    - 「沒有 `started_at` 的舊事件各自獨立計時，不被誤併」→ 規則（3）無 `started_at` 之事件各自計入，不得併入任何階段，也不得被丟棄。
  - 若任一則紅，即代表實作與本變更所寫的條文不符——此時**必須停止回寫**並回報，不得改條文去遷就紅燈。
  - 本變更未觸及 `design/prototype/pages/**` 與 `frontend/**`，故 prototype 全量 `playwright test` 與 `typecheck` 不在本 PR 的 code/test gate 範圍內（CI 對應 job 亦為路徑閘門）；上述單檔執行為口徑證據，不冒充全量閘門。
  - 執行證據：`PW_PORT=8983 pnpm exec playwright test tests/annotation/issue-606-lead-time-dedup.spec.ts` → exit **0**，**3 passed (1.4s)**，三則對應三條分支規則，全數成立。本 worktree 之 `design/prototype/node_modules` 原不存在，先以 `pnpm install --frozen-lockfile` 還原（未改動 `pnpm-lock.yaml`）。
- [x] 1.3 更新 `specs/annotation/015-annotation-workspace/spec.md`，完成 gate 4 回寫，內容如下。 [@main]
  - 版號 MINOR bump（以當下最新版號接續），Changelog 補一列，並載明本次不動生產碼、不新增測試之理由。
  - FR-091 補本版修訂段：把「累計耗時為該樣本全部事件 `lead_time` 之和」改為以作業階段為單位彙總，逐一載明三條分支規則，並明確禁止「取全域最大值」這個看似等價的簡化。
  - AC-1.25 補一句修訂註記：其「累計耗時為兩筆事件耗時之和」於新口徑下仍成立（兩筆分屬不同 `actor_id` 之作業階段），既有斷言逐字保留、不得改寫。
  - FR-016B 之 v4.63.0 段落末句「其『累計耗時』仍計入全部事件」補註指向新口徑——該句是同一個舊說法的第二份拷貝，漏改即留下半套。其原意（折疊為呈現層、不影響彙總）不變。
  - 新情境於回寫時取得正式 AC 編號（`## MODIFIED` 區塊不得含新 AC ID，故 delta 內該情境只有標題）。
  - 逐字保留複驗：FR-088 之 v6.9.0 修訂段、v4.63.0 Changelog 列（含「另案處理」之原文）皆不得改寫——它們是本變更成立的依據，改掉依據等於抹去沿革。
  - 回寫證據：正典 015 v6.12.0 → **v6.13.0**（MINOR）。內容：frontmatter 版號、FR-091 補 v6.13.0 修訂段（作業階段鍵＋三條分支規則＋禁止全域最大值）、AC-1.25 補 v6.13.0 註記、FR-016B 之 v4.63.0 段落補 v6.13.0 註記、新增 **AC-1.33**（四筆事件三種分支之彙總值為 145，而非 175 或 80）、Changelog 補一列。
  - 逐字保留已複驗：v4.63.0 原句「其「累計耗時」仍計入全部事件」、FR-088 v6.9.0 修訂段、v4.63.0 與 v6.9.0 兩列 Changelog 皆原樣未動，新內容一律以附加註記形式呈現。
- [x] 1.4 執行 Source-Verify 後 `/opsx:archive`，並確認衍生檢視中每一處正典引用皆可 `grep` 定位（FR-091、FR-088、FR-090、FR-086、FR-016B、AC-1.25、SC-006、issue #864／#606／#601／#583，以及 `totalLeadTime` 與 `design/prototype/pages/shared/annotation-history.js`）。 [@main]
  - archive 之後必須數一次 diff 刪除行中的 `#### Scenario` 計數，須為 0——`## MODIFIED` 以整塊覆蓋既有 requirement，漏抄任何一則既有情境都會靜默消失。
  - Source-Verify 預掃（archive 之前執行，`/usr/bin/grep`）：FR-091 11／FR-088 12／FR-090 7／FR-086 19／FR-016B 23／AC-1.25 5／AC-1.33 2／SC-006 3 命中，issue `#864` 5／`#606` 3／`#601` 6／`#583` 13 命中（皆於正典 015）；`function totalLeadTime` 於 `design/prototype/pages/shared/annotation-history.js` 1 命中；`design/prototype/tests/annotation/issue-606-lead-time-dedup.spec.ts` 檔案存在。
  - **預掃抓到一處引用誤植**：Changelog 原本把 FR-088 的 #583 條文引為「……舊事件 MUST 原樣保留」，但那是**衍生檢視**的措辭——正典自己寫的是「必須原樣保留」，以引文 grep 正典 0 命中。已於 `3cf435b5` 改為正典逐字措辭。兩道 lint 都不驗引用，這類誤植只有 gate 4 抓得到。
  - Archive：`openspec archive align-lead-time-summation-caliber --yes` → exit **0**，`archived as '2026-09-20-align-lead-time-summation-caliber'`；衍生檢視 `openspec/specs/annotation/015-annotation-workspace/spec.md` **+12 行、0 刪除**（`Totals: + 0, ~ 1, - 0, → 0`）。
  - 情境流失複驗：diff 刪除行中 `#### Scenario` 計數為 **0**，新增 1 則——`## MODIFIED` 已逐字重現 FR-091 原有兩則情境（AC-1.25 清單彙總、同時戳決策事件取最後寫入者）。
  - archive 後重跑：`scripts/check-sdd.sh` → 0 error／12 warning；`scripts/check-spec-artifacts.sh` → `Spec artifact check passed`。
