namespace LibraryManagement.Api.Data.Auth;

public sealed class UserData
{
    public int SchemaVersion { get; set; } = 1;

    public List<AuthUser> Users { get; set; } = [];
}

public sealed class UserSessionData
{
    public int SchemaVersion { get; set; } = 1;

    public List<UserSession> UserSessions { get; set; } = [];
}

public sealed class AuthUser
{
    public Guid UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string NormalizedUsername { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public int FailedLoginAttempts { get; set; }

    public DateTimeOffset? LockedUntilUtc { get; set; }
}

public sealed class UserSession
{
    public Guid SessionId { get; set; }

    public Guid UserId { get; set; }

    public DateTimeOffset LoggedInAtUtc { get; set; }

    public DateTimeOffset ExpiresAtUtc { get; set; }
}
