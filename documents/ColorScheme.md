# Sumaq Yachay Color Scheme

_Sumaq Yachay_ (Quechua: "Beautiful Knowledge" or "Excellent Learning")  
Inspired by Andean lakes, mountain valleys, sunlight, and the natural landscapes of the Andes.

## Theme Tokens

Use semantic tokens so components can switch themes without redefining component-level colors.

> **Navigation chrome exception:** `--primary` is intentionally *not* used directly as the navbar background. In dark mode `--primary` lightens to a moonlit teal (meant for text, links, and icons on dark surfaces) — reusing it as a solid navbar fill collapsed contrast with white nav text/icons. The app instead defines a fixed `--nav-bg` token (`#1F5563`, the light-mode Andean Lake Blue) that is **not** redefined under `[data-theme="dark"]`, so the top bar keeps guaranteed white-on-navy contrast in both themes. Add `--nav-bg` alongside the other tokens below.

### Light Mode

```css
:root,
[data-theme="light"] {
  color-scheme: light;

  --primary: #1F5563;          /* Andean Lake Blue */
  --primary-hover: #184650;
  --on-primary: #FFFFFF;

  --secondary: #4B8B6C;        /* Mountain Valley Green */
  --secondary-hover: #3D7359;
  --on-secondary: #FFFFFF;

  --accent: #E5B85C;           /* Sun Gold */
  --accent-hover: #C99A3D;
  --on-accent: #2B210B;

  --background: #F7F9F8;
  --surface: #FFFFFF;
  --surface-alt: #EAF0ED;
  --border: #C7D3CE;

  --text: #221F1A;
  --text-muted: #56615C;
  --link: #1F5563;

  --success: #357A55;
  --warning: #A86F00;
  --error: #B4433D;
  --info: #2F6F89;

  --focus-ring: #C48600;
  --disabled-bg: #E2E7E5;
  --disabled-text: #6C7571;
}
```

### Dark Mode

```css
[data-theme="dark"] {
  color-scheme: dark;

  --primary: #79C4D3;          /* Moonlit Andean Lake */
  --primary-hover: #9BD6E1;
  --on-primary: #092C34;

  --secondary: #79C99B;        /* High-contrast Valley Green */
  --secondary-hover: #98D8B2;
  --on-secondary: #0B2B1B;

  --accent: #F2C96D;           /* Warm Sun Gold */
  --accent-hover: #F7D98F;
  --on-accent: #332506;

  --background: #101716;
  --surface: #182321;
  --surface-alt: #22302D;
  --border: #465853;

  --text: #F1F5F3;
  --text-muted: #B9C6C1;
  --link: #8DD5E2;

  --success: #79C99B;
  --warning: #F2C96D;
  --error: #FF8A82;
  --info: #82CBE5;

  --focus-ring: #F2C96D;
  --disabled-bg: #2A3633;
  --disabled-text: #93A09B;
}
```

### Automatic System Preference

Use this only when the user has not explicitly selected a theme.

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;

    --primary: #79C4D3;
    --primary-hover: #9BD6E1;
    --on-primary: #092C34;
    --secondary: #79C99B;
    --secondary-hover: #98D8B2;
    --on-secondary: #0B2B1B;
    --accent: #F2C96D;
    --accent-hover: #F7D98F;
    --on-accent: #332506;
    --background: #101716;
    --surface: #182321;
    --surface-alt: #22302D;
    --border: #465853;
    --text: #F1F5F3;
    --text-muted: #B9C6C1;
    --link: #8DD5E2;
    --success: #79C99B;
    --warning: #F2C96D;
    --error: #FF8A82;
    --info: #82CBE5;
    --focus-ring: #F2C96D;
    --disabled-bg: #2A3633;
    --disabled-text: #93A09B;
  }
}
```

## Component Mapping

| Component | Semantic token |
|---|---|
| Main navigation (fixed, both themes) | `--nav-bg` (`#1F5563`) with white text/icons |
| Catalog tree | `--primary` |
| Learning views | `--secondary` |
| Timeline ribbons | `--secondary` |
| Mermaid diagrams | `--secondary` |
| Flashcards | `--accent` |
| Progress indicators | `--accent` |
| Page background | `--background` |
| Cards, dialogs, panels | `--surface` |
| Secondary panels | `--surface-alt` |
| Main text | `--text` |
| Supporting text | `--text-muted` |
| Keyboard focus | `--focus-ring` |
| Success states | `--success` |
| Warnings | `--warning` |
| Errors | `--error` |
| Informational states | `--info` |

## Theme Switching Example

```ts
type Theme = 'light' | 'dark';

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('sumaq-yachay-theme', theme);
}
```

> **Implementation note:** In the Angular app, theme + text-size selection live in the top bar's
> gear/settings drawer (`app.ts` / `app.html`) rather than as separate top-bar icons, to avoid
> icon clutter. Theme is applied the same way as above (`document.documentElement.dataset.theme`);
> text size is applied via `document.documentElement.style.fontSize` at 87.5–137.5% steps, which
> scales all `rem`-based component sizing app-wide.

## Design Principles

- **Blue** represents knowledge, clarity, and deep Andean lakes.
- **Green** represents growth, learning, and connection to nature.
- **Gold** represents wisdom, discovery, and the sun as an important symbol in Andean culture.
- Light mode uses soft neutral backgrounds for comfortable long-form reading.
- Dark mode uses deep green-charcoal surfaces instead of pure black to preserve the natural brand identity and reduce glare.
- Semantic tokens keep every component visually consistent across both themes.

## Accessibility Guidance

- Use `--on-primary`, `--on-secondary`, and `--on-accent` for text and icons placed on their corresponding colors.
- Do not use color as the only indicator of success, warning, or error states. Pair it with text or an icon.
- Preserve a visible focus ring for keyboard navigation.
- Validate final component combinations against WCAG contrast requirements, especially small text, disabled states, charts, and diagram labels.
- Test both explicit theme selection and the operating system preference.

## Brand Personality

- Modern
- Professional
- Knowledge-focused
- Calm and trustworthy
- Inspired by Andean heritage
- Optimized for long reading and learning sessions
