# Spec Delta

## MODIFIED Requirements

### Requirement: FR-095 最終例外池的逐筆收尾

仲裁裁定為 `reject`（兩者皆非，FR-061 第 3 點）的爭議項 MUST 落入該任務的**最終例外池**。最終例外池 MUST 提供專案負責人逐筆收尾的處置畫面，其處置動作 MUST 取自 `EXCEPTION_POOL_ACTIONS`：

1. `adopt_annotator`（採 A）：以標記員原答案定案；
2. `adopt_reviewer`（採 B）：以審核員的答案（修正值或「無法判定」）定案；
3. `custom_answer`（自訂答案）：展開**原始標記介面**——重用該輸出類型之 config-driven 作答控件（`OUTPUT_TYPE_REGISTRY` 驅動），MUST NOT 為例外池另建一套作答 UI；作答值 MUST 限於該輸出類型與其 config 所定義的合法答案空間，超出者 MUST 阻擋定案；定案理由**必填**；
4. `exclude_from_dataset`（自資料集排除）：該樣本不產生定案答案、不進入匯出之最終答案集合，但 MUST 保留排除紀錄（處置者、理由、時間）。

**run_type 分流（唯一一處）**：`custom_answer` MUST 僅於 `official_run` 提供；`dry_run` 之例外池 MUST NOT 渲染自訂答案入口——試標不產生定案答案，自訂答案在試標中沒有可寫入的標的。

處置完成後，`adopt_annotator`／`adopt_reviewer`／`custom_answer` 三者 MUST 使該爭議項解決；該單位全部爭議項解決後推導為 `已定稿`（FR-051）並流入標記結果；`exclude_from_dataset` 則使該單位以排除記號呈現且 MUST NOT 推導為 `已定稿`（FR-063）。

**v6.20.0 釐清（issue #913）**：`adopt_reviewer` 所稱「審核員答案」，於出現 FR-061 第 2 點釐清所述之遺留多提交形狀時，同樣取 FR-093（1）之 sticky 擁有者，理由同 FR-061 第 2 點。

**v6.21.0 釐清（issue #914）**：「全數收尾後推導為已定稿」之「收尾」，於狀態推導（`getReviewUnitStatus()`）與定稿值取用（`getFinalizedOverwrites()`／`getFinalizationSourceKeys()`）兩側先前各自認定寬嚴不一：前者僅檢查仲裁 `finalized_by` 是否存在、或例外池 `action` 是否非 `exclude_from_dataset`，未如後者要求該筆紀錄真正持有合法 `finalized_value`，使一筆缺少或不合法 `finalized_value` 之紀錄仍可讓單位誤判為 `已定稿`。本版統一為單一判準：紀錄須持有 `finalized_value` 屬性；`custom_answer` 額外要求該值不得為 `null`——專案負責人未於重用之作答控件選取任何答案時之落空值，AC-4.56「輸入合法值並填妥理由後可定案」本即隱含此要求，該值不合法時不得判為已定稿。`adopt_b`（FR-061 第 2 點）與本條第（2）點 `adopt_reviewer` 之 `finalized_value: null` 不受此限——兩者承接審核員 `bypass` 決策時，`null` 是設計既有之「無法判定」定案語意（design.md D3），非缺陷，仍須判為已定稿且不得回填標記員原答案。`listReviewPoolItems()`（任務詳情頁例外池佇列與本條第（一）點之左側清單共用來源）同步套用同一判準，使經此收緊後改判為 `爭議中` 之單位得以在佇列中重新浮現，不致無從收尾。（本版新增段落之 AC-4.72/AC-4.75 承接「輸入合法值」與「理由必填」兩項要求，AC-4.56 之原文引用因該 AC 於 v7.0.0 廢止而僅存歷史意義，實質要求不變，見下方新增段。）

例外池為爭議池之後的**最後一道**出口，MUST NOT 再有第四層轉送；收尾必須附理由並寫入歷程事件（`exception_resolved` 或 `excluded`，FR-086），其責任鏈併入 FR-097。該單位在其所有例外項皆收尾前維持 `爭議中`，全數收尾後推導為 `已定稿`（FR-061 第 6 點）。四個處置動作**收尾必須附理由**——本要求適用全部四種處置，不因動作而異。

**本版新增——最終例外處置畫面的外殼**：專案負責人視角之最終例外處置畫面 MUST 使用例外池專屬外殼，MUST NOT 沿用標記員工作區的樣本導覽外殼。具體而言：

1. **佇列即左側清單**：左側清單 MUST 列出該 `task_id × run_type` 之最終例外池**全部待處置項目**（每列一個待處置爭議項），並 MUST 與任務詳情頁的例外池計數推導自同一個來源，兩處 MUST NOT 對「還有幾項待處置」產生分歧。該清單 MUST NOT 列出一般標記樣本，亦 MUST NOT 對其列套用標記進度狀態（待標記／已儲存／已提交）。
2. **計數單位為例外項**：畫面進度 MUST 以待處置例外項為單位呈現，MUST NOT 使用標記提交進度（「{done} / {total} 已提交」）文案——專案負責人在本畫面不執行標記提交。
3. **無自動儲存狀態**：自動儲存狀態列 MUST NOT 呈現於本畫面。專案負責人於本畫面無草稿儲存路徑（其儲存與送出入口 MUST 隱藏），該狀態永遠不會前進，呈現即為誤導。
4. **仲裁理由就地可見**：每一待處置項 MUST 呈現使其落入例外池的仲裁理由與裁定者身分（FR-061 第 3 點之必填理由），使處置決定不需離開本畫面即可查證。
5. **排除動作的危險樣式**：`exclude_from_dataset` 之操作項 MUST 在視覺上與其餘三個採用型處置可區辨（危險樣式）——該動作不產生定案答案且不可於本畫面復原。

本段僅規範畫面外殼，MUST NOT 改變上列四個處置動作的集合、run_type 分流或各自的資料寫入契約（AC-4.56、AC-4.57 已於 v7.0.0 廢止，其一鍵語意由下方新增段落取代，見本節）。

**v6.25.0 釐清（issue #922）**：上述「MUST NOT 沿用標記員工作區的樣本導覽外殼」之範圍，明文化亦涵蓋畫面頂部的進入點麵包屑（`renderEntryBreadcrumb()`）：該元件於專案負責人視角下對「當前處置項」的標示，同屬樣本導覽外殼之一部分，MUST NOT 沿用標記員分支之資料集樣本序號語意（`crumbSamplePosTpl`，對 `datasetRecords` 計數，例如「樣本 5 / 5」），而須與左側清單、中欄計數同源，改以待處置例外項之 `sample_id × annotator_id` 識別當前項——此為對上述已存在之一般性禁止的具體適用範圍釐清，非新增獨立約束；AC-4.69 既有六點列舉（含 v6.25.0 追加之第 6 點）不改寫，SC-011 不修訂。

**本版新增（v7.0.0，BREAKING，issue #920）——先選取、後確認的處置互動模型**：收尾畫面的四個處置動作 MUST 拆分為「選取」與「確認」兩個獨立步驟，取代 v5.0.0 原「開啟收尾畫面即以單步呈現處置結果」之契約：

1. **選取不寫入**：點擊任一處置動作（含 `custom_answer` 展開之原始作答控件內的作答選取）MUST 僅標記該處置為目前選取狀態，MUST NOT 觸發定稿值寫入或任何歷程事件。使用者 MUST 可自由切換選取的處置，切換前既有輸入（理由文字）不因此清空。
2. **彙整列**：畫面 MUST 提供彙整區塊：未選取任何處置時顯示「尚未選擇最終處置」；選取後 MUST 顯示所選處置名稱，`adopt_annotator`／`adopt_reviewer` 與已於作答控件選定合法值之 `custom_answer` MUST 額外顯示其定稿值，`exclude_from_dataset` 不顯示定稿值（其本質為不產生定稿值，見本條前段第（4）點）。
3. **理由必填擴及四種處置**：四個處置動作 MUST 皆要求填寫理由（本條前段「收尾必須附理由」之既有規則本次明文擴及 `adopt_annotator`／`adopt_reviewer` 兩者，修正其現行缺陷——issue #913 所記錄之 `reason: ''`）；理由欄位為空時，「確認處置」控件 MUST 為停用狀態（disabled），MUST NOT 採本規格別處（如 FR-061 第 3 點之仲裁送出）之「blocked-not-disabled」提示阻擋慣例。
4. **單一寫入點**：「確認處置」為本畫面唯一的資料寫入入口；點擊後才依已選取之處置與已填理由執行本條前段所定義之資料寫入契約（定稿值、歷程事件），寫入前的選取與作答皆不產生副作用。

**v7.6.0 釐清（issue #985）**：v6.21.0 之單一判準 `hasLegitimateFinalizedValue()` 當時僅套用於狀態推導（`getReviewUnitStatus()`）與 `listReviewPoolItems()`；工作區渲染層（`annotation-workspace.config.js`）之 `finalizedAnswers()`（定稿摘要卡答案）、`finalizedBasisLabels()`（定稿依據徽章）、`renderArbitrationCard()` 開放項過濾、`exceptionPoolQueue()` 四處仍沿用舊有寬判準（僅檢查 `finalized_by`／例外池紀錄是否存在，未驗證該紀錄是否持有合法 `finalized_value`）。本版將同一判準延伸套用至此四處，使定稿摘要卡答案、定稿依據徽章、仲裁列表開放項渲染、最終例外處置佇列，與既有狀態推導、清單頁三者對「是否已合法定稿」的認定完全一致，MUST NOT 各寫一套。`exceptionPoolQueue()`、`finalizedAnswers()` 之例外池分支、`finalizedBasisLabels()` 之例外池分支三處之判準額外要求 `exclude_from_dataset` 短路（該動作依本條第（4）點本就不持有 `finalized_value`），與既有例外池分支語意一致，非新規則；`renderArbitrationCard()` 讀取的仲裁狀態（`arbState`）從無 `action` 欄位，其開放項過濾之合法值檢查不涉此短路。`exceptionPoolQueue()` 之佇列成員判準仍以仲裁側 `finalized_by` 是否存在為準（不額外要求該仲裁紀錄本身合法）：一筆 `finalized_by` 為真但不合法之仲裁紀錄，其正確復原路徑是交由仲裁者於 `renderArbitrationCard()` 重新裁定（本版已使該紀錄改渲染為開放投票列），而非導向專案負責人之例外池佇列——該佇列僅承接仲裁者裁定「兩者皆非」之項目，若同時放寬佇列判準會使同一項目在仲裁開放列與例外池佇列並存，兩角色皆誤判為己方待處理。

**v8.1.0 釐清（issue #994）**：v6.16.0 之上位規則「MUST NOT 沿用標記員工作區的樣本導覽外殼」與 v6.25.0（issue #922）已明文涵蓋 `renderEntryBreadcrumb()` 對「當前處置項」之標示（第三層），本版進一步涵蓋同一函式渲染之第一層——工作區標籤：該標籤原僅以 `crumbWorkAreaReviewer`／`crumbWorkAreaAnnotator` 二元分流，`project_leader` 落入 `crumbWorkAreaAnnotator`（顯示「標記作業」），與其在本畫面實際進行之最終例外處置語意不符，同屬「MUST NOT 沿用標記員工作區外殼」之具體適用範圍——此為對既有一般性禁止的進一步範圍釐清，非新增獨立約束。AC-4.69 既有六點列舉逐字不改寫，本版於其末尾追加第七個 AND 可測條件（工作區標籤須為專案負責人專屬文案），SC-011 不修訂。

**v9.1.0 新增（issue #1060）**：第（1）點「佇列即左側清單」之呈現層級明文化：左側清單項目 MUST 依 `sampleId` 分組呈現——分組表頭 MUST 顯示該樣本 ID、該樣本待處置例外項數，以及 `getRecordPreviewText(record, fieldRoleMap)` 產出之文本摘要（每樣本群組僅呈現一次；摘要不可得時 MUST 省略，MUST NOT 以其他欄位或 ground truth 頂替）；分組內每個待處置例外項 MUST 仍各自渲染一個 `ws-exception-queue-item` 原生按鈕，MUST NOT 合併不同 `annotatorId` 或 `outKey` 之項目；分組數（樣本數）與全欄列項數（例外項數）為兩種不同計數。每個待處置例外項之次要資訊 MUST 使用 `OUTPUT_TYPE_REGISTRY[outKey][state.lang]` 之人類可讀輸出類型名稱取代原始 `outKey` 鍵名（原始值僅留於資料屬性／內部識別），並 MUST 同時呈現「待處置」之 zh/en 文字狀態標示（MUST NOT 僅靠顏色區辨），與一般標記進度狀態文案（待標記／已儲存／已提交）明確區隔。本版不改變第（1）點「每列一個待處置爭議項」與第（2）點「計數單位為例外項」之既有規則，僅新增分組呈現層級、人類可讀輸出類型名稱與「待處置」文字狀態標示。AC-4.69 既有七點列舉逐字不改寫，本版於其末尾追加第八至十個 AND 可測條件，SC-011 不修訂。

#### Scenario: AC-4.56 正式標記例外池四動作可用
- （v5.0.0 新增；**已於 v7.0.0 廢止，BREAKING，issue #920**）
- ~~**GIVEN** `official_run` 之最終例外池有一筆待處置項目，操作者為專案負責人~~
- ~~**WHEN** 開啟該項目的收尾畫面~~
- ~~**THEN** 提供採 A、採 B、自訂答案、自資料集排除四個處置~~
- ~~**AND** 選自訂答案時展開該輸出類型的原始作答控件，輸入合法值並填妥理由後可定案；未填理由時定案被阻擋~~
- 收尾畫面改為「先選取、後確認」之兩段式互動（見本條新增段），開啟收尾畫面不再單步呈現處置結果，`adopt_annotator`／`adopt_reviewer` 亦不再一鍵定案；本情境所述單步契約前提消失，由 AC-4.72、AC-4.74、AC-4.75 取代，ID 保留不重用（見 FR-095）。

#### Scenario: AC-4.57 試標例外池無自訂答案出口
- （v5.0.0 新增；**已於 v7.0.0 廢止，BREAKING，issue #920**）
- ~~**GIVEN** `dry_run` 之最終例外池有一筆待處置項目~~
- ~~**WHEN** 開啟該項目的收尾畫面~~
- ~~**THEN** 僅提供採 A、採 B、自資料集排除三個處置~~
- ~~**AND** 畫面上不存在自訂答案入口，亦不渲染任何作答控件~~
- 三個處置的可用性集合本身不變，但同樣改為「先選取、後確認」互動，一鍵定案前提消失；由 AC-4.73 取代，ID 保留不重用（見 FR-095）。

#### Scenario: AC-4.69 最終例外處置畫面不沿用標記員外殼
- **GIVEN** 某任務之 `official_run` 最終例外池有待處置項目，操作者以專案負責人身分開啟該任務的最終例外處置畫面
- **WHEN** 畫面完成渲染
- **THEN** 左側清單只列出該任務該 run_type 的待處置例外項，不列出該資料集的一般標記樣本，也不出現「待標記」之類的標記進度狀態
- **AND** 進度以待處置例外項為單位呈現，畫面上不存在「已提交」的標記提交進度文案
- **AND** 畫面上不存在自動儲存狀態列
- **AND** 每一待處置項同時呈現裁定「兩者皆非」的仲裁者與其理由
- **AND** `exclude_from_dataset` 的操作項帶有與其餘三個處置可區辨的危險樣式
- **AND**（v6.25.0 新增）頂部進入點麵包屑對「當前處置項」的標示以該待處置例外項之 `sample_id` 與 `annotator_id` 識別，不呈現資料集樣本序號（「樣本 {i} / {n}」）
- **AND**（v8.1.0 新增）頂部進入點麵包屑第一段（工作區標籤）呈現專案負責人於本畫面之專屬文案（`crumbWorkAreaProjectLeader`），不沿用標記員之工作區標籤文案（`crumbWorkAreaAnnotator`，「標記作業」）
- **AND**（v9.1.0 新增，issue #1060）左側清單項目依 `sampleId` 分組（功能命名之分組 selector，與 reviewer 專用 `ws-sample-group` 區隔）；每個分組表頭顯示該樣本 ID、該樣本待處置例外項數，以及 `getRecordPreviewText()` 產出之文本摘要，每樣本群組僅呈現一次；分組內每個待處置例外項仍各自渲染一個 `ws-exception-queue-item` 原生按鈕，不合併不同 `annotatorId` 或 `outKey`；分組數（樣本數）與全欄列項數（例外項數）為兩種不同計數，頂部總數維持例外項數不變，各列項之 `data-sample-id`／`data-annotator-id`／`ws-exception-queue-item` 與點選導向同 sample_id × annotator_id 內容之既有契約不變
- **AND**（v9.1.0 新增，issue #1060）每個待處置例外項之次要資訊使用 `OUTPUT_TYPE_REGISTRY[outKey][state.lang]` 之人類可讀輸出類型名稱取代原始 `outKey` 鍵名（原始值僅留於資料屬性／內部識別），並同時呈現「待處置」之 zh/en 文字狀態標示（不僅靠顏色區辨），與一般標記進度狀態文案（待標記／已儲存／已提交）明確區隔
- **AND**（v9.1.0 新增，issue #1060）長樣本 ID 與長標記員 ID 於桌面欄寬不造成水平溢出，完整值透過 `title` 屬性與按鈕 `aria-label` 可得；各列項可由鍵盤 `Tab` 到達、`Enter` 選取；1024px 與 375px 下左欄與中欄無重疊或裁切，375px 沿用既有左欄收合規則（AC-5.2）

#### Scenario: AC-4.72（v7.0.0 新增，對應 FR-095 修訂，issue #920）選取不寫入
- **GIVEN** `official_run` 之最終例外池有一筆待處置項目、操作者為專案負責人
- **WHEN** 依序點擊採 A、採 B、自訂答案、自資料集排除任一處置按鈕
- **THEN** 該按鈕僅被標記為已選取狀態
- **AND** 系統不寫入定稿值、不產生任何歷程事件
- **AND** 選取自訂答案時展開該輸出類型的原始作答控件供輸入，但選取本身仍不觸發寫入

#### Scenario: AC-4.73（v7.0.0 新增，對應 FR-095 修訂，issue #920）試標選取不寫入
- **GIVEN** `dry_run` 之最終例外池有一筆待處置項目
- **WHEN** 點擊採 A、採 B、自資料集排除任一處置按鈕
- **THEN** 該按鈕僅被標記為已選取狀態且不寫入
- **AND** 畫面上仍不存在自訂答案入口、不渲染任何作答控件

#### Scenario: AC-4.74（v7.0.0 新增，對應 FR-095 修訂，issue #920）彙整列狀態機
- **GIVEN** 收尾畫面之待處置項目尚未選取任何處置
- **THEN** 畫面底部彙整列顯示「尚未選擇最終處置」
- **WHEN** 選取 `adopt_annotator` 或 `adopt_reviewer`
- **THEN** 彙整列改為顯示該處置名稱與其定稿值（分別為標記員原答案／審核員答案）
- **AND** 選取 `custom_answer` 且已於作答控件選定合法值後，彙整列同樣顯示該定稿值
- **AND** 選取 `exclude_from_dataset` 時彙整列僅顯示處置名稱，不顯示定稿值

#### Scenario: AC-4.75（v7.0.0 新增，對應 FR-095 修訂，issue #920）理由必填與確認按鈕停用
- **GIVEN** 已選取四種處置之任一、理由欄位為空
- **THEN** 「確認處置」按鈕為停用狀態
- **WHEN** 填入理由後
- **THEN** 該按鈕轉為可用，點擊後才依已選取之處置與已填理由執行對應資料寫入與歷程事件
- **AND** 寫入之例外池紀錄的 `reason` 欄位非空字串——涵蓋 `adopt_annotator`／`adopt_reviewer` 兩者，修正其原「一鍵完成、`reason: ''`」之現行缺陷（issue #913）
- **AND** 切換至另一個處置時，即使理由欄位仍留有前一個已選處置填入的文字，「確認處置」按鈕仍先回到停用狀態，須理由欄位再次觸發輸入事件才重新可用——避免某處置所填的理由被靜默沿用為另一處置的理由
