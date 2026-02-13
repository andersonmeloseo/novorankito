
# Rankito — SEO & Analytics SaaS Prototype

## Vision
A beautifully designed, Linear-inspired SaaS shell showcasing all modules of Rankito with mock data. Light-first design with dark mode toggle. Focus on navigation, layout consistency, and design system excellence.

---

## Phase 1: Foundation & Design System

### Layout Shell
- **Sidebar navigation** with collapsible sections, project selector at top, and account menu at bottom
- **Top bar** with date range picker, global search, integration status chips, and export button
- **Content area** with consistent page structure: title, subtitle, KPI row, main chart, data tables
- **Detail Drawer** pattern (slide-in panel from right) for URL and event drill-downs

### Design System
- Light-first theme inspired by Linear (clean, minimal, subtle grays and accent colors)
- Dark mode toggle
- KPI cards, severity badges (critical/high/medium/low), insight cards with impact + CTA
- Advanced data tables with filters, sortable columns, pagination
- Skeleton loading states and empty states for all screens
- Charts: line, bar, heatmap (day × hour)

---

## Phase 2: Authentication & Project Structure

### Auth Pages
- Login and signup pages (clean, branded)
- No real backend — just UI for now

### Projects
- Project list page (cards with domain, status, integration indicators)
- Create project flow
- Project selector in sidebar

---

## Phase 3: Onboarding Wizard
- 7-step wizard with progress bar
- Steps: Create Project → Sitemap → GSC → GA4 → Tracking → Ads → AI Agent Config
- Each step with clear UI, validation indicators, and mock confirmations

---

## Phase 4: Core Modules (all with mock data)

### Overview Dashboard
- KPIs (clicks, impressions, sessions, conversions), main trend chart, top pages, recent insights

### URLs (Sitemap & Inventory)
- Table: URL, type, group/tag, status, priority
- Bulk actions (tag, queue indexing, export)
- URL detail drawer with GSC + GA4 + tracking data

### SEO (GSC Dashboard)
- KPIs: clicks, impressions, CTR, avg. position
- Temporal chart with period comparison
- Tables: pages, queries, countries, devices
- Auto-detected insights (drops, opportunities, low CTR with high impressions)
- Annotations on chart

### Analytics (GA4 Dashboard)
- KPIs: users, sessions, engagement, events, conversions
- Channels, source/medium, campaigns
- Pages, events, device/geo breakdowns
- Comparison and segmentation

### Indexing (GSC API)
- Queue table: URL, request type, status, failures, retries
- Automation rules panel
- Success rate and history report

### AI Agent (Insights & Actions)
- Chat interface + insights panel side by side
- Insight cards with severity, evidence, estimated impact, recommended action, "Create Task" button
- Routine configuration (daily/weekly)
- Executive vs. Technical mode toggle
- Task Center: task list with status, assignee, due date

### Tracking (Clarity-like)
- Live events view
- Heatmap placeholders (click and scroll)
- Sessions list with event trail
- Event tables with filters
- Day × Hour volume heatmap

### Conversions
- Conversion list with event details
- Simple funnel visualization (page → CTA → form → thank you)
- Breakdown by date, page, device, source
- Period comparisons

### Ads (Google Ads & Meta)
- Campaign/adset/ad performance table
- KPIs: cost, clicks, conversions, CPA, ROAS
- "Best time to invest" chart

---

## Phase 5: Reports & Settings

### Reports
- Report templates (Weekly SEO, Monthly Growth, Conversion, Ads+CRO)
- Export options (CSV, XLSX, PDF indicators)
- Schedule configuration UI (email, webhook)

### Project Settings
- Domain, sitemaps, URL tags/groups
- Integration cards (connect/disconnect with health check status)
- Tracking config (key, script snippet, custom events)
- Goals & thresholds for AI agent
- User management per project

### Account Settings
- Projects list
- Users & permissions (roles: Owner, Admin, Analyst, Read-only)
- Integrations overview
- Billing & plans page
- Preferences
- Audit logs

---

## Phase 6: Admin Backoffice

### Admin Dashboard
- Global stats: total users, projects, events volume
- User management: list, status, plan, usage
- Project management: by user, integrations, event volume
- Billing: subscriptions, invoices
- Rate limits and quotas
- Observability: API logs, OAuth failures, queue status
- Security: RBAC overview, login logs, data retention policies

---

## Summary
~20+ screens, all with mock data, consistent design patterns, and fluid navigation. This prototype will serve as the complete product vision that can later be connected to real APIs and a Supabase backend.
