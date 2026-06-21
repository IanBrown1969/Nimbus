using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.DatabaseStructures.Data;

public class NimbusDbContext : DbContext
{
    private readonly ITenantProvider _tenantProvider;
    private readonly ITenantConnectionService _connectionService;

    public NimbusDbContext(
        DbContextOptions<NimbusDbContext> options, 
        ITenantProvider tenantProvider,
        ITenantConnectionService connectionService)
        : base(options)
    {
        _tenantProvider = tenantProvider;
        _connectionService = connectionService;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var connectionString = _connectionService.GetConnectionString();
            optionsBuilder.UseSqlServer(connectionString);
        }
        base.OnConfiguring(optionsBuilder);
    }

    public DbSet<Tenant> Tenants { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Currency> Currencies { get; set; } = null!;
    public DbSet<Plugin> Plugins { get; set; } = null!;
    public DbSet<TenantPlugin> TenantPlugins { get; set; } = null!;
    public DbSet<StockItem> StockItems { get; set; } = null!;
    public DbSet<BinLocation> BinLocations { get; set; } = null!;
    public DbSet<StockInventory> StockInventories { get; set; } = null!;
    public DbSet<StockCheck> StockChecks { get; set; } = null!;
    public DbSet<StockCheckLine> StockCheckLines { get; set; } = null!;
    public DbSet<Supplier> Suppliers { get; set; } = null!;
    public DbSet<PurchaseOrder> PurchaseOrders { get; set; } = null!;
    public DbSet<PurchaseOrderLine> PurchaseOrderLines { get; set; } = null!;
    public DbSet<Delivery> Deliveries { get; set; } = null!;
    public DbSet<DeliveryLine> DeliveryLines { get; set; } = null!;
    public DbSet<Invoice> Invoices { get; set; } = null!;
    public DbSet<InvoiceLine> InvoiceLines { get; set; } = null!;
    public DbSet<LedgerEntry> LedgerEntries { get; set; } = null!;
    public DbSet<LedgerLine> LedgerLines { get; set; } = null!;
    
    // Extended Accounting DbSets
    public DbSet<Contact> Contacts { get; set; } = null!;
    public DbSet<Quote> Quotes { get; set; } = null!;
    public DbSet<QuoteLine> QuoteLines { get; set; } = null!;
    public DbSet<ExpenseClaim> ExpenseClaims { get; set; } = null!;
    public DbSet<ExpenseClaimLine> ExpenseClaimLines { get; set; } = null!;
    public DbSet<Employee> Employees { get; set; } = null!;
    public DbSet<PayRun> PayRuns { get; set; } = null!;
    public DbSet<PaySlip> PaySlips { get; set; } = null!;
    public DbSet<BankAccount> BankAccounts { get; set; } = null!;
    public DbSet<BankStatementLine> BankStatementLines { get; set; } = null!;
    public DbSet<VatReturn> VatReturns { get; set; } = null!;
    public DbSet<FixedAsset> FixedAssets { get; set; } = null!;
    public DbSet<AssetDepreciationLog> AssetDepreciationLogs { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;
    public DbSet<RolePermission> RolePermissions { get; set; } = null!;

    // Core ERP Expansion DbSets
    public DbSet<LedgerAccount> LedgerAccounts { get; set; } = null!;
    public DbSet<SalesOrder> SalesOrders { get; set; } = null!;
    public DbSet<SalesOrderLine> SalesOrderLines { get; set; } = null!;
    public DbSet<PickList> PickLists { get; set; } = null!;
    public DbSet<PickListLine> PickListLines { get; set; } = null!;
    public DbSet<Shipment> Shipments { get; set; } = null!;
    public DbSet<ShipmentLine> ShipmentLines { get; set; } = null!;
    public DbSet<StockAdjustment> StockAdjustments { get; set; } = null!;
    public DbSet<CreditNote> CreditNotes { get; set; } = null!;
    public DbSet<CreditNoteLine> CreditNoteLines { get; set; } = null!;
    public DbSet<SupplierBill> SupplierBills { get; set; } = null!;
    public DbSet<Warehouse> Warehouses { get; set; } = null!;
    public DbSet<Country> Countries { get; set; } = null!;
    public DbSet<TaxClass> TaxClasses { get; set; } = null!;
    public DbSet<TaxRate> TaxRates { get; set; } = null!;
    public DbSet<AccountingDimension> AccountingDimensions { get; set; } = null!;
    public DbSet<AccountingPeriod> AccountingPeriods { get; set; } = null!;
    public DbSet<Customer> Customers { get; set; } = null!;
    public DbSet<CustomerAddress> CustomerAddresses { get; set; } = null!;
    public DbSet<PaymentGateway> PaymentGateways { get; set; } = null!;
    public DbSet<GrantProgram> GrantPrograms { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Disable cascade delete globally to prevent SQL Server multiple cascade path cycles (Error 1785)
        foreach (var relationship in builder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            relationship.DeleteBehavior = DeleteBehavior.Restrict;
        }

        // Configure decimal precision for financial amounts
        foreach (var property in builder.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(4);
        }

        // Configure unique indexes
        builder.Entity<Tenant>().HasIndex(t => t.Subdomain).IsUnique();
        builder.Entity<Plugin>().HasIndex(p => p.Code).IsUnique();
        builder.Entity<Plugin>().Property(p => p.Id).ValueGeneratedNever();
        builder.Entity<TenantPlugin>().HasIndex(tp => new { tp.TenantId, tp.PluginId }).IsUnique();
        builder.Entity<User>().HasIndex(u => new { u.TenantId, u.Username }).IsUnique();
        builder.Entity<StockItem>().HasIndex(s => new { s.TenantId, s.SKU }).IsUnique();
        builder.Entity<Customer>().HasIndex(c => new { c.TenantId, c.CustomerRef }).IsUnique();
        builder.Entity<BinLocation>().HasIndex(b => new { b.TenantId, b.WarehouseId, b.Code }).IsUnique();
        builder.Entity<Supplier>().HasIndex(s => new { s.TenantId, s.Name }).IsUnique();
        builder.Entity<PurchaseOrder>().HasIndex(p => new { p.TenantId, p.OrderNumber }).IsUnique();
        builder.Entity<Delivery>().HasIndex(d => new { d.TenantId, d.DeliveryNumber }).IsUnique();
        builder.Entity<Invoice>().HasIndex(i => new { i.TenantId, i.InvoiceNumber }).IsUnique();
        
        // Extended unique indexes
        builder.Entity<Contact>().HasIndex(c => new { c.TenantId, c.Email }).IsUnique();
        builder.Entity<BankAccount>().HasIndex(b => new { b.TenantId, b.AccountNumber }).IsUnique();
        builder.Entity<FixedAsset>().HasIndex(f => new { f.TenantId, f.AssetCode }).IsUnique();
        builder.Entity<Quote>().HasIndex(q => new { q.TenantId, q.QuoteNumber }).IsUnique();
        builder.Entity<RolePermission>().HasIndex(rp => new { rp.TenantId, rp.Role, rp.Area }).IsUnique();

        // Core ERP Expansion unique indexes
        builder.Entity<LedgerAccount>().HasIndex(l => new { l.TenantId, l.AccountCode }).IsUnique();
        builder.Entity<SalesOrder>().HasIndex(s => new { s.TenantId, s.OrderNumber }).IsUnique();
        builder.Entity<PickList>().HasIndex(p => new { p.TenantId, p.PickListNumber }).IsUnique();
        builder.Entity<Shipment>().HasIndex(s => new { s.TenantId, s.ShipmentNumber }).IsUnique();
        builder.Entity<CreditNote>().HasIndex(c => new { c.TenantId, c.CreditNoteNumber }).IsUnique();
        builder.Entity<SupplierBill>().HasIndex(sb => new { sb.TenantId, sb.BillNumber }).IsUnique();
        builder.Entity<Warehouse>().HasIndex(w => new { w.TenantId, w.Code }).IsUnique();
        builder.Entity<Country>().HasIndex(c => new { c.TenantId, c.Code }).IsUnique();
        builder.Entity<TaxClass>().HasIndex(tc => new { tc.TenantId, tc.Code }).IsUnique();
        builder.Entity<TaxRate>().HasIndex(tr => new { tr.TenantId, tr.CountryId, tr.TaxClassId }).IsUnique();
        builder.Entity<AccountingDimension>().HasIndex(ad => new { ad.TenantId, ad.Code, ad.Type }).IsUnique();
        builder.Entity<AccountingPeriod>().HasIndex(ap => new { ap.TenantId, ap.Name }).IsUnique();
        builder.Entity<PaymentGateway>().HasIndex(pg => new { pg.TenantId, pg.Name }).IsUnique();
        builder.Entity<GrantProgram>().HasIndex(gp => new { gp.TenantId, gp.Name }).IsUnique();

        // Setup multi-tenant global query filters
        builder.Entity<User>().HasQueryFilter(u => u.TenantId == _tenantProvider.TenantId);
        builder.Entity<Currency>().HasQueryFilter(c => c.TenantId == _tenantProvider.TenantId);
        builder.Entity<TenantPlugin>().HasQueryFilter(tp => tp.TenantId == _tenantProvider.TenantId);
        builder.Entity<StockItem>().HasQueryFilter(s => s.TenantId == _tenantProvider.TenantId);
        builder.Entity<BinLocation>().HasQueryFilter(b => b.TenantId == _tenantProvider.TenantId);
        builder.Entity<StockInventory>().HasQueryFilter(si => si.TenantId == _tenantProvider.TenantId);
        builder.Entity<StockCheck>().HasQueryFilter(sc => sc.TenantId == _tenantProvider.TenantId);
        builder.Entity<Supplier>().HasQueryFilter(s => s.TenantId == _tenantProvider.TenantId);
        builder.Entity<PurchaseOrder>().HasQueryFilter(po => po.TenantId == _tenantProvider.TenantId);
        builder.Entity<Delivery>().HasQueryFilter(d => d.TenantId == _tenantProvider.TenantId);
        builder.Entity<Invoice>().HasQueryFilter(i => i.TenantId == _tenantProvider.TenantId);
        builder.Entity<LedgerEntry>().HasQueryFilter(l => l.TenantId == _tenantProvider.TenantId);
        
        // Extended Multi-Tenant filters
        builder.Entity<Contact>().HasQueryFilter(c => c.TenantId == _tenantProvider.TenantId);
        builder.Entity<Quote>().HasQueryFilter(q => q.TenantId == _tenantProvider.TenantId);
        builder.Entity<ExpenseClaim>().HasQueryFilter(ec => ec.TenantId == _tenantProvider.TenantId);
        builder.Entity<Employee>().HasQueryFilter(e => e.TenantId == _tenantProvider.TenantId);
        builder.Entity<PayRun>().HasQueryFilter(pr => pr.TenantId == _tenantProvider.TenantId);
        builder.Entity<BankAccount>().HasQueryFilter(ba => ba.TenantId == _tenantProvider.TenantId);
        builder.Entity<BankStatementLine>().HasQueryFilter(bs => bs.TenantId == _tenantProvider.TenantId);
        builder.Entity<VatReturn>().HasQueryFilter(vr => vr.TenantId == _tenantProvider.TenantId);
        builder.Entity<FixedAsset>().HasQueryFilter(fa => fa.TenantId == _tenantProvider.TenantId);
        builder.Entity<AuditLog>().HasQueryFilter(al => al.TenantId == _tenantProvider.TenantId);
        builder.Entity<RolePermission>().HasQueryFilter(rp => rp.TenantId == _tenantProvider.TenantId);

        // Core ERP Expansion Multi-Tenant filters
        builder.Entity<LedgerAccount>().HasQueryFilter(la => la.TenantId == _tenantProvider.TenantId);
        builder.Entity<SalesOrder>().HasQueryFilter(so => so.TenantId == _tenantProvider.TenantId);
        builder.Entity<PickList>().HasQueryFilter(pl => pl.TenantId == _tenantProvider.TenantId);
        builder.Entity<Shipment>().HasQueryFilter(sh => sh.TenantId == _tenantProvider.TenantId);
        builder.Entity<StockAdjustment>().HasQueryFilter(sa => sa.TenantId == _tenantProvider.TenantId);
        builder.Entity<CreditNote>().HasQueryFilter(cn => cn.TenantId == _tenantProvider.TenantId);
        builder.Entity<SupplierBill>().HasQueryFilter(sb => sb.TenantId == _tenantProvider.TenantId);
        builder.Entity<Warehouse>().HasQueryFilter(w => w.TenantId == _tenantProvider.TenantId);
        builder.Entity<Country>().HasQueryFilter(c => c.TenantId == _tenantProvider.TenantId);
        builder.Entity<TaxClass>().HasQueryFilter(tc => tc.TenantId == _tenantProvider.TenantId);
        builder.Entity<TaxRate>().HasQueryFilter(tr => tr.TenantId == _tenantProvider.TenantId);
        builder.Entity<AccountingDimension>().HasQueryFilter(ad => ad.TenantId == _tenantProvider.TenantId);
        builder.Entity<AccountingPeriod>().HasQueryFilter(ap => ap.TenantId == _tenantProvider.TenantId);
        builder.Entity<Customer>().HasQueryFilter(c => c.TenantId == _tenantProvider.TenantId);
        builder.Entity<CustomerAddress>().HasQueryFilter(ca => ca.TenantId == _tenantProvider.TenantId);
        builder.Entity<PaymentGateway>().HasQueryFilter(pg => pg.TenantId == _tenantProvider.TenantId);
        builder.Entity<GrantProgram>().HasQueryFilter(gp => gp.TenantId == _tenantProvider.TenantId);
    }

    // Automate TenantId injection on SaveChanges
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyTenantId();
        ValidatePeriods();
        var auditLogs = GenerateAuditLogs();
        var result = base.SaveChanges(acceptAllChangesOnSuccess);
        
        if (auditLogs.Any())
        {
            AuditLogs.AddRange(auditLogs);
            base.SaveChanges(acceptAllChangesOnSuccess);
        }
        return result;
    }

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ApplyTenantId();
        ValidatePeriods();
        var auditLogs = GenerateAuditLogs();
        var result = await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        
        if (auditLogs.Any())
        {
            AuditLogs.AddRange(auditLogs);
            await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        }
        return result;
    }

    private void ApplyTenantId()
    {
        var tenantId = _tenantProvider.TenantId;
        if (tenantId == null || tenantId == 0) return;

        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added);

        foreach (var entry in entries)
        {
            var tenantIdProp = entry.Entity.GetType().GetProperty("TenantId");
            if (tenantIdProp != null && tenantIdProp.CanWrite)
            {
                var val = tenantIdProp.GetValue(entry.Entity);
                if (val == null || (long)val == 0)
                {
                    tenantIdProp.SetValue(entry.Entity, tenantId);
                }
            }
        }
    }

    private void ValidatePeriods()
    {
        var tenantId = _tenantProvider.TenantId;
        if (tenantId == null || tenantId == 0) return;

        var modifiedEntries = ChangeTracker.Entries<LedgerEntry>()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)
            .ToList();

        if (!modifiedEntries.Any()) return;

        var lockedPeriods = AccountingPeriods
            .Where(ap => ap.IsLocked)
            .ToList();

        foreach (var entry in modifiedEntries)
        {
            var date = entry.State == EntityState.Deleted
                ? (DateTime)entry.OriginalValues["EntryDate"]
                : entry.Entity.EntryDate;

            var isLocked = lockedPeriods.Any(p => date.Date >= p.StartDate.Date && date.Date <= p.EndDate.Date);
            if (isLocked)
            {
                throw new InvalidOperationException($"Cannot add, modify or delete ledger entries in a locked accounting period ({date:yyyy-MM-dd}).");
            }
        }
    }

    private List<AuditLog> GenerateAuditLogs()
    {
        var auditEntries = new List<AuditLog>();
        var tenantId = _tenantProvider.TenantId;
        var username = _tenantProvider.Username ?? "System";

        var entries = ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog && 
                        (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted))
            .ToList();

        foreach (var entry in entries)
        {
            var entityType = entry.Entity.GetType().Name;
            if (entityType.Contains("Proxy"))
            {
                entityType = entry.Entity.GetType().BaseType?.Name ?? entityType;
            }
            
            var state = entry.State.ToString();
            var entityIdProp = entry.Properties.FirstOrDefault(p => p.Metadata.Name == "Id");
            var entityId = entityIdProp?.CurrentValue?.ToString() ?? "Unknown";

            var details = new System.Text.StringBuilder();
            if (entry.State == EntityState.Added)
            {
                details.Append("Created. Values: ");
                var props = entry.CurrentValues.Properties
                    .Where(p => p.Name != "Tenant" && p.Name != "TenantId" && p.Name != "Id")
                    .Select(p => $"{p.Name}: {entry.CurrentValues[p]}");
                details.Append(string.Join(", ", props));
            }
            else if (entry.State == EntityState.Modified)
            {
                details.Append("Modified. Changes: ");
                var changes = new List<string>();
                foreach (var prop in entry.OriginalValues.Properties)
                {
                    if (prop.Name == "Tenant" || prop.Name == "TenantId" || prop.Name == "Id") continue;
                    var originalValue = entry.OriginalValues[prop];
                    var currentValue = entry.CurrentValues[prop];
                    if (!Equals(originalValue, currentValue))
                    {
                        changes.Add($"{prop.Name}: '{originalValue}' => '{currentValue}'");
                    }
                }
                details.Append(string.Join(", ", changes));
            }
            else if (entry.State == EntityState.Deleted)
            {
                details.Append("Deleted.");
            }

            var entryTenantId = tenantId 
                ?? (entry.Entity.GetType().GetProperty("TenantId")?.GetValue(entry.Entity) as long?) 
                ?? 0;

            var auditLog = new AuditLog
            {
                TenantId = entryTenantId,
                Username = username,
                Action = state,
                EntityName = entityType,
                EntityId = entityId,
                ChangeDetails = details.ToString(),
                Timestamp = DateTime.UtcNow
            };
            auditEntries.Add(auditLog);
        }

        return auditEntries;
    }
}
