using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Nimbus.DatabaseStructures.Models;

namespace Nimbus.DatabaseStructures.Data;

public static class DbInitializer
{
    public static void InitializeCatalog(CatalogDbContext context)
    {
        // Ensure catalog database exists
        context.Database.EnsureCreated();

        // Migrate TenantPlugins ConfigurationSettingsJson column if needed
        if (context.Database.ProviderName == "Microsoft.EntityFrameworkCore.SqlServer")
        {
            context.Database.ExecuteSqlRaw(@"
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[TenantPlugins]') 
                    AND name = N'ConfigurationSettingsJson'
                )
                BEGIN
                    ALTER TABLE [dbo].[TenantPlugins] ADD [ConfigurationSettingsJson] NVARCHAR(MAX) NULL;
                END
            ");
        }

        // 1. Seed Plugins (Global)
        if (!context.Plugins.Any())
        {
            context.Plugins.AddRange(
                new Plugin
                {
                    Id = 1,
                    Code = "PIM",
                    Name = "Product Information Management",
                    Description = "Unlocks advanced catalog features including specification parameters, rich multilingual descriptions, and media galleries.",
                    MonthlyPrice = 49.99m,
                    IsActive = true
                },
                new Plugin
                {
                    Id = 2,
                    Code = "WMS",
                    Name = "Warehouse Management System",
                    Description = "Unlocks physical aisle-shelf-bin tracking, stock movement history logs, and auditing/stock check sessions.",
                    MonthlyPrice = 79.99m,
                    IsActive = true
                },
                new Plugin
                {
                    Id = 3,
                    Code = "SUP",
                    Name = "Supplier & Purchasing Management",
                    Description = "Unlocks supplier catalog directories, Purchase Orders (PO) workflow lifecycle, and Goods Received Delivery Notes matching.",
                    MonthlyPrice = 59.99m,
                    IsActive = true
                },
                new Plugin
                {
                    Id = 4,
                    Code = "CDN",
                    Name = "Azure Cloud Storage & CDN",
                    Description = "Enables highly scalable file uploads to Azure Blob Storage, serving all images and invoice attachments via Azure CDN for production speed.",
                    MonthlyPrice = 19.99m,
                    IsActive = true
                },
                new Plugin
                {
                    Id = 5,
                    Code = "AUD",
                    Name = "Audit Trail & Traceability",
                    Description = "Provides system-wide audit logging and change tracking of all transactions and master records for compliance and traceability.",
                    MonthlyPrice = 29.99m,
                    IsActive = true
                },
                new Plugin
                {
                    Id = 6,
                    Code = "VAT",
                    Name = "Complex VAT & Tax Class Manager",
                    Description = "Allows configuring custom tax classes, countries, and a matrix of tax rate mappings for multi-national sales orders.",
                    MonthlyPrice = 39.99m,
                    IsActive = true
                }
            );
            context.SaveChanges();
        }

        // 2. Seed Tenants (Global)
        if (!context.Tenants.Any())
        {
            var tenantAcme = new Tenant
            {
                Id = 1,
                Name = "Acme Distribution Ltd",
                Subdomain = "acme",
                DefaultLanguageCode = "en-GB",
                DefaultCurrencyCode = "GBP",
                SubscriptionPlan = "Premium",
                PlanPrice = 99.99m,
                SubscriptionStatus = "Active"
            };

            var tenantGlobal = new Tenant
            {
                Id = 2,
                Name = "Global Importers Corp",
                Subdomain = "global",
                DefaultLanguageCode = "en-GB",
                DefaultCurrencyCode = "USD",
                SubscriptionPlan = "Standard",
                PlanPrice = 59.99m,
                SubscriptionStatus = "Active"
            };

            context.Tenants.AddRange(tenantAcme, tenantGlobal);

            bool isSqlServer = context.Database.ProviderName == "Microsoft.EntityFrameworkCore.SqlServer";
            if (isSqlServer)
            {
                using (var transaction = context.Database.BeginTransaction())
                {
                    context.Database.ExecuteSqlRaw("SET IDENTITY_INSERT Tenants ON");
                    context.SaveChanges();
                    context.Database.ExecuteSqlRaw("SET IDENTITY_INSERT Tenants OFF");
                    transaction.Commit();
                }
            }
            else
            {
                context.SaveChanges();
            }

            // Seed Subscribed Tenant Plugins
            context.TenantPlugins.AddRange(
                // Acme subscribes to PIM, WMS, CDN, AUD, and VAT
                new TenantPlugin { TenantId = tenantAcme.Id, PluginId = 1, IsActive = true, EnabledDate = DateTime.UtcNow },
                new TenantPlugin { TenantId = tenantAcme.Id, PluginId = 2, IsActive = true, EnabledDate = DateTime.UtcNow },
                new TenantPlugin { TenantId = tenantAcme.Id, PluginId = 4, IsActive = true, EnabledDate = DateTime.UtcNow },
                new TenantPlugin { TenantId = tenantAcme.Id, PluginId = 5, IsActive = true, EnabledDate = DateTime.UtcNow },
                new TenantPlugin { TenantId = tenantAcme.Id, PluginId = 6, IsActive = true, EnabledDate = DateTime.UtcNow },
                
                // Global Importers subscribes to SUP
                new TenantPlugin { TenantId = tenantGlobal.Id, PluginId = 3, IsActive = true, EnabledDate = DateTime.UtcNow }
            );
            context.SaveChanges();
        }
    }

    public static void InitializeTenant(
        NimbusDbContext context, 
        Tenant tenant, 
        List<Plugin> allPlugins, 
        List<TenantPlugin> tenantPlugins)
    {
        // Ensure tenant database exists
        context.Database.EnsureCreated();

        // Check and migrate table schema for AllowBackorder if needed
        if (context.Database.ProviderName == "Microsoft.EntityFrameworkCore.SqlServer")
        {
            context.Database.ExecuteSqlRaw(@"
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[StockItems]') 
                    AND name = N'AllowBackorder'
                )
                BEGIN
                    ALTER TABLE [dbo].[StockItems] ADD [AllowBackorder] BIT NOT NULL DEFAULT 0;
                END
            ");

            context.Database.ExecuteSqlRaw(@"
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[PurchaseOrders]') 
                    AND name = N'ExpectedDeliveryDate'
                )
                BEGIN
                    ALTER TABLE [dbo].[PurchaseOrders] ADD [ExpectedDeliveryDate] DATETIME2 NULL;
                END
            ");

            context.Database.ExecuteSqlRaw(@"
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[Customers]') 
                    AND name = N'CreditContractDays'
                )
                BEGIN
                    ALTER TABLE [dbo].[Customers] ADD [CreditContractDays] INT NOT NULL DEFAULT 30;
                END
            ");

            context.Database.ExecuteSqlRaw(@"
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[TenantPlugins]') 
                    AND name = N'ConfigurationSettingsJson'
                )
                BEGIN
                    ALTER TABLE [dbo].[TenantPlugins] ADD [ConfigurationSettingsJson] NVARCHAR(MAX) NULL;
                END
            ");

            context.Database.ExecuteSqlRaw(@"
                IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RolePermissions]') AND type in (N'U'))
                BEGIN
                    CREATE TABLE [dbo].[RolePermissions] (
                        [Id] BIGINT IDENTITY(1,1) NOT NULL,
                        [TenantId] BIGINT NOT NULL,
                        [Role] INT NOT NULL,
                        [Area] NVARCHAR(100) NOT NULL,
                        [IsAllowed] BIT NOT NULL,
                        CONSTRAINT [PK_RolePermissions] PRIMARY KEY CLUSTERED ([Id] ASC),
                        CONSTRAINT [FK_RolePermissions_Tenants_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Tenants] ([Id]) ON DELETE CASCADE
                    );
                    CREATE UNIQUE INDEX [IX_RolePermissions_TenantId_Role_Area] ON [dbo].[RolePermissions] ([TenantId], [Role], [Area]);
                END
            ");
        }

        // 1. Seed local Tenant copy
        if (!context.Tenants.Any(t => t.Id == tenant.Id))
        {
            context.Tenants.Add(new Tenant
            {
                Id = tenant.Id,
                Name = tenant.Name,
                Subdomain = tenant.Subdomain,
                DefaultLanguageCode = tenant.DefaultLanguageCode,
                DefaultCurrencyCode = tenant.DefaultCurrencyCode,
                IsActive = tenant.IsActive,
                ConnectionString = tenant.ConnectionString,
                SubscriptionPlan = tenant.SubscriptionPlan,
                PlanPrice = tenant.PlanPrice,
                SubscriptionStatus = tenant.SubscriptionStatus,
                CreatedAt = tenant.CreatedAt
            });

            bool isSqlServer = context.Database.ProviderName == "Microsoft.EntityFrameworkCore.SqlServer";
            if (isSqlServer)
            {
                using (var transaction = context.Database.BeginTransaction())
                {
                    context.Database.ExecuteSqlRaw("SET IDENTITY_INSERT Tenants ON");
                    context.SaveChanges();
                    context.Database.ExecuteSqlRaw("SET IDENTITY_INSERT Tenants OFF");
                    transaction.Commit();
                }
            }
            else
            {
                context.SaveChanges();
            }
        }

        // 2. Seed local Plugins copy
        if (!context.Plugins.Any())
        {
            foreach (var p in allPlugins)
            {
                context.Plugins.Add(new Plugin
                {
                    Id = p.Id,
                    Code = p.Code,
                    Name = p.Name,
                    Description = p.Description,
                    MonthlyPrice = p.MonthlyPrice,
                    IsActive = p.IsActive
                });
            }
            context.SaveChanges();
        }

        // 3. Seed local TenantPlugins subscriptions copy
        if (!context.TenantPlugins.Any())
        {
            var tenantSubscriptions = tenantPlugins.Where(tp => tp.TenantId == tenant.Id);
            foreach (var ts in tenantSubscriptions)
            {
                context.TenantPlugins.Add(new TenantPlugin
                {
                    TenantId = ts.TenantId,
                    PluginId = ts.PluginId,
                    IsActive = ts.IsActive,
                    EnabledDate = ts.EnabledDate
                });
            }
            context.SaveChanges();
        }

        // 4. Seed Currencies
        if (!context.Currencies.Any())
        {
            if (tenant.Subdomain.ToLower() == "acme")
            {
                context.Currencies.AddRange(
                    new Currency { TenantId = tenant.Id, Code = "GBP", Symbol = "£", ExchangeRateToBase = 1.0m, IsBaseCurrency = true },
                    new Currency { TenantId = tenant.Id, Code = "USD", Symbol = "$", ExchangeRateToBase = 1.25m, IsBaseCurrency = false },
                    new Currency { TenantId = tenant.Id, Code = "EUR", Symbol = "€", ExchangeRateToBase = 1.15m, IsBaseCurrency = false }
                );
            }
            else if (tenant.Subdomain.ToLower() == "global")
            {
                context.Currencies.AddRange(
                    new Currency { TenantId = tenant.Id, Code = "USD", Symbol = "$", ExchangeRateToBase = 1.0m, IsBaseCurrency = true },
                    new Currency { TenantId = tenant.Id, Code = "GBP", Symbol = "£", ExchangeRateToBase = 0.80m, IsBaseCurrency = false }
                );
            }
            else
            {
                context.Currencies.Add(new Currency
                {
                    TenantId = tenant.Id,
                    Code = tenant.DefaultCurrencyCode,
                    Symbol = GetCurrencySymbol(tenant.DefaultCurrencyCode),
                    ExchangeRateToBase = 1.0m,
                    IsBaseCurrency = true
                });
            }
            context.SaveChanges();
        }

        // 4.5. Seed Ledger Accounts
        if (!context.LedgerAccounts.Any())
        {
            context.LedgerAccounts.AddRange(
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "1000", Name = "Sales Revenue", Type = LedgerAccountType.Revenue, Description = "Income from main wholesale contract catalog and inventory directory sales." },
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "2000", Name = "Purchases / Cost of Goods Sold", Type = LedgerAccountType.Expense, Description = "Cost of buying stock and direct project materials." },
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "2010", Name = "Travel & Lodging Expenses", Type = LedgerAccountType.Expense, Description = "Business travel, hotel accommodation, and client transport costs." },
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "2020", Name = "Client Meals & Hosting", Type = LedgerAccountType.Expense, Description = "Client dinners, entertainment, and marketing meals." },
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "3000", Name = "Debtors Control Account", Type = LedgerAccountType.Asset, Description = "Accounts receivable ledger for customer invoicing balances." },
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "4000", Name = "Trade Creditors / Accounts Payable", Type = LedgerAccountType.Liability, Description = "Accounts payable ledger for vendor invoices and supplier bills." },
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "5000", Name = "VAT Liability Control", Type = LedgerAccountType.Liability, Description = "HMRC UK Value Added Tax tracker." },
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "6000", Name = "Barclays Bank Current Account", Type = LedgerAccountType.Asset, Description = "Primary company cash reserve holding." },
                new LedgerAccount { TenantId = tenant.Id, AccountCode = "1500", Name = "Accumulated Depreciation", Type = LedgerAccountType.Asset, Description = "Contra-asset account reflecting writing down value of fixed assets." }
            );
            context.SaveChanges();
        }

        // 5. Seed Users
        if (!context.Users.Any())
        {
            const string passwordHash = "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f";
            
            if (tenant.Subdomain.ToLower() == "acme")
            {
                context.Users.AddRange(
                    new User { TenantId = tenant.Id, Username = "admin", Email = "admin@acme.com", PasswordHash = passwordHash, Role = UserRole.CompanyAdmin },
                    new User { TenantId = tenant.Id, Username = "accounts", Email = "accounts@acme.com", PasswordHash = passwordHash, Role = UserRole.Accounts },
                    new User { TenantId = tenant.Id, Username = "warehouse", Email = "warehouse@acme.com", PasswordHash = passwordHash, Role = UserRole.Warehouse }
                );
            }
            else if (tenant.Subdomain.ToLower() == "global")
            {
                context.Users.AddRange(
                    new User { TenantId = tenant.Id, Username = "admin", Email = "admin@global.com", PasswordHash = passwordHash, Role = UserRole.CompanyAdmin },
                    new User { TenantId = tenant.Id, Username = "purchasing", Email = "purchasing@global.com", PasswordHash = passwordHash, Role = UserRole.Sales }
                );
            }
            context.SaveChanges();
        }

        // Seed default Role Permissions
        if (!context.RolePermissions.Any())
        {
            var defaultPermissions = new List<RolePermission>();

            // Accounts
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Accounts, Area = "financials", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Accounts, Area = "sales", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Accounts, Area = "purchasing", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Accounts, Area = "banking", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Accounts, Area = "inventory", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Accounts, Area = "hr", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Accounts, Area = "admin", IsAllowed = false });

            // Warehouse
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Warehouse, Area = "financials", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Warehouse, Area = "sales", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Warehouse, Area = "purchasing", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Warehouse, Area = "banking", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Warehouse, Area = "inventory", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Warehouse, Area = "hr", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Warehouse, Area = "admin", IsAllowed = false });

            // Sales
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Sales, Area = "financials", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Sales, Area = "sales", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Sales, Area = "purchasing", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Sales, Area = "banking", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Sales, Area = "inventory", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Sales, Area = "hr", IsAllowed = false });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Sales, Area = "admin", IsAllowed = false });

            // Integration
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Integration, Area = "financials", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Integration, Area = "sales", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Integration, Area = "purchasing", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Integration, Area = "banking", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Integration, Area = "inventory", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Integration, Area = "hr", IsAllowed = true });
            defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.Integration, Area = "admin", IsAllowed = true });

            // CompanyAdmin & GlobalAdmin
            foreach (var area in new[] { "financials", "sales", "purchasing", "banking", "inventory", "hr", "admin" })
            {
                defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.CompanyAdmin, Area = area, IsAllowed = true });
                defaultPermissions.Add(new RolePermission { TenantId = tenant.Id, Role = UserRole.GlobalAdmin, Area = area, IsAllowed = true });
            }

            context.RolePermissions.AddRange(defaultPermissions);
            context.SaveChanges();
        }

        // 6. Seed Warehouses
        Warehouse whMain = null!;
        Warehouse whWest = null!;
        if (!context.Warehouses.Any())
        {
            whMain = new Warehouse { TenantId = tenant.Id, Code = "WH-MAIN", Name = "Main Distribution Centre", Address = "10 Warehouse Way, London" };
            whWest = new Warehouse { TenantId = tenant.Id, Code = "WH-WEST", Name = "West Coast Depot", Address = "50 Ocean Drive, Bristol" };
            context.Warehouses.AddRange(whMain, whWest);
            context.SaveChanges();
        }
        else
        {
            whMain = context.Warehouses.First(w => w.Code == "WH-MAIN");
            whWest = context.Warehouses.First(w => w.Code == "WH-WEST");
        }

        // 7. Seed VAT Countries & Tax Classes
        Country gb = null!;
        Country fr = null!;
        Country de = null!;
        TaxClass taxStd = null!;
        TaxClass taxRed = null!;
        TaxClass taxZero = null!;

        if (!context.Countries.Any())
        {
            gb = new Country { TenantId = tenant.Id, Code = "GB", Name = "United Kingdom" };
            fr = new Country { TenantId = tenant.Id, Code = "FR", Name = "France" };
            de = new Country { TenantId = tenant.Id, Code = "DE", Name = "Germany" };
            context.Countries.AddRange(gb, fr, de);
            context.SaveChanges();
        }
        else
        {
            gb = context.Countries.First(c => c.Code == "GB");
            fr = context.Countries.First(c => c.Code == "FR");
            de = context.Countries.First(c => c.Code == "DE");
        }

        if (!context.TaxClasses.Any())
        {
            taxStd = new TaxClass { TenantId = tenant.Id, Code = "STD", Name = "Standard Rate" };
            taxRed = new TaxClass { TenantId = tenant.Id, Code = "RED", Name = "Reduced Rate" };
            taxZero = new TaxClass { TenantId = tenant.Id, Code = "ZERO", Name = "Zero Rate" };
            context.TaxClasses.AddRange(taxStd, taxRed, taxZero);
            context.SaveChanges();
        }
        else
        {
            taxStd = context.TaxClasses.First(tc => tc.Code == "STD");
            taxRed = context.TaxClasses.First(tc => tc.Code == "RED");
            taxZero = context.TaxClasses.First(tc => tc.Code == "ZERO");
        }

        // Seed Tax Rates Map
        if (!context.TaxRates.Any())
        {
            context.TaxRates.AddRange(
                new TaxRate { TenantId = tenant.Id, Country = gb, TaxClass = taxStd, Rate = 0.20m },
                new TaxRate { TenantId = tenant.Id, Country = gb, TaxClass = taxRed, Rate = 0.05m },
                new TaxRate { TenantId = tenant.Id, Country = gb, TaxClass = taxZero, Rate = 0.00m },
                new TaxRate { TenantId = tenant.Id, Country = fr, TaxClass = taxStd, Rate = 0.20m },
                new TaxRate { TenantId = tenant.Id, Country = de, TaxClass = taxStd, Rate = 0.19m },
                new TaxRate { TenantId = tenant.Id, Country = de, TaxClass = taxRed, Rate = 0.07m }
            );
            context.SaveChanges();
        }

        // 8. Seed operational inventory (only for Acme Acme)
        if (tenant.Subdomain.ToLower() == "acme")
        {
            // Seed default Stock Items
            var brickItem = new StockItem
            {
                TenantId = tenant.Id,
                SKU = "BRK-RED-01",
                NameJson = "{\"en-GB\": \"Red Facing Bricks\", \"fr-FR\": \"Briques Rouges\"}",
                DescriptionJson = "{\"en-GB\": \"High quality red facing clay bricks for exterior building walls.\", \"fr-FR\": \"Briques d'argile de parement rouge de haute qualité.\"}",
                StockUnitOfSale = "Pallet",
                SellUnitOfSale = "Each",
                ConversionRatio = 400.0m,
                BasePrice = 320.00m,
                EnableForWebsite = true,
                AllowBackorder = true,
                RichDescriptionJson = "{\"en-GB\": \"<p>Acme premium clay bricks are baked at 1000°C for extreme durability.</p>\"}",
                MediaUrlsJson = "[\"https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=400\"]",
                SpecificationsJson = "{\"dimensions\": \"215mm x 102.5mm x 65mm\", \"compressive_strength\": \"75 N/mm²\"}",
                TaxClass = taxStd
            };

            var sandItem = new StockItem
            {
                TenantId = tenant.Id,
                SKU = "SND-BLD-01",
                NameJson = "{\"en-GB\": \"Building Sand Bulk Bag\", \"fr-FR\": \"Sac de sable de construction\"}",
                DescriptionJson = "{\"en-GB\": \"1-ton building sand bulk bag for mortar preparation.\", \"fr-FR\": \"Sac de sable de construction d'une tonne pour mortier.\"}",
                StockUnitOfSale = "Bag",
                SellUnitOfSale = "Each",
                ConversionRatio = 1.0m,
                BasePrice = 45.00m,
                EnableForWebsite = true,
                AllowBackorder = false,
                TaxClass = taxStd
            };

            if (!context.StockItems.Any())
            {
                context.StockItems.AddRange(brickItem, sandItem);
                context.SaveChanges();
            }
            else
            {
                brickItem = context.StockItems.First(s => s.SKU == "BRK-RED-01");
                sandItem = context.StockItems.First(s => s.SKU == "SND-BLD-01");
            }

            // Seed default Bin Locations inside Main Warehouse
            var binA1 = new BinLocation { TenantId = tenant.Id, Warehouse = whMain, Code = "A-01-01", Description = "Aisle A, Rack 1, Shelf 1" };
            var binA2 = new BinLocation { TenantId = tenant.Id, Warehouse = whMain, Code = "A-01-02", Description = "Aisle A, Rack 1, Shelf 2" };
            if (!context.BinLocations.Any())
            {
                context.BinLocations.AddRange(binA1, binA2);
                context.SaveChanges();
            }
            else
            {
                binA1 = context.BinLocations.First(b => b.Code == "A-01-01");
                binA2 = context.BinLocations.First(b => b.Code == "A-01-02");
            }

            // Seed Stock Inventory linked to Warehouse & Bin location
            if (!context.StockInventories.Any())
            {
                context.StockInventories.AddRange(
                    new StockInventory { TenantId = tenant.Id, StockItem = brickItem, BinLocation = binA1, Warehouse = whMain, Quantity = 15.0m },
                    new StockInventory { TenantId = tenant.Id, StockItem = sandItem, BinLocation = binA2, Warehouse = whMain, Quantity = 8.0m }
                );
                context.SaveChanges();
            }

            // Seed default Supplier
            if (!context.Suppliers.Any())
            {
                var supplierUK = new Supplier
                {
                    TenantId = tenant.Id,
                    Name = "London Building Supplies Ltd",
                    Email = "sales@londonbuildingsupplies.co.uk",
                    Address = "100 Thames Highway, London, SE1 9XX",
                    DefaultCurrencyCode = "GBP"
                };
                context.Suppliers.Add(supplierUK);
                context.SaveChanges();
            }

            // Seed Contacts (Customers)
            if (!context.Contacts.Any())
            {
                var contact1 = new Contact
                {
                    TenantId = tenant.Id,
                    Name = "John Builders Ltd",
                    CompanyName = "John Builders",
                    Email = "purchasing@johnbuilders.co.uk",
                    Phone = "020 7946 0192",
                    Address = "50 Cement Works Road, London",
                    DefaultCurrencyCode = "GBP",
                    Type = ContactType.Customer,
                    Country = gb
                };
                var contact2 = new Contact
                {
                    TenantId = tenant.Id,
                    Name = "Gérard Travaux SARL",
                    CompanyName = "Gérard Travaux",
                    Email = "contact@gerardtravaux.fr",
                    Phone = "+33 1 42 27 78 90",
                    Address = "15 Rue de Briques, Paris",
                    DefaultCurrencyCode = "EUR",
                    Type = ContactType.Customer,
                    Country = fr
                };
                context.Contacts.AddRange(contact1, contact2);
                context.SaveChanges();
            }

            // Seed Customers (New Dedicated Table)
            if (!context.Customers.Any())
            {
                var customer1 = new Customer
                {
                    TenantId = tenant.Id,
                    CustomerRef = "CUST-0001",
                    Name = "John Builders Ltd",
                    CompanyName = "John Builders",
                    Email = "purchasing@johnbuilders.co.uk",
                    Phone = "020 7946 0192",
                    DefaultCurrencyCode = "GBP",
                    IsActive = true,
                    Country = gb
                };

                var customer2 = new Customer
                {
                    TenantId = tenant.Id,
                    CustomerRef = "CUST-0002",
                    Name = "Gérard Travaux SARL",
                    CompanyName = "Gérard Travaux",
                    Email = "contact@gerardtravaux.fr",
                    Phone = "+33 1 42 27 78 90",
                    DefaultCurrencyCode = "EUR",
                    IsActive = true,
                    Country = fr
                };

                context.Customers.AddRange(customer1, customer2);
                context.SaveChanges();

                // Seed Customer Addresses
                context.CustomerAddresses.AddRange(
                    new CustomerAddress
                    {
                        TenantId = tenant.Id,
                        CustomerId = customer1.Id,
                        AddressName = "Main Billing",
                        AddressLine1 = "50 Cement Works Road",
                        City = "London",
                        PostalCode = "SE1 0XX",
                        Country = gb,
                        AddressType = "Billing",
                        IsDefault = true
                    },
                    new CustomerAddress
                    {
                        TenantId = tenant.Id,
                        CustomerId = customer1.Id,
                        AddressName = "Secondary Shipping",
                        AddressLine1 = "Unit 4, Industrial Estate",
                        City = "London",
                        PostalCode = "E1 2YY",
                        Country = gb,
                        AddressType = "Shipping",
                        IsDefault = true
                    },
                    new CustomerAddress
                    {
                        TenantId = tenant.Id,
                        CustomerId = customer2.Id,
                        AddressName = "Siège Social (Billing)",
                        AddressLine1 = "15 Rue de Briques",
                        City = "Paris",
                        PostalCode = "75001",
                        Country = fr,
                        AddressType = "Billing",
                        IsDefault = true
                    },
                    new CustomerAddress
                    {
                        TenantId = tenant.Id,
                        CustomerId = customer2.Id,
                        AddressName = "Entrepôt Paris (Shipping)",
                        AddressLine1 = "45 Avenue de la Marne",
                        City = "Paris",
                        PostalCode = "92000",
                        Country = fr,
                        AddressType = "Shipping",
                        IsDefault = true
                    }
                );
                context.SaveChanges();
            }

            // Seed Bank Accounts
            var currentAccount = new BankAccount
            {
                TenantId = tenant.Id,
                AccountName = "Barclays Current Account",
                AccountNumber = "12345678",
                SortCode = "20-10-40",
                CurrencyCode = "GBP",
                CurrentBalance = 24500.00m,
                BankName = "Barclays Bank PLC",
                IsFeedConnected = true,
                LastSyncedAt = DateTime.UtcNow
            };
            var foreignAccount = new BankAccount
            {
                TenantId = tenant.Id,
                AccountName = "Barclays USD Reserve Account",
                AccountNumber = "87654321",
                SortCode = "20-10-40",
                CurrencyCode = "USD",
                CurrentBalance = 8000.00m,
                BankName = "Barclays Bank PLC",
                IsFeedConnected = true,
                LastSyncedAt = DateTime.UtcNow
            };
            if (!context.BankAccounts.Any())
            {
                context.BankAccounts.AddRange(currentAccount, foreignAccount);
                context.SaveChanges();
            }
            else
            {
                currentAccount = context.BankAccounts.First(b => b.AccountNumber == "12345678");
            }

            // Seed Bank Statement Lines (Unreconciled)
            if (!context.BankStatementLines.Any())
            {
                context.BankStatementLines.AddRange(
                    new BankStatementLine
                    {
                        TenantId = tenant.Id,
                        BankAccountId = currentAccount.Id,
                        TransactionDate = DateTime.UtcNow.AddDays(-3),
                        Description = "Builders Depot payment received",
                        Reference = "INV-2026-0001",
                        Amount = 1440.00m,
                        IsReconciled = false
                    },
                    new BankStatementLine
                    {
                        TenantId = tenant.Id,
                        BankAccountId = currentAccount.Id,
                        TransactionDate = DateTime.UtcNow.AddDays(-2),
                        Description = "Supplier bill payment - London Building Supplies Ltd",
                        Reference = "BILL-LBS-99",
                        Amount = -650.00m,
                        IsReconciled = false
                    }
                );
                context.SaveChanges();
            }

            // Seed Employees
            if (!context.Employees.Any())
            {
                var employee1 = new Employee
                {
                    TenantId = tenant.Id,
                    FirstName = "Sarah",
                    LastName = "Jenkins",
                    NationalInsuranceNumber = "QQ123456C",
                    TaxCode = "1257L",
                    MonthlySalary = 3200.00m,
                    IsActive = true
                };
                var employee2 = new Employee
                {
                    TenantId = tenant.Id,
                    FirstName = "David",
                    LastName = "Miller",
                    NationalInsuranceNumber = "JW987654A",
                    TaxCode = "BR",
                    MonthlySalary = 2400.00m,
                    IsActive = true
                };
                context.Employees.AddRange(employee1, employee2);
                context.SaveChanges();
            }

            // Seed Fixed Assets
            if (!context.FixedAssets.Any())
            {
                var computerAsset = new FixedAsset
                {
                    TenantId = tenant.Id,
                    AssetCode = "AST-2026-001",
                    Name = "Office Servers Rack",
                    Description = "Dell PowerEdge servers for hosting company accounting system locally.",
                    PurchaseCost = 3600.00m,
                    PurchaseDate = DateTime.UtcNow.AddMonths(-3),
                    Method = DepreciationMethod.StraightLine,
                    DepreciationRate = 0.20m,
                    CurrentBookValue = 3600.00m,
                    LastDepreciationDate = null
                };
                context.FixedAssets.Add(computerAsset);
                context.SaveChanges();
            }
        }
    }

    private static string GetCurrencySymbol(string code)
    {
        return code.ToUpper() switch
        {
            "GBP" => "£",
            "EUR" => "€",
            "USD" => "$",
            "CAD" => "$",
            "AUD" => "$",
            "JPY" => "¥",
            "CNY" => "¥",
            _ => "¤"
        };
    }
}
