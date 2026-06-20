using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Nimbus.AdminApi.Middleware;
using Nimbus.AdminApi.Services;
using Nimbus.DatabaseStructures.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();

// Swagger configuration with JWT authorization options
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Nimbus ERP Admin API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configure HttpContext Accessor
builder.Services.AddHttpContextAccessor();

// Register Catalog DB Context
builder.Services.AddDbContext<CatalogDbContext>(options =>
{
    var connectionString = "Server=localhost,1434;Database=NimbusCatalogDb;User Id=sa;Password=NimbusSqlPassword2026!;TrustServerCertificate=True;MultipleActiveResultSets=true";
    options.UseSqlServer(connectionString);
});

// Register Scoped Tenant and Location Provider
builder.Services.AddScoped<ITenantProvider, TenantProvider>();

// Register ITenantConnectionService
builder.Services.AddScoped<ITenantConnectionService, TenantConnectionService>();

// Register IPeriodService
builder.Services.AddScoped<IPeriodService, PeriodService>();

// Register ISalesOrderService
builder.Services.AddScoped<ISalesOrderService, SalesOrderService>();

// Register IDeliveryService
builder.Services.AddScoped<IDeliveryService, DeliveryService>();

// Register SQL Server DB Context
builder.Services.AddDbContext<NimbusDbContext>((serviceProvider, options) =>
{
    var connectionService = serviceProvider.GetRequiredService<ITenantConnectionService>();
    var connectionString = connectionService.GetConnectionString();
    options.UseSqlServer(connectionString);
});

// Configure JWT Authentication
var secret = builder.Configuration["Jwt:Secret"] ?? "NimbusERP_Super_Secret_Encryption_Key_2026";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "NimbusERP",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "NimbusAdmin",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
    };
});

builder.Services.AddAuthorization();

// Configure CORS for Next.js Frontends (admin-ui & portal-ui)
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// 2. Database Seeding on Startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        // A. Seed Catalog database first
        var catalogContext = services.GetRequiredService<CatalogDbContext>();
        DbInitializer.InitializeCatalog(catalogContext);

        // B. Seed Tenant databases dynamically
        var tenants = catalogContext.Tenants.ToList();
        var allPlugins = catalogContext.Plugins.ToList();
        var tenantPlugins = catalogContext.TenantPlugins.ToList();

        foreach (var tenant in tenants)
        {
            // Set mock tenant context so TenantConnectionService resolves the correct connection
            TenantProvider.MockTenantId = tenant.Id;
            TenantProvider.MockSubdomain = tenant.Subdomain;

            // Resolve NimbusDbContext inside a subscope to use the mock tenant connection string
            using (var tenantScope = services.CreateScope())
            {
                var tenantContext = tenantScope.ServiceProvider.GetRequiredService<NimbusDbContext>();
                DbInitializer.InitializeTenant(tenantContext, tenant, allPlugins, tenantPlugins);
            }
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
    finally
    {
        // Clear mock context
        TenantProvider.MockTenantId = null;
        TenantProvider.MockSubdomain = null;
    }
}

// 3. Configure HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Nimbus ERP API v1"));
}

app.UseCors("CorsPolicy");

app.UseHttpsRedirection();

// Custom Middleware: Resolves Tenant and sets executing thread locale Culture
app.UseMiddleware<TenantAndLocaleMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
