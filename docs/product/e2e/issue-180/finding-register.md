# Issue #180 — Finding Register（階段四 triage 定案）

建檔：2026-08-19（階段四）。依 issue #180 §11 規範：每項發現須有唯一 Finding ID 與四種處置之一（新 issue／既有 issue／非問題／私下安全 escalation）。
查重基準：2026-08-19 對全部 open/closed issues（#1–#183）逐項比對，無既有 issue 重疊；#154（annotation-list not-found 修復）作為 F-17 的修法先例引用，非重複單。
安全聲明：本輪無 Critical/High 安全發現（W2 §2-10 核實無 gold/敏感欄位洩漏路徑），不觸發 SECURITY ESCALATION。

## A. 發現清單（F-01～F-18）

| Finding ID | 來源 | 角色 | 節點 | 分類 | 嚴重度 | 處置 | Issue |
|---|---|---|---|---|---|---|---|
| F-01 | W2 | A/R | #8 | UX finding | Blocking | 新 issue | [#184](https://github.com/singyichen/label-suite/issues/184) |
| F-02 | W2 | PL→A/R | #5 | UX finding＋資產缺失 | High | 新 issue | [#185](https://github.com/singyichen/label-suite/issues/185) |
| F-03 | W2＋W1 §4.2 | PL | #2 | UX finding＋Requirement gap（合併） | High | 新 issue | [#186](https://github.com/singyichen/label-suite/issues/186) |
| F-04 | W2 | A/R | #2 | UX finding | Medium | 新 issue | [#187](https://github.com/singyichen/label-suite/issues/187) |
| F-05 | W2 | A/R | #8/#11 | UX finding | Medium | 新 issue | [#188](https://github.com/singyichen/label-suite/issues/188) |
| F-06 | W2 | PL | #6 | Requirement gap（D3 已決策） | High | 新 issue（D3 落地） | [#189](https://github.com/singyichen/label-suite/issues/189) |
| F-07 | W2＋w6 DUP-08 | PL | #13 | Requirement gap（D2 已決策） | Blocking | 新 issue（D2 落地：ADR-022＋014 修訂） | [#190](https://github.com/singyichen/label-suite/issues/190) |
| F-08-a | W2（矩陣裁決 #1 拆分） | R | #11 | 文案過時 | High | 新 issue | [#191](https://github.com/singyichen/label-suite/issues/191) |
| F-08-b | W2（矩陣裁決 #1 拆分） | R | #11 | Implementation mismatch（015 AC-3.15） | High | 新 issue（Bug） | [#192](https://github.com/singyichen/label-suite/issues/192) |
| F-09 | W2（矩陣裁決 #3；plan §10-5 併 XROLE-12b） | R | #11 | Requirement gap＋實作風險 | Medium | 新 issue（Task：spec 定義後定案 Bug 與否） | [#193](https://github.com/singyichen/label-suite/issues/193) |
| F-10 | W2 | PL | #2/#16 | Implementation mismatch（014 v2.7.2） | High | 新 issue（Bug） | [#194](https://github.com/singyichen/label-suite/issues/194) |
| F-11 | W2（矩陣裁決 #4 補登） | 全角色 | #3/#6/#8 | UX finding（無障礙） | High | 新 issue | [#195](https://github.com/singyichen/label-suite/issues/195) |
| F-12 | w6 CONT-03 | R | #11 | UX finding（產品決策待定） | Medium | 新 issue | [#196](https://github.com/singyichen/label-suite/issues/196) |
| F-13 | w6 CONT-05（plan §10-6） | PL | #3 | UX finding | Medium | 新 issue | [#197](https://github.com/singyichen/label-suite/issues/197) |
| F-14 | w6 DUP-03 | PL | #6/#8 | Bug（重複回合） | High | 新 issue（與 F-15 同根因合併一單） | [#198](https://github.com/singyichen/label-suite/issues/198) |
| F-15 | w6 DUP-04 | PL | #6/#10 | Bug（重複回合） | High | 併入 F-14 同單 | [#198](https://github.com/singyichen/label-suite/issues/198) |
| F-16 | w6 DUP-05 | R03 | #12 | Bug（votes[] 累加） | Medium | 新 issue | [#199](https://github.com/singyichen/label-suite/issues/199) |
| F-17 | w6 FAIL-05 | PL | #3 | Bug（靜默 fallback，與 #154 修法不一致） | Medium | 新 issue | [#200](https://github.com/singyichen/label-suite/issues/200) |
| F-18 | w6 DUP-01（plan §10-1 補登） | A/R | #8/#10/#15 | Bug（歷程重複累加） | Medium | 新 issue；修復後 XROLE-24 🟡→🟢 | [#201](https://github.com/singyichen/label-suite/issues/201) |

## B. 治理／規格／文件項

| 項目 | 來源 | 分類 | 處置 | Issue |
|---|---|---|---|---|
| D4：五份全景文件同步正典 | 使用者決策 D4＋W1 §3.1-3.3（含 story-map 三→四步驟） | Docs | 新 issue | [#202](https://github.com/singyichen/label-suite/issues/202) |
| D1：正式 E2E 目錄決議＋新 ADR | 使用者決策 D1＋W1 §3.4 | Task | 新 issue | [#203](https://github.com/singyichen/label-suite/issues/203) |
| STATUS.md 5 份 spec 版本漂移 | W1 §3.6（phase2 低爭議表） | Docs | 新 issue | [#204](https://github.com/singyichen/label-suite/issues/204) |
| 6 份 spec frontmatter 殘留 | W1 §1.4（phase2 低爭議表） | Docs | 新 issue | [#205](https://github.com/singyichen/label-suite/issues/205) |
| 使用者操作 audit trail 無正典 | W1 §4.4（矩陣節點 #15） | Spike | 新 issue | [#206](https://github.com/singyichen/label-suite/issues/206) |
| 小樣本 IAA 提示文案（014 FR-010o） | w7 建議 1 | Enhancement | 新 issue | [#207](https://github.com/singyichen/label-suite/issues/207) |
| official_run gold FR spec 補完 | w7 建議 2 | Docs | 新 issue | [#208](https://github.com/singyichen/label-suite/issues/208) |
| data-fairness 強負向測資 | w7 建議 3 | Task | 新 issue | [#209](https://github.com/singyichen/label-suite/issues/209) |
| 正式標記分派演算法未定義 | w4 §7-1（plan §10-9） | Task（Requirement gap） | 新 issue | [#210](https://github.com/singyichen/label-suite/issues/210) |
| 停用標記員對已指派樣本行為未定義 | w4 §7-2（plan §10-9） | Task（Requirement gap） | 新 issue（獨立追蹤，不併 D2/D3 群） | [#211](https://github.com/singyichen/label-suite/issues/211) |
| 驗收計畫實作 follow-up | plan §12 downstream DoD | Task | 新 issue | [#212](https://github.com/singyichen/label-suite/issues/212) |

## C. 不建單處置（記錄即結案）

| 項目 | 來源 | 處置理由 |
|---|---|---|
| W2 §2-10 敏感欄位防洩漏 | W2 | **非問題**：`fieldRoleMap` 過濾路徑核實無 gold 外洩，無需 escalation |
| w7 提醒 4：entity_recognition 差異比對不含位置 | w7 §6.2-4 | **非問題（已追蹤）**：015 spec:642 自述已知落差；驗收計畫 fixture 已採「改變擷取文字或型別」構造 dispute |
| w7 提醒 5：anchoring bias 措辭紀律 | w7 §6.2-5 | **非問題（記錄）**：redesign:289 已自我揭露；供 Demo Paper 限制章節參照，驗收文件已採措辭紀律 |
| w4 §7-5：多筆/人分頁情境 | w4 | **記錄即可**（plan §10-10）：刻意的最小 fixture 設計限制，非疏漏 |
| w4 §7-6：screenshot/video 設定 | w4 | **併入 #212**：以局部 `test.use` 覆蓋實作（plan §7 已定案做法） |
| IA dataset-analysis 章節舊 `TASK_TYPE_ENUM` | W1 §3.7 | **本輪不處置**：依 issue #180 邊界留待 dataset 模組盤點 |
| w6 DUP-02／CONT-01／CONT-02／CONT-04／FAIL-01~04／CONC-01~03／A11Y-03~05／I18N-01~02／RESP-01~03 | w6 | **非缺陷**：正向驗收情境（現況行為正確），由 #212 實作斷言 |
| w6 FAIL-D01~06 | w6 | **明文排除**：全端-only 情境，留待正式 E2E（#203 之後） |
| w6 I18N-03 | w6 | **併入 F-08-a（#191）**：同一文案根因，修復後啟用斷言 |
| w6 DUP-08／A11Y-01／A11Y-02 | w6 | **併入 F-07（#190）／F-11（#195）**：同根因，修復後啟用斷言 |

## D. 處理順序建議（2026-08-19 使用者核可）

原則：正式開發照 spec 實作而非移植 prototype 程式碼，故 **spec 未定義**才是返工風險；prototype 缺陷只在「驗收基準（#212）＋demo」範圍內有先修價值。

| 波次 | 時點 | Issues | 定位 |
|---|---|---|---|
| 1 | **正式開發前必須完成** | #190（D2 completed 條件）、#189（D3 成員不足 FR）、#193（跨審核員可見性）、#210（分派演算法）、#211（停用標記員行為）、#206（audit trail Spike）、#208（gold FR 補完） | spec／決策層：狀態機終點、守門邏輯、資料模型與公平性契約，缺定義即實作時猜 |
| 2 | 儘早（不擋開發） | #202、#204、#205 | 文件正典同步，防止照過期文件實作 |
| 3 | **跑 #212 驗收套件前** | #192、#201（修復後 XROLE-24 🟡→🟢）、#194、#198、#199、#200＋例外納入 #184（Blocking，標記員主線第一步） | prototype 行為缺陷：不修則 25 條原子測試在已知缺陷上紅，驗收無意義；亦為 demo 前置 |
| 4 | 正式開發 backlog | #185、#186、#195（High，視 demo 時程提前）、#187、#188、#191、#196、#197、#207 | UX 打磨：React 重寫時會重做，先修 prototype 報酬率低 |
| 時點另計 | 正式開發 kickoff 第一件事 | #203（正式 E2E 目錄 ADR） | 寫正式 E2E 前決議即可 |
| 時點另計 | 第三波清完後執行 | #212（驗收套件實作） | prototype 凍結前的最終驗收 |

硬門檻總結：正式開發前＝第一波 7 張 spec 調整；prototype 凍結前＝第三波修完＋#212 跑綠。

## E. 完成門檻自查（issue #180 §11）

- [x] 每項發現有唯一 Finding ID＋來源／角色／節點／分類／嚴重度
- [x] 逐項查重 open/closed issues（無重複建單）
- [x] 依 Finding→Issue 類型對應表建單（bug 6／enhancement 12／task 6／docs 4／spike 1＋不建單處置 10 類）
- [x] 每張 issue 含重現證據（file:line）、正典引用、預期 vs 實際、驗收條件、Finding ID、parent #180、🤖 Opened by
- [x] 每張已回報 `ISSUE OPENED: <url> — <summary>`
- [x] Critical/High 安全發現：無（不需私下 escalation）
