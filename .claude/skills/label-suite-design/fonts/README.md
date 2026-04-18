# Fonts

Label Suite uses **100% Google Fonts**. No self-hosted TTFs are included in this folder — all fonts load via the `@import` at the top of `colors_and_type.css`.

| Family | Usage | Weights | Source |
|---|---|---|---|
| **Crimson Pro** | Headings, display, academic feel | 400, 500, 600, 700 | [Google Fonts](https://fonts.google.com/specimen/Crimson+Pro) |
| **Inter** | UI body, buttons, inputs, labels | 400, 500, 600, 700 | [Google Fonts](https://fonts.google.com/specimen/Inter) |
| **Atkinson Hyperlegible** | Accessibility-forward data-dense alternative | 400, 700 | [Google Fonts](https://fonts.google.com/specimen/Atkinson+Hyperlegible) |
| **JetBrains Mono** | YAML/config editor surface, code | 400, 600 | [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono) |

## CJK fallback chain

Chinese (zh-TW) falls back to platform fonts so users get proper PingFang TC (macOS) or Microsoft JhengHei (Windows) rendering without a 300 KB web-font download:

```css
--font-sans: 'Inter', 'Noto Sans TC', 'PingFang TC', -apple-system, sans-serif;
--font-serif-display: 'Crimson Pro', 'Noto Serif TC', 'Source Han Serif TC', Georgia, serif;
```

## No substitutions flagged

Every family above is already Google-hosted. If you need to self-host for an offline build, pull the .woff2 files from the Google Fonts API using the helper.css URL and drop them in this folder; no visual changes needed.
