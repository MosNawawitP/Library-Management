namespace LibraryManagement.Api.Data.Library;

public interface ILibraryRepository
{
    Task<TResult> ReadAsync<TResult>(
        Func<LibraryData, TResult> read,
        CancellationToken cancellationToken);

    Task<TResult> UpdateAsync<TResult>(
        Func<LibraryData, LibraryDataUpdate<TResult>> update,
        CancellationToken cancellationToken);

    Task CheckHealthAsync(CancellationToken cancellationToken);
}

public readonly record struct LibraryDataUpdate<TResult>(
    TResult Result,
    bool Changed);
