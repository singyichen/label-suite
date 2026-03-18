# Labeling & Evaluation Tool Analysis

> A technical analysis of existing labeling and evaluation platforms, covering architecture and pain points. Used as a reference for Label-Eval-Portal's technology selection and contribution definition.

---

## Label Studio

**GitHub:** https://github.com/HumanSignal/label-studio

**Overview:** A multi-type data labeling and annotation tool with standardized output format.

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript |
| **State Management** | MobX + MobX State Tree |
| **UI Components** | Ant Design, Radix UI, Tailwind CSS |
| **Build Tool** | Webpack 5, Nx (Monorepo) |
| **Backend** | Django (Python) |
| **API** | Django REST Framework |
| **Async Tasks** | Celery |
| **Database** | PostgreSQL |
| **Cache / Queue** | Redis |
| **Containerization** | Docker / Docker Compose |
| **Testing** | Jest, Pytest |

### Pain Points

- Requires manual server configuration to deploy, raising the barrier for non-engineering users
- Feature-heavy; research teams performing simple annotation find the system overly complex
- No integration with evaluation (scoring) and leaderboard features

---

## CodaBench

**GitHub:** https://github.com/codalab/codabench

**Overview:** A flexible, easy-to-use, and reproducible benchmarking platform.

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Riot.js + jQuery |
| **CSS** | Stylus |
| **Backend** | Django (Python) |
| **API** | Django REST Framework |
| **Async Tasks** | Celery |
| **Real-time** | Django Channels (WebSocket) |
| **Database** | PostgreSQL |
| **Cache / Queue** | Redis |
| **Containerization** | Docker / Docker Compose |
| **CI/CD** | CircleCI |

### Pain Points

- Unintuitive interface with poor usability and a steep learning curve
- Frontend uses outdated technology (Riot.js), resulting in lower maintainability
- Labeling and evaluation features are separate with no integrated workflow

---

## Shared Core Technologies

Both platforms adopt the **Django + PostgreSQL + Redis + Celery + Docker** backend stack, which is the mainstream choice for evaluation platforms.

---

## Label-Eval-Portal Differentiation

| Dimension | Existing Tools | Label-Eval-Portal |
|---|---|---|
| Backend Framework | Django (heavyweight) | FastAPI (lightweight, native async) |
| Frontend Framework | React (LS) / Riot.js (CB) | React + TypeScript + Vite |
| Labeling + Evaluation Integration | Separated | Unified in a single platform |
| Task Configuration | Complex setup | Config-driven (YAML/JSON) |
| NLP Ecosystem Fit | General-purpose | Optimized for NLP research workflows |
