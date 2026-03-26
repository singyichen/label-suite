# Claude Code Agents Directory

This document provides a comprehensive overview of all available AI agents for the Label Suite project.

## Quick Reference

| Category | Count | Agents |
|----------|-------|--------|
| NLP Research | 1 | nlp-research-advisor |
| Product & Planning | 4 | senior-pm, senior-po, senior-ba, senior-release-manager |
| System Design | 5 | senior-sa, senior-sd, senior-architect, senior-cloud-architect, senior-api-designer |
| UI/UX Design | 2 | senior-uiux, senior-visual-designer |
| Development | 4 | senior-frontend, senior-backend, senior-full-stack, senior-dba |
| Data & AI | 4 | senior-data-engineer, senior-data-scientist, senior-ai-engineer, senior-analytics |
| Quality | 3 | senior-qa, senior-qc, senior-code-reviewer |
| Debugging | 2 | senior-debugger, senior-error-resolver |
| Security | 1 | senior-security |
| Infrastructure | 2 | senior-devops, senior-sre |
| Performance | 1 | senior-performance |
| Accessibility & i18n | 1 | senior-i18n |
| Leadership | 1 | senior-tech-lead |
| Technical Writing | 1 | senior-technical-writer |
| End User Support | 3 | senior-customer-support, user-researcher, user-support |
| **Total** | **35** | |

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
| `senior-ai-engineer` | AI/ML Engineer | Data & AI | LLM, model evaluation, MLOps, AI architecture | Design automated scoring pipeline for NLP task evaluation |
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
| `senior-cloud-architect` | Cloud Architect | System Design | Cloud architecture, multi-cloud strategy, cost optimization | Design deployment architecture for research lab environment |
| `senior-data-engineer` | Data Engineer | Data & AI | Data pipeline design, ETL, data warehouse architecture | Build ETL pipeline for importing NLP benchmark datasets |
| `senior-data-scientist` | Data Scientist | Data & AI | Statistical analysis, predictive modeling, experimental design | Analyze annotator agreement patterns across tasks |
| `senior-analytics` | Analytics Specialist | Data & AI | Product analytics, event tracking, dashboard design | Design leaderboard analytics and submission trend dashboard |
| `senior-sre` | Site Reliability Engineer | Infrastructure | Monitoring, incident response, SLA management | Set up uptime monitoring for scoring API endpoints |
| `senior-release-manager` | Release Manager | Product & Planning | Release planning, version control, deployment coordination | Plan Demo Paper submission release milestone |
| `senior-qc` | Quality Control | Quality | Quality standards, process control, defect prevention | Establish code quality standards aligned with Constitution principles |
| `senior-i18n` | i18n Specialist | Accessibility & i18n | Internationalization, localization, multi-language support | Design i18n architecture for English-first open source release |
| `senior-visual-designer` | Visual Designer | UI/UX Design | Visual design systems, brand guidelines, typography, color theory | Define color palette and typography for annotation portal |
| `user-researcher` | User Researcher | End User Support | User interviews, usability testing, behavior analysis | Conduct usability testing of annotation interface with annotators |
| `senior-customer-support` | Customer Support | End User Support | User inquiries, troubleshooting, FAQ content | Create FAQ for annotators on how to submit annotation results |
| `user-support` | User Support | End User Support | System navigation, user guidance, end-user Q&A | Guide annotators through the task setup and submission process |

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

### Agent Collaboration
For complex tasks, use multiple agents in sequence:
```
1. Use senior-ba agent to gather requirements from NLP researchers and annotators
2. Use senior-sa agent to create technical specification
3. Use senior-architect agent to design system architecture
4. Use senior-code-reviewer agent to review implementation
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
| Build AI/scoring feature | senior-ai-engineer |
| Write tests | senior-qa |
| Review code | senior-code-reviewer |
| Fix bugs | senior-debugger, senior-error-resolver |
| Security audit | senior-security |
| Prevent test-set leakage | senior-security |
| Deploy application | senior-devops, senior-release-manager |
| Monitor system | senior-sre |
| Optimize performance | senior-performance |
| Write Demo Paper | senior-technical-writer, nlp-research-advisor |
| Add i18n | senior-i18n |
| Research leaderboard design | nlp-research-advisor, senior-analytics |
| Support annotators | senior-customer-support, user-support |

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

## Detailed Use Cases by Agent

This section provides multiple practical use cases for commonly used agents to help you select the most appropriate agent more precisely.

### 🔴 High Priority Agents

#### `nlp-research-advisor` - NLP Research Advisor
**When to Use:**
- Design annotation task configuration for NLP benchmarks
- Select appropriate evaluation metrics (accuracy, F1, Cohen's kappa, etc.)
- Ensure leaderboard fairness and prevent gaming
- Frame academic contributions for the Demo Paper
- Review annotation guidelines for clarity and consistency

**Example Commands:**
```
Use nlp-research-advisor agent to design evaluation metrics for text classification task
Use nlp-research-advisor agent to review leaderboard design for anti-gaming measures
Use nlp-research-advisor agent to frame the academic contribution of config-driven design
```

---

#### `senior-backend` - Backend Engineer
**When to Use:**
- Implement FastAPI endpoints for task configuration and submission
- Design Celery task queue for asynchronous scoring
- Integrate PostgreSQL and Redis for data persistence and caching
- Build scoring pipeline with test-set answer protection
- Implement RBAC for annotator vs. administrator access control

**Example Commands:**
```
Use senior-backend agent to implement scoring submission API with rate limiting
Use senior-backend agent to design Celery task queue for asynchronous evaluation
Use senior-backend agent to integrate PostgreSQL models for annotation result storage
```

---

#### `senior-frontend` - Frontend Engineer
**When to Use:**
- Build annotation workspace UI in React + TypeScript
- Implement config-driven annotation form rendering
- Develop leaderboard display and filtering components
- Optimize Vite build for production performance
- Write Playwright E2E tests for annotation flows

**Example Commands:**
```
Use senior-frontend agent to build config-driven annotation form renderer
Use senior-frontend agent to implement leaderboard table with sorting and filtering
Use senior-frontend agent to create Playwright E2E test for annotation submission
```

---

#### `senior-full-stack` - Full Stack Engineer
**When to Use:**
- Implement complete annotation flow (task display → annotation → submission → scoring)
- Develop end-to-end task configuration and deployment system
- Build complete leaderboard update pipeline
- Integrate frontend form state with backend scoring API

**Example Commands:**
```
Use senior-full-stack agent to implement end-to-end annotation submission and scoring flow
Use senior-full-stack agent to build task configuration upload and deployment feature
```

---

#### `senior-qa` - QA Engineer
**When to Use:**
- Create Playwright E2E tests for annotator user journeys
- Write pytest unit tests for scoring logic correctness
- Design boundary condition tests for evaluation metrics
- Verify test-set answer leakage prevention through API response testing
- Build regression test suite for config-driven task templates

**Example Commands:**
```
Use senior-qa agent to create Playwright E2E test for annotation submission flow
Use senior-qa agent to write pytest unit tests for scoring engine
Use senior-qa agent to design security tests verifying test-set answers are not exposed
```

---

#### `senior-ai-engineer` - AI/ML Engineer
**When to Use:**
- Design automated scoring pipeline for NLP evaluation tasks
- Implement scoring metrics computation (BLEU, ROUGE, BERTScore, etc.)
- Build model inference pipeline integration
- Design multi-task evaluation architecture
- Advise on LLM-based annotation quality assessment

**Example Commands:**
```
Use senior-ai-engineer agent to design automated scoring pipeline for NLP evaluation
Use senior-ai-engineer agent to implement BLEU and ROUGE scoring computation
Use senior-ai-engineer agent to integrate LLM-based annotation quality checker
```

---

### 🟡 Medium Priority Agents

#### `senior-code-reviewer` - Code Reviewer
**When to Use:**
- Review scoring engine implementation for correctness
- Check code quality of new annotation interface components
- Ensure code adheres to project Constitution principles
- Identify potential security issues in API response schemas
- Perform comprehensive review before PR submission

**Example Commands:**
```
Use senior-code-reviewer agent to review scoring engine implementation
Use senior-code-reviewer agent to check annotation submission API for security issues
```

---

#### `senior-dba` - Database Administrator
**When to Use:**
- Design PostgreSQL schema for annotation results and leaderboard
- Optimize query performance for leaderboard ranking queries
- Create indexing strategy for large submission datasets
- Design data migration plan for schema evolution
- Review ORM queries for SQL injection prevention

**Example Commands:**
```
Use senior-dba agent to design schema for storing annotation results and leaderboard data
Use senior-dba agent to optimize leaderboard ranking query performance
Use senior-dba agent to create indexing strategy for submission dataset
```

---

#### `senior-api-designer` - API Designer
**When to Use:**
- Design REST API specification for task configuration endpoints
- Define request/response schemas for scoring submission API
- Create OpenAPI/Swagger documentation
- Design API versioning strategy for open source release
- Plan rate limiting for anti-gaming submission protection

**Example Commands:**
```
Use senior-api-designer agent to design REST API for task configuration management
Use senior-api-designer agent to create OpenAPI documentation for scoring submission API
```

---

#### `senior-security` - Security Engineer
**When to Use:**
- Audit API responses to verify test-set answers are not exposed
- Review RBAC implementation for annotator/admin separation
- Verify CORS configuration (no wildcard `*`)
- Check rate limiting on scoring submission endpoints
- Ensure JWT implementation follows secure practices

**Example Commands:**
```
Use senior-security agent to audit API response schemas for test-set answer leakage
Use senior-security agent to review RBAC implementation for role separation
Use senior-security agent to verify rate limiting on scoring submission API
```

---

#### `senior-uiux` - UI/UX Designer
**When to Use:**
- Improve annotation workspace layout for annotator efficiency
- Design intuitive task configuration interface for NLP researchers
- Review leaderboard information presentation
- Design confirmation dialogs for critical actions (score submission)
- Evaluate annotation interface against WCAG accessibility standards

**Example Commands:**
```
Use senior-uiux agent to improve annotation workspace layout for efficiency
Use senior-uiux agent to design task configuration interface for NLP researchers
Use senior-uiux agent to review leaderboard information hierarchy
```

---

#### `senior-debugger` - Debugger
**When to Use:**
- Investigate why Celery scoring task returns unexpected results
- Trace root cause of annotation submission failures
- Analyze stack traces in FastAPI error responses
- Debug React state management issues in annotation form
- Investigate leaderboard calculation inconsistencies

**Example Commands:**
```
Use senior-debugger agent to investigate Celery scoring task failure
Use senior-debugger agent to trace root cause of annotation submission error
```

---

#### `senior-devops` - DevOps Engineer
**When to Use:**
- Configure Docker Compose for local development (FastAPI + PostgreSQL + Redis + Celery)
- Set up GitHub Actions CI/CD for automated testing and deployment
- Configure environment variable management (.env, secrets)
- Design container orchestration for production deployment
- Set up development/staging environments

**Example Commands:**
```
Use senior-devops agent to configure Docker Compose for local development environment
Use senior-devops agent to set up GitHub Actions CI/CD pipeline
Use senior-devops agent to design container orchestration for production
```

---

### 🟢 Specialized Agents

#### `senior-architect` - Software Architect
**When to Use:**
- Design overall system architecture for annotation and evaluation platform
- Evaluate technology choices aligned with Demo Paper contributions
- Plan config-driven system scalability
- Create Architecture Decision Records (ADR)
- Design plugin architecture for extensible NLP task types

**Example Commands:**
```
Use senior-architect agent to design architecture for config-driven annotation platform
Use senior-architect agent to evaluate technology trade-offs for task configuration format
Use senior-architect agent to create ADR for scoring pipeline architecture
```

---

#### `senior-technical-writer` - Technical Writer
**When to Use:**
- Write Demo Paper system description and contribution sections
- Create API documentation for open source release
- Update README.md with new features and setup instructions
- Write architecture documentation (ADR, system overview)
- Ensure English-first documentation quality for open source readiness

**Example Commands:**
```
Use senior-technical-writer agent to write Demo Paper system description section
Use senior-technical-writer agent to create API documentation for task configuration endpoints
Use senior-technical-writer agent to update README with new annotation workflow
```

---

#### `senior-tech-lead` - Tech Lead
**When to Use:**
- Evaluate technical decisions against Constitution principles
- Assess YAGNI/KISS compliance in proposed solutions
- Advise on technical debt trade-offs for thesis timeline
- Determine whether decisions warrant an ADR
- Review cross-module dependency design

**Example Commands:**
```
Use senior-tech-lead agent to evaluate YAML vs JSON for task configuration format
Use senior-tech-lead agent to assess constitution compliance of new feature design
Use senior-tech-lead agent to review cross-module dependencies for circular reference risks
```

---

#### `senior-i18n` - i18n Specialist
**When to Use:**
- Design i18n architecture for English-first open source release
- Review annotation interface for hardcoded Chinese strings
- Establish translation file management strategy
- Ensure consistent English terminology in UI and documentation
- Plan future multi-language support without over-engineering

**Example Commands:**
```
Use senior-i18n agent to design i18n architecture for English-first release
Use senior-i18n agent to review annotation interface for localization readiness
```

---

#### `user-support` - User Support
**When to Use:**
- Guide annotators through the task setup and submission process
- Answer frequently asked questions about annotation workflow
- Explain leaderboard scoring rules and submission limits
- Help users troubleshoot annotation interface issues
- Provide guidance on dataset upload and format requirements

**Example Commands:**
```
Use user-support agent to create annotator onboarding guide
Use user-support agent to draft FAQ for annotation submission process
```

---

## Agents by Development Phase

### 📋 Phase 1: Planning & Requirements

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `nlp-research-advisor` | NLP Research Advisor | NLP task design, evaluation metrics, benchmark design | Designing annotation tasks and evaluation strategy |
| `senior-pm` | Product Manager | Product strategy, roadmap, feature prioritization | Planning product features and Demo Paper milestones |
| `senior-po` | Product Owner | Feature definition, backlog prioritization, timeline management | Managing product backlog and iterations |
| `senior-ba` | Business Analyst | Requirement gathering, stakeholder interviews, process modeling | Conducting requirement interviews with researchers and annotators |

**Usage Examples:**
```
Use nlp-research-advisor agent to define annotation task requirements
Use senior-ba agent to document annotator and researcher workflow requirements
Use senior-po agent to prioritize product backlog
Use senior-pm agent to create Demo Paper development roadmap
```

---

### 🎨 Phase 2: Design

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-sa` | System Analyst | System requirements, technical specifications, process flows | Writing technical specifications |
| `senior-sd` | System Designer | Component design, interface design, technical specifications | Creating system design documents |
| `senior-architect` | Software Architect | System architecture, technology selection, scalability, ADR | Designing system architecture |
| `senior-cloud-architect` | Cloud Architect | Cloud architecture, multi-cloud strategy, cost optimization | Designing deployment infrastructure |
| `senior-uiux` | UI/UX Designer | Annotation interface design, user experience, usability | Improving annotation workflow UX |
| `senior-visual-designer` | Visual Designer | Visual systems, brand guidelines, typography, colors | Creating design system for annotation portal |
| `senior-api-designer` | API Designer | RESTful API, OpenAPI specifications, API contracts | Designing API contracts |

**Usage Examples:**
```
Use senior-architect agent to design config-driven annotation platform architecture
Use senior-sd agent to create component diagram for annotation module
Use senior-uiux agent to design annotation workspace layout
Use senior-visual-designer agent to define design system for annotation portal
Use senior-api-designer agent to design task configuration REST API
```

---

### 💻 Phase 3: Development

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-frontend` | Frontend Engineer | React, TypeScript, Vite, pnpm, Playwright | Frontend development and annotation interface |
| `senior-backend` | Backend Engineer | FastAPI, PostgreSQL, Redis, Celery | Backend API and scoring pipeline |
| `senior-full-stack` | Full Stack Engineer | End-to-end development, frontend-backend integration | Full annotation and evaluation feature development |
| `senior-dba` | Database Administrator | PostgreSQL schema design, query optimization, indexing | Database design and optimization |
| `senior-data-engineer` | Data Engineer | Data pipeline design, ETL, data warehouse architecture | Building dataset import and processing pipelines |
| `senior-data-scientist` | Data Scientist | Statistical analysis, predictive modeling, experimental design | Analyzing annotation quality and agreement metrics |
| `senior-ai-engineer` | AI/ML Engineer | LLM, model evaluation, scoring metrics, MLOps | Building automated scoring and evaluation features |
| `senior-analytics` | Analytics Specialist | Product analytics, event tracking, dashboard design | Implementing leaderboard analytics and dashboards |

**Usage Examples:**
```
Use senior-frontend agent to build config-driven annotation form renderer
Use senior-backend agent to implement Celery scoring pipeline
Use senior-full-stack agent to implement end-to-end annotation submission flow
Use senior-dba agent to optimize leaderboard query performance
Use senior-ai-engineer agent to implement automated scoring metrics
```

---

### ✅ Phase 4: Quality Assurance

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-qa` | QA Engineer | Test strategy, Playwright E2E, pytest, quality assurance | Creating test plans and automation |
| `senior-qc` | Quality Control | Quality standards, process control, defect prevention | Establishing quality processes |
| `senior-code-reviewer` | Code Reviewer | Code quality, security review, best practices | Reviewing code changes |
| `senior-performance` | Performance Engineer | API optimization, query tuning, Celery task efficiency | Performance testing and optimization |

**Usage Examples:**
```
Use senior-qa agent to create test strategy for annotation and scoring flows
Use senior-code-reviewer agent to review recent changes
Use senior-performance agent to analyze leaderboard query bottlenecks
```

---

### 🐛 Phase 5: Debugging & Troubleshooting

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-debugger` | Debugger | Root cause analysis, stack trace analysis, Celery debugging | Investigating complex bugs |
| `senior-error-resolver` | Error Resolver | Runtime errors, dependency conflicts, quick fixes | Resolving common errors |

**Usage Examples:**
```
Use senior-debugger agent to investigate scoring task failure
Use senior-error-resolver agent to fix dependency conflict in FastAPI
```

---

### 🔒 Phase 6: Security

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-security` | Security Engineer | OWASP, test-set leak prevention, RBAC, JWT/OAuth2 | Security audits and test-set leakage prevention |

**Usage Examples:**
```
Use senior-security agent to audit API responses for test-set answer leakage
Use senior-security agent to review RBAC implementation
```

---

### 🚀 Phase 7: Deployment & Operations

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-devops` | DevOps Engineer | Docker, GitHub Actions CI/CD, environment setup | Setting up deployment pipelines |
| `senior-sre` | Site Reliability Engineer | Monitoring, incident response, SLA management | Ensuring system reliability |
| `senior-release-manager` | Release Manager | Release planning, version control, deployment coordination | Coordinating Demo Paper release milestones |

**Usage Examples:**
```
Use senior-devops agent to configure Docker Compose for development environment
Use senior-sre agent to set up monitoring for scoring API
Use senior-release-manager agent to plan Demo Paper release milestone
```

---

### 📊 Phase 8: Analytics

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-analytics` | Analytics Specialist | Product analytics, event tracking, dashboards | Implementing leaderboard analytics |

**Usage Examples:**
```
Use senior-analytics agent to design submission trend dashboard
Use senior-analytics agent to implement annotator progress tracking
```

---

### 🌐 Phase 9: Internationalization

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-i18n` | i18n Specialist | Internationalization, localization, multi-language | English-first open source release readiness |

**Usage Examples:**
```
Use senior-i18n agent to design i18n architecture for open source release
Use senior-i18n agent to review annotation interface for localization readiness
```

---

### 📝 Phase 10: Documentation

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-technical-writer` | Technical Writer | Demo Paper writing, API docs, README, research documentation | Writing technical and academic documentation |

**Usage Examples:**
```
Use senior-technical-writer agent to write Demo Paper system description
Use senior-technical-writer agent to create API documentation for open source release
```

---

### 👔 Leadership

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `senior-tech-lead` | Tech Lead | Technical decisions, constitution compliance, engineering best practices | Making technical decisions and reviewing against Constitution |

**Usage Examples:**
```
Use senior-tech-lead agent to evaluate technology options for task configuration
Use senior-tech-lead agent to assess constitution compliance of design decisions
```

---

### 🔬 NLP Research

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `nlp-research-advisor` | NLP Research Advisor | NLP task design, evaluation metrics, leaderboard fairness, Demo Paper | Designing NLP annotation tasks and academic contributions |

**Usage Examples:**
```
Use nlp-research-advisor agent to design evaluation metrics for annotation benchmark
Use nlp-research-advisor agent to review leaderboard anti-gaming measures
```

---

### 👥 End User Support

| Agent | Role | Expertise | When to Use |
|-------|------|-----------|-------------|
| `user-researcher` | User Researcher | User interviews, usability testing, behavior analysis | Understanding researcher and annotator needs |
| `senior-customer-support` | Customer Support | Issue handling, FAQ creation, support processes | Handling annotator and researcher inquiries |
| `user-support` | User Support | System navigation, user guidance, end-user Q&A | Guiding users through annotation and submission |

**Usage Examples:**
```
Use user-researcher agent to conduct usability testing of annotation interface
Use senior-customer-support agent to create FAQ for annotation submission process
Use user-support agent to draft annotator onboarding guide
```

---

## Maintenance

- Agents are stored in `.claude/agents/` directory
- Each agent is a Markdown file with YAML frontmatter
- To add a new agent, create a new `.md` file in the directory
- To modify an agent, edit the corresponding `.md` file
- Run `/agents` in Claude Code to view and manage agents
