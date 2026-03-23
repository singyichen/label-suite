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

- **Friction in Existing Tools:** Existing tools like Label Studio are extremely tedious and time-consuming to set up, while CodaBench's interface is insufficiently intuitive, resulting in a steep learning curve for research teams.
- **Inefficient Workflows:** Research teams are often forced to use Excel for labeling due to the high barrier of existing tools, or to "reinvent the wheel" by developing one-off systems for specific tasks, wasting engineering resources.
- **Risks of Data Contamination and Evaluation Fairness:** Many studies publicly post test-set answers on GitHub, potentially allowing LLMs to "pre-study" answers during training. Existing tools generally lack a fair third-party scoring mechanism to hide answers, undermining the scientific validity of evaluation results.
- **Fragmented and Disconnected Workflows:** Current labeling (e.g., Label Studio), evaluation (e.g., custom scripts), and leaderboard display (e.g., manual web updates) are typically separate and disconnected processes. This fragmentation forces researchers to frequently convert data formats between tools, significantly increasing error risk and time costs.

### 1.3 Research Objectives

- **Developing a General-Purpose Portal:** Build a lightweight platform named `Label-Eval-Portal` that supports multiple NLP task templates.
- **Config-driven Launch:** Enable rapid labeling server deployment through simple config files, replacing traditional complex system development workflows.
- **Integrating a Unified Workflow:** Integrate data labeling, automated evaluation, and leaderboard display into a single portal, eliminating the friction of data conversion between existing tools.
- **Establishing a Fair Evaluation Mechanism:** Through third-party scoring logic that isolates test-set answers, ensure the fairness of model evaluation and prevent data contamination.

### 1.4 Research Contributions

- **Lowering Entry Barriers:** Significantly simplifies the deployment of labeling and evaluation environments, enabling researchers without deep engineering backgrounds to quickly launch annotation and evaluation workflows so they can focus on domain tasks.
- **Integrated Workflow:** First to integrate "data labeling," "automated scoring," and "leaderboard generation" into a single portal system.
- **Ensuring Data Integrity:** Hides test-set answers through a third-party scoring mechanism, effectively preventing data contamination caused by models "pre-learning" answers.

---

## Chapter 2 — Related Work

### 2.1 Survey of Labeling Platforms & Tools

- **Analysis of Label Studio & CodaBench:** Although Label Studio is powerful, its server setup process is tedious. CodaBench is an academic standard but has an extremely difficult and unintuitive interface.
- **Architectural Limitations:** Existing platforms lack an integrated workflow combining labeling, automated scoring, and leaderboards, and are difficult to launch for specific NLP tasks via config files.

### 2.2 Survey of Current Workflow Pain Points

- **Inefficient Labeling Practices:** Many teams resort to Excel or Word for labeling due to high tool barriers, lacking automation and version control.
- **Waste of Resources in "Reinventing the Wheel":** Due to the lack of general-purpose tools, researchers frequently develop one-off systems for single tasks that cannot be reused across different research projects, resulting in repeated engineering investment and a lack of generalizability.

### 2.3 Research on Chinese Data Annotation

- **Specificity of Chinese NLP Annotation:** Chinese annotation involves word boundary determination and complex domain terminology (e.g., medical terms), differing significantly from English in complexity and annotation requirements.
- **Domain Annotation Experience:** Drawing on the lab's extensive practical experience in Chinese medical/healthcare and sentiment/psychology domains to illustrate the necessity of flexible annotation templates for these specific fields.

### 2.4 Chinese Data Evaluation & Leaderboard Mechanisms

- **Establishing Evaluation Standards:** Research on establishing standardized datasets and evaluation workflows for Chinese domains lacking public benchmarks, enabling fair community-wide comparison.
- **Data Contamination & Third-party Evaluation:** In-depth discussion of the data contamination problem where models may have been pre-exposed to public test-set answers. Research on how third-party platforms retain answers server-side to ensure evaluation fairness.

---

## Chapter 3 — System Design & Architecture

### 3.1 Generalization Design Philosophy

- **Config-driven Architecture:** The system core adopts the "Config over Code" philosophy. Users only need to write simple YAML or JSON config files to define different types of NLP tasks, enabling rapid deployment and template reuse.
- **Multi-task Support:** Supports general task templates including Classification, Regression, and Span Labeling to meet research needs across different domains.

### 3.2 Labeling Module Design

- **High-Usability Interface:** Addresses the pain points of difficult interfaces and fragmented workflows in existing platforms by designing an intuitive labeling interface that lowers the learning curve for non-engineering annotators.
- **Task Initialization Workflow:** Describes how the system reads config files and dynamically generates corresponding labeling components and backend storage logic.

### 3.3 Automated Evaluation & Leaderboard Module

- **Integrated Workflow:** Integrates the previously fragmented "labeling, scoring, leaderboard" into a single portal system, resolving the inefficiency of researchers repeatedly developing one-off evaluation systems.
- **Real-time Performance Benchmarking:** Supports automated scoring — uploaded model predictions are scored instantly with results reflected on the leaderboard.

### 3.4 Data Integrity Mechanism

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

- **Intuitive Design:** Addresses the navigation pain points of existing tools (e.g., CodaBench) and demonstrates how `Label-Eval-Portal` simplifies task management and labeling workflows.
- **Visual Comparison:** Screenshot-based comparison of this system vs Label Studio / CodaBench for the same labeling task, highlighting the "rapid launch" advantage.

### 4.3 Implementation of Config-driven Functionality

- **Dynamic Component Generation:** Explains how the system parses uploaded config files and dynamically renders corresponding NLP labeling templates (e.g., classification, span labeling).
- **Automated Scoring Pipeline:** Demonstrates how the backend automatically triggers evaluation scripts based on config and returns results to the leaderboard in real time.

### 4.4 Integration of Labeling and Evaluation Workflow

- **Implementation of Unified Portal:** Presents how "labeling, submission, scoring, leaderboard" are integrated into a single web workflow, replacing previously fragmented processes.

---

## Chapter 5 — Experiments & Analysis

### 5.1 Experimental Scenarios: Chinese Medical and Sentiment Analysis

- **Practical Task Validation:** Applies the system to Chinese medical data and sentiment/psychology domain labeling tasks to validate domain applicability.

### 5.2 Quantitative Evaluation of System Efficiency

- **Task Setup Cost Comparison:** Quantitatively compares this system vs Label Studio in terms of **number of steps** and **setup time (minutes)** required to initialize the same task, demonstrating the efficiency advantage of config-driven design.

### 5.3 User Study and Satisfaction Analysis

- **Five-point Likert Scale:** Designed with reference to the Co-DETECT questionnaire format, covering usability, task clarity, and navigation intuitiveness as quantitative indicators.
- **Lab Member Pilot Study:** 5–10 lab members with annotation experience. Collects feedback on the config mechanism and automated leaderboard functionality.

### 5.4 Data Integrity Validation

- **Prevention of Contamination Testing:** Validates whether the third-party scoring platform effectively hides test-set answers to ensure evaluation fairness.

---

## Chapter 6 — Conclusion & Future Work

### 6.1 Conclusion

- **Summary of Contributions:** Summarizes how `Label-Eval-Portal` addresses the practical pain points of workflow fragmentation and "reinventing the wheel."
- **Realization of Demo Paper Value:** Emphasizes the system's reuse value in the open-source community and academic research.

### 6.2 Research Limitations

- **Limited Task Support:** The system is currently optimized for general NLP tasks (classification, regression, span labeling) and does not yet cover all complex generative tasks.
- **Small-scale User Study:** Due to sample size constraints, user study participants are primarily from a specific lab, which may introduce scenario limitations.
- **Lack of Stress Testing:** The system has not yet undergone performance stress testing under large-scale high-concurrency conditions.

### 6.3 Ethics Statement

- **Data Privacy and Protection:** Describes data de-identification handling and informed consent regulations for study participants.

### 6.4 Future Work

- **AI-Assisted Labeling:** Inspired by the Co-DETECT approach, introduce LLM assistance for discovering annotation edge cases and optimizing labeling guidelines.

---

## Chapter 7 — Ethics Statement

### 7.1 Data Privacy and Protection

- **Prevention of Data Contamination:** The third-party evaluation mechanism developed in this research ensures test-set answers are not exposed or pre-learned by large language models, maintaining academic evaluation integrity.
- **Sensitive Domain Data Handling:** For medical and psychology domain data used in system validation, only de-identified text is processed, and all data transmission complies with privacy protection standards.

### 7.2 User Study and Informed Consent

- **Participant Recruitment and Rights:** All researchers and experts participating in usability testing and annotation validation are clearly informed of the research purpose and procedures beforehand, and retain the right to withdraw at any time.
- **Anonymization of Feedback Data:** User interview and feedback data are anonymized to ensure individual participants cannot be tracked or identified, and data is used solely for system optimization and academic analysis.
