using System.Text.Json;
using LibraryManagement.Api.Data.Categories;

namespace LibraryManagement.Api.Data.Library;

public sealed class JsonLibraryRepository : ILibraryRepository, IDisposable
{
    private const int SupportedSchemaVersion = 1;

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly string _dataDirectory;
    private readonly string _filePath;
    private readonly string _seedPath;
    private readonly TimeProvider _timeProvider;

    public JsonLibraryRepository(
        IWebHostEnvironment environment,
        IConfiguration configuration,
        TimeProvider timeProvider)
    {
        _timeProvider = timeProvider;

        var configuredDirectory = configuration["Storage:DataDirectory"];
        if (string.IsNullOrWhiteSpace(configuredDirectory))
        {
            throw new InvalidOperationException("Storage:DataDirectory is required.");
        }

        _dataDirectory = Path.IsPathRooted(configuredDirectory)
            ? configuredDirectory
            : Path.GetFullPath(configuredDirectory, environment.ContentRootPath);

        var fileName = configuration["Storage:LibraryFileName"] ?? "library.json";
        if (!string.Equals(Path.GetFileName(fileName), fileName, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Storage:LibraryFileName must be a file name without a directory path.");
        }

        _filePath = Path.Combine(_dataDirectory, fileName);
        _seedPath = Path.Combine(environment.ContentRootPath, "Seed", "library.seed.json");
    }

    public async Task<TResult> ReadAsync<TResult>(
        Func<LibraryData, TResult> read,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(read);

        await _lock.WaitAsync(cancellationToken);
        try
        {
            var data = await LoadAsync(cancellationToken);
            return read(data);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<TResult> UpdateAsync<TResult>(
        Func<LibraryData, LibraryDataUpdate<TResult>> update,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(update);

        await _lock.WaitAsync(cancellationToken);
        try
        {
            var data = await LoadAsync(cancellationToken);
            var changes = update(data);

            if (changes.Changed)
            {
                Validate(data);
                await WriteAtomicallyAsync(data, _filePath, cancellationToken);
            }

            return changes.Result;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task CheckHealthAsync(CancellationToken cancellationToken)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            _ = await LoadAsync(cancellationToken);
            Directory.CreateDirectory(_dataDirectory);

            var probePath = Path.Combine(
                _dataDirectory,
                $".{Path.GetFileName(_filePath)}.{Guid.NewGuid():N}.health");
            try
            {
                await File.WriteAllTextAsync(probePath, string.Empty, cancellationToken);
            }
            finally
            {
                if (File.Exists(probePath))
                {
                    File.Delete(probePath);
                }
            }
        }
        finally
        {
            _lock.Release();
        }
    }

    public void Dispose() => _lock.Dispose();

    private async Task<LibraryData> LoadAsync(CancellationToken cancellationToken)
    {
        var fileExists = File.Exists(_filePath);
        var sourcePath = fileExists ? _filePath : _seedPath;
        var data = await ReadJsonAsync(sourcePath, cancellationToken);
        var migratedCategories = MigrateLegacyCategoryTimestamps(data);
        Validate(data);

        if (!fileExists || migratedCategories)
        {
            await WriteAtomicallyAsync(data, _filePath, cancellationToken);
        }

        return data;
    }

    private static async Task<LibraryData> ReadJsonAsync(
        string path,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
        {
            throw new InvalidOperationException(
                $"Required library data file was not found: {path}");
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
            var data = await JsonSerializer.DeserializeAsync<LibraryData>(
                stream,
                SerializerOptions,
                cancellationToken);

            return data ?? throw new InvalidDataException(
                $"Library data is empty: {path}");
        }
        catch (JsonException exception)
        {
            throw new InvalidDataException(
                $"Library data is not valid JSON: {path}",
                exception);
        }
    }

    // Compatibility migration for category records created before Categories CRUD
    // introduced timestamps. Remove after all persisted snapshots have migrated.
    private bool MigrateLegacyCategoryTimestamps(LibraryData data)
    {
        if (data.Categories is null)
        {
            return false;
        }

        var categoriesMissingCreatedAt = data.Categories
            .Where(category => category.CreatedAt == default)
            .ToList();
        if (categoriesMissingCreatedAt.Count == 0)
        {
            return false;
        }

        var migratedAt = _timeProvider.GetUtcNow();
        foreach (var category in categoriesMissingCreatedAt)
        {
            category.CreatedAt = migratedAt;
        }

        return true;
    }

    private static async Task WriteAtomicallyAsync(
        LibraryData data,
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

    private static void Validate(LibraryData data)
    {
        if (data.SchemaVersion != SupportedSchemaVersion)
        {
            throw new InvalidDataException(
                $"Library schema version {data.SchemaVersion} is not supported.");
        }

        if (data.Categories is null ||
            data.Books is null ||
            data.BookCopies is null ||
            data.Members is null ||
            data.Loans is null ||
            data.Reservations is null)
        {
            throw new InvalidDataException("Library data collections cannot be null.");
        }

        var categoryIds = new HashSet<Guid>();
        var categoryNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var category in data.Categories)
        {
            if (category.Id == Guid.Empty ||
                string.IsNullOrWhiteSpace(category.Name) ||
                category.Name.Length > CategoryData.MaximumNameLength ||
                !string.Equals(category.Name, category.Name.Trim(), StringComparison.Ordinal) ||
                category.CreatedAt == default ||
                category.CreatedAt.Offset != TimeSpan.Zero ||
                category.UpdatedAt?.Offset is { } updatedOffset && updatedOffset != TimeSpan.Zero ||
                category.UpdatedAt < category.CreatedAt)
            {
                throw new InvalidDataException("Library data contains an invalid category.");
            }

            if (!categoryIds.Add(category.Id) || !categoryNames.Add(category.Name.Trim()))
            {
                throw new InvalidDataException("Library data contains duplicate categories.");
            }
        }

        var bookIds = new HashSet<Guid>();
        var bookCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var book in data.Books)
        {
            if (book.Id == Guid.Empty ||
                string.IsNullOrWhiteSpace(book.BookCode) ||
                string.IsNullOrWhiteSpace(book.Title) ||
                string.IsNullOrWhiteSpace(book.Author) ||
                !categoryIds.Contains(book.CategoryId) ||
                book.TotalCopies <= 0 ||
                book.CreatedAt.Offset != TimeSpan.Zero ||
                book.UpdatedAt?.Offset is { } offset && offset != TimeSpan.Zero ||
                book.UpdatedAt < book.CreatedAt)
            {
                throw new InvalidDataException("Library data contains an invalid book.");
            }

            if (!bookIds.Add(book.Id) || !bookCodes.Add(book.BookCode.Trim()))
            {
                throw new InvalidDataException("Library data contains duplicate books or book codes.");
            }
        }

        var loanIds = new HashSet<Guid>();
        var activeLoanCounts = new Dictionary<Guid, int>();
        foreach (var loan in data.Loans)
        {
            if (loan.Id == Guid.Empty ||
                !bookIds.Contains(loan.BookId) ||
                !loanIds.Add(loan.Id))
            {
                throw new InvalidDataException(
                    "Library data contains an invalid loan or unknown bookId relation.");
            }

            if (loan.ReturnedAt is null)
            {
                activeLoanCounts[loan.BookId] =
                    activeLoanCounts.GetValueOrDefault(loan.BookId) + 1;
            }
        }

        if (data.Books.Any(book =>
                activeLoanCounts.GetValueOrDefault(book.Id) > book.TotalCopies))
        {
            throw new InvalidDataException(
                "Library data contains more active loans than available copies.");
        }
    }
}
