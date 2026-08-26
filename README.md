<div align="center">

<img src="assets/logo/icon-colored.svg" alt="Label Suite" width="100">

# Label Suite

<a href="README.zh-TW.md">繁體中文</a> | <strong>English</strong>

**A config-driven NLP annotation platform with built-in dataset analytics, designed for academic research labs.**

Launch annotation tasks through simple config files — no custom code required. Built-in dataset statistics eliminate post-hoc analysis scripts.

[![License: Research Preview](https://img.shields.io/badge/License-Research%20Preview-red.svg)](#license)
![Python](https://img.shields.io/badge/Backend-FastAPI-009688.svg)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB.svg)
![NLP](https://img.shields.io/badge/Domain-NLP%20Annotation-orange.svg)
![Demo Paper](https://img.shields.io/badge/Research-Demo%20Paper-8A2BE2.svg)

</div>

---

## Motivation

Existing annotation platforms such as [Label Studio](https://labelstud.io/) are powerful but come with significant friction for academic research teams:

- **Complex setup:** Deploying Label Studio requires configuring a dedicated server, which is time-consuming and demands engineering effort beyond the scope of most research teams.
- **Fragmented workflows:** Task configuration, labeling, and dataset analysis are often handled by separate tools or ad-hoc scripts, forcing researchers to repeatedly build one-off systems from scratch.
- **No dataset quality visibility:** Existing tools provide no built-in dataset statistics, forcing researchers to write analysis scripts after each labeling round.

**Label Suite** aims to eliminate these pain points by providing a lightweight, config-driven annotation platform that any NLP research team can launch with minimal setup.

---

## Quick Start

```bash
bash scripts/init.sh                    # one-time setup (deps + backend/.env)
cd backend && uv run uvicorn app.main:create_app --factory --reload
cd frontend && pnpm dev                 # http://localhost:5173
./scripts/serve-prototype.sh            # http://localhost:8888 — the product screens
```

> **Where the screens live:** `frontend/` is currently the Foundation-Core scaffold and serves only `/health-check`. The annotation, task-configuration, and review screens are still HTML prototypes under `design/prototype/` — serve them with the last command above.

Full instructions, integration tests, and seed data: **[docs/development.md](docs/development.md)**.

---

## System Workflow

![Label Suite system workflow](docs/diagrams/workflow/system-workflow.png)

---

## Site Map

![Label Suite site map](docs/site-map/site-map.en.png)

> Standalone HTML version: [docs/site-map/site-map.en.html](docs/site-map/site-map.en.html) — open it locally in a browser to see hover descriptions for each page.

---

## Key Features

- **Config-driven Task Launch:** Define NLP annotation tasks through simple YAML/JSON config files — no custom code required. Supports Single Sentence, Sentence Pairs, Sequence Labeling, and Generative Labeling.
- **Dry Run / Official Run Mechanism:** Validate labeling interfaces and configurations before formal data collection, with strict data isolation between modes.
- **Built-in Dataset Analytics:** Automatically computes and surfaces #Sentence, #Token, and #Label statistics in real time for quality monitoring.
- **High Usability UI:** Intuitive labeling interface designed for non-engineering annotators.

---

## Key Contributions

1. **Config-Driven and General-Purpose**
   Launch annotation tasks for diverse NLP task types through a simple configuration file — no custom code required for each new task.

2. **Config-Driven Task Workflow**
   Turns task setup, dry-run validation, official labeling, and dataset analysis into one repeatable workflow for academic NLP labs.

3. **Built-in Dataset Analytics**
   Eliminates the need for post-hoc analysis scripts by automatically computing and surfacing dataset statistics within the portal.

4. **Integrated Annotation Workflow**
   Combines task configuration, data labeling, and dataset analysis in a single platform, replacing fragmented multi-tool pipelines.

5. **Low Entry Barrier**
   Designed for researchers and annotators without deep engineering backgrounds — spin up a labeling server in minutes, not days.

6. **Publicly Viewable Research Preview**
   The source code is publicly viewable for academic evaluation and citation; usage rights are governed by the repository's [LICENSE](LICENSE) notice.

---

## Academic Contribution

This project is positioned as a **Demo Paper**, with its core value in:

- Lowering the barrier for NLP research teams to set up annotation environments.
- Providing a reusable annotation toolkit that addresses the practical inefficiency of ad-hoc workflows in academic labs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + TypeScript + Vite |
| **Backend** | FastAPI (Python) |
| **Database** | SQLite (quick start) / PostgreSQL (production) |
| **Cache / Queue** | Redis |
| **Async Tasks** | Celery |
| **Testing** | Playwright (E2E) + pytest |

> **Note:** This tech stack reflects the current design decision; implementation is tracked in Phase 3.
>
> **SQLite quick-start warning:** The default SQLite tier is intended for single-user local demos and evaluation only. It does **not** support concurrent writes and is **not recommended for multi-user production deployments**. Set `DATABASE_URL=postgresql+asyncpg://...` to switch to the production-grade PostgreSQL tier (see ADR-024).

---

## Comparison with Label Studio

| Feature | Label Studio | **Label Suite** |
|---|---|---|
| Easy setup (no server config) | ✗ | ✓ |
| Config-driven task definition | Partial | ✓ |
| Built-in dataset statistics | ✗ | ✓ |
| Dry Run / Official Run isolation | ✗ | ✓ |
| Designed for NLP research teams | ✓ | ✓ |
| Open source | ✓ | ✗ (Research Preview — viewable, all rights reserved) |

---

## Research Roadmap

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "cScale0": "#3B82F6",
    "cScale1": "#8B5CF6",
    "cScale2": "#10B981",
    "cScale3": "#F59E0B",
    "gridColor": "#E5E7EB",
    "todayLineColor": "#EF4444",
    "fontSize": "14px"
  }
}}%%
gantt
    title Label Suite — Research Roadmap
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y

    section Phase 1 · Problem Definition
    Tool survey (Label Studio)                    :p1a, 2026-04-01, 2026-06-01
    UX interview & pain-point questionnaire       :p1d, 2026-05-01, 2026-07-01
    Academic paper survey (Related Work)          :p1e, 2026-05-01, 2026-08-01
    Define system contributions                   :p1b, 2026-06-01, 2026-07-01
    Study Demo Paper examples from target venue   :p1c, 2026-07-01, 2026-08-01

    section Phase 2 · System Design
    Core module planning                          :p2a, 2026-08-01, 2026-09-01
    General-purpose task template design          :p2b, 2026-09-01, 2026-11-01
    Tech stack documentation                      :p2c, 2026-10-01, 2026-11-01
    Dataset analytics module design               :p2d, 2026-11-01, 2026-12-01
    Preliminary Related Work draft                :p2e, 2026-10-01, 2026-12-01

    section Phase 3 · Development & Validation
    Project infrastructure & CI                   :p3a, 2026-12-01, 2027-02-01
    Backend — FastAPI + DB + Celery               :p3b, 2027-02-01, 2027-07-01
    Frontend — React annotation UI                :p3c, 2027-04-01, 2027-09-01
    Dataset analytics & export features           :p3d, 2027-07-01, 2027-11-01
    Domain validation & user feedback             :p3e, 2027-09-01, 2027-12-01
    Mini user study (SUS questionnaire)           :p3g, 2027-11-01, 2028-01-01
    Demonstration scenarios & demo video          :p3h, 2027-11-01, 2028-02-01

    section Phase 4 · Paper & Demo
    Paper outline & section drafts                :p4a, 2028-01-01, 2028-03-01
    Advisor review & revision cycle               :p4b, 2028-03-01, 2028-04-01
    System demonstration preparation              :p4c, 2028-03-01, 2028-04-01
```

### Phase 1 — Problem Definition & Tool Survey (Month 1–4)
- [ ] Survey Label Studio and identify pain points in setup, usability, and dataset analytics
- [ ] Conduct UX interviews and distribute a pain-point questionnaire to target users (researchers, annotators)
- [ ] Survey related academic papers on annotation platforms to establish positioning for the Related Work section
- [ ] Define the system's contribution: clarify how Label Suite is simpler and more usable than Label Studio
- [ ] Study Demo Paper examples from target venue proceedings to understand structure, length, and demonstration requirements

### Phase 2 — System Design & General-Purpose Architecture (Month 5–8)
- [ ] Plan core modules: Task Management, Annotation Tasks, Dataset Analysis
- [ ] Design general-purpose task templates — ensure the system supports diverse NLP tasks (Single Sentence, Sentence Pairs, Sequence Labeling, Generative Labeling)
- [ ] Document and ratify tech stack decision (FastAPI + React + PostgreSQL + Redis + Celery)
- [ ] Design dataset analytics module (#Sentence, #Token, #Label, quality monitoring)
- [ ] Draft preliminary Related Work notes; confirm no existing system makes the same contribution claim

### Phase 3 — Development & Validation (Month 9–22)
- [ ] Project infrastructure setup (SDD workflow, CI, AI agents)
- [ ] Implement frontend annotation interface and backend logic (leverage AI tools to assist development)
- [ ] Implement task member coordination through task detail workflows
- [ ] Implement Dry Run / Official Run mechanism with strict data isolation
- [ ] Implement built-in dataset analytics (#Sentence, #Token, #Label)
- [ ] Validate system on domain-specific NLP tasks (e.g., Chinese medical/healthcare, sentiment & psychological analysis)
- [ ] Conduct structured mini user study with lab members (SUS questionnaire); document results as paper evidence
- [ ] Define 2–3 demonstration scenarios covering core workflows (task launch via config, dry run validation, dataset analysis)
- [ ] Capture system screenshots and record a demo walkthrough video

### Phase 4 — Paper Writing & Demo Preparation (Month 22–24)
- [ ] Draft paper outline and confirm structure with advisor (Introduction, System Overview, Key Features, Demonstration Scenarios, Related Work, Conclusion)
- [ ] Write thesis in English to Demo Paper length and format
- [ ] Complete advisor review cycle; address all feedback
- [ ] Prepare system demonstration to showcase practical impact

---

## Target Application Domains

- Chinese Medical & Healthcare NLP
- Sentiment & Psychological Analysis
- General NLP annotation tasks (classification, span labeling, etc.)

---

## Advisor

**Prof. Lung-Hao Lee** — [Natural Language Processing Lab](https://ainlp.tw/)

- Personal Page: [lunghao.weebly.com](https://lunghao.weebly.com/)

Research focus: Chinese NLP, text annotation, and language model evaluation.

---

## License

**Copyright © 2026 Sing-Yi Chen (陳欣怡). All rights reserved.**

Label Suite is unpublished research software. No permission is granted to
copy, modify, publish, distribute, deploy, or create derivative works without
prior written authorization from the copyright holder. See [LICENSE](LICENSE)
for the complete notice and [CITATION.cff](CITATION.cff) for citation metadata.
