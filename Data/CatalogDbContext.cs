using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.DatabaseStructures.Data;

public class CatalogDbContext : DbContext
{
    public CatalogDbContext(DbContextOptions<CatalogDbContext> options)
        : base(options)
    {
    }

    public DbSet<Tenant> Tenants { get; set; } = null!;
    public DbSet<Plugin> Plugins { get; set; } = null!;
    public DbSet<TenantPlugin> TenantPlugins { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Configure unique indexes
        builder.Entity<Tenant>().HasIndex(t => t.Subdomain).IsUnique();
        builder.Entity<Plugin>().HasIndex(p => p.Code).IsUnique();
        builder.Entity<Plugin>().Property(p => p.Id).ValueGeneratedNever();
        builder.Entity<TenantPlugin>().HasIndex(tp => new { tp.TenantId, tp.PluginId }).IsUnique();
    }
}
