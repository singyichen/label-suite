---
name: xmind-import
description: Use this skill whenever the user shares an XMind share URL (app.xmind.com/share/...) and wants to import, convert, or export the mind map — even if they don't say "xmind-import" explicitly. Triggers on: "convert this XMind link", "import my mind map", "turn this XMind into Mermaid", "parse this XMind", or when the user pastes an app.xmind.com/share URL alongside any request involving diagrams or markdown. Fetches the mind map JSON via Playwright MCP, converts the tree structure to a Mermaid flowchart LR diagram, and writes it to a markdown file or prints it to the conversation.
---

# XMind Import

Fetch a public XMind share link, extract the mind map JSON, and convert it to a `flowchart LR` Mermaid diagram.

## Usage

```
/xmind-import <xmind-share-url> [output-path]
```

**Examples:**

```
/xmind-import https://app.xmind.com/share/PKjJEIHD docs/functional-map/functional-map.md
/xmind-import https://app.xmind.com/share/ABC123
```

If `output-path` is omitted, print the Mermaid source to the conversation.

---

## Steps

### Step 1 — Extract the file ID from the URL

Parse the share URL to get `fileId`:

```
https://app.xmind.com/share/{fileId}
                               ↑ this part
```

For example, `https://app.xmind.com/share/PKjJEIHD` → `fileId = PKjJEIHD`.

### Step 2 — Navigate with Playwright

Use `mcp__plugin_playwright_playwright__browser_navigate` to open the share page. This establishes the session cookies that allow the API call in Step 3 to succeed without authentication.

```
url: https://app.xmind.com/share/{fileId}   ← substitute real fileId
```

### Step 3 — Wait for the SPA to load

Use `mcp__plugin_playwright_playwright__browser_wait_for` with `time: 3`.

The page title changes from the generic XMind branding to the mind map name (e.g., "Label Suite - Xmind AI") once the JavaScript has fully loaded.

### Step 4 — Fetch, parse, and convert in one browser call

Use `mcp__plugin_playwright_playwright__browser_evaluate` to fetch the XMind content API, walk the topic tree, and produce Mermaid output — all in a single call. Substitute the actual `fileId` into the fetch URL string before running.

```js
async () => {
  const FILE_ID = 'PKjJEIHD'; // ← replace with actual fileId

  const res = await fetch(`/api/drive/share/${FILE_ID}/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (!res.ok) return `ERROR: API returned ${res.status}`;

  const data = await res.json();
  const sheet = data[0];
  const mapTitle = sheet.title ?? 'Mind Map';
  const root = sheet.rootTopic;

  const lines = ['flowchart LR'];
  let counter = 0;

  function sanitize(title) {
    return (title ?? '').replace(/"/g, "'").replace(/\n/g, ' ').trim();
  }

  function walk(topic, parentId) {
    const id = 'n' + counter++;
    const label = sanitize(topic.title);
    if (parentId === null) {
      lines.push(`  ${id}(["${label}"])`);
    } else {
      lines.push(`  ${parentId} --> ${id}["${label}"]`);
    }
    if (topic.children?.attached) {
      for (const child of topic.children.attached) {
        walk(child, id);
      }
    }
  }

  walk(root, null);
  return JSON.stringify({ title: mapTitle, mermaid: lines.join('\n') });
}
```

The function returns a JSON string with two fields:
- `title` — the mind map name (use this as the markdown heading)
- `mermaid` — the full `flowchart LR` source

### Step 5 — Write or print output

Parse the JSON string returned by Step 4, then:

**If an output path was given**, write a markdown file using the `Write` tool with this structure:

```
# {title from Step 4}

```mermaid
{mermaid from Step 4}
` ``
```

*(Note: close the fence with three backticks — the above uses a space before the last ` `` ` only to avoid nesting issues in this document.)*

**If no output path was given**, print the mermaid source in the conversation inside a `mermaid` code fence.

---

## Error Handling

| Situation | Action |
|-----------|--------|
| API returns non-200 (e.g., 401, 403) | The map is private or requires login. Inform the user — public share links work without auth, private ones do not. |
| `rootTopic` is missing | The XMind API format may have changed. Print the raw API response so the user can inspect it. |
| Playwright tools unavailable | Inform the user that this skill requires the Playwright MCP plugin to be installed. `WebFetch` cannot load XMind's SPA content. |
| `title` field missing in response | Fall back to the browser page title (available via `browser_evaluate`: `() => document.title`). |

---

## Notes

- **Auth**: Public share links work without login. The browser session cookie from Step 2 is what grants access to the content API.
- **Layout**: `flowchart LR` is a horizontal left-to-right tree. XMind's balanced layout (branches on both sides) cannot be reproduced in Mermaid — all branches appear on the right.
- **Folded nodes**: XMind `"branch": "folded"` is purely visual. All children are present in the JSON and will appear in the output.
- **`fileId` substitution**: Always replace the `FILE_ID` constant in the evaluate script with the actual ID from the URL before running — do not leave it as `'PKjJEIHD'` which is the example from this skill's documentation.
