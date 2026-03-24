# Labeling Tool Analysis

> A technical analysis of Label Studio as the reference baseline for LabelSuite's technology selection and contribution definition.

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
- No annotator account management, working hours tracking, or salary estimation
- No built-in dataset statistics — researchers must write external scripts to inspect data quality

---

## LabelSuite Differentiation

| Dimension | Label Studio | LabelSuite |
|---|---|---|
| Backend Framework | Django (heavyweight) | FastAPI (lightweight, native async) |
| Frontend Framework | React + TypeScript | React + TypeScript + Vite |
| Task Configuration | Complex setup | Config-driven (YAML/JSON) |
| Annotator Management | None | Account CRUD, working hours, salary |
| Built-in Dataset Analytics | None | #Sentence, #Token, #Label in real time |
| Dry Run / Official Run | None | Supported with strict data isolation |
| NLP Ecosystem Fit | General-purpose | Optimized for NLP research workflows |
| Open Source | ✓ (Apache 2.0) | ✓ (MIT) |
