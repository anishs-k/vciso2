// Tailwind CDN config for each theme (moved from the three old index.html files).
// index.html runs this right after the Tailwind CDN script, before the app loads.
(function () {
  var configs = {
    "classic": function () {
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              serif: ["'Source Serif 4'", 'serif'],
              sans: ["'Inter'", 'sans-serif'],
              mono: ["'JetBrains Mono'", 'monospace']
            },
            colors: {
              // ── Register design system — source of truth: src/styles/register.css
              reg: {
                bg: '#F1F5F9',
                surface: '#FFFFFF',
                notice: '#F8FAFC',
                hover: '#F8FAFC',
                border: '#DCE3EC',
                borderMid: '#E2E8F0',
                borderSubtle: '#E2E8F0',
                ink: '#0F172A',
                inkBody: '#0F172A',
                inkParagraph: '#475569',
                inkMuted: '#64748B',
                inkDim: '#64748B',
                inkClause: '#94A3B8',
                crimson: '#2563EB',
                crimsonHover: '#1D4ED8',
                sideBg: '#FFFFFF',
                sideFooter: '#FFFFFF',
                sideHover: '#F8FAFC',
                sideActive: '#F1F5F9',
                sideBorder: '#E2E8F0',
                sideText: '#475569',
                sideTextBright: '#0F172A',
                sideTextMuted: '#64748B'
              },
              brand: {
                50: '#eff6ff',
                100: '#dbeafe',
                200: '#bfdbfe',
                300: '#93c5fd',
                400: '#60a5fa',
                500: '#3b82f6',
                600: '#2563eb',
                700: '#1d4ed8',
                800: '#1e40af',
                900: '#1e3a8a'
              },
              sidebar: {
                bg: '#ffffff',
                border: '#e5e7eb',
                hover: '#f8fafc',
                active: '#eff6ff',
                activeText: '#2563eb',
                text: '#64748b',
                heading: '#94a3b8'
              },
              primary: '#2563EB',
              surface: '#FFFFFF',
              canvas: '#F1F5F9',
              slate: {
                850: '#131c31',
                950: '#070d1f'
              }
            },
            borderRadius: {
              DEFAULT: '2px', sm: '2px', md: '2px', lg: '2px', xl: '2px', '2xl': '2px', '3xl': '2px'
            },
            boxShadow: {
              'card': 'none',
              'card-hover': 'none',
              'dropdown': '0px 4px 12px rgba(15, 23, 42, 0.08)',
            }
          }
        }
      }
    },
    "new": function () {
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              serif: ["'Source Serif 4'", 'serif'],
              sans: ["'Inter'", 'sans-serif'],
              mono: ["'JetBrains Mono'", 'monospace']
            },
            colors: {
              // ── Graphite & Mist theme (code.html / DESIGN.md)
              graphite: { main: '#2D3748', active: '#3A475C', border: '#4A5568', text: '#CBD5E0', heading: '#FFFFFF', inset: '#1A202C' },
              mist: { bg: '#EDF2F7', card: '#FFFFFF', border: '#D7DEE7', muted: '#A0AEC0', label: '#4A5568', text: '#1A202C' },
              clearblue: '#3182CE',
              // ── Register design system — source of truth: src/styles/register.css
              reg: {
                bg: '#EDF2F7',
                surface: '#FFFFFF',
                notice: '#F8FAFC',
                hover: '#F8FAFC',
                border: '#D7DEE7',
                borderMid: '#E2E8F0',
                borderSubtle: '#EDF2F7',
                ink: '#1A202C',
                inkBody: '#1A202C',
                inkParagraph: '#4A5568',
                inkMuted: '#4A5568',
                inkDim: '#718096',
                inkClause: '#4A5568',
                crimson: '#3182CE',
                crimsonHover: '#2B6CB0',
                sideBg: '#2D3748',
                sideFooter: '#283141',
                sideHover: '#3A475C',
                sideActive: '#3A475C',
                sideBorder: '#3A475C',
                sideText: '#CBD5E0',
                sideTextBright: '#FFFFFF',
                sideTextMuted: '#A0AEC0'
              },
              brand: {
                50: '#eff6ff',
                100: '#dbeafe',
                200: '#bfdbfe',
                300: '#93c5fd',
                400: '#60a5fa',
                500: '#3b82f6',
                600: '#2563eb',
                700: '#1d4ed8',
                800: '#1e40af',
                900: '#1e3a8a'
              },
              sidebar: {
                bg: '#ffffff',
                border: '#e5e7eb',
                hover: '#f8fafc',
                active: '#eff6ff',
                activeText: '#2563eb',
                text: '#64748b',
                heading: '#94a3b8'
              },
              slate: {
                850: '#131c31',
                950: '#070d1f'
              }
            },
            boxShadow: {
              // Flat editorial: standard elements carry no shadow; overlays get one sharp ambient blur
              sm: "none", DEFAULT: "none", md: "none", card: "none", "card-hover": "none", inner: "none",
              lg: "0px 4px 12px rgba(15, 23, 42, 0.08)",
              xl: "0px 4px 12px rgba(15, 23, 42, 0.08)",
              "2xl": "0px 4px 12px rgba(15, 23, 42, 0.08)",
              dropdown: "0px 4px 12px rgba(15, 23, 42, 0.08)",
              none: "none"
            },
            borderRadius: {
              none: "0px", sm: "2px", DEFAULT: "2px", md: "2px", lg: "2px", xl: "2px", "2xl": "2px", "3xl": "2px", full: "9999px"
            }
          }
        }
      }
    },
    "dark": function () {
      // Dark theme (code.html "13 Dark Mode"): Tailwind's light-mode utility
      // classes used across the app are remapped onto a dark slate palette —
      // white = card surface, slate-50 = canvas, slate-900 = primary text, and
      // every hue scale is mirrored (50<->950) so tints become dark fills.
      const DARK_PALETTE = {
  "red": {
    "50": "#301b25",
    "100": "#53222a",
    "200": "#991b1b",
    "300": "#b91c1c",
    "400": "#dc2626",
    "500": "#ef4444",
    "600": "#f87171",
    "700": "#fca5a5",
    "800": "#fecaca",
    "900": "#fee2e2",
    "950": "#fef2f2"
  },
  "orange": {
    "50": "#2f2024",
    "100": "#522b24",
    "200": "#9a3412",
    "300": "#c2410c",
    "400": "#ea580c",
    "500": "#f97316",
    "600": "#fb923c",
    "700": "#fdba74",
    "800": "#fed7aa",
    "900": "#ffedd5",
    "950": "#fff7ed"
  },
  "amber": {
    "50": "#302222",
    "100": "#503023",
    "200": "#92400e",
    "300": "#b45309",
    "400": "#d97706",
    "500": "#f59e0b",
    "600": "#fbbf24",
    "700": "#fcd34d",
    "800": "#fde68a",
    "900": "#fef3c7",
    "950": "#fffbeb"
  },
  "yellow": {
    "50": "#2e2523",
    "100": "#4c3524",
    "200": "#854d0e",
    "300": "#a16207",
    "400": "#ca8a04",
    "500": "#eab308",
    "600": "#facc15",
    "700": "#fde047",
    "800": "#fef08a",
    "900": "#fef9c3",
    "950": "#fefce8"
  },
  "lime": {
    "50": "#1c2b23",
    "100": "#2b4026",
    "200": "#3f6212",
    "300": "#4d7c0f",
    "400": "#65a30d",
    "500": "#84cc16",
    "600": "#a3e635",
    "700": "#bef264",
    "800": "#d9f99d",
    "900": "#ecfccb",
    "950": "#f7fee7"
  },
  "green": {
    "50": "#132b2a",
    "100": "#184033",
    "200": "#166534",
    "300": "#15803d",
    "400": "#16a34a",
    "500": "#22c55e",
    "600": "#4ade80",
    "700": "#86efac",
    "800": "#bbf7d0",
    "900": "#dcfce7",
    "950": "#f0fdf4"
  },
  "emerald": {
    "50": "#112a30",
    "100": "#113d3b",
    "200": "#065f46",
    "300": "#047857",
    "400": "#059669",
    "500": "#10b981",
    "600": "#34d399",
    "700": "#6ee7b7",
    "800": "#a7f3d0",
    "900": "#d1fae5",
    "950": "#ecfdf5"
  },
  "teal": {
    "50": "#122c35",
    "100": "#183d43",
    "200": "#115e59",
    "300": "#0f766e",
    "400": "#0d9488",
    "500": "#14b8a6",
    "600": "#2dd4bf",
    "700": "#5eead4",
    "800": "#99f6e4",
    "900": "#ccfbf1",
    "950": "#f0fdfa"
  },
  "cyan": {
    "50": "#142e3f",
    "100": "#1a3d51",
    "200": "#155e75",
    "300": "#0e7490",
    "400": "#0891b2",
    "500": "#06b6d4",
    "600": "#22d3ee",
    "700": "#67e8f9",
    "800": "#a5f3fc",
    "900": "#cffafe",
    "950": "#ecfeff"
  },
  "sky": {
    "50": "#142c41",
    "100": "#143b57",
    "200": "#075985",
    "300": "#0369a1",
    "400": "#0284c7",
    "500": "#0ea5e9",
    "600": "#38bdf8",
    "700": "#7dd3fc",
    "800": "#bae6fd",
    "900": "#e0f2fe",
    "950": "#f0f9ff"
  },
  "blue": {
    "50": "#1b2746",
    "100": "#1e3266",
    "200": "#1e40af",
    "300": "#1d4ed8",
    "400": "#2563eb",
    "500": "#3b82f6",
    "600": "#60a5fa",
    "700": "#93c5fd",
    "800": "#bfdbfe",
    "900": "#dbeafe",
    "950": "#eff6ff"
  },
  "indigo": {
    "50": "#1e2342",
    "100": "#282c62",
    "200": "#3730a3",
    "300": "#4338ca",
    "400": "#4f46e5",
    "500": "#6366f1",
    "600": "#818cf8",
    "700": "#a5b4fc",
    "800": "#c7d2fe",
    "900": "#e0e7ff",
    "950": "#eef2ff"
  },
  "violet": {
    "50": "#251e4e",
    "100": "#37226c",
    "200": "#5b21b6",
    "300": "#6d28d9",
    "400": "#7c3aed",
    "500": "#8b5cf6",
    "600": "#a78bfa",
    "700": "#c4b5fd",
    "800": "#ddd6fe",
    "900": "#ede9fe",
    "950": "#f5f3ff"
  },
  "purple": {
    "50": "#2b1a4d",
    "100": "#3e2265",
    "200": "#6b21a8",
    "300": "#7e22ce",
    "400": "#9333ea",
    "500": "#a855f7",
    "600": "#c084fc",
    "700": "#d8b4fe",
    "800": "#e9d5ff",
    "900": "#f3e8ff",
    "950": "#faf5ff"
  },
  "fuchsia": {
    "50": "#321844",
    "100": "#4b215b",
    "200": "#86198f",
    "300": "#a21caf",
    "400": "#c026d3",
    "500": "#d946ef",
    "600": "#e879f9",
    "700": "#f0abfc",
    "800": "#f5d0fe",
    "900": "#fae8ff",
    "950": "#fdf4ff"
  },
  "pink": {
    "50": "#341a31",
    "100": "#56203f",
    "200": "#9d174d",
    "300": "#be185d",
    "400": "#db2777",
    "500": "#ec4899",
    "600": "#f472b6",
    "700": "#f9a8d4",
    "800": "#fbcfe8",
    "900": "#fce7f3",
    "950": "#fdf2f8"
  },
  "rose": {
    "50": "#33192c",
    "100": "#581d39",
    "200": "#9f1239",
    "300": "#be123c",
    "400": "#e11d48",
    "500": "#f43f5e",
    "600": "#fb7185",
    "700": "#fda4af",
    "800": "#fecdd3",
    "900": "#ffe4e6",
    "950": "#fff1f2"
  },
  "slate": {
    "50": "#0F172A",
    "100": "#172033",
    "200": "#334155",
    "300": "#475569",
    "400": "#64748B",
    "500": "#94A3B8",
    "600": "#A8B4C6",
    "700": "#CBD5E1",
    "800": "#E2E8F0",
    "900": "#F1F5F9",
    "950": "#F8FAFC",
    "850": "#EAEFF5"
  },
  "gray": {
    "50": "#0F172A",
    "100": "#172033",
    "200": "#334155",
    "300": "#475569",
    "400": "#64748B",
    "500": "#94A3B8",
    "600": "#A8B4C6",
    "700": "#CBD5E1",
    "800": "#E2E8F0",
    "900": "#F1F5F9",
    "950": "#F8FAFC",
    "850": "#EAEFF5"
  },
  "zinc": {
    "50": "#0F172A",
    "100": "#172033",
    "200": "#334155",
    "300": "#475569",
    "400": "#64748B",
    "500": "#94A3B8",
    "600": "#A8B4C6",
    "700": "#CBD5E1",
    "800": "#E2E8F0",
    "900": "#F1F5F9",
    "950": "#F8FAFC",
    "850": "#EAEFF5"
  },
  "neutral": {
    "50": "#0F172A",
    "100": "#172033",
    "200": "#334155",
    "300": "#475569",
    "400": "#64748B",
    "500": "#94A3B8",
    "600": "#A8B4C6",
    "700": "#CBD5E1",
    "800": "#E2E8F0",
    "900": "#F1F5F9",
    "950": "#F8FAFC",
    "850": "#EAEFF5"
  },
  "stone": {
    "50": "#0F172A",
    "100": "#172033",
    "200": "#334155",
    "300": "#475569",
    "400": "#64748B",
    "500": "#94A3B8",
    "600": "#A8B4C6",
    "700": "#CBD5E1",
    "800": "#E2E8F0",
    "900": "#F1F5F9",
    "950": "#F8FAFC",
    "850": "#EAEFF5"
  },
  "white": "#1E293B"
};
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              serif: ["'Source Serif 4'", 'serif'],
              sans: ["'Inter'", 'sans-serif'],
              mono: ["'JetBrains Mono'", 'monospace']
            },
            colors: {
              ...DARK_PALETTE,
              brand: DARK_PALETTE.blue,
              sidebar: {
                bg: '#0B1120',
                border: '#1E293B',
                hover: '#172033',
                active: '#1E293B',
                activeText: '#60A5FA',
                text: '#94A3B8',
                heading: '#64748B'
              }
            },
            borderRadius: {
              DEFAULT: '2px', sm: '2px', md: '2px', lg: '2px', xl: '2px', '2xl': '2px', '3xl': '2px'
            },
            boxShadow: {
              sm: 'none', DEFAULT: 'none', md: 'none', lg: '0px 4px 12px rgba(0, 0, 0, 0.35)',
              xl: '0px 4px 12px rgba(0, 0, 0, 0.35)', '2xl': '0px 4px 12px rgba(0, 0, 0, 0.35)',
              card: 'none', 'card-hover': 'none', dropdown: '0px 4px 12px rgba(0, 0, 0, 0.35)'
            }
          }
        }
      }
    },
  };
  var theme = document.documentElement.getAttribute('data-theme');
  (configs[theme] || configs['new'])();
})();
