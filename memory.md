# Database Structures - Project Memory

## Active State
- **Project Type**: C# .NET 10 Class Library
- **Target Framework**: `net10.0`
- **DB Provider**: SQL Server (EF Core)
- **Active Connections**: Standard SQL LocalDB or Dev SQL Server (`DefaultConnection`).

## Status Log

### Completed
- `[x]` Scaffolding the `database-structures` class library.
- `[x]` Creating database standards (`agent.md`).

### In Progress
- `[ ]` Modeling database entities.
- `[ ]` Configuring DbContext query filters.
- `[ ]` Drafting `DbInitializer` with HMRC code accounts.

## Current Schema Models

- **Identity**:
  - `Tenant`: Isolated customer subscriptions.
  - `User`: Account details, passwords, and RBAC roles.
  - `Currency`: Multi-currency exchange rate tables.
  - `Plugin` & `TenantPlugin`: Active modules subscriptions tracker.
- **Warehouse**:
  - `StockItem`: Inventory definitions (Stocking/Selling conversion ratios).
  - `BinLocation`: Coordinate codes (e.g. Rack-Row-Shelf).
  - `StockInventory`: Stock amounts matched to bins.
  - `StockCheck` & `StockCheckLine`: Physical audits logic.
- **Finance**:
  - `Supplier`: Vendor details.
  - `PurchaseOrder` & `PurchaseOrderLine`: Procurement documents.
  - `Delivery` & `DeliveryLine`: Goods received records.
  - `Invoice` & `InvoiceLine`: Sales tax invoices under UK HMRC rules.
  - `LedgerEntry` & `LedgerLine`: Double-entry accounting system.
