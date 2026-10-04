using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LibraryManagement.Api.Data.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace LibraryManagement.Api.Features.Auth;

public sealed class AuthService(
    IAuthRepository repository,
    IPasswordHasher<AuthUser> passwordHasher,
    JwtOptions jwtOptions,
    TimeProvider timeProvider)
{
    private const int MaximumFailedAttempts = 10;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(10);

    // A valid PBKDF2 hash is verified for unknown users to reduce username timing differences.
    private const string DummyPasswordHash =
        "AQAAAAIAAYagAAAAEJqcs4FvOnxrfY6foLHC0+SYLb5B057oIH+H+CeP+9sXhZyyILJ1wC0LnV+3O8yM/A==";

    private static readonly AuthUser DummyUser = new();

    public Task<LoginResult> LoginAsync(
        string username,
        string password,
        CancellationToken cancellationToken)
    {
        var normalizedUsername = username.Trim().ToUpperInvariant();

        return repository.UpdateAsync(
            (users, sessions) => Authenticate(
                users,
                sessions,
                normalizedUsername,
                password),
            cancellationToken);
    }

    public Task<bool> IsSessionValidAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow();

        return repository.ReadAsync(
            (users, sessions) =>
                users.Users.Any(user =>
                    user.UserId == userId && user.IsActive) &&
                sessions.UserSessions.Any(session =>
                    session.SessionId == sessionId &&
                    session.UserId == userId &&
                    session.ExpiresAtUtc > now),
            cancellationToken);
    }

    private AuthDataUpdate<LoginResult> Authenticate(
        UserData users,
        UserSessionData sessions,
        string normalizedUsername,
        string password)
    {
        var now = timeProvider.GetUtcNow();
        var user = users.Users.SingleOrDefault(candidate =>
            string.Equals(
                candidate.NormalizedUsername,
                normalizedUsername,
                StringComparison.Ordinal));

        if (user is null)
        {
            _ = passwordHasher.VerifyHashedPassword(DummyUser, DummyPasswordHash, password);
            return new AuthDataUpdate<LoginResult>(
                new LoginResult(LoginStatus.InvalidCredentials),
                UsersChanged: false,
                SessionsChanged: false);
        }

        if (user.LockedUntilUtc is { } lockedUntil && lockedUntil > now)
        {
            return new AuthDataUpdate<LoginResult>(
                new LoginResult(LoginStatus.Locked, RetryAfter: lockedUntil - now),
                UsersChanged: false,
                SessionsChanged: false);
        }

        var hadExpiredLock = user.LockedUntilUtc is not null;
        if (hadExpiredLock)
        {
            user.LockedUntilUtc = null;
            user.FailedLoginAttempts = 0;
        }

        var verification = passwordHasher.VerifyHashedPassword(
            user,
            user.PasswordHash,
            password);

        if (verification == PasswordVerificationResult.Failed || !user.IsActive)
        {
            if (verification != PasswordVerificationResult.Failed)
            {
                return new AuthDataUpdate<LoginResult>(
                    new LoginResult(LoginStatus.InvalidCredentials),
                    UsersChanged: hadExpiredLock,
                    SessionsChanged: false);
            }

            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= MaximumFailedAttempts)
            {
                user.LockedUntilUtc = now.Add(LockoutDuration);
                return new AuthDataUpdate<LoginResult>(
                    new LoginResult(LoginStatus.Locked, RetryAfter: LockoutDuration),
                    UsersChanged: true,
                    SessionsChanged: false);
            }

            return new AuthDataUpdate<LoginResult>(
                new LoginResult(LoginStatus.InvalidCredentials),
                UsersChanged: true,
                SessionsChanged: false);
        }

        var userChanged = hadExpiredLock || user.FailedLoginAttempts > 0;
        user.FailedLoginAttempts = 0;
        user.LockedUntilUtc = null;
        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, password);
            userChanged = true;
        }

        var sessionId = Guid.NewGuid();
        var expiresAt = now.AddHours(jwtOptions.ExpirationHours);
        var token = CreateToken(user.UserId, sessionId, now, expiresAt);

        sessions.UserSessions.Add(new UserSession
        {
            SessionId = sessionId,
            UserId = user.UserId,
            LoggedInAtUtc = now,
            ExpiresAtUtc = expiresAt
        });

        var response = new LoginResponse(token, "Bearer", expiresAt);
        return new AuthDataUpdate<LoginResult>(
            new LoginResult(LoginStatus.Succeeded, response),
            UsersChanged: userChanged,
            SessionsChanged: true);
    }

    private string CreateToken(
        Guid userId,
        Guid sessionId,
        DateTimeOffset issuedAt,
        DateTimeOffset expiresAt)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("userId", userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, sessionId.ToString()),
            new Claim(
                JwtRegisteredClaimNames.Iat,
                issuedAt.ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64)
        };
        var signingKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtOptions.SigningKey));
        var credentials = new SigningCredentials(
            signingKey,
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: jwtOptions.Issuer,
            audience: jwtOptions.Audience,
            claims: claims,
            notBefore: issuedAt.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
