# 任務清單：task-run-identity-contract

> 本 change 對應 issue #1160 的 014 task/run 身分正典對齊，僅交付規劃文件與 OpenSpec 衍生檢視。013 的 `task-config-version-contract`、015 的 `annotation-run-identity-contract` 為相依 change；14 張表仍是候選，沒有 ORM、migration、API、已部署 Schema 或 NoteCraft 圖面。主 session 逐項核對 commit 與驗證結果後，才更新下列核取方塊。

## 1. 正典決策

> 依賴：先由 senior-dba 裁決 T1～T12，再對齊 Accepted ADR-022，最後修訂 014 正典；本群組依序執行。

**故事目標**：task-management-014 SC-053／SC-054 — 重啟 R1 保留歷史，run item 互斥且發布身分、冪等與交易邊界可追溯。

- [x] 1.1 修訂 `docs/adr/022-task-state-machine-location.md`，釐清退回 draft 關閉目前 cycle、保留歷史，以及每次發布各自擁有 snapshot；依 DBA 裁決核對狀態轉換表與不變式。 [@main]
- [x] 1.2 修訂 `specs/task-management/014-task-detail/spec.md` 至 v6.0.0，寫入 FR-005h、FR-010b～f、FR-010f-2～f-6、FR-010u、FR-014／017a、FR-022 與 AC-3.40～3.46／SC-053～056；核對 sealed dataset、Official 保留額度、版本釘選、候選名冊、終局排除及 Changelog。 [@main]

## 2. 014 OpenSpec 四件套

> 依賴：1.1～1.2 與相依的 013 v8.3.0、015 v11.0.1 正典；依 proposal → design → delta → tasks 的順序。014 change 不收錄 013／015 delta。

**故事目標**：task-management-014 SC-055／SC-056 — 指引與 config/schema 版本、即時權限、排除及公開抽樣均有單一 owning source。

- [x] 2.1 建立 `openspec/changes/task-run-identity-contract/proposal.md`，frontmatter 僅標 014 正典，說明 issue #1160 的問題、跨 change 相依、候選未部署界線與回滾。 [@main]
- [x] 2.2 建立 `openspec/changes/task-run-identity-contract/design.md`，記錄 cycle／run／snapshot／版本／membership 的 DBA 決策與 SQLite／PostgreSQL 待實測邊界，不將候選表寫成已核准物理 schema。 [@senior-dba]
- [x] 2.3 建立 `openspec/changes/task-run-identity-contract/specs/task-management/014-task-detail/spec.md`，以正典原文鏡射變更的 FR／AC／SC ID，並保留所有被 MODIFIED 需求原有的 Scenario；執行 `openspec validate task-run-identity-contract --type change`，預期 exit 0。 [@main]
- [x] 2.4 建立 `openspec/changes/task-run-identity-contract/tasks.md`，每個 artifact task 限一檔、每列恰一個派工標籤，明列相依、審查及 archive 閘門；主 session 核對後才勾選。 [@main]

## 3. 狀態與衍生 inventory

> 依賴：三份正典版本及三個 OpenSpec owner 均已確定；3.2 待 013／014／015 的 SC 計數固定後執行。兩項分別只變更一檔。

**故事目標**：task-management-014 SC-053／SC-055 — 索引與衍生檢視指向正確版本，不能把規劃狀態誤讀為已部署。

- [x] 3.1 更新 `specs/STATUS.md` 的 013／014／015 三列，版本與正典檔頭一致，015 不再標示 `done`，並明示 issue #1160 僅規劃候選資料表。 [@main]
- [x] 3.2 先執行 `node scripts/gen-screen-inventory.mjs --check` 記錄 stale 預期失敗，再由 `node scripts/gen-screen-inventory.mjs` 重生 `design/system/screen-inventory.md`；執行 `node scripts/gen-screen-inventory.mjs --check` 與 `bash scripts/inventory-tests.sh`，預期皆 exit 0。 [@main]

## 4. 審查與四層驗證

> 依賴：1～3 已完成且三個 change 的 owner 不衝突；4.1～4.4 可平行審查，4.5～4.7 依序由主 session 執行。審查只產生回報，若需修正須回到對應單檔任務；本 change 沒有 runtime Green 測試可宣稱通過。

**故事目標**：task-management-014 SC-053～SC-056 — 正典與 delta 的身份、抽樣、版本、授權及安全語意一致，文件驗證與後續實體測試範圍清楚分開。

<!-- parallel:start -->
- [x] 4.1 senior-dba 審查 014 與 ADR-022 的 cycle、Official 唯一性、sealed-version 餘額及 SQLite／PostgreSQL 候選約束；不改檔，回報阻擋項。 [@senior-dba]
- [x] 4.2 senior-code-reviewer 審查 source ownership、013／014／015 相依、OpenSpec delta 與 design 一致性；不改檔，回報阻擋項。 [@senior-code-reviewer]
- [x] 4.3 senior-qa 依 014 AC-3.40～3.46／SC-053～056 核對 delta Scenario 的 Given／When／Then、舊 Scenario 保存及後續雙資料庫測試缺口；不改檔，回報驗收結果。 [@senior-qa]
- [x] 4.4 senior-security 審查 private answer／declared_split 隔離、停用 membership 即時撤權與 reviewer 候選快照界線；不改檔，回報阻擋項。 [@senior-security]
<!-- parallel:end -->

- [x] 4.5 驗證任務（不改檔）：執行 `openspec validate task-run-identity-contract --type change`，預期 exit 0；執行 `git diff --check`，預期無 whitespace error。 [@main]
- [x] 4.6 驗證任務（不改檔）：執行 `bash scripts/check-sdd.sh`、`node scripts/gen-screen-inventory.mjs --check` 與 `bash scripts/inventory-tests.sh`，預期均 exit 0；若 inventory 尚未更新，先完成 3.2，不以其他 gate 的通過掩蓋此錯誤。 [@main]
- [x] 4.7 Source-Verify 任務（不改檔）：執行 `rg -n -F -e 'FR-010f-5' -e 'FR-010f-6' -e 'AC-3.40' -e 'SC-053' specs/task-management/014-task-detail/spec.md openspec/changes/task-run-identity-contract/specs/task-management/014-task-detail/spec.md`，預期兩檔皆可定位；再逐條比對 delta 的全部 FR／AC／SC 原文與 014 v6.0.0、版本、Changelog、ADR-022 引用，且 013／015 引用可在各自正典定位。 [@main]

## 5. Archive 與交付

> 依賴：4.1～4.7 通過、主 session 留存審查與 Source-Verify 證據；archive 的產物為工具一次生成的多檔變更，後續逐條核對 derived view 才算完成。

**故事目標**：task-management-014 SC-053～SC-056 — 衍生需求與正典可定位且交付結果清楚標示規劃範圍。

- [x] 5.1 執行 `openspec archive task-run-identity-contract --yes` 並核對工具輸出；Exception: governance-propagation; Files: `openspec/changes/task-run-identity-contract/proposal.md`, `openspec/changes/task-run-identity-contract/design.md`, `openspec/changes/task-run-identity-contract/tasks.md`, `openspec/changes/task-run-identity-contract/specs/task-management/014-task-detail/spec.md`, `openspec/changes/archive/2026-10-06-task-run-identity-contract/proposal.md`, `openspec/changes/archive/2026-10-06-task-run-identity-contract/design.md`, `openspec/changes/archive/2026-10-06-task-run-identity-contract/tasks.md`, `openspec/changes/archive/2026-10-06-task-run-identity-contract/specs/task-management/014-task-detail/spec.md`, `openspec/specs/task-management/014-task-detail/spec.md`; Reason: OpenSpec archive 必須原子搬移 change 四件套並回寫 014 derived view，無法以單檔任務完成。 [@main]
- [x] 5.2 驗證任務（不改檔）：核對 4.5 留存的 archive 前 `openspec validate task-run-identity-contract --type change` exit 0 證據；active change 已移入 archive，不對舊名稱重跑。於 repo root 執行 `for source in specs/task-management/014-task-detail/spec.md openspec/changes/archive/2026-10-06-task-run-identity-contract/specs/task-management/014-task-detail/spec.md openspec/specs/task-management/014-task-detail/spec.md; do for id in FR-005h FR-010b FR-010c FR-010d FR-010e FR-010f FR-010f-2 FR-010f-3 FR-010f-4 FR-010f-5 FR-010f-6 FR-010i-1 FR-010i-2 FR-010s-1 FR-010t FR-010u FR-014 FR-017a FR-018 FR-021 FR-022 AC-1.26 AC-3.40 AC-3.41 AC-3.42 AC-3.43 AC-3.44 AC-3.45 AC-3.46 SC-005 SC-011 SC-050 SC-053 SC-054 SC-055 SC-056; do rg -n -F -e "$id" "$source" || exit 1; done; done`，預期三檔的全部 36 個變更 ID 均可定位；另人工核對 014 v6.0.0、Changelog、ADR-022 與原文措辭一致，記錄 Source-Verify/write-back 證據。 [@main]
- [ ] 5.3 建立繁體中文 PR；所有 CI job（含非 required 的 Prototype Playwright）完成且成功後合併，並只勾選 issue #1160 已驗證的 014 正典規劃項；物理欄位字典、NoteCraft ER 與 runtime 保留後續工作。 [@main]
