---
name: flowchart
description: Generate Mermaid flowcharts and diagrams for system flows, user journeys, and process documentation.
---

# Flowchart

Generate Mermaid diagrams for system flows, user journeys, sequence diagrams, and state machines.

## Usage

```
/flowchart "Annotation submission and async scoring flow"
/flowchart "Annotator user journey — from task selection to submission"
/flowchart "Celery task retry logic for scoring failures"
/flowchart "RBAC authorization decision flow"
```

## Diagram Types

### Process Flow (Flowchart)
```mermaid
flowchart TD
    A([Annotator opens workspace]) --> B{Task assigned?}
    B -->|No| C[Show 'No tasks available']
    B -->|Yes| D[Load task config]
    D --> E[Render annotation form]
    E --> F[Annotator fills predictions]
    F --> G{Predictions valid?}
    G -->|No| H[Show validation error]
    H --> F
    G -->|Yes| I[Submit to POST /submissions]
    I --> J{Rate limit OK?}
    J -->|No| K[Show 429 error with retry time]
    J -->|Yes| L[Return submission_id]
    L --> M[Poll task status]
    M --> N{Scoring complete?}
    N -->|No, wait 2s| M
    N -->|Yes| O[Show score and rank]
    O --> P([Done])

    style A fill:#4CAF50,color:#fff
    style P fill:#4CAF50,color:#fff
    style K fill:#f44336,color:#fff
    style H fill:#FF9800,color:#fff
```

### Sequence Diagram
```mermaid
sequenceDiagram
    participant A as Annotator (Browser)
    participant API as FastAPI
    participant DB as PostgreSQL
    participant Q as Redis (Celery Broker)
    participant W as Celery Worker

    A->>API: POST /api/v1/submissions {task_id, predictions}
    API->>API: Validate JWT + RBAC
    API->>API: Validate request schema
    API->>DB: INSERT INTO submissions (status='queued')
    API->>Q: compute_score.delay(submission_id)
    API-->>A: 201 Created {submission_id, status: 'queued'}

    W->>DB: SELECT predictions FROM submissions WHERE id=N
    Note over W,DB: Answer fetched here — never via API
    W->>DB: SELECT answer FROM dataset_answers WHERE task_id=N
    W->>W: compute_metric(predictions, answers)
    W->>DB: UPDATE submissions SET score=X, status='completed'

    A->>API: GET /api/v1/submissions/{id}
    API->>DB: SELECT score, status FROM submissions
    API-->>A: 200 OK {score: 0.833, rank: 5}
    Note over API,A: No answer field in response
```

### State Machine
```mermaid
stateDiagram-v2
    [*] --> queued: POST /submissions accepted
    queued --> processing: Celery worker picks up task
    processing --> completed: Score computed successfully
    processing --> failed: Error or timeout (after 3 retries)
    failed --> queued: Admin triggers retry
    completed --> [*]
```

### Swimlane (Cross-functional Flow)
```mermaid
flowchart LR
    subgraph NLP Researcher
        R1[Create task config YAML]
        R2[Upload dataset + answers]
        R3[Publish task]
        R4[Review leaderboard]
    end
    subgraph Administrator
        A1[Validate config]
        A2[Import dataset to DB]
        A3[Assign task to annotators]
    end
    subgraph Annotator
        AN1[View assigned tasks]
        AN2[Complete annotation]
        AN3[Submit predictions]
        AN4[View score]
    end
    subgraph System
        S1[Celery: async scoring]
        S2[Update leaderboard]
    end

    R1 --> A1 --> R2 --> A2 --> R3 --> A3
    A3 --> AN1 --> AN2 --> AN3 --> S1 --> S2
    S2 --> AN4
    S2 --> R4
```

## Node Shape Reference

| Shape | Mermaid Syntax | Use For |
|-------|---------------|---------|
| Rectangle | `[Text]` | Process step |
| Rounded | `([Text])` | Start/end |
| Diamond | `{Text}` | Decision |
| Parallelogram | `[/Text/]` | Input/output |
| Database | `[(Text)]` | Data store |
| Hexagon | `{{Text}}` | Preparation |
| Subroutine | `[[Text]]` | Called process |

## Styling Reference

```mermaid
flowchart TD
    A[Normal step]
    B[Success]:::success
    C[Warning]:::warning
    D[Error]:::error
    A --> B --> C --> D

    classDef success fill:#4CAF50,color:#fff
    classDef warning fill:#FF9800,color:#fff
    classDef error fill:#f44336,color:#fff
```

## Best Practices

1. **Direction**: Use `TD` (top-down) for process flows, `LR` (left-right) for swimlanes
2. **Start/End**: Always use rounded nodes `([...])` for terminal states
3. **Decisions**: Diamond nodes `{...}` with Yes/No labels on arrows
4. **Security notes**: Add `Note over` annotations in sequence diagrams to highlight security boundaries
5. **Complexity**: If a flowchart exceeds 20 nodes, split into sub-diagrams
6. **Labels**: Keep node labels concise (≤ 5 words)
