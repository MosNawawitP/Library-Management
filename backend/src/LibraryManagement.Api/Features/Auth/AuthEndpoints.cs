using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace LibraryManagement.Api.Features.Auth;

public static class AuthEndpoints
{
    private const string InvalidCredentialsMessage = "Invalid username or password.";
    private const string LockedMessage =
        "Login ผิดเกินที่กำหนด กรุณารอ 10 นาทีและลองอีกครั้ง";

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth")
            .WithTags("Authentication");

        group.MapPost("/login", LoginAsync)
            .AllowAnonymous()
            .WithName("Login")
            .Produces<LoginResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status423Locked);

        group.MapGet("/validate-token", ValidateToken)
            .RequireAuthorization()
            .WithName("ValidateToken")
            .Produces<TokenValidationResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        return endpoints;
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        AuthService authService,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        var validationErrors = Validate(request);
        if (validationErrors.Count > 0)
        {
            return Results.BadRequest(new
            {
                message = "Username and password are required.",
                errors = validationErrors
            });
        }

        var result = await authService.LoginAsync(
            request.Username!,
            request.Password!,
            cancellationToken);

        return result.Status switch
        {
            LoginStatus.Succeeded => Results.Ok(result.Response),
            LoginStatus.Locked => CreateLockedResult(result, httpContext),
            _ => Results.Json(
                new { message = InvalidCredentialsMessage },
                statusCode: StatusCodes.Status401Unauthorized)
        };
    }

    private static IResult ValidateToken(ClaimsPrincipal principal)
    {
        var userId = Guid.Parse(principal.FindFirstValue("userId")!);
        var sessionId = Guid.Parse(
            principal.FindFirstValue(JwtRegisteredClaimNames.Jti)!);

        return Results.Ok(new TokenValidationResponse(
            true,
            userId,
            sessionId));
    }

    private static Dictionary<string, string[]> Validate(LoginRequest request)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            errors[nameof(request.Username)] = ["Username is required."];
        }
        else if (request.Username.Length > 100)
        {
            errors[nameof(request.Username)] = ["Username cannot exceed 100 characters."];
        }

        if (string.IsNullOrEmpty(request.Password))
        {
            errors[nameof(request.Password)] = ["Password is required."];
        }
        else if (request.Password.Length > 1024)
        {
            errors[nameof(request.Password)] = ["Password cannot exceed 1024 characters."];
        }

        return errors;
    }

    private static IResult CreateLockedResult(
        LoginResult result,
        HttpContext httpContext)
    {
        var retryAfterSeconds = Math.Max(
            1,
            (int)Math.Ceiling(result.RetryAfter?.TotalSeconds ?? 600));
        httpContext.Response.Headers.RetryAfter =
            retryAfterSeconds.ToString(CultureInfo.InvariantCulture);

        return Results.Json(
            new
            {
                message = LockedMessage,
                retryAfterSeconds
            },
            statusCode: StatusCodes.Status423Locked);
    }
}
