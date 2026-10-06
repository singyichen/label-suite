# Label Suite 資料庫規劃圖：NoteCraft Wiki／Diagram 設計

> Issue [#1160](https://github.com/singyichen/label-suite/issues/1160) 的第一階段設計。2026-10-06 使用者確認先呈現已有實體層欄位字典的 account/admin 候選表；其餘模組留在盤點總帳，待實體層定案後加入。本設計不裁決資料庫契約。

## 目標與完成判準

讓工程師在 NoteCraft 的 Wiki／Diagram 兩個分頁查看 **account/admin 的規劃資料表**：逐表欄位、已明列的候選鍵與外鍵、來源及待裁決事項。頁面必須在總覽與每張表清楚顯示「尚無已部署業務表、此為設計草案」，讓可瀏覽的圖不被誤認為已可執行的 migration。

第一階段完成時，八張候選表都可搜尋、開啟 Wiki、在 Diagram 聚焦；`admin_role_permission` 與 `admin_role_permission_version` 明確標示「是否建立待 D-9 裁決」。所有顯示的欄位必須能回指實體層字典，所有 `fk` 都必須指向本資料檔存在的表且在字典中已有明確欄位定義。其他模組在盤點文件保留候選實體與缺口，不以假表、假欄位或假 FK 充數。

## 來源權威與目前邊界

權威順序依 [`docs/sdd-workflow.md`](../../sdd-workflow.md) §0：主憲法與適用 domain constitution → Accepted ADR → canonical feature spec；[`account-admin-db-schema.md`](../../diagrams/architecture/account-admin-db-schema.md) 與 [`database-table-inventory.md`](../../diagrams/architecture/database-table-inventory.md) 是衍生設計文件，NoteCraft JSON 再由它們投影，不反向定義產品規則。account/admin 文件目前自述的「feature spec ＞ foundation spec ＞ Accepted ADR」與 SDD §0 權威矩陣不同；投影前須依正典矩陣核對並修正文案，遇到實質條文衝突則列為待裁決，不由 JSON 靜默選一邊。

`backend/alembic/versions/` 目前只有 `.gitkeep`，`backend/app/` 無業務 ORM model。因此本階段的「八張表」一律稱**候選表**，已落地業務表數為零。`account-admin-db-schema.md` §3 提供八張表的欄位字典與型別，§5 提供 N-1、D-1、D-3、D-4、D-6、D-8、D-9、D-10 等阻擋或條件決策。其餘模組的 spec 實體多半沒有完整 SQL 型別、唯一鍵與外鍵作用域，暫不加入表卡。

## 方案選擇

| 方案 | 優點 | 代價／風險 | 結論 |
|---|---|---|---|
| 先展示 account/admin 八張已有欄位字典的候選表 | 近期即可檢視，逐欄可追來源；未決事項可標示 | 不是全系統實體 ERD | **採用**：使用者已選定 |
| 將所有規格實體先做成表卡 | 分群看似完整 | renderer 要求每表至少一欄，且每欄必須有型別與必填語彙；會迫使未定實體使用虛構表名或欄位 | 不採用 |
| 等所有模組資料庫決策完成才建立 NoteCraft 頁面 | 完整度最高 | 在前期無法用 Wiki／Diagram 檢查既有 account/admin 草案 | 不採用 |

## 資料與檔案設計

資料流程是「現行 spec／Accepted ADR → account/admin 欄位字典 → `docs/diagrams/architecture/database-schema.er.json` → 已安裝的 `er-diagram-renderer`」。JSON 是可 diff 的**檢視資料**，不是第二份權威欄位字典。`docs/diagrams/architecture/database-table-inventory.md` 仍是跨模組進度總帳；`docs/diagrams/README.md` 列出新檢視入口與其草案定位。

`.notecraft/plugins.json` 已用 `**/*.er.json` 對應 `er-diagram-renderer`，不新增 plugin、不改 renderer 原始碼。本階段 JSON 只用 `account`、`admin` 兩個業務 `groups`，**省略 `schemas[]`**：目前沒有已定案的 PostgreSQL schema 分割，畫面也不該暗示已有物理 schema。未來加入 dataset、task/run、annotation/review/quality 時，沿用同一份 JSON，按已定案的實體層文件擴充。

### 表與欄位映射

- 八張表名、順序與欄位清單取自 `account-admin-db-schema.md` §3.1～§3.8。每表 `description` 交代用途、來源、草案狀態及適用的 §5 決策；兩張權限矩陣表同時標示「D-9 決定是否存在」。總覽 `meta.description` 標明 0 張已落地業務表、當前覆蓋範圍及後續模組待盤點狀態。
- 每欄的 `name`、`type`、`required` 與說明依字典六欄表轉寫；`uuid → users` 拆為 `type: uuid` 與 `fk: users`。`nullable`、`required`、`system` 等顯示語彙在 JSON 頂層宣告，與 renderer schema 相符。某項必填性尚有規格衝突時用「待裁決」語彙和欄位說明，不能只顯示草案建議值而省略衝突。
- `pk`、`fk`、`unique`、`index` 僅在字典或其 ERD／限制清單有明確依據時加上。像 `users.email` 的大小寫唯一性 D-8、`users.is_seeder` 的部分唯一索引、`audit_event` 的表形 D-4，均在 Wiki 說明限制；通用徽章不足以表達條件時不拿它代替完整規則。
- `Diagram` 的邊只由欄位 `fk` 產生，不維護 `edges`。被列為候選 FK 的線仍隸屬「草案圖」，不表示 migration 已建立。無法從字典定位的業務關聯留在盤點文件與 Wiki 說明中。
- `meta.description` 和各表 `description` 使用 renderer 支援的精簡 Markdown 語法；站內連結只使用 NoteCraft 實測能解析的路徑。不得放入 token 原值、個資樣本或測試集 ground truth。

## 驗證與失敗處理

1. 以安裝版本的 `.notecraft/plugins/er-diagram-renderer/schema.json` 驗證 JSON 結構；不以另一版 schema 驗證，也不新增未被 schema 接受的 `status` 屬性。
2. 對照 `account-admin-db-schema.md` §3 逐表核查表名、欄名、型別、必填、PK、FK 目標。差異須修正或在文件中明列來源衝突；不能靠 renderer「仍能顯示」視為通過。
3. 從 JSON 計算表、欄、FK 數，避免手寫摘要漂移；每個 `fk` 的父表名必須存在。若新增可執行檢查器，依 testing constitution 先提交失敗測試，再實作驗證器。
4. 實際開啟 NoteCraft 的 `/view/diagrams/architecture/database-schema.er`，核對 Wiki 總覽、逐表欄位、Diagram 搜尋／聚焦、FK 跳轉與草案警語。若本機 NoteCraft 無法啟動，保留 JSON 與靜態檢查證據，明確回報互動檢視未驗證。
5. 執行 `git diff --check`、文件連結與適用的專案文件／SDD lint。來源 spec 或 ADR 版本更新時，重新核對並同步 JSON 與盤點文件。

## 後續階段與不在本階段的工作

Issue #1160 的後續階段依資料落點總帳逐模組補欄位字典，先裁決 task／dataset／run／annotation／review 的作用域、唯一鍵、版本及測試集答案隔離，再把已定表加入同一份 NoteCraft JSON。必要的正典 spec／ADR 修改與 DB／API contract 變更須走專案 SDD 及 user checkpoint；此設計不授權 migration、資料搬遷、API 修改或部署。

第一階段只交付**可審查的規劃版**。其完成不代表 #1160 全部關閉；跨模組實體 Schema 的完成度由盤點總帳逐項追蹤，未決項維持可見。
