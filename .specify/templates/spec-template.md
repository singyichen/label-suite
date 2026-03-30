# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

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

### Page Navigation Flow *(include if feature introduces new pages or modifies navigation)*

<!--
  List every page/screen in this feature and define how users navigate between them.
  This prevents orphan pages (pages with no entry point) in prototypes and implementation.
  Format: [Source Page] --[trigger]--> [Target Page]
-->

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
