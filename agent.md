# Admin API - Agent Guidelines

These guidelines define the coding standards for the Nimbus ERP dotnet 10 Web API.

## 1. Project Architecture

The API follows a Clean/SOLID Service-Controller pattern:
- **Controllers**: Responsible strictly for HTTP concerns (routing, parsing inputs, returning status codes, OpenAPI/Swagger attributes). They must delegate all business logic to Services.
- **Services**: Contain business logic. Injected via interfaces. Each service must have one core responsibility area (e.g. `WarehouseService` handles inventory, `FinanceService` handles invoicing and ledgers).
- **Middleware**: Handles cross-cutting pipeline logic like tenant resolution and thread locale configuration.

```
Controllers/        -> Thin REST entry points.
Middleware/         -> TenantAndLocaleMiddleware.cs.
Services/           -> Business logic interfaces and implementations.
Models/             -> Request and Response DTOs.
Attributes/         -> RequirePluginAttribute.cs action filter.
Program.cs          -> Dependency injection registrations and pipeline setup.
```

## 2. Pipeline Execution Order

All requests must pass through the middlewares in this exact order:
1. `TenantAndLocaleMiddleware` (Resolves tenant ID and active UI culture).
2. `UseAuthentication` (Validates JWT tokens).
3. `UseAuthorization` (Checks RBAC policies).
4. `ActionFilters` (Validates plugin activations via `RequirePluginAttribute`).
5. `Controller Action` (Executes endpoint).

## 3. SOLID & Dependency Injection (DI)

- **Single Responsibility**: Do not mix accounting ledger entries and inventory calculations. Keep services focused.
- **Dependency Inversion**: Always register services via interfaces in `Program.cs`. Example:
  ```csharp
  builder.Services.AddScoped<IWarehouseService, WarehouseService>();
  ```
- **Inject ITenantProvider**: Services querying database tables must receive `ITenantProvider` to ensure the DB context resolves the correct tenant filters.

## 4. API Response Standards

- Return `200 OK` for successful queries.
- Return `201 Created` for successful resource creations.
- Return `204 NoContent` for successful updates/deletions.
- Return `400 BadRequest` for invalid payloads or DTO validation failures.
- Return `401 Unauthorized` for missing or invalid tokens.
- Return `403 Forbidden` for RBAC permission failures.
- Return `402 PaymentRequired` (or `403`) when a tenant tries to access a feature of a plugin they have not subscribed to.
- Return `404 NotFound` when resources do not exist.
