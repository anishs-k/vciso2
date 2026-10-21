# vCISO frontend (3 themes, one codebase)

```
npm install
npm run dev        # http://localhost:5173  (API proxied to VITE_API_TARGET, default http://localhost:4000)
npm run build      # dist/  — served by the client API (full_project/src) in a client deployment
```

The API is the client platform in the parent project (see `full_project/README.md`): it must be linked
to a client database before it serves data. `VITE_SKIP_LOGIN=true` opens the vCISO pages as a demo user
without signing in (no data will load without a session).

## Themes

Three looks share every component: **new** (default), **classic**, **dark**.
Switch with the toggle next to "New Policy Draft" (it floats bottom-right on
pages without that button), or open any URL with `?theme=classic|new|dark`.
The choice is saved in `localStorage` (`vciso_theme`) and the page reloads.

| Where | What |
|---|---|
| `src/theme/index.js` | `THEME`, `isDark`, `th()`, `setTheme()` |
| `src/theme/toggle.js` | the 3-way toggle button |
| `src/themes/<name>/` | each theme's CSS (`index.css` imports `base.css`, `register.css`, …) |
| `public/tailwind-themes.js` | each theme's Tailwind config (dark remaps the colour palette) |
| `index.html` | picks the theme before render + loads that theme's fonts |

### Writing themed code

Values that differ per theme use `th(newValue, { classic, dark })` — any theme
you leave out gets the `new` value:

```jsx
import { th, isDark } from '../theme';

<div style={{ color: th('#1A202C', { classic: '#0F172A', dark: '#F1F5F9' }) }} />
<div className={`card ${th('rounded-sm', { classic: 'rounded-md' })}`} />
{isDark ? <DarkHeader /> : <Header />}   // when the markup itself differs
```

Dark-only markup lives in `VCISOMainPage.jsx` (org bar, stat cards) and
`VCISOSidebar.jsx` (icons per theme).
