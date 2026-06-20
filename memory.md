# Admin API - Project Memory

## Active State
- **Project Type**: ASP.NET Core 10 Web API
- **Target Framework**: `net10.0`
- **Authentication**: JWT Bearer Tokens (multi-tenant claims) + API Key (3rd party integrations).
- **Core Database**: SQL Server (referenced via `database-structures`).

## Status Log

### Completed
- `[x]` Scaffolding the `admin-api` Web API.
- `[x]` Creating API standards (`agent.md`).
- `[x]` Adding project reference to `database-structures.csproj`.
- `[x]` Setting up JWT Bearer authentication.
- `[x]` Configuring `TenantAndLocaleMiddleware` for multi-tenant routing and locale mapping.
- `[x]` Developing multi-tenant storage and db connection services (`TenantProvider`, `TenantConnectionService`).
- `[x]` Implementing Controllers (`WarehouseController`, `FinanceController`, `PluginsController`, `AuthController`).

### In Progress
- `[ ]` Adding unit test suites for edge cases in VAT calculations.

## Planned API Route Structure

### Auth Endpoints (`/api/auth`)
- `POST /api/auth/login` -> Authenticates user and returns JWT token with TenantId, UserId, and Role.

### Plugin Management (`/api/plugins`)
- `GET /api/plugins` -> Lists all subscription plugins and their active states.
- `POST /api/plugins/toggle` -> Subscribes or unsubscribes a tenant to a paid module (PIM, WMS, SUP).

### Inventory & Warehousing (`/api/warehouse`)
- `GET /api/warehouse/stock` -> Basic stock listing.
- `POST /api/warehouse/stock` -> (Require `PIM` for custom specs/fields). Create new SKU.
- `GET /api/warehouse/bins` -> (Require `WMS`). View bin locations.
- `POST /api/warehouse/stocktake` -> (Require `WMS`). Perform stock takes.

### Finance & Procurement (`/api/finance`)
- `GET /api/finance/invoices` -> View invoice ledger entries.
- `POST /api/finance/invoices` -> Issue invoices (multicurrency, VAT calculations).
- `GET /api/finance/purchase-orders` -> (Require `SUP`). View PO catalog.
- `POST /api/finance/purchase-orders` -> (Require `SUP`). Create purchasing orders.

### 3rd Party Integrations (`/api/integration`)
- `GET /api/integration/catalog` -> API Key authorized endpoint for fetching website-enabled items.
