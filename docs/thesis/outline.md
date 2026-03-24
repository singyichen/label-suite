# Thesis Outline — Label-Eval-Portal

**Title (tentative):** Label-Eval-Portal: A Configurable, General-Purpose NLP Data Labeling and Automated Evaluation Portal

**Type:** Demo Paper (Master's Thesis)

**Advisor:** Prof. Lung-Hao Lee — [Natural Language Processing Lab](https://ainlp.tw/)

---

## Chapter 1 — Introduction

### 1.1 Research Background

- **Data-driven Paradigm:** High-quality labeled data and reproducible evaluation mechanisms are the key foundations driving model progress under the current data-driven NLP research paradigm.
- **Complexity of Chinese Language:** Chinese presents high complexity in word boundary determination (word segmentation), semantic ambiguity, and domain-specific terminology. Compared to English, establishing standardized Chinese labeling and evaluation workflows is considerably more difficult, making the development of specialized system tools highly urgent.
- **Domain Knowledge Needs:** Specific domains such as Chinese medical/healthcare and sentiment/psychology analysis urgently require precise and professional labeling workflows to establish benchmarks.

### 1.2 Research Motivation

- **Friction in Existing Tools:** Label Studio is extremely tedious and time-consuming to set up, while CodaBench's interface is insufficiently intuitive, resulting in a steep learning curve for research teams.
- **Inefficient Workflows:** Research teams are often forced to use Excel for labeling due to high tool barriers, or to "reinvent the wheel" by developing one-off systems for specific tasks, wasting engineering resources.
- **Risks of Data Contamination and Evaluation Fairness:** Many studies publicly post test-set answers on GitHub, potentially allowing LLMs to "pre-study" answers during training. Existing tools generally lack a fair third-party scoring mechanism to hide answers, undermining the scientific validity of evaluation results.
- **Fragmented and Disconnected Workflows:** Current labeling (e.g., Label Studio), evaluation (e.g., custom scripts), and leaderboard display (e.g., manual web updates) are separate and disconnected processes. This fragmentation forces researchers to frequently convert data formats between tools, significantly increasing error risk and time costs.
- **Lack of Annotator Management:** Existing tools do not support lab-scale annotator management (e.g., part-time student accounts, working hours tracking, salary estimation), forcing research teams to manage human resources through external spreadsheets.
- **Absence of Dataset Quality Visibility:** Existing annotation tools provide no built-in dataset statistics (e.g., sentence count, token distribution, label balance), forcing researchers to write ad-hoc analysis scripts after each labeling round to inspect data quality.

### 1.3 Research Objectives

- **Developing a General-Purpose Portal:** Build a lightweight platform named `Label-Eval-Portal` targeting academic NLP labs, integrating annotation and evaluation into a single system.
- **Config-driven Launch:** Enable rapid deployment of labeling servers through simple config files, replacing traditional complex system development workflows.
- **Annotator Lifecycle Management:** Provide end-to-end annotator management covering account administration, working hours tracking, and salary estimation to streamline lab operations.
- **Integrating a Unified Workflow:** Integrate data labeling, automated evaluation, and leaderboard display into a single portal, eliminating the friction of data conversion between existing tools.
- **Dataset Quality Visibility:** Provide real-time dataset statistics (#Sentence, #Token, #Label) to help researchers inspect data characteristics and annotation quality without external scripts.
- **Establishing a Fair Evaluation Mechanism:** Through third-party scoring logic that isolates test-set answers, ensure the fairness of model evaluation and prevent data contamination.

### 1.4 Research Contributions

- **Lowering Entry Barriers:** Significantly simplifies the deployment of labeling and evaluation environments, enabling researchers without deep engineering backgrounds to quickly launch annotation workflows so they can focus on domain tasks.
- **Annotator-centered Lab Management:** First to integrate annotator account management, working hours tracking, and salary estimation into an NLP annotation portal, addressing the operational needs of academic labs.
- **Integrated Annotation-to-Evaluation Workflow:** Integrates "data labeling," "automated scoring," and "leaderboard generation" into a single portal system, replacing fragmented multi-tool workflows.
- **Built-in Dataset Analytics:** Eliminates the need for post-hoc analysis scripts by automatically computing and surfacing #Sentence, #Token, and #Label statistics within the portal, enabling researchers to monitor data quality and distribution throughout the labeling process.
- **Ensuring Data Integrity:** Hides test-set answers through a third-party scoring mechanism, effectively preventing data contamination caused by models "pre-learning" answers.

---

## Chapter 2 — Related Work

### 2.1 NLP Task Background Knowledge

- **NLP Task Types:** The system supports four NLP task templates categorized by input format and annotation need: **Single Sentence** — classification or scoring of a single text input; **Sentence Pairs** — comparing semantic relationships between two texts (e.g., similarity, entailment); **Sequence Labeling** — token-level annotation of POS tags, named entities, etc.; **Generative Labeling** — evaluating model-generated text quality or collecting human-written outputs. Understanding these task types is the prerequisite for designing a general-purpose annotation interface.
- **Importance of Labeled Data:** NLP model training heavily depends on human-annotated datasets. Annotation quality directly impacts model generalization and evaluation reliability, making a systematic and reproducible labeling workflow fundamentally important for advancing NLP research.
- **Basic Evaluation Metrics:** Core evaluation metrics include **Accuracy**, **Precision**, **Recall**, and **F1-score**. The system's automated scoring module uses these metrics as its core, automatically computing and returning results to the leaderboard based on task configuration.

### 2.2 Survey of Labeling Platforms & Tools

- **Label Studio Analysis:** An open-source data annotation platform (Apache 2.0) adopted by enterprises such as NVIDIA, Meta, and IBM. It excels in multi-modal support (image, audio, text, video, time series) and LLM fine-tuning data preparation. However, its server setup is tedious for non-engineering researchers, and it lacks built-in evaluation, leaderboard, and annotator management features.
- **CodaBench Analysis:** An academic benchmarking platform used by conferences such as SemEval and CLEF. It supports both code submission and result submission evaluation modes with flexible scoring mechanisms. However, its interface is unintuitive, and it provides no labeling or annotator management functionality.
- **Positioning of Label-Eval-Portal:** Unlike Label Studio (annotation-only) and CodaBench (evaluation-only), `Label-Eval-Portal` targets academic NLP labs and integrates annotation, automated evaluation, and leaderboard into a single config-driven system, while adding annotator lifecycle management absent from both existing tools.

### 2.3 Survey of Current Workflow Pain Points

- **Inefficient Labeling Practices:** Many teams resort to Excel or Word for labeling due to high tool barriers, lacking automation and version control.
- **Waste of Resources in "Reinventing the Wheel":** Due to the lack of general-purpose tools, researchers frequently develop one-off systems for single tasks that cannot be reused across different research projects, resulting in repeated engineering investment and a lack of generalizability.
- **Disconnected Annotator Management:** Research labs typically manage annotator hours and payments through external spreadsheets, introducing manual errors and operational overhead that could otherwise be automated within the annotation system.

### 2.4 Research on Chinese Data Annotation

- **Specificity of Chinese NLP Annotation:** Chinese annotation involves word boundary determination and complex domain terminology (e.g., medical terms), differing significantly from English in complexity and annotation requirements.
- **Domain Annotation Experience:** Drawing on the lab's extensive practical experience in Chinese medical/healthcare and sentiment/psychology domains to illustrate the necessity of flexible annotation templates for these specific fields.

### 2.5 Chinese Data Evaluation & Leaderboard Mechanisms

- **Establishing Evaluation Standards:** Research on establishing standardized datasets and evaluation workflows for Chinese domains lacking public benchmarks, enabling fair community-wide comparison.
- **Data Contamination & Third-party Evaluation:** In-depth discussion of the data contamination problem where models may have been pre-exposed to public test-set answers. Research on how third-party platforms retain answers server-side to ensure evaluation fairness.

---

## Chapter 3 — System Design & Architecture

### 3.1 Generalization Design Philosophy

- **Config-driven Architecture:** The system core adopts the "Config over Code" philosophy. Users only need to write simple YAML or JSON config files to define different types of NLP tasks, enabling rapid deployment and template reuse without engineering overhead.
- **Multi-task Support:** Supports four general NLP task templates: Single Sentence, Sentence Pairs, Sequence Labeling, and Generative Labeling, covering the full spectrum of common NLP research annotation needs.

### 3.2 Annotator Management Module

- **Account Management:** Supports annotator account creation, modification, and deletion, with role-based access control (Admin / Annotator / Reviewer) to ensure appropriate data access boundaries.
- **Working Hours Tracking:** Automatically records each annotator's active working hours per task session, providing an auditable log for lab administrators.
- **Salary Estimation:** Calculates estimated compensation based on recorded hours and configured hourly rates, simplifying the administrative overhead of managing part-time research assistants.

### 3.3 Annotation Tasks Module

- **High-Usability Interface:** Addresses the pain points of difficult interfaces and fragmented workflows in existing platforms by designing an intuitive labeling interface that lowers the learning curve for non-engineering annotators.
- **Task Initialization Workflow:** Describes how the system reads config files and dynamically generates corresponding labeling components and backend storage logic for each of the four supported task types.
- **Dry Run / Official Run Mechanism (Dry Run / Official Run Mechanism):** Supports two execution modes — Dry Run for validating the labeling interface and configuration correctness; Official Run for formally collecting annotation data. Data from both modes is strictly isolated.

### 3.4 Dataset Analysis Module

- **Statistical Overview:** Automatically computes and presents basic dataset statistics including sentence count (#Sentence), token count (#Token), and label distribution (#Label), helping researchers quickly understand dataset characteristics and identify potential imbalances.
- **Annotation Quality Monitoring:** Uses statistical analysis to help identify annotation inconsistencies or abnormal data distributions, improving overall annotation data quality.

### 3.5 Automated Evaluation & Leaderboard Module

- **Integrated Workflow:** Integrates the previously fragmented "labeling, scoring, leaderboard" into a single portal system, resolving the inefficiency of researchers repeatedly developing one-off evaluation systems.
- **Real-time Performance Benchmarking:** Supports automated scoring — uploaded model predictions are scored instantly with results reflected on the leaderboard.

### 3.6 Data Integrity Mechanism

- **Third-party Scoring & Test-set Confidentiality:** Implements the third-party scoring mechanism keeping test-set answers hidden server-side to ensure evaluation fairness.
- **Preventing Data Contamination:** Designs mechanisms ensuring models can only be tested through the platform, preventing exposure to test questions and correct answers during training.

---

## Chapter 4 — Implementation

### 4.1 Technology Stack and Development Tools

- **Frontend Architecture:** React + TypeScript + Vite — component-based development for responsive, high-usability annotation interfaces.
- **Backend Architecture:** FastAPI (Python) — async API service with native NLP ecosystem integration for scoring scripts.
- **AI-Assisted Development:** Leveraging AI tools to improve code quality and development efficiency, shortening the system development cycle.
- **Spec-Driven Development (SDD):** Requirements are converted into clear, verifiable specifications before coding begins, serving as the basis for all development work.

### 4.2 System Interface Showcase and UX Optimization

- **Intuitive Design:** Demonstrates how `Label-Eval-Portal` simplifies task management and labeling workflows compared to existing tools (CodaBench, Label Studio).
- **Visual Comparison:** Screenshot-based comparison of this system vs Label Studio / CodaBench for the same labeling task, highlighting the "rapid launch" and "all-in-one" advantages.

### 4.3 Implementation of Core Modules

- **Annotator Management Implementation:** Describes the account lifecycle, role-based permission enforcement, working hours logging mechanism, and salary estimation computation logic.
- **Dynamic Annotation Interface Generation:** Explains how the system parses uploaded config files and dynamically renders NLP labeling templates (Single Sentence, Sentence Pairs, Sequence Labeling, Generative Labeling).
- **Dry Run / Official Run Data Isolation:** Details the data partitioning strategy ensuring Dry Run data never contaminates Official Run datasets.
- **Dataset Statistics Pipeline:** Describes how #Sentence, #Token, and #Label statistics are computed and surfaced in real time.
- **Automated Scoring Pipeline:** Demonstrates how the backend automatically triggers evaluation scripts based on config and returns results to the leaderboard in real time.

### 4.4 Integration of Full Workflow

- **Implementation of Unified Portal:** Presents how the complete workflow — "annotator onboarding → task configuration → dry run → official labeling → dataset analysis → evaluation → leaderboard" — is integrated into a single system, replacing previously fragmented multi-tool processes.

---

## Chapter 5 — Experiments & Analysis

### 5.1 Experimental Scenarios: Chinese Medical and Sentiment Analysis

- **Practical Task Validation:** Applies the system to Chinese medical data and sentiment/psychology domain labeling tasks to validate domain applicability across multiple task types.

### 5.2 Quantitative Evaluation of System Efficiency

- **Task Setup Cost Comparison:** Quantitatively compares this system vs Label Studio in terms of **number of steps** and **setup time (minutes)** required to initialize the same task, demonstrating the efficiency advantage of config-driven design.

### 5.3 User Study and Satisfaction Analysis

- **Five-point Likert Scale:** Designed with reference to the Co-DETECT questionnaire format, covering usability, task clarity, and navigation intuitiveness as quantitative indicators.
- **Lab Member Pilot Study:** 5–10 lab members with annotation experience. Collects feedback on the config mechanism, annotator management features, and automated leaderboard functionality.

### 5.4 Dataset Analysis Validation

- **Statistics Accuracy Verification:** Validates that the system-computed #Sentence, #Token, and #Label statistics are accurate and consistent with ground-truth counts from the raw dataset, confirming the reliability of the built-in analytics pipeline.
- **Label Distribution Inspection:** Demonstrates how the Dataset Analysis Module surfaces class imbalance and annotation inconsistency patterns, using the Chinese medical and sentiment domain datasets as concrete examples.

### 5.5 Data Integrity Validation

- **Prevention of Contamination Testing:** Validates whether the third-party scoring platform effectively hides test-set answers to ensure evaluation fairness.

---

## Chapter 6 — Conclusion & Future Work

### 6.1 Conclusion

- **Summary of Contributions:** Summarizes how `Label-Eval-Portal` addresses the practical pain points of workflow fragmentation, "reinventing the wheel," annotator management overhead, and the absence of built-in dataset quality visibility in academic NLP labs.
- **Realization of Demo Paper Value:** Emphasizes the system's positioning as an all-in-one alternative to Label Studio + CodaBench for academic research teams, with open-source reuse value.

### 6.2 Research Limitations

- **Complexity of Generative Labeling:** The evaluation metrics and interface design for generative labeling tasks are considerably more complex than other task types. The current implementation provides basic support but has not yet been fully optimized for all generative scenarios.
- **Salary Calculation Scope:** The current salary estimation covers basic hourly-rate computation and does not handle full payroll compliance (e.g., labor insurance, tax withholding), limiting applicability to rough estimation for lab budgeting purposes.
- **Small-scale User Study:** Due to sample size constraints, user study participants are primarily from a specific lab, which may introduce scenario limitations.
- **Lack of Stress Testing:** The system has not yet undergone performance stress testing under large-scale high-concurrency conditions.

### 6.3 Future Work

- **AI-Assisted Labeling:** Inspired by the Co-DETECT approach, introduce LLM assistance for discovering annotation edge cases and optimizing labeling guidelines.
- **Inter-Annotator Agreement (IAA):** Add support for computing Cohen's Kappa and Fleiss' Kappa to quantify annotation consistency across multiple annotators.
- **Data Export in Standard Formats:** Support exporting annotated datasets in NLP-standard formats (e.g., CoNLL, BIO, JSON-L) for direct use in downstream model training pipelines.

---

## Chapter 7 — Ethics Statement

### 7.1 Data Privacy and Protection

- **Prevention of Data Contamination:** The third-party evaluation mechanism developed in this research ensures test-set answers are not exposed or pre-learned by large language models, maintaining academic evaluation integrity.
- **Sensitive Domain Data Handling:** For medical and psychology domain data used in system validation, only de-identified text is processed, and all data transmission complies with privacy protection standards.

### 7.2 User Study and Informed Consent

- **Participant Recruitment and Rights:** All researchers and experts participating in usability testing and annotation validation are clearly informed of the research purpose and procedures beforehand, and retain the right to withdraw at any time.
- **Anonymization of Feedback Data:** User interview and feedback data are anonymized to ensure individual participants cannot be tracked or identified, and data is used solely for system optimization and academic analysis.
