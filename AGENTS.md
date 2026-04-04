# Claude Code Agents Directory

This document provides a comprehensive overview of all available AI agents for the Label Suite project.

## Quick Reference

| Category | Count | Agents |
|----------|-------|--------|
| NLP Research | 1 | nlp-research-advisor |
| Product & Planning | 3 | senior-pm, senior-po, senior-ba |
| System Design | 4 | senior-sa, senior-sd, senior-architect, senior-api-designer |
| UI/UX Design | 2 | senior-uiux, senior-visual-designer |
| Development | 4 | senior-frontend, senior-backend, senior-full-stack, senior-dba |
| Quality | 2 | senior-qa, senior-code-reviewer |
| Debugging | 2 | senior-debugger, senior-error-resolver |
| Security | 1 | senior-security |
| Infrastructure | 1 | senior-devops |
| Performance | 1 | senior-performance |
| Accessibility & i18n | 1 | senior-i18n |
| Leadership | 1 | senior-tech-lead |
| Technical Writing | 1 | senior-technical-writer |
| User Research | 1 | user-researcher |
| **Total** | **25** | |

---

## Complete Agent Reference

**Sorting Note**: Ordered by usage frequency in the Label Suite project, with most frequently used agents listed first.

| Agent Name | Role | Category | Key Expertise | Example Task |
|------------|------|----------|---------------|--------------|
| `nlp-research-advisor` | NLP Research Advisor | NLP Research | NLP annotation task design, evaluation metrics, benchmark design | Design evaluation metrics for text classification annotation task |
| `senior-backend` | Backend Engineer | Development | FastAPI, PostgreSQL, Redis, Celery, API design | Implement scoring submission API with rate limiting |
| `senior-frontend` | Frontend Engineer | Development | React, TypeScript, Vite, pnpm, Playwright E2E | Build annotation interface for labeling task |
| `senior-full-stack` | Full Stack Engineer | Development | End-to-end development, frontend-backend integration | Implement end-to-end annotation submission and scoring flow |
| `senior-qa` | QA Engineer | Quality | Test strategy, Playwright E2E, pytest, quality assurance | Create Playwright E2E test for annotation submission flow |
| `senior-code-reviewer` | Code Reviewer | Quality | Code quality, security review, best practices | Review scoring engine implementation for correctness and security |
| `senior-dba` | Database Administrator | Development | PostgreSQL schema design, query optimization, indexing | Design schema for storing annotation results and leaderboard data |
| `senior-api-designer` | API Designer | System Design | RESTful API, OpenAPI/Swagger, endpoint naming, API contracts | Design REST API specification for task configuration endpoints |
| `senior-security` | Security Engineer | Security | OWASP, test-set leak prevention, RBAC, JWT/OAuth2 | Audit API responses to prevent test-set answer leakage |
| `senior-uiux` | UI/UX Designer | UI/UX Design | Annotation interface design, user experience, research tool usability | Improve annotation workspace layout for annotator efficiency |
| `senior-debugger` | Debugger | Debugging | Root cause analysis, stack trace analysis, Celery task debugging | Investigate why Celery scoring task returns unexpected results |
| `senior-error-resolver` | Error Resolver | Debugging | Runtime errors, dependency conflicts, build failures | Fix ImportError in FastAPI scoring module |
| `senior-devops` | DevOps Engineer | Infrastructure | Docker, GitHub Actions CI/CD, environment setup | Configure Docker Compose for local development environment |
| `senior-architect` | Software Architect | System Design | System architecture, technology selection, scalability, ADR | Design scalable architecture for config-driven annotation platform |
| `senior-technical-writer` | Technical Writer | Technical Writing | Demo Paper writing, API docs, README, research documentation | Write Demo Paper system description section |
| `senior-tech-lead` | Tech Lead | Leadership | Technical decisions, constitution compliance, engineering best practices | Evaluate trade-offs between YAML vs JSON for task configuration format |
| `senior-performance` | Performance Engineer | Performance | API optimization, database query tuning, Celery task efficiency | Optimize leaderboard query performance for large submission datasets |
| `senior-pm` | Product Manager | Product & Planning | Product strategy, feature prioritization, requirement analysis | Define product roadmap for annotation and evaluation milestones |
| `senior-po` | Product Owner | Product & Planning | Feature definition, backlog prioritization, timeline management | Prioritize backlog for next development iteration |
| `senior-ba` | Business Analyst | Product & Planning | Requirement gathering, stakeholder interviews, process modeling | Document annotator and researcher workflow requirements |
| `senior-sa` | System Analyst | System Design | System requirements, technical specifications, process flows | Write technical specification for config-driven task template system |
| `senior-sd` | System Designer | System Design | Component design, interface design, technical specifications | Create component diagram for annotation submission module |
| `senior-i18n` | i18n Specialist | Accessibility & i18n | Internationalization, localization, multi-language support | Design i18n architecture for English-first open source release |
| `senior-visual-designer` | Visual Designer | UI/UX Design | Visual design systems, brand guidelines, typography, color theory | Define color palette and typography for annotation portal |
| `user-researcher` | User Researcher | User Research | User interviews, usability testing, behavior analysis | Conduct usability testing of annotation interface with annotators |

---

## How to Use Agents

### Basic Syntax
```
Use [agent-name] agent to [task description]
```

### Usage Examples
```
Use nlp-research-advisor agent to design evaluation metrics for the annotation task
Use senior-code-reviewer agent to check my recent changes
Use senior-qa agent to create test cases for the scoring engine
Use senior-security agent to verify test-set answers are not exposed in API responses
```

### Parallel Invocation
You can use multiple agents simultaneously for comprehensive review:
```
Use senior-security agent and senior-code-reviewer agent to review scoring submission API
```

---

## Agent Selection Guide

### By Task Type

| Task | Recommended Agent(s) |
|------|---------------------|
| Design annotation task | nlp-research-advisor, senior-ba |
| Plan new feature | senior-pm, senior-po, senior-ba |
| Design system | senior-architect, senior-sd, senior-sa |
| Design UI/UX | senior-uiux, senior-visual-designer |
| Write frontend code | senior-frontend, senior-full-stack |
| Write backend code | senior-backend, senior-full-stack |
| Design API | senior-api-designer, senior-backend |
| Design database | senior-dba |
| Write tests | senior-qa |
| Review code | senior-code-reviewer |
| Fix bugs | senior-debugger, senior-error-resolver |
| Security audit | senior-security |
| Prevent test-set leakage | senior-security |
| Deploy application | senior-devops |
| Optimize performance | senior-performance |
| Write Demo Paper | senior-technical-writer, nlp-research-advisor |
| Add i18n | senior-i18n |
| Research leaderboard design | nlp-research-advisor |
| User research | user-researcher |

### By Question Type

| Question | Recommended Agent |
|----------|-------------------|
| "How should we architect this?" | senior-architect |
| "Is this code secure?" | senior-security |
| "Are test-set answers leaking?" | senior-security |
| "Why is this slow?" | senior-performance |
| "Why is this failing?" | senior-debugger |
| "How to fix this error?" | senior-error-resolver |
| "What evaluation metric is best?" | nlp-research-advisor |
| "How to prevent leaderboard gaming?" | nlp-research-advisor, senior-security |
| "How to prioritize features?" | senior-po, senior-pm |
| "What do researchers/annotators need?" | user-researcher, senior-ba |
| "Does this comply with the Constitution?" | senior-tech-lead |

---

## Agents by Development Phase

### Phase 1: Planning & Requirements

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `nlp-research-advisor` | NLP task design, evaluation metrics | Designing annotation tasks and evaluation strategy |
| `senior-pm` | Product strategy, roadmap | Planning product features and Demo Paper milestones |
| `senior-po` | Feature definition, backlog prioritization | Managing product backlog and iterations |
| `senior-ba` | Requirement gathering, process modeling | Conducting requirement interviews with researchers and annotators |

### Phase 2: Design

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `senior-sa` | System requirements, technical specifications | Writing technical specifications |
| `senior-sd` | Component design, interface design | Creating system design documents |
| `senior-architect` | System architecture, ADR | Designing system architecture |
| `senior-uiux` | Annotation interface design, UX | Improving annotation workflow UX |
| `senior-visual-designer` | Visual systems, typography, colors | Creating design system for annotation portal |
| `senior-api-designer` | RESTful API, OpenAPI specifications | Designing API contracts |

### Phase 3: Development

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `senior-frontend` | React, TypeScript, Vite, Playwright | Frontend development and annotation interface |
| `senior-backend` | FastAPI, PostgreSQL, Redis, Celery | Backend API and scoring pipeline |
| `senior-full-stack` | End-to-end development | Full annotation and evaluation feature development |
| `senior-dba` | PostgreSQL schema design, query optimization | Database design and optimization |

### Phase 4: Quality Assurance

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `senior-qa` | Test strategy, Playwright E2E, pytest | Creating test plans and automation |
| `senior-code-reviewer` | Code quality, security review | Reviewing code changes |
| `senior-performance` | API optimization, query tuning | Performance testing and optimization |

### Phase 5: Debugging & Troubleshooting

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `senior-debugger` | Root cause analysis, stack trace analysis | Investigating complex bugs |
| `senior-error-resolver` | Runtime errors, dependency conflicts | Resolving common errors |

### Phase 6: Security

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `senior-security` | OWASP, test-set leak prevention, RBAC, JWT | Security audits and test-set leakage prevention |

### Phase 7: Deployment

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `senior-devops` | Docker, GitHub Actions CI/CD | Setting up deployment pipelines |

### Phase 8: Internationalization

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `senior-i18n` | Internationalization, localization | English-first open source release readiness |

### Phase 9: Documentation

| Agent | Expertise | When to Use |
|-------|-----------|-------------|
| `senior-technical-writer` | Demo Paper writing, API docs, README | Writing technical and academic documentation |

---

## Maintenance

- Agents are stored in `.claude/agents/` directory
- Each agent is a Markdown file with YAML frontmatter
- To add a new agent, create a new `.md` file in the directory
- To modify an agent, edit the corresponding `.md` file
- Run `/agents` in Claude Code to view and manage agents

---

*Last Updated: 2026-04-04*
*Total Agents: 25*
