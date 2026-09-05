# 設計：sequence_tagging 座標系由 token 改為字元 offset（producer-side）

> 本 change 不觸及 API contract 或 DB schema（backend 目前僅有 `health` 模組），依 OpenSpec 規則 `design.md` 為選填。仍撰寫本文件的理由：本 change 註銷一份已 Accepted 的 ADR，並定義後續 change ②（`annotation/015`）與 change ③（`dataset/017`）都要依附的座標系契約。此契約若只散落在 delta 條文中，後兩個 change 將沒有單一可引用的來源。

## 決策 1：儲存座標系改為字元 offset

**決定**：標記結果的權威座標系為「相對於原始文本的字元 offset」，資料結構為 `spans[]: { start, end, label }`，`start` 含端點、`end` 不含端點（半開區間 `[start, end)`）。

**取代**：ADR-031 決策 1–5 建立的 token 座標系（`tokens[]` + `tags[]` index-aligned + 後端計算 tokenizer + 建立任務時凍結 engine/version）。

**理由**：token 座標系的核心缺陷不是效能或介面偏好，而是**座標基準本身可變**。`tokenization.unit` 由 `character` 改 `word` 會改變 Token 邊界，使既有 `tags[]` 的第 i 項不再對應原本那段文字。013 v6.3.0 為此長出五條防護規則（清除暫存 tag、重新驗證數量、阻擋前進、點名另一單位的兩條出路、重新一致時自資料重新初始化），全部都是在補救一個不該存在的可變基準。字元 offset 的基準是原始文本本身，不因任何設定改變，因此那五條規則在本版全數消失而非改寫。

**半開區間的理由**：與 `String.prototype.slice(start, end)`、Python 切片、Label Studio、doccano、spaCy `Doc.char_span` 一致，`end - start` 直接等於長度，相鄰 span 的 `a.end === b.start` 判定不需 ±1。

**代價**：`spans[]` 不再自帶「這段文字是什麼」的冗餘資訊，任何消費端都必須持有原始文本才能還原顯示值。這是刻意的——冗餘副本會與 offset 不一致，而不一致時無法判斷哪一份是對的。

## 決策 2：粒度設定降級為「選取吸附」

**決定**：`snap_unit`（`SPAN_SNAP_UNITS = character | word`）只影響滑鼠放開時的落點修正，不影響儲存值、不參與驗證、不寫入匯出檔。

**理由**：這是決策 1 的直接推論。既然座標基準是原始文本，粒度就沒有東西可以「切分」，只剩下「幫使用者把手滑的邊界對齊到詞界」這一個功能。此語意與 Label Studio 的 `<Text granularity>` 一致（該屬性同樣只影響選取、不影響儲存）。

**連帶結果**：`snap_unit` 是純 UI 便利設定，因此
- 切換它不需要任何資料遷移或重新驗證
- 執行環境不支援 `Intl.Segmenter` 時可以直接退回「不吸附」，產出的 `spans[]` 與其他標註者**位元層級相容**——不會造成資料分歧或 IAA 失真
- 降級必須發生在**標註者端**而非建立者端：吸附是任務屬性，若一位使用舊瀏覽器的標註者能改寫任務設定，將影響全任務所有人

## 決策 3：兩型別的區分收斂為單一布林不變式

**決定**：`SPAN_OVERLAP_POLICY_BY_OUTPUT_TYPE = sequence_tagging: forbidden | entity_recognition: configurable`。`sequence_tagging` 的 `allow_overlapping` 鎖死 `false` 且不是設定欄位。

**問題背景**：改用同一套圈選 UI 後，`sequence_tagging` 與 `entity_recognition` 的介面與儲存格式幾乎相同。若不明訂判準，兩者將只差一個顯示名稱，違反 Generalization-First 的反面——不是硬編了任務邏輯，而是留下兩個沒有實質差異的型別。

**理由**：扁平 BIO 序列在數學上無法表達重疊與巢狀。以此為界，差異可寫入 spec、可寫成測試、可在 Code 模式驗證，而不是靠文件敘述維持。

**否決的替代方案**：
- *合併為單一輸出類型* — 會使既有 `sequence_tagging` 任務失去「保證可壓成 BIO」這項承諾，而該承諾正是序列標註任務要匯出訓練資料的原因
- *以 `tagging_scheme` 有無區分* — 決策 4 已把 `tagging_scheme` 移出任務層，此判準隨之消失
- *廢止 `sequence_tagging`* — 序列標註是 NLP 領域的獨立任務型別，廢止它會使平台的 taxonomy 與領域慣例脫節

## 決策 4：`tagging_scheme` 移至匯出層

**決定**：BIO／BIOES／IOB2／SINGLE 不再是任務建立時的設定，改為匯出時由 `spans[]` 決定性推導。013 不再產出該欄位；推導契約由 change ③ 於 `dataset/017` 定義。

**理由**：前綴方案是「同一份標記的不同書寫法」，不是「不同的標記」。把書寫法綁在任務層，等於在建立任務時就鎖死了未來所有匯出的格式，而使用者在那個時間點通常還不知道下游模型要吃哪種格式。決策 3 的扁平不變式保證了任一方案都能無損推導，因此推遲決定沒有代價。

**跨 change 交接**：本 change 只負責移除 013 的設定欄位，不定義推導規則。以下三項已由維護者拍板、由 change ③ 落實，記錄於此以免遺失：
1. 預設**字元級 BIO**（每個字元一個 token），不需要任何 tokenizer；詞級為進階選項，選了才指定引擎並把 `tokenizer.engine` + `tokenizer.version` 寫入匯出檔 metadata
2. span 邊界未落在 token 邊界時**擴張到涵蓋該 span 的完整 token**（先例：spaCy `Doc.char_span` 的 `alignment_mode="expand"`），匯出後顯示「N 段標記因對齊被擴張」並可展開清單（列出原 span 文字、擴張後文字、offset 變化）
3. 匯出對話框預設選中「字元級」，切到「詞級」時才顯示引擎選擇器

## 決策 5：吸附引擎採前端 `Intl.Segmenter`

**決定**：`granularity: 'word'`，使用瀏覽器內建 ICU。ADR-031 決策 6（CKIP／Jieba／PyICU 選型）註銷。

**理由**：決策 2 已使吸附結果不進資料，因此引擎的一致性不再是資料契約問題，只是使用體驗問題。零後端依賴、零版本凍結、零部署成本。

**已知限制**：Firefox 自 125 起支援。偵測方式為 `typeof Intl.Segmenter === 'function'`；缺席時退回不吸附並於標記卡顯示一行提示（提示文案由 change ② 於 015 定義）。

## 對 ADR-031 的處置

`docs/adr/031-sequence-tagging-tokenization-contract.md` 的六項決策全數依附 token 座標系，無一可在字元 offset 下成立，因此標為 **Superseded**（而非逐條改版）。ADR 內容原樣保留以維持決策脈絡的可追溯性，僅於 Status 與新增的 Superseded-by 註記說明取代來源為 issue #581 與本 change。

## Constitution Check

| 原則 | 檢核 |
|------|------|
| **Generalization-First（NON-NEGOTIABLE）** | ✅ 決策 3 使兩個 span 型別由 registry 的單一布林政策驅動，消除 `sequence_tagging` 專屬的硬編 Token 網格渲染路徑。 |
| **Data Fairness（NON-NEGOTIABLE）** | ✅ 本 change 不新增任何資料讀取路徑；Step 2 預覽沿用 FR-003g-5 的「只取用角色為 Input／Output 的欄位」規則，test-set ground-truth 的可見性界線不變。 |
| **KISS／YAGNI** | ✅ 淨移除的條文多於新增（見 `proposal.md` Constitution Check）。決策 4 刻意不在本 change 定義匯出推導規則，避免為尚未動工的 change ③ 預先設計。 |
