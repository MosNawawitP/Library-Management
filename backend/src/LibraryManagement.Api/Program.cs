using System.Globalization;
using System.Text;
using System.Threading.RateLimiting;
using LibraryManagement.Api.Common.Configuration;
using LibraryManagement.Api.Common.Middleware;
using LibraryManagement.Api.Data.Auth;
using LibraryManagement.Api.Data.Library;
using LibraryManagement.Api.Features.Auth;
using LibraryManagement.Api.Features.Books;
using LibraryManagement.Api.Features.Categories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;

DotEnvLoader.LoadFromRepositoryTree();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks()
    .AddCheck<LibraryStorageHealthCheck>(
        "library-storage",
        tags: ["ready"]);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

var jwtOptions = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
    ?? throw new InvalidOperationException("JWT configuration is required.");
var signingKey = builder.Configuration["Jwt:SigningKey"];

if (string.IsNullOrWhiteSpace(jwtOptions.Issuer) ||
    string.IsNullOrWhiteSpace(jwtOptions.Audience) ||
    jwtOptions.ExpirationHours is < 1 or > 24)
{
    throw new InvalidOperationException("JWT issuer, audience, and an expiration between 1 and 24 hours are required.");
}

if (string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:SigningKey must be supplied by backend/.env or an environment variable and contain at least 32 UTF-8 bytes.");
}

jwtOptions.SigningKey = signingKey;
var tokenSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = tokenSigningKey,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton(jwtOptions);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IAuthRepository, JsonAuthRepository>();
builder.Services.AddSingleton<ILibraryRepository, JsonLibraryRepository>();
builder.Services.AddSingleton<IPasswordHasher<AuthUser>, PasswordHasher<AuthUser>>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<BookService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 300,
                Window = TimeSpan.FromSeconds(10),
                QueueLimit = 0,
                AutoReplenishment = true
            }
        )
    );

    options.OnRejected = (context, _) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }

        return ValueTask.CompletedTask;
    };
});

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy
                .WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseMiddleware<ApiResponseMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseMiddleware<JwtTokenValidationMiddleware>();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready")
});
app.MapAuthEndpoints();
app.MapBookEndpoints();
app.MapCategoryEndpoints();

app.Run();
