# 任務清單：annotation-run-identity-contract

> 本 change 對應 issue #1160 的 015 標記／審核 run 身分正典對齊。上游 `task-config-version-contract` 擁有 013 初始 config/schema 版本，`task-run-identity-contract` 擁有 014 cycle、run、assignment 與發布時版本釘選；本 change 僅消費其穩定身分。候選資料模型尚未建立 ORM、migration、API、實體 ER 或 NoteCraft 圖面；主 session 核對證據後才更新核取方塊。

## 1. 正典與設計來源

**故事目標**：annotation/015-annotation-workspace SC-013、SC-014 — 重啟 R1 後作業紀錄仍依 run／assignment 隔離，歷史黏著不能繞過即時授權。

> 依賴：senior-dba 的 issue #1160 裁決及上游 013／014 正典版本先定案；以下依正典 → proposal → design 順序執行。各 artifact 任務僅修改所列單檔。

- [x] 1.1 修訂 `specs/annotation/015-annotation-workspace/spec.md` 至 v11.0.1，對齊 FR-014S／FR-049／FR-051／FR-059／FR-061／FR-066／FR-072／FR-073／FR-093、AC-1.3／AC-1.16／AC-1.23、AC-7.1～AC-7.3、SC-013／SC-014 與 Changelog；保持 prototype route/bucket 與正式持久化身分的區別。 [@senior-sa]
- [x] 1.2 建立 `openspec/changes/annotation-run-identity-contract/proposal.md`，只宣告 015 owning spec，界定 013／014 相依、候選未部署與回滾範圍。 [@main]
- [x] 1.3 建立 `openspec/changes/annotation-run-identity-contract/design.md`，記錄 run／assignment、submission-derived reviewer 黏著、即時權限、run-pinned 指引與隱藏答案隔離；物理 FK 留給後續 owning slice。 [@senior-dba]

## 2. Delta 與版本登錄

**故事目標**：annotation/015-annotation-workspace SC-013、SC-014 — OpenSpec 與版本索引能定位跨 cycle 隔離、停用撤權及歷史指引確認的正典來源。

> 依賴：1.1～1.3 完成後鏡射 delta；版本登錄待三份正典版本確定後更新。015 delta 不重述 013 建立或 014 發布規則。

- [x] 2.1 建立 `openspec/changes/annotation-run-identity-contract/specs/annotation/015-annotation-workspace/spec.md`，鏡射 015 v11.0.1 中本次變更的 FR／AC／SC，保留 MODIFIED requirement 原有 Scenario；執行 `openspec validate annotation-run-identity-contract --type change`，預期 exit 0。 [@senior-sa]
- [x] 2.2 更新 `specs/STATUS.md` 的 015 列，使版本與正典檔頭一致，且規劃狀態不誤稱 runtime 已完成；此共享檔的 013／014 列由主 session 一併協調。 [@main]
- [x] 2.3 建立 `openspec/changes/annotation-run-identity-contract/tasks.md`，每個 artifact task 限定一檔，列明依賴、平行審查與 archive 閘門；核取方塊待主 session 核對證據後更新。 [@main]

## 3. 審查與四層驗證

**故事目標**：annotation/015-annotation-workspace SC-013、SC-014 — 正典與衍生條款的身分、盲審、授權及版本語意一致，並清楚區分文件檢查與後續 runtime 證據。

> 依賴：1～2 完成且 013／014／015 的 owner 邊界沒有衝突。3.1～3.4 可平行進行，3.5～3.7 依序由主 session 執行；審查不改檔，若需修正回到所屬單檔任務。

<!-- parallel:start -->
- [x] 3.1 senior-dba 審查 Dry `run_id × dataset_item_id` 黏著、Official 單位鍵、已提交責任鏈與非持久化 ReviewAssignment；不改檔，回報阻擋項。 [@senior-dba]
- [x] 3.2 senior-code-reviewer 審查 015 正典、proposal、design、delta 的來源一致性與 013／014 相依；不改檔，回報阻擋項。 [@senior-code-reviewer]
- [x] 3.3 senior-qa 依 AC-7.1～AC-7.3、SC-013／SC-014 核對 Scenario 的 Given／When／Then 與後續跨 cycle、雙資料庫、權限及版本測試缺口；不改檔，回報結果。 [@senior-qa]
- [x] 3.4 senior-security 審查停用 membership／矩陣撤權、未提交 reviewer 草稿盲審，以及 private answer／declared_split 不進標記者投影；不改檔，回報阻擋項。 [@senior-security]
<!-- parallel:end -->

- [x] 3.5 驗證任務（不改檔）：執行 `openspec validate annotation-run-identity-contract --type change`，預期輸出 `Change 'annotation-run-identity-contract' is valid`；執行 `git diff --check`，預期無 whitespace error。 [@main]
- [x] 3.6 驗證任務（不改檔）：執行 `bash scripts/check-sdd.sh`、`node scripts/gen-screen-inventory.mjs --check`、`bash scripts/inventory-tests.sh`，預期均 exit 0；若 inventory stale，先完成共享生成檔同步，不以 OpenSpec 通過代替 Project SDD lint。 [@main]
- [x] 3.7 Source-Verify 任務（不改檔）：執行 `for source in specs/annotation/015-annotation-workspace/spec.md openspec/changes/annotation-run-identity-contract/specs/annotation/015-annotation-workspace/spec.md; do for id in FR-014S FR-049 FR-051 FR-059 FR-061 FR-066 FR-072 FR-073 FR-093 AC-1.3 AC-1.16 AC-1.23 AC-7.1 AC-7.2 AC-7.3 SC-013 SC-014; do rg -n -F "$id" "$source" >/dev/null || exit 1; done; done`，預期各 delta 引用皆可在 015 v11.0.1 定位；逐段比較原文、版本與 Changelog，另確認 013／014 引用可在各自正典定位。 [@main]

## 4. Archive 與交付

**故事目標**：annotation/015-annotation-workspace SC-013、SC-014 — archive/write-back 後衍生檢視仍可定位 015 正典，交付說明不把候選資料表宣稱為已部署。

> 依賴：3.1～3.7 通過且主 session 留存審查、OpenSpec、Project SDD、Source-Verify 證據。Archive 為工具原子產生的多檔輸出，完成後須再核對衍生 view；PR 須等所有 CI job 成功。

- [x] 4.1 執行 `openspec archive annotation-run-identity-contract --yes` 並核對工具輸出；Exception: governance-propagation; Files: `openspec/changes/annotation-run-identity-contract/proposal.md`, `openspec/changes/annotation-run-identity-contract/design.md`, `openspec/changes/annotation-run-identity-contract/tasks.md`, `openspec/changes/annotation-run-identity-contract/specs/annotation/015-annotation-workspace/spec.md`, `openspec/changes/archive/2026-10-06-annotation-run-identity-contract/proposal.md`, `openspec/changes/archive/2026-10-06-annotation-run-identity-contract/design.md`, `openspec/changes/archive/2026-10-06-annotation-run-identity-contract/tasks.md`, `openspec/changes/archive/2026-10-06-annotation-run-identity-contract/specs/annotation/015-annotation-workspace/spec.md`, `openspec/specs/annotation/015-annotation-workspace/spec.md`; Reason: OpenSpec archive 必須原子搬移 change 四件套並回寫 015 derived view，無法由單檔任務完成。 [@main]
- [x] 4.2 驗證任務（不改檔）：執行 `for source in openspec/specs/annotation/015-annotation-workspace/spec.md specs/annotation/015-annotation-workspace/spec.md; do for id in FR-014S FR-049 FR-051 FR-059 FR-061 FR-066 FR-072 FR-073 FR-093 AC-1.3 AC-1.16 AC-1.23 AC-7.1 AC-7.2 AC-7.3 SC-013 SC-014; do rg -n -F "$id" "$source" >/dev/null || exit 1; done; done`，預期 archive 後衍生 view 每條 015 正典引用均可定位；再核對 archive 前 `openspec validate annotation-run-identity-contract --type change` 的成功紀錄、正典 v11.0.1 與 Changelog。 [@main]
- [ ] 4.3 建立繁體中文 PR；所有 CI job（含非 required 的 Prototype Playwright）完成且成功後合併，並只勾選 issue #1160 已驗證的 015 正典規劃項；物理 annotation／review 欄位字典、NoteCraft ER 與 runtime 測試仍屬後續工作。 [@main]
