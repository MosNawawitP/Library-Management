namespace LibraryManagement.Api.Features.Categories;

public sealed class CategoryQueryRequest
{
    public string? Search { get; init; }

    public int? Page { get; init; }

    public int? PageSize { get; init; }
}

public sealed record CreateCategoryRequest(string? Name);

public sealed record UpdateCategoryRequest(string? Name);

public sealed record CategoryResponse(
    Guid Id,
    string Name,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record CategoryPaginationResponse(
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);

public sealed record CategoryListResult(
    IReadOnlyList<CategoryResponse> Items,
    CategoryPaginationResponse? Pagination);

public enum CategoryCommandStatus
{
    Succeeded,
    NotFound,
    DuplicateName,
    ReferencedByBooks
}

public sealed record CategoryCommandResult(
    CategoryCommandStatus Status,
    CategoryResponse? Category = null);
