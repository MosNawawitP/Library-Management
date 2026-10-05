namespace LibraryManagement.Api.Features.Books;

public sealed class BookListQuery
{
    public string? Search { get; init; }

    public Guid? CategoryId { get; init; }

    public int? Page { get; init; }

    public int? PageSize { get; init; }
}

public sealed record CreateBookRequest(
    string? BookCode,
    string? Title,
    string? Author,
    string? Isbn,
    Guid CategoryId,
    int TotalCopies);

public sealed record UpdateBookRequest(
    string? BookCode,
    string? Title,
    string? Author,
    string? Isbn,
    Guid CategoryId,
    int TotalCopies);

public sealed record BookResponse(
    Guid Id,
    string BookCode,
    string Title,
    string Author,
    string? Isbn,
    Guid CategoryId,
    string CategoryName,
    int TotalCopies,
    int AvailableCopies,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record PaginationResponse(
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public sealed record BookListResult(
    IReadOnlyList<BookResponse> Items,
    PaginationResponse Pagination,
    bool CategoryExists);

public enum BookCommandStatus
{
    Succeeded,
    NotFound,
    UnknownCategory,
    DuplicateBookCode,
    TotalCopiesBelowActiveLoans,
    HasLoanHistory
}

public sealed record BookCommandResult(
    BookCommandStatus Status,
    BookResponse? Book = null);

public sealed record BookInput(
    string BookCode,
    string Title,
    string Author,
    string? Isbn,
    Guid CategoryId,
    int TotalCopies);
