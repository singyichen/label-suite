---
name: d2-diagram
description: Generate diagrams using the D2 diagramming language. Use when the user requests diagrams.
---

# D2 Diagram

## Instructions

Generate D2 code following these guidelines.

### Basic Syntax

```d2
# Nodes and labels
node1
node2: Custom Label

# Connections
a -> b: label     # directed arrow (left to right)
a <- b: label     # directed arrow (right to left)
a <-> b: label    # bidirectional arrow
a -- b: label     # line (no arrows)

# Chained connections
a -> b -> c -> d
```

### Containers

```d2
# Dot notation (quick)
aws.ec2.instance

# Map syntax (structured)
aws: {
  ec2: {
    instance
  }
}

# Reference children with full path
aws.ec2.instance -> database
```

### Shapes

Available shapes: `rectangle`, `square`, `circle`, `oval`, `diamond`, `hexagon`, `parallelogram`, `cylinder`, `queue`, `package`, `step`, `page`, `document`, `callout`, `stored_data`, `person`, `cloud`

```d2
server: Web Server {shape: cylinder}
user: {shape: person}
cdn: {shape: cloud}
config: Config File {shape: document}
decision: Valid? {shape: diamond}
```

### UML Class Diagrams

```d2
MyClass: {
  shape: class
  +publicField: string
  -privateField: int
  #protectedField: bool
  +publicMethod(): void
  -privateMethod(arg: string): int
}
```

### SQL Tables

```d2
users: {
  shape: sql_table
  id: int {constraint: primary_key}
  email: varchar {constraint: unique}
  org_id: int {constraint: foreign_key}
}

orgs: {
  shape: sql_table
  id: int {constraint: primary_key}
  name: varchar
}

users.org_id -> orgs.id
```

### Markdown and Code Blocks

```d2
# Markdown content
readme: |`
# Title
- List item
- Another item
`|

# Code block with syntax highlighting
snippet: |`go
func main() {
    fmt.Println("Hello")
}
`|
```

### Classes — Reusable Styles

Define classes once and apply them to multiple nodes. This is the key to consistent, maintainable diagrams.

Always include the following **standard class block** at the top of every `.d2` file. This is the project-wide base style:

```d2
classes: {
  base: {
    style: {
      bold: true
      font-size: 24
    }
  }

  person: {
    shape: person
  }

  animated: {
    style: {
      animated: true
    }
  }

  multiple: {
    style: {
      multiple: true      # stacked visual — conveys "many instances"
    }
  }

  tool: {
    style: {
      bold: true
      font-size: 22
      fill: PapayaWhip
      fill-pattern: grain
      border-radius: 8
    }
  }

  module: {
    style: {
      bold: true
      font-size: 22
      fill: honeydew
      fill-pattern: grain
      border-radius: 8
    }
  }

  highlight: {
    style: {
      bold: true
      font-size: 22
      fill: LightCyan
      fill-pattern: grain
      border-radius: 8
    }
  }

  warning: {
    shape: diamond
    style: {
      bold: true
      font-size: 20
      fill: MistyRose
    }
  }

  step: {
    shape: step
    style: {
      bold: true
      font-size: 20
    }
  }

  store: {
    shape: cylinder
    style: {
      bold: true
      font-size: 22
      font: mono
    }
  }
}
```

#### Class usage guide

| Class | Shape | Fill | Use for |
|---|---|---|---|
| `base` | rectangle | theme default | generic nodes with bold label |
| `person` | person | theme default | users, actors |
| `animated` | — | — | apply to connections for active data flow |
| `multiple` | — | — | apply to nodes representing many instances |
| `tool` | rectangle | PapayaWhip + grain | existing tools, external systems |
| `module` | rectangle | honeydew + grain | system modules, components |
| `highlight` | rectangle | LightCyan + grain | key concepts, outputs, results |
| `warning` | diamond | MistyRose | decisions, problems, gaps |
| `step` | step | theme default | sequential pipeline stages |
| `store` | cylinder | theme default | databases, caches, storage |

```d2
# Apply one or more classes
user: Alice {class: [base; person; multiple]}
db: PostgreSQL {class: store}
cache: Redis {class: [store; animated]}
pain: Setup is Painful {class: warning}
flow1: Ingest {class: step}
```

### Cross-file Class Import

If the project already has a `_base.d2` file with the classes defined, import it instead of repeating the block:

```d2
# Import from same directory
...@_base

# Import from subdirectory
...@shared/_base

# Import from parent directory
...@../_base
```

When a `_base.d2` is present, **do not duplicate the classes block** — use `...@_base` instead.

### Icons

Use `icon:` to add brand/domain icons to nodes. Only the `dev/*` namespace is publicly accessible from `icons.terrastruct.com`. The `essentials/*`, `health/*`, and other namespaces return **403 Forbidden** — do not use them.

```d2
# ✅ These work
frontend: {icon: https://icons.terrastruct.com/dev%2Freact.svg}
backend:  {icon: https://icons.terrastruct.com/dev%2Fpython.svg}
db:       {icon: https://icons.terrastruct.com/dev%2Fpostgresql.svg}
cache:    {icon: https://icons.terrastruct.com/dev%2Fredis.svg}
repo:     {icon: https://icons.terrastruct.com/dev%2Fgithub.svg}
docker:   {icon: https://icons.terrastruct.com/dev%2Fdocker.svg}

# ❌ These return 403 — do not use
# {icon: https://icons.terrastruct.com/essentials%2F122-server.svg}
# {icon: https://icons.terrastruct.com/health%2Fstethoscope.svg}
```

To use icons as the entire node shape (no label box):

```d2
redis: {
  shape: image
  icon: https://icons.terrastruct.com/dev%2Fredis.svg
}
```

### Reserved Keywords

The following identifiers **cannot be used as node IDs** — they are D2 built-in keywords and will cause a compile error:

| Reserved word | Alternative ID to use |
|---|---|
| `steps` | `setup_steps`, `workflow_steps` |
| `scenarios` | `exp_scenarios`, `use_cases` |
| `classes` | `node_classes`, `categories` |
| `direction` | `flow_direction` |
| `shape` | `node_shape` |
| `style` | `node_style` |
| `label` | `node_label` |
| `link` | `node_link` |
| `icon` | `node_icon` |
| `near` | _(avoid as node ID)_ |
| `constraint` | _(avoid as node ID)_ |

## Guidelines

1. Write D2 code to `.d2` files
2. Use descriptive node IDs (e.g., `web_server` not `ws`) — and avoid reserved keywords
3. Group related nodes in containers
4. Add labels to connections when they clarify relationships
5. Choose appropriate shapes for the domain:
   - `cylinder` → databases, storage
   - `cloud` → external services
   - `person` → users, actors
   - `diamond` → decisions, gates, warnings
   - `document` → config files, specs
   - `stored_data` → datasets, files at rest
   - `step` → sequential pipeline stages
   - `hexagon` → key concepts, highlights
6. Use `classes` for any diagram with 3+ nodes sharing the same style
7. Extract shared classes into `_base.d2` when producing multiple related diagrams
8. Use `style.multiple: true` to convey "multiple instances" without duplicating nodes
9. Use `style.animated: true` on connections to emphasize active data flow
10. Render to PNG by default unless vector format is specifically requested

## Rendering

Render diagrams using the `d2` CLI. The output format is determined by the file extension.

```sh
# Render to PNG (default)
d2 input.d2 output.png

# Render to SVG (vector — preserves animated arrows)
d2 input.d2 output.svg

# Use ELK layout engine for complex diagrams (recommended over dagre)
d2 --layout=elk input.d2 output.png

# Theme 300 (Shirley Temple) — recommended for polished output
d2 --theme=300 input.d2 output.png

# Theme + ELK + padding — full production render command
d2 --theme=300 --layout=elk --pad=50 input.d2 output.png

# Sketch mode (hand-drawn look)
d2 --sketch input.d2 output.png

# Watch mode for live preview during editing
d2 --watch input.d2 output.svg
```

### Theme Reference

| ID | Name | Character |
|---|---|---|
| 0 | Neutral | Clean, minimal |
| 1 | Neutral Grey | Monochrome |
| 3 | Cool Classics | Blue tones |
| 4 | Mixed Berries | Colorful |
| 100 | Terminal | Dark, code-like |
| **300** | **Shirley Temple** | **Warm, polished — recommended** |
| 301 | Earth Tones | Natural, muted |

### Windows Note

On Windows, run D2 with its full path if it is not yet on `PATH` (requires reopening terminal after install):

```powershell
& "C:\Program Files\D2\d2.exe" --theme=300 --layout=elk --pad=50 input.d2 output.png
```
