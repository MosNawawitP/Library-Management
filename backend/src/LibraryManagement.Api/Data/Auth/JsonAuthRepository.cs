using System.Text.Json;

namespace LibraryManagement.Api.Data.Auth;

public sealed class JsonAuthRepository : IAuthRepository, IDisposable
{
    private const int SupportedSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly string _userFilePath;
    private readonly string _userSessionFilePath;
    private readonly string _userSeedPath;
    private readonly string _userSessionSeedPath;

    public JsonAuthRepository(
        IWebHostEnvironment environment,
        IConfiguration configuration)
    {
        var configuredDirectory = configuration["Storage:DataDirectory"];
        if (string.IsNullOrWhiteSpace(configuredDirectory))
        {
            throw new InvalidOperationException("Storage:DataDirectory is required.");
        }

        var dataDirectory = Path.IsPathRooted(configuredDirectory)
            ? configuredDirectory
            : Path.GetFullPath(configuredDirectory, environment.ContentRootPath);
        var userFileName = GetFileName(configuration, "Storage:AuthFileName", "user.json");
        var sessionFileName = GetFileName(
            configuration,
            "Storage:UserSessionFileName",
            "userSession.json");

        if (string.Equals(userFileName, sessionFileName, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "User and user session data must use different file names.");
        }

        _userFilePath = Path.Combine(dataDirectory, userFileName);
        _userSessionFilePath = Path.Combine(dataDirectory, sessionFileName);
        _userSeedPath = Path.Combine(environment.ContentRootPath, "Seed", "user.seed.json");
        _userSessionSeedPath = Path.Combine(
            environment.ContentRootPath,
            "Seed",
            "userSession.seed.json");
    }

    public async Task<TResult> ReadAsync<TResult>(
        Func<UserData, UserSessionData, TResult> read,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(read);

        await _lock.WaitAsync(cancellationToken);
        try
        {
            var store = await LoadStoreAsync(cancellationToken);
            return read(store.Users, store.Sessions);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<TResult> UpdateAsync<TResult>(
        Func<UserData, UserSessionData, AuthDataUpdate<TResult>> update,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(update);

        await _lock.WaitAsync(cancellationToken);
        try
        {
            var store = await LoadStoreAsync(cancellationToken);
            var changes = update(store.Users, store.Sessions);

            ValidateChanges(store, changes);
            await SaveChangesAsync(store, changes, cancellationToken);

            return changes.Result;
        }
        finally
        {
            _lock.Release();
        }
    }

    public void Dispose() => _lock.Dispose();

    private async Task<AuthStore> LoadStoreAsync(
        CancellationToken cancellationToken)
    {
        var userFileExists = File.Exists(_userFilePath);
        var storedUsers = await ReadJsonAsync<StoredUserFile>(
            userFileExists ? _userFilePath : _userSeedPath,
            cancellationToken);
        var users = new UserData
        {
            SchemaVersion = storedUsers.SchemaVersion,
            Users = storedUsers.Users ?? []
        };
        ValidateUsers(users);

        if (!userFileExists)
        {
            await WriteJsonAtomicallyAsync(users, _userFilePath, cancellationToken);
        }

        var sessionFileExists = File.Exists(_userSessionFilePath);
        var sessions = sessionFileExists
            ? await ReadJsonAsync<UserSessionData>(
                _userSessionFilePath,
                cancellationToken)
            : await ReadJsonAsync<UserSessionData>(
                _userSessionSeedPath,
                cancellationToken);

        var migratedSessions = MergeLegacySessions(
            sessions,
            storedUsers.UserSessions);
        ValidateSessions(sessions, users);

        if (!sessionFileExists || migratedSessions)
        {
            await WriteJsonAtomicallyAsync(
                sessions,
                _userSessionFilePath,
                cancellationToken);
        }

        if (storedUsers.UserSessions is not null)
        {
            // Rewriting removes the legacy userSessions property from user.json.
            await WriteJsonAtomicallyAsync(users, _userFilePath, cancellationToken);
        }

        return new AuthStore(users, sessions);
    }

    private async Task SaveChangesAsync<TResult>(
        AuthStore store,
        AuthDataUpdate<TResult> changes,
        CancellationToken cancellationToken)
    {
        if (changes.UsersChanged)
        {
            await WriteJsonAtomicallyAsync(
                store.Users,
                _userFilePath,
                cancellationToken);
        }

        if (changes.SessionsChanged)
        {
            await WriteJsonAtomicallyAsync(
                store.Sessions,
                _userSessionFilePath,
                cancellationToken);
        }
    }

    private static void ValidateChanges<TResult>(
        AuthStore store,
        AuthDataUpdate<TResult> changes)
    {
        if (changes.UsersChanged)
        {
            ValidateUsers(store.Users);
        }

        if (changes.UsersChanged || changes.SessionsChanged)
        {
            ValidateSessions(store.Sessions, store.Users);
        }
    }

    private static bool MergeLegacySessions(
        UserSessionData sessions,
        List<UserSession>? legacySessions)
    {
        if (legacySessions is null)
        {
            return false;
        }

        var knownSessionIds = sessions.UserSessions
            .Select(session => session.SessionId)
            .ToHashSet();
        var changed = false;

        foreach (var session in legacySessions)
        {
            if (knownSessionIds.Add(session.SessionId))
            {
                sessions.UserSessions.Add(session);
                changed = true;
            }
        }

        return changed;
    }

    private static async Task<T> ReadJsonAsync<T>(
        string path,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
        {
            throw new InvalidOperationException(
                $"Required authentication data file was not found: {path}");
        }

        try
        {
            await using var stream = new FileStream(
                path,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 4096,
                FileOptions.Asynchronous | FileOptions.SequentialScan);
            var data = await JsonSerializer.DeserializeAsync<T>(
                stream,
                SerializerOptions,
                cancellationToken);

            return data ?? throw new InvalidDataException(
                $"Authentication data is empty: {path}");
        }
        catch (JsonException exception)
        {
            throw new InvalidDataException(
                $"Authentication data is not valid JSON: {path}",
                exception);
        }
    }

    private static async Task WriteJsonAtomicallyAsync<T>(
        T data,
        string filePath,
        CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(filePath)!;
        Directory.CreateDirectory(directory);
        var temporaryPath = Path.Combine(
            directory,
            $"{Path.GetFileName(filePath)}.{Guid.NewGuid():N}.tmp");

        try
        {
            await using (var stream = new FileStream(
                temporaryPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 4096,
                FileOptions.Asynchronous | FileOptions.WriteThrough))
            {
                await JsonSerializer.SerializeAsync(
                    stream,
                    data,
                    SerializerOptions,
                    cancellationToken);
                await stream.FlushAsync(cancellationToken);
            }

            File.Move(temporaryPath, filePath, overwrite: true);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }
        }
    }

    private static void ValidateUsers(UserData data)
    {
        EnsureSupportedSchema(data.SchemaVersion, "User");
        if (data.Users is null)
        {
            throw new InvalidDataException("User collection cannot be null.");
        }

        var userIds = new HashSet<Guid>();
        var usernames = new HashSet<string>(StringComparer.Ordinal);

        foreach (var user in data.Users)
        {
            if (user.UserId == Guid.Empty ||
                string.IsNullOrWhiteSpace(user.Username) ||
                string.IsNullOrWhiteSpace(user.NormalizedUsername) ||
                string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                throw new InvalidDataException("User data contains an invalid user.");
            }

            if (!userIds.Add(user.UserId))
            {
                throw new InvalidDataException("User data contains duplicate user IDs.");
            }

            if (!usernames.Add(user.NormalizedUsername))
            {
                throw new InvalidDataException("User data contains duplicate usernames.");
            }
        }
    }

    private static void ValidateSessions(
        UserSessionData data,
        UserData users)
    {
        EnsureSupportedSchema(data.SchemaVersion, "User session");
        if (data.UserSessions is null)
        {
            throw new InvalidDataException("User session collection cannot be null.");
        }

        var userIds = users.Users.Select(user => user.UserId).ToHashSet();
        var sessionIds = new HashSet<Guid>();

        foreach (var session in data.UserSessions)
        {
            if (session.SessionId == Guid.Empty ||
                !userIds.Contains(session.UserId) ||
                session.ExpiresAtUtc <= session.LoggedInAtUtc)
            {
                throw new InvalidDataException(
                    "User session data contains an invalid session or unknown userId relation.");
            }

            if (!sessionIds.Add(session.SessionId))
            {
                throw new InvalidDataException(
                    "User session data contains duplicate session IDs.");
            }
        }
    }

    private static void EnsureSupportedSchema(int version, string dataName)
    {
        if (version != SupportedSchemaVersion)
        {
            throw new InvalidDataException(
                $"{dataName} schema version {version} is not supported.");
        }
    }

    private static string GetFileName(
        IConfiguration configuration,
        string key,
        string defaultValue)
    {
        var fileName = configuration[key] ?? defaultValue;
        if (!string.Equals(Path.GetFileName(fileName), fileName, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"{key} must be a file name without a directory path.");
        }

        return fileName;
    }

    private sealed record AuthStore(
        UserData Users,
        UserSessionData Sessions);

    private sealed class StoredUserFile
    {
        public int SchemaVersion { get; set; }

        public List<AuthUser>? Users { get; set; }

        // Compatibility only: remove after all runtime files use userSession.json.
        public List<UserSession>? UserSessions { get; set; }
    }
}
