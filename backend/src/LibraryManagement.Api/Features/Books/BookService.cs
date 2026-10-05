using LibraryManagement.Api.Data.Books;
using LibraryManagement.Api.Data.Library;

namespace LibraryManagement.Api.Features.Books;

public sealed class BookService(
    ILibraryRepository repository,
    TimeProvider timeProvider)
{
    public Task<BookListResult> GetBooksAsync(
        string? search,
        Guid? categoryId,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var normalizedSearch = string.IsNullOrWhiteSpace(search)
            ? null
            : search.Trim();

        return repository.ReadAsync(
            data => BuildBookList(
                data,
                normalizedSearch,
                categoryId,
                page,
                pageSize),
            cancellationToken);
    }

    public Task<BookResponse?> GetBookAsync(
        Guid id,
        CancellationToken cancellationToken) =>
        repository.ReadAsync(
            data =>
            {
                var book = data.Books.SingleOrDefault(candidate => candidate.Id == id);
                return book is null ? null : MapBook(data, book);
            },
            cancellationToken);

    public Task<BookCommandResult> CreateBookAsync(
        BookInput input,
        CancellationToken cancellationToken) =>
        repository.UpdateAsync(
            data => CreateBook(data, Normalize(input)),
            cancellationToken);

    public Task<BookCommandResult> UpdateBookAsync(
        Guid id,
        BookInput input,
        CancellationToken cancellationToken) =>
        repository.UpdateAsync(
            data => UpdateBook(data, id, Normalize(input)),
            cancellationToken);

    public Task<BookCommandResult> DeleteBookAsync(
        Guid id,
        CancellationToken cancellationToken) =>
        repository.UpdateAsync(
            data => DeleteBook(data, id),
            cancellationToken);

    private static BookListResult BuildBookList(
        LibraryData data,
        string? search,
        Guid? categoryId,
        int page,
        int pageSize)
    {
        if (categoryId.HasValue &&
            data.Categories.All(category => category.Id != categoryId.Value))
        {
            return new BookListResult(
                [],
                new PaginationResponse(page, pageSize, 0, 0),
                CategoryExists: false);
        }

        IEnumerable<BookData> query = data.Books;
        if (categoryId.HasValue)
        {
            query = query.Where(book => book.CategoryId == categoryId.Value);
        }

        if (search is not null)
        {
            query = query.Where(book =>
                Contains(book.BookCode, search) ||
                Contains(book.Title, search) ||
                Contains(book.Author, search) ||
                book.Isbn is not null && Contains(book.Isbn, search));
        }

        var filteredBooks = query
            .OrderByDescending(book => book.CreatedAt)
            .ThenBy(book => book.Id)
            .ToList();
        var totalItems = filteredBooks.Count;
        var totalPages = totalItems == 0
            ? 0
            : (int)Math.Ceiling(totalItems / (double)pageSize);
        var items = GetPage(data, filteredBooks, page, pageSize);

        return new BookListResult(
            items,
            new PaginationResponse(page, pageSize, totalItems, totalPages),
            CategoryExists: true);
    }

    private static IReadOnlyList<BookResponse> GetPage(
        LibraryData data,
        IReadOnlyList<BookData> books,
        int page,
        int pageSize)
    {
        var offset = (long)(page - 1) * pageSize;
        if (offset >= books.Count)
        {
            return [];
        }

        return books
            .Skip((int)offset)
            .Take(pageSize)
            .Select(book => MapBook(data, book))
            .ToList();
    }

    private LibraryDataUpdate<BookCommandResult> CreateBook(
        LibraryData data,
        BookInput input)
    {
        if (data.Categories.All(category => category.Id != input.CategoryId))
        {
            return Unchanged(BookCommandStatus.UnknownCategory);
        }

        if (HasDuplicateBookCode(data, input.BookCode))
        {
            return Unchanged(BookCommandStatus.DuplicateBookCode);
        }

        var book = new BookData
        {
            Id = Guid.NewGuid(),
            BookCode = input.BookCode,
            Title = input.Title,
            Author = input.Author,
            Isbn = input.Isbn,
            CategoryId = input.CategoryId,
            TotalCopies = input.TotalCopies,
            CreatedAt = timeProvider.GetUtcNow()
        };
        data.Books.Add(book);

        return Changed(new BookCommandResult(
            BookCommandStatus.Succeeded,
            MapBook(data, book)));
    }

    private LibraryDataUpdate<BookCommandResult> UpdateBook(
        LibraryData data,
        Guid id,
        BookInput input)
    {
        var book = data.Books.SingleOrDefault(candidate => candidate.Id == id);
        if (book is null)
        {
            return Unchanged(BookCommandStatus.NotFound);
        }

        if (data.Categories.All(category => category.Id != input.CategoryId))
        {
            return Unchanged(BookCommandStatus.UnknownCategory);
        }

        if (HasDuplicateBookCode(data, input.BookCode, id))
        {
            return Unchanged(BookCommandStatus.DuplicateBookCode);
        }

        var activeLoanCount = CountActiveLoans(data, id);
        if (input.TotalCopies < activeLoanCount)
        {
            return Unchanged(BookCommandStatus.TotalCopiesBelowActiveLoans);
        }

        book.BookCode = input.BookCode;
        book.Title = input.Title;
        book.Author = input.Author;
        book.Isbn = input.Isbn;
        book.CategoryId = input.CategoryId;
        book.TotalCopies = input.TotalCopies;
        book.UpdatedAt = timeProvider.GetUtcNow();

        return Changed(new BookCommandResult(
            BookCommandStatus.Succeeded,
            MapBook(data, book)));
    }

    private static LibraryDataUpdate<BookCommandResult> DeleteBook(
        LibraryData data,
        Guid id)
    {
        var book = data.Books.SingleOrDefault(candidate => candidate.Id == id);
        if (book is null)
        {
            return Unchanged(BookCommandStatus.NotFound);
        }

        if (data.Loans.Any(loan => loan.BookId == id))
        {
            return Unchanged(BookCommandStatus.HasLoanHistory);
        }

        data.Books.Remove(book);
        return Changed(new BookCommandResult(BookCommandStatus.Succeeded));
    }

    private static BookInput Normalize(BookInput input) =>
        input with
        {
            BookCode = input.BookCode.Trim(),
            Title = input.Title.Trim(),
            Author = input.Author.Trim(),
            Isbn = string.IsNullOrWhiteSpace(input.Isbn) ? null : input.Isbn.Trim()
        };

    private static bool HasDuplicateBookCode(
        LibraryData data,
        string bookCode,
        Guid? excludedId = null) =>
        data.Books.Any(book =>
            book.Id != excludedId &&
            string.Equals(
                book.BookCode,
                bookCode,
                StringComparison.OrdinalIgnoreCase));

    private static BookResponse MapBook(LibraryData data, BookData book)
    {
        var categoryName = data.Categories
            .Single(category => category.Id == book.CategoryId)
            .Name;

        return new BookResponse(
            book.Id,
            book.BookCode,
            book.Title,
            book.Author,
            book.Isbn,
            book.CategoryId,
            categoryName,
            book.TotalCopies,
            book.TotalCopies - CountActiveLoans(data, book.Id),
            book.CreatedAt,
            book.UpdatedAt);
    }

    private static int CountActiveLoans(LibraryData data, Guid bookId) =>
        data.Loans.Count(loan => loan.BookId == bookId && loan.ReturnedAt is null);

    private static bool Contains(string value, string search) =>
        value.Contains(search, StringComparison.OrdinalIgnoreCase);

    private static LibraryDataUpdate<BookCommandResult> Unchanged(
        BookCommandStatus status) =>
        new(new BookCommandResult(status), Changed: false);

    private static LibraryDataUpdate<BookCommandResult> Changed(
        BookCommandResult result) =>
        new(result, Changed: true);
}
