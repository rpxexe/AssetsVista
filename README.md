# AssetsVista

AssetsVista is a modern, full-stack IT Asset Management (ITAM) platform inspired by Snipe-IT and engineered with **Next.js 16 (App Router + Turbopack)**, **React 19**, **TypeScript**, **MongoDB + Mongoose**, **Tailwind CSS**, **shadcn/ui**, and **Skullet**.

It pairs familiar Snipe-IT operational workflows with architectural upgrades that solve real IT admin pain points—zero-write spreadsheet dry runs, 1-click atomic employee offboarding, native Excel imports, SHA-256 Personal Access Tokens without OAuth ceremony, and instant React SPA transitions.

---

## AssetsVista vs. Snipe-IT

AssetsVista adopts Snipe-IT’s battle-tested ITAM mental model (Assets, Licenses, Accessories, Consumables, Components, Maintenances, EULA Acceptances, Audits, Offboarding, Personal API Keys, and Bulk Import) while rebuilding the stack and eliminating major operational bottlenecks found in Snipe-IT.

### Architectural & Capabilities Comparison

| Dimension | AssetsVista | Snipe-IT |
|---|---|---|
| **Runtime & Frontend** | Next.js 16 (App Router + Turbopack), React 19, TypeScript end-to-end | PHP 8 + Laravel + Blade + Livewire + jQuery server views |
| **Database & Tenancy** | MongoDB + Mongoose with workspace isolation (`workspaceId`) & schema hooks | MySQL / MariaDB relational schema (single-tenant instance per DB) |
| **API Key Auth** | Zero-setup SHA-256 Personal Access Tokens (`av_<prefix>.<secret>`) with 30d–20y or never expiry, `lastUsedAt` tracking, and session-only key minting | Laravel Passport (`oauth_access_tokens`) requiring OAuth RSA keys (`passport:install`) and fixed global expiration |
| **Offboarding Workflow** | **1-Click Atomic Command Center** (`/people/offboarding`): checks in hardware, reclaims seats, suspends login, and revokes API keys together; tracks **both overdue and upcoming** departures + dollar exposure | Passive `Offboarding Soon` date filter only; drops overdue staff silently; requires 10+ manual steps across assets, licenses, login, and tokens |
| **Spreadsheet Importer** | **Native `.xlsx`, `.xls`, and `.csv`** with multi-sheet tab switching, **zero-write Pre-Flight Dry Run**, auto-taxonomy creation with schema defaults, import-time checkout, and **Export Failed Rows CSV** | CSV-only (`League\Csv`), commits live slice-by-slice with partial-commit failures on error, no pre-flight dry-run simulation |
| **Soft-Delete Security** | Moving a Person to `/people/deleted` **automatically disables login & revokes active API keys**; both Assets and People Trash support audit attribution (`deletedBy`) and bulk restore/purge | Soft-delete preserves deleted records without automatic OAuth token cleanup or unified operator attribution |
| **RBAC & Access Clarity** | 3 clean deterministic roles (`admin`, `assets_user`, `requester`) plus distinct **Login Enabled / Suspended / Directory-Only** badges & 1-click inline toggle | Bitflag permission JSON mixed with Group permissions; login disabled vs directory-only reasons buried inside edit forms |
| **Loading Experience** | Layout-measured **Skullet** (`skullet`) skeletons matching exact table widths and card geometry with zero full-page reloads | Full-page HTTP reloads and Blade/Livewire partial swaps |

### 5 Areas Where AssetsVista Improves on Snipe-IT

1. **Pre-Flight Dry-Run Importer Instead of Partial Live Commits (`/import`)**
   - In Snipe-IT, CSV uploads commit slice-by-slice straight into the database—meaning a bad row mid-file can leave your catalog half-imported.
   - AssetsVista reads **Excel (`.xlsx` / `.xls`) and CSV directly in-browser**, switches tabs on multi-sheet workbooks, auto-maps Snipe-IT aliases (`Asset Tag`, `Model Name`, `Assigned To`, etc.), and runs a **Zero-Write Pre-Flight Dry Run** first. You see exact `Create`, `Update`, `Skip`, `Error`, and `Auto-Create Taxonomy` counts *before* touching MongoDB, and can export only failed rows as CSV to fix offline.

2. **1-Click Atomic Employee Offboarding (`/people/offboarding`)**
   - Snipe-IT's `Offboarding Soon` stops at listing upcoming `end_date` entries—overdue departing staff vanish from the 30-day filter even if they still hold laptops, software seats, logins, or active tokens.
   - AssetsVista computes live hardware dollar exposure (`total_asset_value`), license count, active login state, and live Personal Access Token count per departing user (covering **both overdue and upcoming** end dates), then lets admins clear all four in **one atomic action** (`POST /api/core/people/[id]/offboard`) with a full Activity Log receipt.

3. **Zero-Ceremony Personal Access Tokens with Automatic Security Revocation (`/account/api`)**
   - Instead of requiring OAuth Passport setup or fixed 20-year-only tokens, users with `canManageApiKeys` mint SHA-256–hashed `av_...` tokens with selectable lifetimes (`30d`, `90d`, `1y`, `5y`, `20y`, `never`), live cURL test snippets, and `Last Used` auditing.
   - Tokens cannot self-mint or revoke other tokens (`requireSessionPermission`), and **any login suspension, role downgrade, soft-delete, or offboarding immediately invalidates and revokes active tokens**.

4. **Separated Trash & Auto-Hardened User Lifecycle (`/assets/deleted`, `/people/deleted`)**
   - Both Hardware Assets and People use Mongoose `pre` soft-delete scopes (`deletedAt`, `deletedBy`) rather than brittle hard deletes—giving admins a searchable Trash view with single & bulk **Restore** and **Permanent Purge** while keeping active asset/people counts accurate everywhere.

5. **Interactive Status Analytics & Sub-Second Operational Views**
   - Real-time sidebar counters (`/api/core/asset/sidebar-counts`, `/api/core/people/sidebar-counts`), semantic status chart filtering (`RadialGraph`), comprehensive Individual Asset Dossiers (`/assets/view/[id]`), **Quick Scan Checkin**, **Bulk Checkout**, and **Scanner Bulk Audit** work smoothly as a single typed TypeScript Next.js codebase without context-switching reloads.

---

## Future Updates (Roadmap)

- **Predefined Kits**: Bundle standardized onboarding sets (laptop, monitor, dock, keyboard, and software licenses) into reusable kits for 1-click new-hire checkout.
- **Dynamic Custom Fields & Fieldsets**: Define per-category/model custom attributes (e.g., MAC Address, RAM, OS Build, IMEI) rendered across Asset forms, Dossiers, and the Smart Importer.
- **Enterprise Identity & Directory Sync (SSO / SAML / SCIM)**: Built-in Okta, Microsoft Entra ID, and Google Workspace SCIM sync to auto-provision employees, keep departments updated, and trigger automatic Offboarding clearances.
- **MDM & Fleet Sync Connectors**: Scheduled sync bridges for Apple Business Manager, Jamf, Kandji, and Microsoft Intune via Workspace Personal Access Tokens (`/account/api`).
- **Event Webhooks & Automated Slack/Teams Alerts**: Real-time outbound notifications on low inventory, overdue audits/checkins, expiring licenses, and completed offboarding clearances.
- **Custom Asset Tag & QR Label Designer**: Visual drag-and-drop thermal/Zebra label printing layout with customizable QR payloads and barcode templates.

---

## Key Features

### 1. Native RBAC Authentication, Sessions & Personal API Keys
- **Session Auth**: Email/password sign-in powered by Node `scrypt` hashing ([`lib/password.ts`](lib/password.ts)) and HMAC-SHA256 signed HTTP-only cookies (`av_session`, [`lib/session.ts`](lib/session.ts)), enforced at the request boundary by [`proxy.ts`](proxy.ts).
- **Personal API Keys (`/account/api`)**:
  - Accessible from the user dropdown (`Manage API Keys` in [`components/nav-user.tsx`](components/nav-user.tsx)), governed by `canManageApiKeys`.
  - Tokens (`av_<prefix>.<secret>`) are shown once on creation ([`lib/apiKeys.ts`](lib/apiKeys.ts), [`models/ApiKey.model.ts`](models/ApiKey.model.ts)), hashed with SHA-256, tracked via `lastUsedAt`, and accepted across `/api/*` via `Authorization: Bearer <token>` in [`lib/serverAuth.ts`](lib/serverAuth.ts).
- **Three Built-In Workspace Roles ([`lib/rbac.ts`](lib/rbac.ts))**:
  - **Admin (`admin`)**: Full control across user roles, API keys, settings, setup wizard, reports, soft-delete purge, offboarding, and all inventory.
  - **Assets User (`assets_user`)**: Inventory operations across assets/licenses/accessories, checkouts/check-ins, audits, maintenances, request fulfillment, imports, and API keys.
  - **Request User (`requester`)**: Self-service portal for requestable hardware, submitting item requests, custody EULA acceptances, and inspecting assigned items.

### 2. Complete IT Inventory, Asset Dossiers & Scanner Workflows
- **Assets Navigation & Live Counters**: `List All`, `CheckedOut`, `Deployed`, `Ready to Deploy`, `Pending`, `Un-deployed`, `BYOD`, `Archived`, `Requestable`, `Due for Audit`, `Due for Checkin`, and `Past EOL` ([`/api/core/asset/sidebar-counts`](app/api/core/asset/sidebar-counts/route.ts)).
- **Individual Asset Dossier (`/assets/view/[id]`)**: Two-column hardware dossier showing financial cost rollup (asset + maintenances), EOL/depreciation progress bar, status/custody timeline, QR code badge, and inline checkout/checkin/audit controls ([`components/assets/AssetDetailView.tsx`](components/assets/AssetDetailView.tsx)).
- **High-Speed Asset Operations**:
  - **Quick Scan Checkin** (`/assets/quick-scan-checkin`)
  - **Bulk Checkout** (`/assets/bulk-checkout`)
  - **Scanner Bulk Audit** (`/assets/scanner-bulk-audit`)
  - **Deleted Assets Trash** (`/assets/deleted`) with restore & permanent purge
- **Full Asset Ecosystem**: Licenses (`/licenses`), Accessories (`/accessories`), Consumables (`/consumables`), Components (`/components`), Maintenances (`/maintenances`), Acceptances (`/acceptances`), Requests (`/requests`), and Calendar (`/calendar`).

### 3. People Directory, Role Filters & Automated Offboarding
- **7-View People Navigation** (`/people` & [`/api/core/people/sidebar-counts`](app/api/core/people/sidebar-counts/route.ts)): `List All`, `Superusers`, `Admin Users`, `Deleted Users` (`/people/deleted`), `Login Enabled`, `Login Disabled`, and `Offboarding Soon` (`/people/offboarding`).
- **Automated Offboarding Command Center (`/people/offboarding`)**: Surfaces overdue & upcoming departing employees with hardware dollar exposure, active logins, and active API keys, plus 1-click [`OffboardPersonDialog`](components/people/OffboardPersonDialog.tsx) clearance ([`POST /api/core/people/[id]/offboard`](app/api/core/people/%5Bid%5D/offboard/route.ts)).
- **Profile Dossier (`/people/[id]`)**: Assigned assets, dollar valuation, software seats, sign-off sheet modal, activity logs, and direct offboarding clearance.

### 4. Smart CSV & Excel Importer (`/import`)
- Supports **Assets, People, Licenses, Accessories, Consumables, Components, Locations, Suppliers, and Categories** ([`lib/importSchemas.ts`](lib/importSchemas.ts)).
- Features multi-sheet Excel (`.xlsx` / `.xls`) + CSV parsing, 1-click starter templates (CSV & `.xlsx`), Snipe-IT column alias auto-mapping, upsert with blank preservation, auto-creation of missing taxonomy entities ([`app/api/import/route.ts`](app/api/import/route.ts)), **Zero-Write Pre-Flight Dry Run**, **Export Failed Rows CSV**, and persistent import audit history ([`models/ImportJob.model.ts`](models/ImportJob.model.ts)).

### 5. Dashboards, Search, Bulk Operations & Reports
- Role-tailored dashboards (`/admin`) featuring color-coded interactive `RadialGraph` status filtering, Recent Activity, Calendar Up Next, Low Inventory, Needs Attention, Locations, and Categories summaries—all wrapped in **Skullet** (`skullet`) skeletons.
- Multi-row selection, Excel/CSV exports ([`lib/exportData.ts`](lib/exportData.ts)), and guarded bulk operations across inventory & settings tables ([`POST /api/bulk`](app/api/bulk/route.ts)).
- Reports suite: Activity Audit Log (`/reports/activity`), Custom Assets Report (`/reports/custom`), Asset Depreciation (`/reports/depreciation`), License Compliance (`/reports/licenses`), and Maintenance & Audit (`/reports/maintenance`).
- Global command search (`/api/search`) with optional Elasticsearch integration or built-in workspace search ([`lib/elasticSearch.ts`](lib/elasticSearch.ts)).

### 6. Admin Settings Hub (`/settings`), Setup Wizard (`/setup`) & Dev Tools (`/dev-tools`)
- **Settings Hub ([`components/settings/AdminSettingsHub.tsx`](components/settings/AdminSettingsHub.tsx))**: Branding, EULA defaults, Security & Login Attempts audit (`/api/settings/login-attempts`), Localization, Alerts, Asset Tag prefixes, Label sizes, JSON Workspace Backup (`/api/settings/backup`), Purge (`/api/settings/purge`), and single account-card access button in [`NavUser`](components/nav-user.tsx).
- **Guided Setup (`/setup`)**: Automated MongoDB connectivity & `.env.local` helper for self-hosted workspaces (`shouldRedirectToSetup`).
- **Dev-Only Seed & Reset (`/dev-tools`)**: Restricted to `NODE_ENV === "development"` + active Admin (+ optional `DEV_TOOLS_EMAIL`, [`lib/devTools.ts`](lib/devTools.ts)); disabled with `403 Forbidden` in production.

---

## Tech Stack

- **Framework**: Next.js `16.1.6` (App Router, Turbopack), React `19.2.4`, TypeScript `^5`
- **Database**: MongoDB with Mongoose `^8.9.6`
- **Styling & UI**: Tailwind CSS `^3.4.1`, shadcn/ui (`@radix-ui/*`), `lucide-react`, `skullet` (`^0.0.3`)
- **State & Tables**: `@tanstack/react-query`, `@tanstack/react-table`, `axios`
- **Charts, Forms & Spreadsheets**: `recharts`, `react-hook-form`, `zod`, `date-fns`, `xlsx` (`^0.18.5`), `qrcode`
- **Email Alerts (Optional)**: `resend`, `@react-email/components`

---

## Getting Started

### Prerequisites
- Node.js `20+` and `npm`
- A running MongoDB instance (Local MongoDB or MongoDB Atlas Cluster)

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

Open [http://localhost:3000](http://localhost:3000) (redirects `/` to `/login`).

1. Register on `/login` (the first user for a workspace becomes its `admin`).
2. Complete or skip the setup wizard at `/setup`.
3. In development mode (`npm run dev`), visit [`http://localhost:3000/dev-tools`](http://localhost:3000/dev-tools) (or run `POST /api/demo/seed` / `scripts/seed-demo.ts`) to populate realistic demo inventory, people, and activity logs—or upload spreadsheets directly via **Import** (`/import`).

### Available Scripts
```bash
npm run dev          # Start Next.js development server with Turbopack
npx tsc --noEmit     # Typecheck the entire TypeScript codebase
npm run lint         # Run ESLint across the repository
npm run build        # Build optimized production bundle
npm start            # Start production server (dev tools disabled)
```

---

## Repository Structure

```text
app/
├── (dashboard)/             # Authenticated workspace shell (Sidebar + Sticky Footer + RBAC Guard)
│   ├── account/api/         # Personal Access Token manager (/account/api)
│   ├── admin/               # Role-aware dashboard (Admin / Assets User / Requester)
│   ├── assets/              # listall, view/[id], deleted, quick-scan-checkin, bulk-checkout, scanner-bulk-audit
│   ├── licenses/            # Software license tracking
│   ├── accessories/         # Peripheral accessories tracking
│   ├── consumables/         # Consumables stock tracking
│   ├── components/          # Internal hardware components
│   ├── people/              # Employee directory, roles tab, [id] dossier, deleted trash, offboarding center
│   ├── import/              # Smart 4-step CSV/Excel Dry-Run Importer & history
│   ├── maintenances/        # Maintenance & repair schedules
│   ├── acceptances/         # EULA / custody acknowledgements
│   ├── requests/            # Equipment request queue
│   ├── calendar/            # Audit, expiry & maintenance calendar
│   ├── reports/             # activity, custom, depreciation, licenses, maintenance
│   ├── settings/            # Admin Settings Hub & taxonomy pages
│   └── dev-tools/           # Dev-only hidden seed & reset console
├── api/                     # Route Handlers (account/api-keys, auth, bulk, core, import, reports, settings, setup, users)
├── login/[[...rest]]/       # Native login & registration portal
└── setup/                   # Guided MongoDB & workspace setup wizard
components/
├── assets/                  # AssetDetailView & asset-specific panels
├── dashboard/               # Dashboard KPI, chart & summary widgets
├── forms/                   # Hardware, license, people & taxonomy create/edit modals
├── people/                  # UserRolesTable, OffboardPersonDialog, ProvisionUserModal, SignOffSheetModal
├── settings/                # AdminSettingsHub component
├── setup/                   # SetupWizard component
├── skeletons/               # AppSkeletons (Skullet wrappers & Table/Dossier skeletons)
├── tables/                  # TanStack data tables + TaxonomyBulkBar
└── ui/                      # shadcn/ui primitives (Plus Jakarta Sans theme)
Data/                        # Sidebar & navigation metadata (navData.ts)
hooks/                       # usePermissions, useBulkSelection, useCachedOptions, use-toast, use-mobile
lib/                         # apiKeys, apiKeyFormat, importSchemas, peopleDirectory, rbac, session, serverAuth, exportData
models/                      # Mongoose models (Asset, People, ApiKey, ImportJob, License, Settings, User, etc.)
proxy.ts                     # Request boundary guard (av_session cookies + Bearer API key passthrough on /api/*)
```
