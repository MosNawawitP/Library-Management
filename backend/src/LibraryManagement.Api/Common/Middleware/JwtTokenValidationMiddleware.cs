using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using LibraryManagement.Api.Features.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

namespace LibraryManagement.Api.Common.Middleware;

public sealed class JwtTokenValidationMiddleware(RequestDelegate next)
{
    private const string MissingTokenMessage =
        "Authorization header with a Bearer token is required.";
    private const string ExpiredTokenMessage = "Token has expired.";
    private const string InvalidTokenMessage =
        "Token is invalid or was not issued by this system.";

    public async Task InvokeAsync(
        HttpContext context,
        AuthService authService)
    {
        if (!RequiresAuthentication(context))
        {
            await next(context);
            return;
        }

        if (!HasBearerToken(context.Request))
        {
            await WriteUnauthorizedAsync(context, MissingTokenMessage);
            return;
        }

        var authentication = await context.AuthenticateAsync(
            JwtBearerDefaults.AuthenticationScheme);

        if (!authentication.Succeeded || authentication.Principal is null)
        {
            var message = IsExpired(authentication.Failure)
                ? ExpiredTokenMessage
                : InvalidTokenMessage;
            await WriteUnauthorizedAsync(context, message);
            return;
        }

        if (!TryReadSessionClaims(
                authentication.Principal,
                out var userId,
                out var sessionId) ||
            !await authService.IsSessionValidAsync(
                userId,
                sessionId,
                context.RequestAborted))
        {
            await WriteUnauthorizedAsync(context, InvalidTokenMessage);
            return;
        }

        context.User = authentication.Principal;
        await next(context);
    }

    private static bool RequiresAuthentication(HttpContext context)
    {
        var endpoint = context.GetEndpoint();

        return endpoint?.Metadata.GetMetadata<IAllowAnonymous>() is null &&
            endpoint?.Metadata.GetMetadata<IAuthorizeData>() is not null;
    }

    private static bool HasBearerToken(HttpRequest request) =>
        AuthenticationHeaderValue.TryParse(
            request.Headers.Authorization.ToString(),
            out var header) &&
        string.Equals(
            header.Scheme,
            JwtBearerDefaults.AuthenticationScheme,
            StringComparison.OrdinalIgnoreCase) &&
        !string.IsNullOrWhiteSpace(header.Parameter);

    private static bool TryReadSessionClaims(
        System.Security.Claims.ClaimsPrincipal principal,
        out Guid userId,
        out Guid sessionId)
    {
        userId = Guid.Empty;
        sessionId = Guid.Empty;

        return Guid.TryParse(
            principal.FindFirst("userId")?.Value,
            out userId) &&
            Guid.TryParse(
            principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value,
            out sessionId);
    }

    private static bool IsExpired(Exception? exception)
    {
        while (exception is not null)
        {
            if (exception is SecurityTokenExpiredException)
            {
                return true;
            }

            exception = exception.InnerException;
        }

        return false;
    }

    private static async Task WriteUnauthorizedAsync(
        HttpContext context,
        string message)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.Headers.WWWAuthenticate = "Bearer";
        await context.Response.WriteAsJsonAsync(
            new { message },
            context.RequestAborted);
    }
}
