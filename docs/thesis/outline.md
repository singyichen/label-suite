# Thesis Outline — Label Suite

**Title (tentative):** Label Suite: A Config-Driven NLP Annotation Platform with Built-in Dataset Analytics

**Type:** Demo Paper (Master's Thesis)

**Advisor:** Prof. Lung-Hao Lee — [Natural Language Processing Lab](https://ainlp.tw/)

---

## Capability Status Convention

Every capability claim in this outline carries one of three tiers. A tier is judged against the repository at the time of writing, not against the intended end state.

- **Implemented** — exists as production code (with tests) under `frontend/` or `backend/`. A capability that only exists in `design/prototype/` is **not** Implemented, because the prototype is a validated design artifact and not the product.
- **Specified** — defined by a canonical spec under `specs/` (cited by FR ID) and, where applicable, demonstrated in `design/prototype/`, but not yet built in `frontend/` or `backend/`. All canonical specs cited below are still `Draft`.
- **Planned** — research direction with no canonical FR yet; neither specified nor built.

At the time of writing, `frontend/` and `backend/` contain only the engineering scaffold and a health-check slice, so the only Implemented items are the technology baseline. Every product capability described in Chapters 3–4 is Specified, and must not be presented as an experimentally validated result until it is built and evaluated (Chapter 5).

| Capability | Tier | Source |
|---|---|---|
| React + TypeScript + Vite frontend, FastAPI backend, health-check slice (4.1) | Implemented | `frontend/src/features/health/`, `backend/app/modules/health/`; baseline in `foundation/000` (no FR) |
| Composable task model: `outputs[]` over 8 output types (`sequence_tagging`, `entity_recognition`, `relation_identification`, `single_label`, `multi_label`, `single_dim`, `multi_dim`, `free_text`) and 2 input types (`single_item`, `item_pair`) (2.1, 3.1, 4.3) | Specified | `task-management/013` FR-002e, FR-003d, FR-003c; ADR-029 |
| Config-driven task creation, YAML/JSON config editing and upload (3.1, 3.2) | Specified | `task-management/013` FR-001, FR-003, FR-003e, FR-003h |
| Config-driven annotation workspace rendered from `outputs[]` (3.3, 4.3) | Specified | `annotation/015` FR-024, FR-013 |
| Task-level roles and member management (3.2) | Specified | `task-management/014` FR-002, FR-005, FR-007 |
| Dry Run / Official Run mechanism with data isolation (3.3, 4.3) | Specified | `task-management/014` FR-008a, FR-010b |
| Dataset statistics: #Sentence, #Token, per-type label distributions (3.4, 4.3) | Specified | `dataset/017` FR-008, FR-009F to FR-009M |
| Annotation quality monitoring: per-type IAA (Krippendorff alpha / ICC / span F1 / unitizing alpha), with Cohen's and Fleiss' Kappa as auxiliary metrics for `single_label` (3.4, 6.3) | Specified | `dataset/017` FR-012, FR-012F, FR-039 |
| Export as `JSON` and `JSON-MIN` (4.4, 6.3) | Specified | `task-management/014` FR-009, FR-015e, FR-015h |
| Export of `sequence_tagging` as token sequences in BIO / BIOES / IOB2 (character-level by default, word-level optional) (6.3) | Specified | `dataset/017` FR-041, FR-042; `task-management/014` FR-020 |
| Export as CoNLL or JSON-L files | Planned | No canonical FR. JSON Lines appears in the specs only as an upload format (`task-management/013` FR-002a, `dataset/021` FR-003) |
| LLM-assisted labeling, edge-case discovery (6.3) | Planned | No canonical FR |
| Large-scale concurrency / stress testing (6.2) | Planned | No canonical FR |
| Comparative evaluation against Label Studio and the lab user study (5.2, 5.3) | Planned | Research activity; no FR |

---

## Chapter 1 — Introduction

### 1.1 Research Background

- **Data-driven Paradigm:** High-quality labeled data is the key foundation driving model progress under the current data-driven NLP research paradigm.
- **Complexity of Chinese Language:** Chinese presents high complexity in word boundary determination (word segmentation), semantic ambiguity, and domain-specific terminology. Compared to English, establishing standardized Chinese labeling workflows is considerably more difficult, making the development of specialized system tools highly urgent.
- **Domain Knowledge Needs:** Specific domains such as Chinese medical/healthcare and sentiment/psychology analysis urgently require precise and professional labeling workflows to establish reliable benchmarks.

### 1.2 Research Motivation

- **Friction in Existing Tools:** The existing **Label Studio** is extremely tedious and time-consuming to set up, resulting in a steep learning curve for research teams without engineering backgrounds.
- **Inefficient Workflows:** Research teams are often forced to use Excel for labeling due to high tool barriers, or to "reinvent the wheel" by developing one-off systems for specific tasks, wasting engineering resources.
- **Absence of Dataset Quality Visibility:** Existing annotation tools provide no built-in dataset statistics (e.g., sentence count, token distribution, label balance), forcing researchers to write ad-hoc analysis scripts after each labeling round to inspect data quality.
- **Fragmented and Disconnected Workflows:** The annotation workflow — from task configuration and labeling to dataset export — is fragmented across disparate tools, forcing researchers to manage multiple systems and convert data formats manually, significantly increasing error risk and time cost.

### 1.3 Research Objectives

- **Developing a General-Purpose Annotation Platform:** Build a lightweight platform named **`Label Suite`** targeting academic NLP labs, enabling rapid deployment of diverse annotation tasks through simple configuration files.
- **Config-driven Launch:** Enable rapid deployment of labeling servers through simple config files, replacing traditional complex system development workflows.
- **Dataset Quality Visibility:** Provide real-time dataset statistics (#Sentence, #Token, #Label) to help researchers inspect data characteristics and annotation quality without external scripts.
- **Integrating a Unified Annotation Workflow:** Integrate task configuration, data labeling, and dataset analysis into a single portal, eliminating the friction of managing multiple disconnected tools.

### 1.4 Research Contributions

- **Lowering Entry Barriers:** Significantly simplifies the deployment of labeling environments, enabling researchers without deep engineering backgrounds to quickly launch annotation workflows so they can focus on domain tasks.
- **Integrated Annotation Workflow:** Integrates "task configuration," "data labeling," and "dataset analysis" into a single portal system, replacing fragmented multi-tool workflows.
- **Built-in Dataset Analytics:** Eliminates the need for post-hoc analysis scripts by automatically computing and surfacing #Sentence, #Token, and #Label statistics within the portal, enabling researchers to monitor data quality and distribution throughout the labeling process.

---

## Chapter 2 — Related Work

### 2.1 NLP Task Background Knowledge

- **NLP Task Types:** For exposition, NLP annotation tasks fall into four classical categories by input format and annotation need (the platform itself does not hard-code these as templates; it composes them from `outputs[]` — **Specified**, `task-management/013` FR-003d): **Single Sentence** — classification or scoring of a single text input; **Sentence Pairs** — comparing semantic relationships between two texts (e.g., similarity, entailment); **Sequence Labeling** — token-level annotation of POS tags, named entities, etc.; **Generative Labeling** — collecting human-written outputs or rating model-generated text quality. Single Sentence typically maps to `single_item` plus label or dimension outputs, Sentence Pairs to `item_pair`, Sequence Labeling to `sequence_tagging` / `entity_recognition` / `relation_identification`, and Generative Labeling to `free_text`. Understanding these task types is the prerequisite for designing a general-purpose annotation interface.
- **Importance of Labeled Data:** NLP model training heavily depends on human-annotated datasets. Annotation quality directly impacts model generalization and evaluation reliability, making a systematic and reproducible labeling workflow fundamentally important for advancing NLP research.
- **Basic Annotation Quality Metrics:** Core data quality indicators include label consistency, inter-annotator agreement, and label distribution balance. These metrics guide the design of the Dataset Analysis Module and inform quality monitoring during the labeling process.

### 2.2 Survey of Labeling Platforms & Tools

- **Label Studio Analysis:** An open-source data annotation platform (Apache 2.0) adopted by enterprises such as NVIDIA, Meta, and IBM. It excels in multi-modal support (image, audio, text, video, time series) and LLM fine-tuning data preparation. However, its server setup is tedious for non-engineering researchers, and it lacks built-in dataset analytics tailored to academic NLP workflows.
- **Differentiated Positioning of Label Suite:** Taking Label Studio as the reference baseline, `Label Suite` targets academic NLP labs and differentiates by: (1) enabling config-driven rapid deployment without engineering overhead; (2) integrating task setup, dry-run validation, official labeling, and dataset analysis into one workflow; (3) integrating built-in dataset statistics (#Sentence, #Token, #Label) for real-time quality monitoring.

### 2.3 Survey of Current Workflow Pain Points

- **Inefficient Labeling Practices:** Many teams resort to Excel or Word for labeling due to high tool barriers, lacking automation and version control.
- **Waste of Resources in "Reinventing the Wheel":** Due to the lack of general-purpose tools, researchers frequently develop one-off systems for single tasks that cannot be reused across different research projects, resulting in repeated engineering investment and a lack of generalizability.
- **Disconnected Quality Inspection:** Research labs typically inspect dataset quality with external scripts after labeling rounds, introducing manual errors and slowing down iteration that could otherwise happen inside the annotation system.

### 2.4 Research on Chinese Data Annotation

- **Specificity of Chinese NLP Annotation:** Chinese annotation involves word boundary determination and complex domain terminology (e.g., medical terms), differing significantly from English in complexity and annotation requirements.
- **Domain Annotation Experience:** Drawing on the lab's extensive practical experience in Chinese medical/healthcare and sentiment/psychology domains to illustrate the necessity of flexible annotation templates for these specific fields.

---

## Chapter 3 — System Design & Architecture

### 3.1 Generalization Design Philosophy

- **Config-driven Architecture:** The system core adopts the "Config over Code" philosophy. Users only need to write simple YAML or JSON config files to define different types of NLP tasks, enabling rapid deployment and template reuse without engineering overhead.
- **Multi-task Support (Specified):** Instead of four fixed templates, a task is a composition of one or more of eight output types over a single-item or item-pair input (`task-management/013` FR-002e, FR-003d, FR-003c), so the four classical categories of Section 2.1 and their mixtures are covered without changing the core flow.

### 3.2 Task Management Module

- **Task Configuration:** Supports config-driven task creation, task member assignment, and run-state control so project leaders can manage annotation workflows without custom engineering.
- **Role-Based Collaboration:** Uses task-level roles (`project_leader` / `reviewer` / `annotator`) to keep task setup, labeling, review, and result access within appropriate data boundaries.

### 3.3 Labeling Module Design

- **High-Usability Interface:** Addresses the pain points of difficult interfaces and fragmented workflows in existing platforms by designing an intuitive labeling interface that lowers the learning curve for non-engineering annotators.
- **Task Initialization Workflow:** Describes how the system reads config files and dynamically generates corresponding labeling components and backend storage logic.
- **Dry Run / Official Run Mechanism:** Supports two execution modes — Dry Run for validating the labeling interface and configuration correctness; Official Run for formally collecting annotation data. Data from both modes is strictly isolated.

### 3.4 Dataset Analysis Module

- **Statistical Overview:** Automatically computes and presents basic dataset statistics including sentence count (#Sentence), token count (#Token), and label distribution (#Label), helping researchers quickly understand dataset characteristics.
- **Annotation Quality Monitoring:** Uses statistical analysis to help identify annotation inconsistencies or abnormal data distributions, improving overall annotation data quality.

---

## Chapter 4 — Implementation

### 4.1 Technology Stack and Development Tools

- **Frontend Architecture:** React + TypeScript + Vite — component-based development for responsive, high-usability annotation interfaces.
- **Backend Architecture:** FastAPI (Python) — async API service with native NLP ecosystem integration.
- **AI-Assisted Development:** Leveraging AI tools to improve code quality and development efficiency, shortening the system development cycle.
- **Spec-Driven Development (SDD):** Requirements are converted into clear, verifiable specifications before coding begins, serving as the basis for all development work.

### 4.2 System Interface Showcase and UX Optimization

- **Intuitive Design:** Addresses the pain points of Label Studio's complex and cluttered setup, demonstrating how **`Label Suite`** simplifies task management and labeling workflows.
- **Visual Comparison:** Screenshot-based comparison of this system vs Label Studio for the same labeling task, highlighting the "rapid launch," "workflow integration," and "built-in analytics" advantages.

### 4.3 Implementation of Core Modules

- **Task Management Implementation:** Describes task lifecycle, task member assignment, role-based permission enforcement, and run-state control.
- **Dynamic Annotation Interface Generation:** Explains how the system parses uploaded config files and dynamically renders the labeling interface for each output type in `outputs[]` (**Specified**, `annotation/015` FR-024).
- **Dry Run / Official Run Data Isolation:** Details the data partitioning strategy ensuring Dry Run data never contaminates Official Run datasets.
- **Dataset Statistics Pipeline:** Describes how #Sentence, #Token, and #Label statistics are computed and surfaced in real time.

### 4.4 Integration of Full Workflow

- **Implementation of Unified Annotation Portal:** Presents how the complete workflow — "task configuration → dry run → official labeling → dataset analysis → export" — is integrated into a single system, replacing previously fragmented multi-tool processes.

---

## Chapter 5 — Experiments & Analysis

### 5.1 Experimental Scenarios: Chinese Medical and Sentiment Analysis

- **Practical Task Validation:** Applies the system to Chinese medical data and sentiment/psychology domain labeling tasks to validate domain applicability across multiple task types.

### 5.2 Quantitative Evaluation of System Efficiency (New Metrics)

- **Task Setup Cost Comparison:** Quantitatively compares this system vs Label Studio in terms of **number of steps** and **setup time (minutes)** required to initialize the same task, demonstrating the efficiency advantage of config-driven design.

### 5.3 User Study and Satisfaction Analysis

- **Five-point Likert Scale:** Designed with reference to the Co-DETECT questionnaire format, covering usability, task clarity, and navigation intuitiveness as quantitative indicators.
- **Lab Member Pilot Study:** 5–10 lab members with annotation experience. Collects feedback on the config mechanism, workflow integration, and built-in dataset analytics.

### 5.4 Dataset Analysis Validation

- **Statistics Accuracy Verification:** Validates that the system-computed #Sentence, #Token, and #Label statistics are accurate and consistent with ground-truth counts from the raw dataset, confirming the reliability of the built-in analytics pipeline.
- **Label Distribution Inspection:** Demonstrates how the Dataset Analysis Module surfaces class imbalance and annotation inconsistency patterns, using the Chinese medical and sentiment domain datasets as concrete examples.

---

## Chapter 6 — Conclusion & Future Work

### 6.1 Conclusion

- **Summary of Contributions:** Summarizes how **`Label Suite`** addresses the practical pain points of workflow fragmentation, "reinventing the wheel," and the absence of built-in dataset quality visibility in academic NLP labs.
- **Realization of Demo Paper Value:** Emphasizes the system's positioning as a config-driven, workflow-centered alternative to Label Studio for academic research teams, with open-source reuse value.

### 6.2 Research Limitations (New Section)

- **Complexity of Generative Labeling Interface:** The interface design and quality monitoring for generative labeling tasks are considerably more complex than other task types. The `free_text` output type is Specified (`task-management/013` FR-003d-10) but not yet built in the product, and has not been optimized for all generative scenarios.
- **Small-scale User Study:** Due to sample size constraints, user study participants are primarily from a specific lab, which may introduce scenario limitations.
- **Lack of Stress Testing:** The system has not yet undergone performance stress testing under large-scale high-concurrency conditions.

### 6.3 Future Work

- **AI-Assisted Labeling:** Inspired by the Co-DETECT approach, introduce LLM assistance for discovering annotation edge cases and optimizing labeling guidelines.
- **Inter-Annotator Agreement (IAA) — Specified, not built:** The quality-monitoring spec already defines per-output-type IAA, with Krippendorff's alpha as the primary metric for `single_label` and Cohen's / Fleiss' Kappa as auxiliary metrics (`dataset/017` FR-012F, FR-039). Future work is building and validating it.
- **Data Export in Standard Formats:** `JSON` and `JSON-MIN` export is Specified (`task-management/014` FR-009, FR-015h). BIO / BIOES / IOB2 sequence export for `sequence_tagging` is Specified (`dataset/017` FR-041, FR-042; `task-management/014` FR-020). Neither is built yet. CoNLL and JSON-L files are **Planned** with no canonical FR; they must not be described as supported.

---

## Chapter 7 — Ethics Statement

### 7.1 Data Privacy and Protection

- **Participant Data Protection:** User account information and study feedback are stored securely with appropriate access controls, ensuring personal data is only accessible to authorized administrators.
- **Sensitive Domain Data Handling:** For medical and psychology domain data used in system validation, only de-identified text is processed, and all data transmission complies with privacy protection standards.

### 7.2 User Study and Informed Consent

- **Participant Recruitment and Rights:** All researchers and experts participating in usability testing and annotation validation are clearly informed of the research purpose and procedures beforehand, and retain the right to withdraw at any time.
- **Anonymization of Feedback Data:** User interview and feedback data are anonymized to ensure individual participants cannot be tracked or identified, and data is used solely for system optimization and academic analysis.

---

## References
