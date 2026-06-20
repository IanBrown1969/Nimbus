# Admin UI - Project Memory

## Active State
- **Framework**: Next.js 16 (App Router)
- **State Management**: React Context (Tenant context, Auth/User role state)
- **Styling**: Tailwind CSS v4
- **Mock / Real API**: Resolving connections to `http://localhost:5000/api` or mock fallback data.

## Status Log

### Completed
- `[x]` Initialized Next.js 16 project structure.
- `[x]` Created local standards guideline (`agent.md`).
- `[x]` Added `lucide-react` and `axios` dependencies.
- `[x]` Configured global Layout (`src/app/layout.tsx`) and Theme.
- `[x]` Created Tenant Login Screen (`src/app/login/page.tsx`).
- `[x]` Implemented Navigation and Sidebar components in Dashboard Layout.
- `[x]` Built Settings Marketplace Add-ons (`src/app/dashboard/settings/plugins/page.tsx`).
- `[x]` Built Warehousing dashboard with WMS/PIM extensions (`src/app/dashboard/warehouse/page.tsx`).
- `[x]` Built Finance accounting dashboard with supplier integration (`src/app/dashboard/finance/page.tsx`).

### In Progress
- `[ ]` Improving interactive reporting charts and data visualisations.

## Implemented Pages & Layouts
- **Login screen**: Tenant/company login form mapping to correct base API configuration.
- **Dashboard Layout**: Dynamic Sidebar showing menu routes based on active module context (WMS/PIM/SUP/VAT).
- **Dashboard Page**: Quick overview statistics (billing, stock catalog count, compliance audits).
- **Settings Marketplace**: Activation toggle for add-on modules mapping subscription cost.
- **Warehouse Operations**: Inventory stock levels, bin location listings, audit sheet generation, shipments, and pick list processing.
- **Finance Ledger**: Invoice posting, payments processing, general ledger double-entry lines viewer, and supplier directory.
