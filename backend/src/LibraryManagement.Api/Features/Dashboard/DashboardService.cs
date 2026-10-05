using LibraryManagement.Api.Data.Books;
using LibraryManagement.Api.Data.Library;

namespace LibraryManagement.Api.Features.Dashboard;

public sealed class DashboardService(ILibraryRepository repository)
{
    private const int RecentBookLimit = 5;

    public Task<DashboardResponse> GetDashboardAsync(
        CancellationToken cancellationToken) =>
        repository.ReadAsync(BuildDashboard, cancellationToken);

    private static DashboardResponse BuildDashboard(LibraryData data)
    {
        var categoryNames = data.Categories.ToDictionary(
            category => category.Id,
            category => category.Name);
        var summary = new DashboardSummaryResponse(
            data.Books.Count,
            data.Books.Sum(book => (long)book.TotalCopies),
            data.Categories.Count);
        var recentBooks = data.Books
            .OrderByDescending(book => book.CreatedAt)
            .ThenBy(book => book.Id)
            .Take(RecentBookLimit)
            .Select(book => MapRecentBook(book, categoryNames[book.CategoryId]))
            .ToList();

        return new DashboardResponse(summary, recentBooks);
    }

    private static RecentBookResponse MapRecentBook(
        BookData book,
        string categoryName) =>
        new(
            book.Id,
            book.BookCode,
            book.Title,
            book.Author,
            book.CategoryId,
            categoryName,
            book.TotalCopies,
            book.CreatedAt);
}
