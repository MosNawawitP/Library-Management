namespace LibraryManagement.Api.Features.Auth;

public sealed record LoginRequest(
    string? Username,
    string? Password);

public sealed record LoginResponse(
    string Token,
    string TokenType,
    DateTimeOffset ExpiresAtUtc);

public sealed record TokenValidationResponse(
    bool IsValid,
    Guid UserId,
    Guid SessionId);

public sealed class JwtOptions
{
    public string Issuer { get; init; } = string.Empty;

    public string Audience { get; init; } = string.Empty;

    public int ExpirationHours { get; init; } = 8;

    public string SigningKey { get; set; } = string.Empty;
}

public enum LoginStatus
{
    Succeeded,
    InvalidCredentials,
    Locked
}

public sealed record LoginResult(
    LoginStatus Status,
    LoginResponse? Response = null,
    TimeSpan? RetryAfter = null);
