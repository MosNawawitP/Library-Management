namespace LibraryManagement.Api.Features.Dashboard;

public sealed record DashboardResponse(
    DashboardSummaryResponse Summary,
    IReadOnlyList<RecentBookResponse> RecentBooks);

public sealed record DashboardSummaryResponse(
    int TotalBooks,
    long TotalBookCopies,
    int TotalCategories);

public sealed record RecentBookResponse(
    Guid Id,
    string BookCode,
    string Title,
    string Author,
    Guid CategoryId,
    string CategoryName,
    int TotalCopies,
    DateTimeOffset CreatedAt);
