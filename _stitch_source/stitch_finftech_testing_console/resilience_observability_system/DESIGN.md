---
name: Resilience Observability System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#006242'
  on-tertiary: '#ffffff'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  metric-stat:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  code-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for mission-critical software reliability, chaos engineering, and infrastructure observability. Targeted at Site Reliability Engineers, DevOps teams, and technical leadership, the interface evokes calm authority, surgical precision, and unyielding dependability under high-stress incident scenarios.

The visual style blends **Corporate / Modern** refinement with technical minimalism, drawing direct cues from high-performance developer tools like Stripe Dashboard, Datadog, and Linear. The aesthetic prioritizes rapid data scanning, clear visual hierarchy, and instant cognitive comprehension through:
- A neutral, low-strain slate foundation that keeps focus locked on data and operational health.
- Vibrant, intentional accentuation via electric royal blue for active workflows and primary interactions.
- Explicit, unambiguous semantic states that provide instant peripheral awareness of health, latency regressions, and system failures.
- Crisp outlines, deliberate micro-elevations, and structural harmony with no unnecessary decorative clutter.

## Colors

The palette is tuned for high-density analytical dashboards, metric visualizations, and continuous operational monitoring.

### Core Roles
- **Primary (`#2563EB`):** High-energy electric royal blue reserved for focal points, primary interactive triggers, active tab states, and baseline telemetry series.
- **Secondary (`#0F172A`):** Deep slate-navy for authoritative header typography, active sidebar navigation selections, and strong structural boundaries.
- **Tertiary (`#10B981`):** Precision emerald green used for healthy states, operational success indicators, positive delta trends, and stable service indicators.
- **Neutral (`#64748B`):** Balanced slate gray providing neutral contrast for secondary text, metric units, breadcrumb trails, and baseline axis gridlines.

### Semantic Spectrum & States
- **Success / Healthy:** Background tint `#ECFDF5`, border `#A7F3D0`, foreground `#059669`. Used for uptime indicators, passed chaos experiments, and recovery notifications.
- **Warning / Degraded:** Background tint `#FFFBEB`, border `#FDE68A`, foreground `#D97706`. Deployed for elevated latencies, minor packet drops, and nearing threshold limits.
- **Critical / Failed:** Background tint `#FEF2F2`, border `#FECACA`, foreground `#DC2626`. Highlights unhandled exceptions, network partition failures, and degraded SLOs.
- **Info / In-Progress:** Background tint `#EFF6FF`, border `#BFDBFE`, foreground `#2563EB`. Used for active synthetic runs, queued simulations, and system announcements.

### Background & Border Architecture
- **Canvas Base:** `#F8FAFC` provides a soft, low-glare backdrop that separates the workspace from elevated cards.
- **Surface (Containers):** Pure `#FFFFFF` ensures crisp contrast for complex time-series charts and numerical metrics.
- **Borders & Dividers:** Subtle, architectural `#E2E8F0` defines cards, table rows, and input perimeters without visual noise.

## Typography

Inter serves across all interface levels to provide neutral, systematic clarity. Its tall x-height, clear apertures, and distinct numeral forms make it suited for technical dashboards with high-density tabular and numerical figures.

### Typographic Hierarchy & Guidelines
- **Numerals & Metrics (`metric-stat`):** Use font feature setting `'tnum' on` (tabular numbers) for all numerical metrics, timestamps, and data tables to prevent horizontal jitter during real-time streaming updates.
- **Headings (`display`, `headline-lg`):** Set with negative tracking to create a tight, compact, modern editorial cadence suitable for dashboard views.
- **Labels & Micro-copy (`label-sm`):** Reserved for status chips, table headers, and metric sub-labels. When rendering table column headers, apply uppercase transformation with `0.04em` letter spacing and neutral text color (`#64748B`).
- **Code & Service Identifiers (`code-mono`):** Applied to pod names, run IDs (e.g., `FT-104`), latency percentiles (`p99`), and CLI execution strings for immediate distinction against general labels.

## Layout & Spacing

The system utilizes an application shell layout composed of a fixed-width left navigation bar (`240px`) and an expansive fluid workspace canvas with strict internal padding structures.

### Layout Mechanics
- **Canvas Shell:** Fluid desktop container with a maximum content constraint of `1600px` to maintain legible line lengths on ultra-wide monitoring stations.
- **Analytical Grid:** A flexible 12-column grid utilizing a constant `1.25rem` (`20px`) gutter. Key metric cards typically span 3 columns each on desktop, primary telemetry charts span 8 columns, and peripheral health diagnostics span 4 columns.
- **Vertical Rhythm:** Section containers enforce a consistent `space-lg` (`24px`) gap between distinct operational segments (e.g., summary metrics to analytical charts, charts to recent run history).
- **Responsive Adaptations:**
  - **Desktop (>= 1280px):** Permanent sidebar navigation, full multi-column grid, expanded data tables.
  - **Tablet / Laptop (1024px - 1279px):** Collapsible sidebar rail (icon-only `64px`), 2x2 grid for top metric tiles, full-width charts stacked above service health.
  - **Mobile (< 1024px):** Single-column stack, full-width cards, hidden horizontal table columns with drawer-based row inspect.

## Elevation & Depth

Visual hierarchy is conveyed through a hybrid of **crisp hairline borders** and **soft ambient shadows**, eliminating harsh outlines while separating nested surfaces cleanly.

### Elevation Levels
- **Level 0 (Canvas):** Flat base layer in `#F8FAFC`. Houses background canvas regions and navigation sidebars.
- **Level 1 (Card & Section Containers):** Pure `#FFFFFF` surface framed by a solid `1px` border in `#E2E8F0` and cushioned with a subtle diffuse shadow:
  `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`.
- **Level 2 (Interactive Floating Elements):** Dropdown menus, popovers, date-range selectors, and filter triggers use:
  `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`, bordered with `#CBD5E1`.
- **Level 3 (Modals & Critical Overlays):** Run execution modals and scenario parameter sheets use:
  `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)`, paired with a semi-opaque neutral backdrop blur (`rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(4px)`).

## Shapes

The design system maintains a balanced, contemporary geometry (Roundedness Level `2`). Corner radii are applied intentionally across atomic and organism tiers:
- **Small Controls (`rounded-sm` / 4px):** Checkboxes, nested status dots, and micro badges.
- **Interactive Elements (`rounded-md` / 6px - 8px):** Primary buttons, text input fields, segmented range switchers, and dropdown triggers.
- **Card Containers (`rounded-lg` / 12px - 16px):** Metric widgets, time-series visualization charts, and structural table wrappers.
- **Pill Badges (`rounded-full` / 9999px):** Operational health indicators, test result indicators (e.g., `Successful`, `Degraded`), and avatar badges.

## Components

### Buttons
- **Primary:** Background `#2563EB`, text `#FFFFFF`, font weight `500`, height `36px` (compact) or `40px` (standard), corner radius `8px`. Subtle inner top highlight `inset 0 1px 0 rgba(255, 255, 255, 0.15)`. Hover: `#1D4ED8`. Active: `#1E40AF`.
- **Secondary / Outline:** Background `#FFFFFF`, text `#0F172A`, border `1px solid #E2E8F0`. Hover: background `#F8FAFC`, border `#CBD5E1`.
- **Ghost:** Transparent background, text `#64748B`. Hover: background `#F1F5F9`, text `#0F172A`.
- **Destructive:** Background `#EF4444`, text `#FFFFFF`. Hover: `#DC2626`.

### Badges & Health Chips
- Structured as compact horizontal containers (`height: 22px`, `padding: 2px 8px`, `border-radius: 9999px`).
- Include a leading `6px` solid status circle indicator.
- **Healthy / Passed:** Background `#ECFDF5`, text `#047857`, dot `#10B981`.
- **Warning / Degraded:** Background `#FFFBEB`, text `#B45309`, dot `#F59E0B`.
- **Critical / Failed:** Background `#FEF2F2`, text `#B91C1C`, dot `#EF4444`.

### Cards & Metric Containers
- Surface: `#FFFFFF`, border: `1px solid #E2E8F0`, border radius: `12px`.
- Padding: `20px` internal padding (`space-lg`).
- Header incorporates an iconography badge container (`32x32px`, rounded `6px`, light tint background matching metric semantic category).
- Metrics display the bold `metric-stat` value alongside an embedded micro sparkline or inline delta badge (`+12% vs previous run`).

### Data Tables
- Container: Enclosed in Level 1 card border with zero outer margin to integrate seamlessly.
- Table Header: Background `#F8FAFC`, height `40px`, text style `label-sm`, color `#64748B`, border-bottom `1px solid #E2E8F0`.
- Table Row: Height `52px`, border-bottom `1px solid #F1F5F9`. Hover state transitions background smoothly to `#F8FAFC`.
- Numerical Alignment: Monospaced code fonts for IDs, right-aligned metric values, left-aligned entity descriptors.

### Input Fields & Selectors
- Default: Height `38px`, background `#FFFFFF`, border `1px solid #CBD5E1`, border-radius `8px`, typography `body-md`.
- Focus State: Border color `#2563EB`, paired with an outer focus ring `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15)`.
- Trailing actions (e.g., keyboard shortcuts `Ã¢Å’ËœK`, dropdown chevrons) rendered in `#94A3B8`.

### Segmented Time-Range Controls
- Container: Pill-shaped or soft-rounded enclosure in `#F1F5F9` with `2px` interior padding.
- Items: `5m`, `15m`, `30m`, `1h`. Unselected items: transparent background, text `#64748B`. Active item: `#FFFFFF` background, text `#0F172A`, shadow `0 1px 2px rgba(15, 23, 42, 0.08)`, border-radius `6px`.