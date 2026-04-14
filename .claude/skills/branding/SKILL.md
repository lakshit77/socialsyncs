---
name: branding
description: Create or update the central branding file (lib/branding.ts) for this project. Use this skill whenever creating, editing, or referencing brand colors, typography, logo config, semantic tokens, or metadata. The actual brand values live in lib/branding.ts — this skill defines the structure, types, and wiring patterns only.
---

# Branding Skill

This skill governs the structure and maintenance of `lib/branding.ts` — the single source of truth for all brand identity. Every color, font, logo reference, and semantic token used anywhere in the codebase must trace back to that file.

**The actual brand values (colors, fonts, logo, metadata) are defined in `lib/branding.ts`. Read that file first before making any design decisions.**

---

## When to Invoke This Skill

- Before writing any component that uses color, typography, or the logo
- When scaffolding the project for the first time
- When the user asks to update brand colors, fonts, or logo
- When creating `tailwind.config.ts` (extend theme from BRANDING)
- When creating `globals.css` (inject CSS variables from BRANDING)

---

## Step 1 — Always Read `lib/branding.ts` First

Before touching any component or config, read `lib/branding.ts` to get the live brand values. Do not guess or invent colors or fonts.

---

## Step 2 — Required Types

`lib/branding.ts` must define and export these types at the top of the file:

```ts
export type LogoType = 'svg' | 'image'

export type PrimaryColorPalette = Record<
  '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
  string
>

export interface LogoConfig {
  type: LogoType
  imageSrc?: string       // path for type: 'image'
  alt: string
  backgroundColor?: string
  svgViewBox?: string     // for type: 'svg'
  svgPath?: string        // space-separated polygon/polyline points for SVG
}

export interface MetadataConfig {
  title: string
  description: string
  favicon?: string
}

export interface SemanticColors {
  primary: string         // Main brand color — CTAs, links, highlights
  primaryHover: string    // Darker shade for hover states
  primaryMuted: string    // Light tint for backgrounds, badges, subtle fills
  background: string      // Page background
  surface: string         // Card / panel surface
  surfaceElevated: string // Elevated surface (modals, dropdowns)
  text: string            // Primary body text
  textMuted: string       // Secondary / subdued text
  border: string          // Dividers and borders
  success: string         // Success / positive states
  warning: string         // Warning / caution states
  error: string           // Error / destructive states
  whatsapp: string        // WhatsApp Green — use ONLY for WhatsApp-specific UI
}

export interface BrandingConfig {
  logo: LogoConfig
  brandName: string
  tagline: string
  metadata: MetadataConfig
  theme: 'light' | 'dark'
  typography: {
    fontFamily: string         // Body font (CSS font-family string)
    fontFamilyHeading: string  // Heading font (CSS font-family string)
    fontFamilyMono: string     // Monospace font
  }
  colors: { primaryPalette: PrimaryColorPalette } & SemanticColors
  termsOfServiceUrl?: string
  privacyPolicyUrl?: string
  supportUrl?: string
}
```

---

## Step 3 — PRIMARY_PALETTE Convention

Always define a named `PRIMARY_PALETTE` constant and derive `primary`, `primaryHover`, and `primaryMuted` from it. Never hardcode the derived values separately.

```ts
// primary       = PRIMARY_PALETTE['600']
// primaryHover  = PRIMARY_PALETTE['700']
// primaryMuted  = PRIMARY_PALETTE['100']
const PRIMARY_PALETTE: PrimaryColorPalette = {
  '50':  '...',
  '100': '...', // primaryMuted
  '200': '...',
  '300': '...',
  '400': '...',
  '500': '...',
  '600': '...', // primary
  '700': '...', // primaryHover
  '800': '...',
  '900': '...',
}
```

---

## Step 4 — Wire Branding into the Project

### tailwind.config.ts
Import BRANDING and extend the theme so Tailwind utility classes map to brand tokens:

```ts
import { BRANDING } from './lib/branding'

const config = {
  theme: {
    extend: {
      colors: {
        primary:             BRANDING.colors.primary,
        'primary-hover':     BRANDING.colors.primaryHover,
        'primary-muted':     BRANDING.colors.primaryMuted,
        surface:             BRANDING.colors.surface,
        'surface-elevated':  BRANDING.colors.surfaceElevated,
        'text-muted':        BRANDING.colors.textMuted,
        border:              BRANDING.colors.border,
        success:             BRANDING.colors.success,
        warning:             BRANDING.colors.warning,
        error:               BRANDING.colors.error,
        whatsapp:            BRANDING.colors.whatsapp,
      },
      fontFamily: {
        sans:    [BRANDING.typography.fontFamily],
        heading: [BRANDING.typography.fontFamilyHeading],
        mono:    [BRANDING.typography.fontFamilyMono],
      },
    },
  },
}
```

### globals.css
Inject CSS variables for use outside Tailwind (inline styles, SVGs, etc.). Values must match `lib/branding.ts` exactly — do not hardcode; read from the file:

```css
:root {
  --color-primary:        /* BRANDING.colors.primary */;
  --color-primary-hover:  /* BRANDING.colors.primaryHover */;
  --color-primary-muted:  /* BRANDING.colors.primaryMuted */;
  --color-background:     /* BRANDING.colors.background */;
  --color-surface:        /* BRANDING.colors.surface */;
  --color-text:           /* BRANDING.colors.text */;
  --color-text-muted:     /* BRANDING.colors.textMuted */;
  --color-border:         /* BRANDING.colors.border */;
  --color-success:        /* BRANDING.colors.success */;
  --color-warning:        /* BRANDING.colors.warning */;
  --color-error:          /* BRANDING.colors.error */;
  --color-whatsapp:       /* BRANDING.colors.whatsapp */;
  --font-sans:            /* BRANDING.typography.fontFamily */;
  --font-heading:         /* BRANDING.typography.fontFamilyHeading */;
  --font-mono:            /* BRANDING.typography.fontFamilyMono */;
}
```

### app/layout.tsx — Metadata
```ts
import { BRANDING } from '@/lib/branding'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       BRANDING.metadata.title,
  description: BRANDING.metadata.description,
  icons: { icon: BRANDING.metadata.favicon },
}
```

### Logo component
```tsx
import BRANDING from '@/lib/branding'
import Image from 'next/image'

export function Logo() {
  if (BRANDING.logo.type === 'image') {
    return (
      <Image
        src={BRANDING.logo.imageSrc!}
        alt={BRANDING.logo.alt}
        width={140}
        height={36}
        priority
      />
    )
  }
  // SVG logo
  return (
    <svg viewBox={BRANDING.logo.svgViewBox} aria-label={BRANDING.logo.alt}>
      <path d={BRANDING.logo.svgPath} />
    </svg>
  )
}
```

---

## Rules

- `lib/branding.ts` is the **only** place where raw hex values and font names are defined. Never hardcode them in components, config files, or CSS.
- Never use default Tailwind colors (indigo-500, blue-600, etc.) — always use the custom tokens derived from BRANDING.
- The `whatsapp` color must only be used for WhatsApp-specific UI elements (icons, badges, buttons that open WhatsApp).
- When a new semantic color is needed, add it to `SemanticColors` in `lib/branding.ts` first, then wire it through Tailwind config and CSS variables.
- When updating brand values, update `lib/branding.ts` only — all consumers update automatically.
