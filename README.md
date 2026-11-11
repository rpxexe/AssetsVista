# AssetsVista

AssetsVista is a full-stack IT Asset Management (ITAM) platform inspired by Snipe-IT and built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **TypeScript**, **MongoDB + Mongoose**, **Tailwind CSS**, and **shadcn/ui**.

---

## Key Features

### 1. Native Role-Based Authentication & Session Security
- Custom email/password authentication powered by Node `scrypt` password hashing ([`lib/password.ts`](lib/password.ts)) and HMAC-SHA256 signed HTTP-only session cookies (`av_session`, [`lib/session.ts`](lib/session.ts)), enforced at the request boundary via [`proxy.ts`](proxy.ts).
- Three built-in workspace roles configured in [`lib/rbac.ts`](lib/rbac.ts):
  - **Admin (`admin`)**: Full system access across user role management, settings, setup wizard, reports, bulk deletions, and all inventory.
  - **Assets User (`assets_user`)**: Inventory operations including asset/license/accessory management, checkouts/check-ins, audits, maintenances, and request fulfillment.
  - **Request User (`requester`)**: Self-service portal to browse requestable items, submit equipment requests, review EULA/custody acceptances, and inspect their assigned hardware.
- Workspace user provisioning & access management via [`/people?tab=roles`](components/people/UserRolesTable.tsx) and [`/api/users`](app/api/users/route.ts).

### 2. Multi-Tenant Workspace Isolation & Guided Setup (`/setup`)
- Brand-new Admin workspaces start cleanly with isolated collections scoped by `workspaceId` (`userId`) and automatically route to [`/setup`](app/setup/page.tsx) via `shouldRedirectToSetup`.
- Interactive **Bring-Your-Own-MongoDB** diagnostics test cluster connectivity/latency, inspect collection health, generate/save `.env.local` in self-hosted setups (`POST /api/setup/mongodb`), and optionally initialize default Status labels & Categories.

### 3. Complete IT Inventory & Lifecycle Tracking
- **Core Collections**: Assets (`/assets/listall`), Licenses (`/licenses`), Accessories (`/accessories`), Consumables (`/consumables`), Components (`/components`), and People (`/people`, `/people/[id]`).
- **Operational Workflows**:
  - **Check-Out / Check-In & Audits**: Assign hardware to people or locations, record custody acceptances ([`/acceptances`](app/(dashboard)/acceptances/page.tsx)), and track overdue audits/check-ins.
  - **Maintenances** ([`/maintenances`](app/(dashboard)/maintenances/page.tsx)): Schedule repairs, upgrades, calibrations, and support logs with cost & completion tracking.
  - **Requests Queue** ([`/requests`](app/(dashboard)/requests/page.tsx)): Self-service request submission and fulfillment workflow.
  - **Calendar** ([`/calendar`](app/(dashboard)/calendar/page.tsx)): Scheduled audits, warranty renewals, expiring licenses, and maintenance due dates.
- **Organization & Catalog Taxonomies**: Manage Status Labels, Asset Models, Categories, Manufacturers, Suppliers, Departments, Locations, and Companies under `/settings/*`.

### 4. Bulk Actions & Excel/CSV Exports Across All Tables
- Multi-row checkbox selection, Excel `Export Selected`, and RBAC-guarded bulk operations via [`POST /api/bulk`](app/api/bulk/route.ts), [`BulkActionBar`](components/BulkActionBar.tsx), [`TaxonomyBulkBar`](components/tables/TaxonomyBulkBar.tsx), and [`useBulkSelection`](hooks/useBulkSelection.ts).
- Includes bulk status updates, bulk check-in, bulk item requests, role assignment, account activate/suspend, maintenance complete/reopen, request fulfill/cancel, EULA accept/decline, and bulk deletion across inventory, operational, report, dashboard widget, and settings audit tables.

### 5. Dashboards, Search & Reports
- Role-tailored dashboards on `/admin` with Recharts asset status visualization, Recent Activity, Today & Up Next calendar widget, Low Inventory monitor, Needs Attention alerts, Locations summary, and Categories summary.
- Global search across inventory and people (`/api/search`), with optional Elasticsearch integration or built-in local indexing ([`lib/elasticSearch.ts`](lib/elasticSearch.ts)).
- Dedicated Reports suite with multi-sheet `.xlsx` & `.csv` export ([`lib/exportData.ts`](lib/exportData.ts)):
  - Activity Audit Log (`/reports/activity`)
  - Custom Assets Report (`/reports/custom`)
  - Asset Depreciation & Valuation (`/reports/depreciation`)
  - License Compliance & Utilization (`/reports/licenses`)
  - Maintenance & Audit Report (`/reports/maintenance`)

### 6. Snipe-IT Style Admin Settings Hub (`/settings`)
- Centralized administration in [`components/settings/AdminSettingsHub.tsx`](components/settings/AdminSettingsHub.tsx):
  - Branding (Site Name, Tagline, Logo), General & EULA defaults, Security & Password policies, Localization & Timezones, Email Alerts & Audit intervals, Search Integrations, Asset Tag auto-increment prefixes, Label dimensions, JSON Workspace Backups (`/api/settings/backup`), Workspace Login Attempts Audit (`/api/settings/login-attempts`), Purge & Cleanup (`/api/settings/purge`), and Live System Information.

### 7. Development-Only Seed & Reset Console (`/dev-tools`)
- Locked strictly behind `NODE_ENV === "development"` + active Admin role + optional `DEV_TOOLS_EMAIL` allowlist ([`lib/devTools.ts`](lib/devTools.ts)).
- Hidden from normal user navigation and returns `403 Forbidden` in production builds (`next build` / `next start`).
- Provides one-click **Load Dummy Data** (`POST /api/demo/seed`), **Reset Inventory Only**, **Reset All Workspace Data**, and **Reset & Reload Dummy Data** directly at `/dev-tools` or inside Admin Settings -> Purge & Cleanup in development mode.

---

## Tech Stack

- **Framework**: Next.js `16.1.6` (App Router, Turbopack), React `19.2.4`, TypeScript
- **Database**: MongoDB with Mongoose `^8.9.6`
- **Styling & UI**: Tailwind CSS `^3.4.1`, shadcn/ui (`@radix-ui/*`), `lucide-react`
- **Data Fetching & Tables**: `@tanstack/react-query`, `@tanstack/react-table`, `axios`
- **Charts, Forms & Exports**: `recharts`, `react-hook-form`, `zod`, `date-fns`, `xlsx`
- **Email Alerts (Optional)**: `resend`

---

## Getting Started

### Prerequisites
- Node.js `20+` and `npm`
- A running MongoDB instance (Local MongoDB or MongoDB Atlas M0/Cluster)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
# Required: MongoDB connection string
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/assetsvista?retryWrites=true&w=majority"

# Recommended (required in production): secret used to sign session cookies
AUTH_SECRET="replace-with-a-long-random-secret"

# Optional: restricts /dev-tools & /api/demo/seed in dev mode to specific Admin email(s)
DEV_TOOLS_EMAIL="your-admin@example.com"

# Optional: email alert notifications via Resend
RESEND_API_KEY=""

# Optional: external Elasticsearch cluster URL
ELASTICSEARCH_URL=""
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (automatically redirects `/` to `/login`).

1. Sign up on `/login` with a new account (the first user registered for a workspace becomes its `admin`).
2. Complete or skip the guided setup wizard at `/setup`.
3. In development mode (`npm run dev`), visit [`http://localhost:3000/dev-tools`](http://localhost:3000/dev-tools) (or **Settings -> Developer Seed & Reset**) to click **Load Dummy Data** anytime you want sample inventory, people, and activity logs.

### Available Scripts
```bash
npm run dev    # Start Next.js development server with Turbopack
npm run lint   # Run ESLint across the repository
npm run build  # Build production bundle
npm start      # Run production server (NODE_ENV=production; dev tools disabled)
```

---

## Repository Structure

```text
app/
├── (dashboard)/             # Authenticated workspace pages (Sidebar + Guard layout)
│   ├── admin/               # Role-aware dashboard (Admin / Assets Ops / Requester)
│   ├── assets/listall/      # Hardware asset inventory table & filters
│   ├── licenses/            # Software license tracking
│   ├── accessories/         # Peripheral accessories tracking
│   ├── consumables/         # Consumables stock tracking
│   ├── components/          # Internal hardware components
│   ├── people/              # Employee directory, user roles & profile tabs ([id])
│   ├── maintenances/        # Maintenance & repair schedules
│   ├── acceptances/         # EULA / custody acknowledgements
│   ├── requests/            # Equipment request queue
│   ├── calendar/            # Audit, expiry & maintenance calendar
│   ├── reports/             # activity, custom, depreciation, licenses, maintenance
│   ├── settings/            # Admin Settings Hub & taxonomy pages
│   └── dev-tools/           # Dev-only hidden seed & reset console
├── api/                     # Route Handlers (auth, bulk, core, dashboard, demo, reports, settings, setup, users)
├── login/[[...rest]]/       # Native login & registration portal
└── setup/                   # Guided MongoDB & workspace setup wizard
components/
├── dashboard/               # Dashboard KPI, chart & summary widgets
├── forms/                   # Hardware, license, people & taxonomy create/edit modals
├── people/                  # User roles table, provisioning modal, sign-off sheet
├── settings/                # AdminSettingsHub component
├── setup/                   # SetupWizard component
├── tables/                  # TanStack data tables + TaxonomyBulkBar
└── ui/                      # shadcn/ui primitives (Plus Jakarta Sans theme)
hooks/                       # usePermissions, useBulkSelection, use-toast, use-mobile
lib/                         # dbconnect, rbac, session, password, serverAuth, devTools, demoData, exportData
models/                      # Mongoose models for inventory, users, settings, logs & taxonomies
```
