# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

## Process Flow *(include if feature involves a multi-step business process or cross-role workflow)*

<!--
  Describe the end-to-end business process BEFORE breaking it into user stories.
  Focus on WHO does WHAT and in what ORDER — not on technical implementation.
  Use a Mermaid sequenceDiagram and a step table. Renders natively on GitHub — no extra tooling needed.
-->

```mermaid
sequenceDiagram
    actor ActorA
    participant System
    actor ActorB

    ActorA->>System: [action]
    System-->>ActorB: [notification / response]
    ActorB->>System: [confirmation / next action]
```

| Step | Role | Action | System Response |
|------|------|--------|----------------|
| 1 | [Role] | [What they do] | [What the system does] |

---

## User Scenarios & Testing *(required)*

<!--
  User Stories should be prioritized by importance. P1 is the highest priority.
  Each Story must be independently implementable and testable — completing P1 alone should deliver a viable MVP.
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and reason for this priority level]

**Independent Test**: [Describe how this can be tested independently, e.g., "Can be fully validated by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and reason for this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### Edge Cases

- What happens when [boundary condition]?
- How does the system respond to [error scenario]?

## Requirements *(required)*

### Functional Requirements

- **FR-001**: The system MUST [specific capability]
- **FR-002**: The system MUST [specific capability]
- **FR-003**: Users MUST be able to [key interaction]

### User Flow & Navigation *(include if feature introduces new pages or modifies navigation)*

<!--
  1. Map every screen and its navigation triggers to prevent orphan pages.
  2. Include a Mermaid flowchart for flows with 3+ screens or branching paths.
  Renders natively on GitHub — no extra tooling needed.
-->

```mermaid
flowchart LR
    Login --> |login success| Dashboard
    Dashboard --> |click avatar| Profile
    Profile --> |sidebar link| Dashboard
    Dashboard --> |sign out| Login
```

| From | Trigger | To |
|------|---------|-----|
| [Page A] | [e.g. click avatar] | [Page B] |
| [Page B] | [e.g. sidebar link] | [Page A] |

**Entry points**: [Which existing pages link INTO the new pages?]
**Exit points**: [Which pages can users navigate to FROM the new pages?]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(required)*

- **SC-001**: [Measurable metric, e.g., "Users can complete labeling task setup in under 2 minutes"]
- **SC-002**: [Measurable metric]
- **SC-003**: [User satisfaction metric]
