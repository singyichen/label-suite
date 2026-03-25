# 論文大綱 — LabelSuite

**論文名稱（中文）：** LabelSuite：具整合式標記員管理之配置驅動 NLP 標記平台設計與實作

**論文名稱（英文）：** LabelSuite：A Config-Driven NLP Annotation Platform with Integrated Annotator Management

**類型：** Demo Paper（碩士論文）

**指導教授：** 李龍豪教授 — [自然語言處理實驗室](https://ainlp.tw/)

---

## 摘要 (Abstract)

---

## 第一章：緒論 (Introduction)

### 1.1 研究背景 (Research Background)

- **資料驅動典範 (Data-driven Paradigm)：** 在當前資料驅動的 NLP 研究典範下，高品質的標記資料是推動模型進步的關鍵基礎。
- **中文語言複雜性 (Complexity of Chinese Language)：** 中文在詞界判定（斷詞）、語義歧義以及領域專業術語方面具有高度複雜性。相較於英文，建立中文標準化標記流程更為困難，因此發展專門的系統工具具有高度迫切性。
- **領域知識需求 (Domain Knowledge Needs)：** 針對中文醫療健康照護與情緒心理分析等特定領域，極需精確且專業的標記流程來建立基準測試 (Benchmarks)。

### 1.2 研究動機 (Research Motivation)

- **現有工具之摩擦 (Friction in Existing Tools)：** 現有的 **Label Studio** 架設伺服器過程極為繁瑣且耗時，導致不具備工程背景的研究團隊學習曲線過陡。
- **低效的工作流 (Inefficient Workflows)：** 研究團隊常因缺乏通用工具而被迫使用 Excel 標記，或針對特定任務「重複造輪子」開發一次性系統，造成工程資源浪費。
- **缺乏標記員管理機制 (Lack of Annotator Management)：** 現有工具均不支援實驗室規模的標記員管理（如工讀生帳號、工時追蹤、薪資試算），研究團隊被迫透過外部試算表管理人力，增加行政負擔與出錯風險。
- **缺乏資料集品質可視性 (Absence of Dataset Quality Visibility)：** 現有標記工具未提供內建的資料集統計功能（如句子數量、詞元分布、標籤平衡），研究人員每次標記後都需撰寫臨時分析腳本，才能了解資料品質與分布狀況。
- **碎片化且斷裂的工作流 (Fragmented and Disconnected Workflows)：** 標記流程從任務配置、標記執行到資料匯出，分散於各個獨立工具之間，研究人員必須頻繁手動轉換資料格式、管理多套系統，大幅增加錯誤風險與時間成本。

### 1.3 研究目的 (Research Objectives)

- **開發通用型標記平台 (Developing a General-Purpose Annotation Platform)：** 建立一個名為 **`LabelSuite`** 的輕量化平台，以學術 NLP 實驗室為目標，透過簡單設定檔即可快速部署多様化標記任務。
- **配置化啟動 (Config-driven Launch)：** 實現透過簡單設定檔 (Config file) 即可快速啟動標記伺服器的機制，取代傳統繁雜的系統開發流程。
- **標記員全生命週期管理 (Annotator Lifecycle Management)：** 提供涵蓋帳號管理、工時追蹤與薪資試算的端到端標記員管理功能，簡化實驗室行政作業。
- **資料集品質可視性 (Dataset Quality Visibility)：** 提供即時資料集統計指標（#Sentence、#Token、#Label），協助研究人員無需外部腳本即可快速掌握資料集特性與標記品質。
- **整合一體化標記工作流 (Integrating a Unified Annotation Workflow)：** 將任務配置、資料標記與資料集分析整合於單一門戶，消除管理多個獨立工具之間的摩擦。

### 1.4 研究貢獻 (Research Contributions)

- **降低進入門檻 (Lowering Entry Barriers)：** 大幅簡化標記的部署流程，讓不具備深厚工程背景的研究員也能快速啟動標記環境，使研究人員能專注於領域任務。
- **以標記員為中心的實驗室管理 (Annotator-centered Lab Management)：** 首創將標記員帳號管理、工時追蹤與薪資試算整合於 NLP 標記門戶中，解決學術實驗室的行政管理需求。
- **整合標記工作流 (Integrated Annotation Workflow)：** 將「任務配置」、「資料標記」與「資料集分析」整合於單一門戶系統，取代碎片化的多工具流程。
- **內建資料集分析功能 (Built-in Dataset Analytics)：** 無需事後撰寫分析腳本，系統於標記過程中自動計算並即時呈現 #Sentence、#Token 與 #Label 統計，讓研究人員在標記階段即可持續監控資料品質與分布。

---

## 第二章：相關研究 (Related Work)

### 2.1 NLP 任務背景知識 (NLP Task Background Knowledge)

- **NLP 任務類型 (NLP Task Types)：** 本系統依輸入格式與標記需求，支援四類 NLP 任務範本：**單一句子 (Single Sentence)**——針對單一文字輸入進行分類或數值評分；**句子對 (Sentence Pairs)**——比較兩段文字的語義關係（如相似度、蘊含關係）；**序列標記 (Sequence Labeling)**——於文字序列中逐一標記詞性、命名實體等結構；**生成標記 (Generative Labeling)**——評估模型生成文字的品質或進行人工撰寫。理解上述任務類型是設計通用標記介面的基礎前提。
- **標記資料的重要性 (Importance of Labeled Data)：** NLP 模型的訓練高度依賴人工標記的資料集。標記品質直接影響模型的泛化能力與評測可靠性，因此建立一套系統化、可重現的標記流程，對於推動 NLP 研究具有根本性意義。
- **標記品質基礎指標 (Basic Annotation Quality Metrics)：** 資料品質的核心指標包含標籤一致性、標記員間一致程度（Inter-Annotator Agreement）與標籤分布平衡性。這些指標引導資料集分析模組的設計，並在標記過程中提供品質監控依據。

### 2.2 標記平台與工具調研 (Survey of Labeling Platforms & Tools)

- **Label Studio 分析 (Label Studio Analysis)：** 以 Apache 2.0 授權開源，獲 NVIDIA、Meta、IBM 等企業採用。核心強項為多模態支援（圖像、音頻、文本、影片）與 LLM 微調資料準備。然而伺服器架設對非工程背景研究員過於繁瑣，且不具備標記員管理與內建資料集統計功能。
- **Label-Suite 的差異化定位 (Differentiated Positioning)：** 以 Label Studio 為參考標的，`LabelSuite` 針對學術 NLP 實驗室進行差異化：(1) 配置驅動快速部署，無需工程背景；(2) 新增 Label Studio 所缺乏的標記員全生命週期管理（帳號管理、工時追蹤、薪資試算）；(3) 整合內建資料集統計（#Sentence、#Token、#Label）以支援即時品質監控。

### 2.3 盤點現有流程的痛點 (Survey of Current Workflow Pain Points)

- **低效的標記現狀 (Inefficient Labeling Practices)：** 許多團隊因工具門檻高而退回使用 Excel 或 Word 進行標記，導致標記過程缺乏自動化與版本控管。
- **重複開發資源浪費 (Waste of Resources in "Reinventing the Wheel")：** 由於缺乏「一般化」工具，研究生常為單一任務開發「一次性系統」，這些工具無法在不同研究間重用，造成工程資源重複投入且缺乏一般化能力。
- **標記員管理斷裂 (Disconnected Annotator Management)：** 研究實驗室通常透過外部試算表管理工讀生工時與薪資，引入人工錯誤與行政負擔，這些本可在標記系統內部自動化。

### 2.4 中文資料標記研究 (Research on Chinese Data Annotation)

- **中文 NLP 標記特殊性 (Specificity of Chinese NLP Annotation)：** 中文標記涉及詞界判定與複雜的領域術語（如：醫療術語），其複雜度與標記需求與英文顯著不同。
- **領域標記經驗 (Domain Annotation Experience)：** 引用實驗室在**中文醫療健康照護**與**情緒心理**領域的豐富實務經驗，說明針對這些特定領域設計「靈活標記公板」以提升研究效率的必要性。

---

## 第三章：系統設計與架構 (System Design & Architecture)

### 3.1 一般化設計理念 (Generalization Design Philosophy)

- **配置驅動架構 (Config-driven Architecture)：** 系統核心採用「配置取代程式碼 (Config over Code)」的理念。使用者僅需撰寫簡單的 YAML 或 JSON 設定檔，即可定義不同類型的 NLP 任務，實現快速部署與公板化。
- **多任務支援 (Multi-task Support)：** 支援四類通用 NLP 任務範本：單一句子 (Single Sentence)、句子對 (Sentence Pairs)、序列標記 (Sequence Labeling)、生成標記 (Generative Labeling)，以滿足不同領域與不同輸入格式的研究需求。

### 3.2 標記員管理模組 (Annotator Management Module)

- **帳號管理 (Account Management)：** 支援標記員帳號的新增、修改、刪除，並依角色（管理員 / 標記員）設定不同存取權限。
- **工時統計與薪資試算 (Working Hours & Salary Calculation)：** 自動記錄每位標記員的工作時數並提供薪資試算功能，簡化研究團隊的人力管理流程。

### 3.3 標記模組設計 (Labeling Module Design)

- **高易用性介面 (High-Usability Interface)：** 針對現有平台介面難用、流程斷裂的痛點，設計直覺式的標記介面，降低非工程背景標記員的學習曲線。
- **任務初始化流程 (Task Initialization Workflow)：** 說明系統如何讀取配置檔並動態生成對應的標記元件與後端儲存邏輯。
- **Dry Run / Official Run 機制 (Dry Run / Official Run Mechanism)：** 支援任務試跑（Dry Run）與正式執行（Official Run）兩種模式。Dry Run 用於驗證標記介面與設定是否正確；Official Run 為正式收集標記資料的執行階段，兩者資料相互隔離。

### 3.4 資料集分析模組 (Dataset Analysis Module)

- **統計指標總覽 (Statistical Overview)：** 自動計算並呈現資料集的基本統計數據，包含句子數量 (#Sentence)、詞元數量 (#Token) 與標籤分布 (#Label)，協助研究人員快速掌握資料集特性。
- **標記品質監控 (Annotation Quality Monitoring)：** 透過統計分析輔助識別標記不一致或資料分布異常的情形，提升標記資料的整體品質。

---

## 第四章：系統實作 (Implementation)

### 4.1 技術選型與開發工具 (Technology Stack and Development Tools)

- **前端架構 (Frontend Architecture)：** 採用 **React + TypeScript + Vite**。選擇理由在於其強大的組件化開發能力，能快速構建響應式且高易用性的標記介面。
- **後端架構 (Backend Architecture)：** 使用 **FastAPI (Python)**。FastAPI 與 Python NLP 生態系整合良好，能提供高效且易於維護的非同步 API 服務。
- **AI 輔助開發 (AI-Assisted Development)：** 利用 AI 輔助提升程式碼品質與開發效率，縮短系統從無到有的週期。
- **規格驅動開發 (Spec-Driven Development)：** 寫程式之前必須將需求轉換成「清晰且可驗證的規格」，並以此作為開發的依據。

### 4.2 系統介面展示與 UX 優化 (System Interface Showcase and UX Optimization)

- **直覺式設計 (Intuitive Design)：** 針對 Label Studio 介面設置繁瑣的痛點，展示 **`LabelSuite`** 如何簡化任務管理與標記流程。
- **可視化對比 (Visual Comparison)：** 以截圖形式對比本系統與 **Label Studio** 在執行同一標記任務時的步驟差異，強調本系統的「快速啟動」、「標記員管理」與「內建分析」優勢。

### 4.3 核心模組實作 (Implementation of Core Modules)

- **標記員管理實作 (Annotator Management Implementation)：** 說明帳號生命週期、角色權限執行、工時記錄機制與薪資試算計算邏輯。
- **動態標記介面生成 (Dynamic Annotation Interface Generation)：** 說明系統如何解析上傳的 Config 檔，動態渲染 NLP 標記模板（單一句子、句子對、序列標記、生成標記）。
- **Dry Run / Official Run 資料隔離 (Dry Run / Official Run Data Isolation)：** 詳述資料分區策略，確保 Dry Run 資料不污染 Official Run 資料集。
- **資料集統計管線 (Dataset Statistics Pipeline)：** 說明 #Sentence、#Token 與 #Label 統計如何即時計算並呈現。

### 4.4 完整工作流整合 (Integration of Full Workflow)

- **一體化標記門戶實作 (Implementation of Unified Annotation Portal)：** 呈現完整工作流——「標記員入職 → 任務配置 → Dry Run → 正式標記 → 資料集分析 → 匯出」——如何整合於單一系統，取代過往碎片化的多工具流程。

---

## 第五章：領域驗證與分析 (Experiments & Analysis)

### 5.1 實驗場景：中文醫療與情緒分析 (Experimental Scenarios: Chinese Medical and Sentiment Analysis)

- **實務任務驗證 (Practical Task Validation)：** 將系統應用於中文醫療資料與情緒心理領域的標記任務，驗證系統於特定領域的適用性。

### 5.2 系統效率之量化評估 (Quantitative Evaluation of System Efficiency) (New Metrics)

- **任務啟動成本對比 (Task Setup Cost Comparison)：** 量化對比本系統與 **Label Studio** 在初始化同一任務時所需的**操作步驟數 (Number of steps)** 與**總配置時間 (Setup time in minutes)**，證明「配置驅動」的效率優勢。

### 5.3 使用者研究與滿意度分析 (User Study and Satisfaction Analysis)

- **五點量表問卷 (Five-point Likert Scale)：** 參考 **Co-DETECT** 問卷格式，針對系統易用性、任務清晰度與導覽直覺性設計量化指標。
- **實驗室成員試用 (Lab Member Pilot Study)：** 邀請 5–10 位具有標記經驗的實驗室成員參與測試。收集其對於 Config 配置機制、標記員管理功能與內建資料集分析的反饋。

### 5.4 資料集分析功能驗證 (Dataset Analysis Validation)

- **統計精確性驗證 (Statistics Accuracy Verification)：** 驗證系統計算的 #Sentence、#Token 與 #Label 統計數據是否與原始資料集的真實計數一致，確認內建分析管線的可靠性。
- **標籤分布檢視 (Label Distribution Inspection)：** 以中文醫療與情緒分析領域資料集為例，展示資料集分析模組如何呈現類別不平衡與標記不一致的現象。

---

## 第六章：結論與未來展望 (Conclusion & Future Work)

### 6.1 研究結論 (Conclusion)

- **貢獻總結 (Summary of Contributions)：** 總結 **`LabelSuite`** 如何解決標記流程斷裂、「重複造輪子」、實驗室標記員管理負擔與缺乏內建資料集品質可視性等實務痛點。
- **Demo Paper 價值體現 (Realization of Demo Paper Value)：** 強調系統作為學術研究團隊以配置驅動、以標記員為中心之 Label Studio 替代方案的開源重用價值。

### 6.2 研究限制 (Research Limitations) (New Section)

- **生成標記介面之複雜性 (Complexity of Generative Labeling Interface)：** 生成標記任務的介面設計與品質監控較其他任務類型複雜，目前僅提供基礎支援，尚未針對所有生成式場景進行完整優化。
- **薪資計算範疇之限制 (Salary Calculation Scope)：** 目前薪資試算僅涵蓋基本時薪計算，不處理完整薪資合規事項（如勞健保、所得稅扣除），適用範疇為實驗室預算粗估而非正式薪資核發。
- **使用者研究規模 (Small-scale User Study)：** 受限於樣本數，目前 User Study 的參與者主要來自特定實驗室，可能存在場景侷限性。
- **系統壓力測試 (Lack of Stress Testing)：** 系統尚未在大規模高並發（Large-scale concurrent usage）的環境下進行效能壓力測試。

### 6.3 未來展望 (Future Work)

- **整合 AI 輔助標記 (AI-Assisted Labeling)：** 借鑑 **Co-DETECT** 模式，引入 LLM 輔助發現標記邊緣案例並優化標記規則。
- **標記者一致性分析 (Inter-Annotator Agreement, IAA)：** 新增 Cohen's Kappa 與 Fleiss' Kappa 等指標計算，量化多位標記員間的標記一致程度。
- **標準格式資料匯出 (Data Export in Standard Formats)：** 支援將標記完成的資料集匯出為 NLP 標準格式（如 CoNLL、BIO、JSON-L），可直接用於下游模型訓練管線。

---

## 第七章：倫理聲明 (Ethics Statement)

### 7.1 資料隱私與保護說明 (Data Privacy and Protection Statement)

- **標記員資料保護 (Annotator Data Protection)：** 標記員帳號資訊與工時記錄以適當存取控制安全儲存，確保個人資料僅授權管理員可存取。
- **敏感領域資料處理 (Sensitive Domain Data Handling)：** 針對系統驗證中所涉及的醫療與心理領域資料，系統僅處理去識別化後的文本，並確保所有資料傳輸符合隱私保護規範。

### 7.2 使用者研究與知情同意 (User Study and Informed Consent)

- **受試者招募與權益 (Participant Recruitment and Rights)：** 所有參與系統易用性測試與標記驗證的研究員及專家，皆在受測前被明確告知研究目的及流程，並擁有隨時退出研究之權利。
- **回饋資料匿名化 (Anonymization of Feedback Data)：** 使用者訪談與回饋數據皆經過匿名化處理，確保個別受試者的身份無法被追蹤或識別，且相關數據僅用於系統優化與學術分析。

---

## 參考文獻
