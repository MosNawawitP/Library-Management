namespace LibraryManagement.Api.Data.Auth;

public interface IAuthRepository
{
    Task<TResult> ReadAsync<TResult>(
        Func<UserData, UserSessionData, TResult> read,
        CancellationToken cancellationToken);

    Task<TResult> UpdateAsync<TResult>(
        Func<UserData, UserSessionData, AuthDataUpdate<TResult>> update,
        CancellationToken cancellationToken);
}

public readonly record struct AuthDataUpdate<TResult>(
    TResult Result,
    bool UsersChanged,
    bool SessionsChanged);
