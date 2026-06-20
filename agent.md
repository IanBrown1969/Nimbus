# Database Structures - Agent Guidelines

These guidelines define the development standards for all Entity Framework Core models and configurations in this project.

## 1. Directory Structure

```
Data/               -> DbContext and seeding configurations.
Models/             -> Pure C# entity classes.
database-structures.csproj
agent.md            -> Local standards (this file).
memory.md           -> Local progress log.
```

## 2. Coding Standards

- **Namespaces**: Use `Nimbus.DatabaseStructures.Models` for entities and `Nimbus.DatabaseStructures.Data` for data context files.
- **Entity Properties**:
  - Always use PascalCase for properties.
  - Mark properties that cannot be null as required or initialize them (e.g. `public string Name { get; set; } = null!;`).
  - Use `decimal` for financial amounts (currency, VAT, prices). Never use `double` or `float` for money.
- **Keys and IDs**:
  - Primary keys must be named `Id` and be of type `Guid` (UUID) or `int` (where appropriate for seeding lookups like Currencies and Plugins).
  - Multi-tenant entities **must** implement a `TenantId` property of type `Guid`.

## 3. EF Core Conventions

- **Multi-Tenancy**:
  - All tenant-isolated entities must filter by `TenantId` globally.
  - Configure the global query filter in `NimbusDbContext.OnModelCreating`:
    ```csharp
    builder.Entity<MyEntity>().HasQueryFilter(e => e.TenantId == _tenantProvider.TenantId);
    ```
- **Foreign Keys & Navigation**:
  - Explicitly define foreign key properties (e.g., `public Guid TenantId { get; set; }` and `public Tenant Tenant { get; set; } = null!;`).
  - Use cascade deletes carefully; ensure deleting a Tenant cascade-deletes all its children.

## 4. Seeding Data
- All base config seeding (HMRC general ledger codes, standard currencies GBP/USD/EUR, default modules PIM/WMS/SUP) must be done in `DbInitializer.cs`.
- Ensure seed data works across fresh installations.
