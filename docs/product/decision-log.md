# 產品文件 Decision Log

**基線：** `2a27dc6793e1c3a6460dbf99e9c54c1dda0f9cf5`

**盤點日期：** 2026-10-06；21 份現存 spec：foundation-000～002、account-001～005／020、admin-006～007、dashboard-012、shared-008／018／019、annotation-015、task-management-010／013／014、dataset-016／017。

## 任務閱讀順序

依 [`agent-context-contract.md`](./agent-context-contract.md) 的 Required reading sequence：Constitution → applicable domain constitutions → Product Baseline → `specs/STATUS.md` → target spec → upstream/downstream specs → 涵蓋此模組的跨模組架構圖（若有）→ shared constants → prototype/design → approved plan/tasks。此處僅規定任務閱讀順序，不改變該契約的 Authority order；衝突仍依其正典權威階層處理。`STATUS.md` 是交付狀態來源，feature spec 是行為來源；產品文件不得反向覆蓋它們。

## 已採用的跨文件決策

| 日期 | 決策 |
|------|------|
| 2026-08-19 | 任務組態採 `input_type + outputs[] + field_role_map`；八個 output key 以 013 registry 為準。T001–T013 僅為 prototype fixtures，不是產品白名單或上限。 |
| 2026-08-19 | 生命週期採五態：`draft → dry_run_in_progress → waiting_iaa_confirmation → official_run_in_progress → completed`；完成 gate 回鏈 014／015／017。 |
| 2026-08-19 | 審核單位為 sample × annotator × run；可直接修正，爭議交由合格且非當事仲裁者處理。annotator 及其可見資料不可取得 ground truth。 |
| 2026-08-19 | 資料集統計與 IAA 依 `outputs[].type` 逐型呈現；`free_text` 不計自動 IAA，指標與 threshold 只引用 017 registry。 |
| 2026-08-19 | Google SSO 僅為可操作入口與未來整合預留；上傳為 JSON，匯出為 JSON／JSON-MIN；zh/en 切換在範圍內。 |
| 2026-10-13 | PRD §4 的 `FR-A01` 等編號保留為「PRD 能力編號」，不是 spec FR，也不改名或退場（改名須回改 `docs/product/e2e/issue-180/**` 歷史紀錄，成本高於收益，issue #1315 Checkpoint 0 裁定）；PRD 以 §4.0 規格索引指向各 spec，需求以 spec 為準。 |

## 已知衝突與禁止自行裁決項目

| 項目 | 現況與處理 |
|------|------------|
| shared constants aliases | 同值 alias 尚未收斂；只能引用 `specs/_shared/constants.md` 正名，待 owner spec 升版處理。 |
| 014 legacy 013 dependency | 014 仍有 legacy 013 相依與相容欄位；不得由產品文件宣告其已完成遷移。 |
| 013 tokenization consumers | **已解（2026-10-06，沿革保留）**：`sequence_tagging` 已於 issue #581 改為字元 offset `spans[]`，013 v7.0.0 起不再有 `tokenization` 任務設定，僅餘 `snap_unit`（選取落點，FR-003d-1）；原「限縮至已同步 consumer」的保守處理不再適用。原記載：「013 的 tokenization producer 描述需限縮至已同步 consumer；不要將候選 engine 或 prototype 行為寫成全產品契約。」 |
| 017 legacy divergent arbitration | 017 尚有與現行仲裁模型不一致的 legacy 引用；現行行為回鏈 014／015／017，衝突由相關 spec/ADR 處理。 |
| ADR-031 word-mode engine | **原決策已被取代（2026-10-06，沿革保留）**：ADR-031 已 `Superseded`，選取時詞界改由前端 `Intl.Segmenter`（`snap_unit`，013 FR-003d-1，僅影響落點、不是資料座標系）。仍未決的只剩**匯出時**詞級 BIO 的 production tokenizer engine：017 FR-042 僅要求匯出 metadata 寫入 `tokenizer.engine`／`tokenizer.version` 並以擴張對齊；不得宣告 Jieba、CKIP、PyICU 或其他候選為正典。原記載：「production word-mode engine 未決；不得宣告 `Intl.Segmenter`、Jieba、CKIP、PyICU 或其他候選為正典。」 |

| PRD ↔ spec 014 分頁數（2026-10-13） | PRD FR-T06 原寫「五個 tab」；spec 014 FR-003（v12.0.0）已為六個分頁。以 spec 為準，PRD FR-T06 改為不列舉分頁數。spec 014 FR-010u 仍寫「五個頁籤」，屬 spec 內部用語，待 owner spec 升版處理，產品文件不自行改寫。 |
| PRD ↔ spec 007 角色矩陣能力（2026-10-13） | PRD FR-AD02 原寫「顯示…功能存取矩陣」；spec 007 功能目標為「檢視、修改與稽核」。以 spec 為準，FR-AD02 改為「檢視並維護」；PRD §3.5 旅程仍寫「檢視角色權限矩陣」，列為後續同步項。 |
| 本文件盤點清單（2026-10-13） | 上方「21 份現存 spec」清單未含 `dataset-021`；`specs/` 現存實為 22 份（見 PRD §4.0 規格索引）。基線與盤點日期保留不改。 |

新增衝突時，記錄來源、影響範圍與 owner；在較高階正典未解決前，產品文件只標示衝突，不自行選值。
