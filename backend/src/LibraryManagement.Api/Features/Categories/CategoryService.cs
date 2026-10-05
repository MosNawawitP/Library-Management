using LibraryManagement.Api.Data.Categories;
using LibraryManagement.Api.Data.Library;

namespace LibraryManagement.Api.Features.Categories;

public sealed class CategoryService(
    ILibraryRepository repository,
    TimeProvider timeProvider)
{
    public Task<CategoryListResult> GetCategoriesAsync(
        string? search,
        int page,
        int pageSize,
        bool usePagination,
        CancellationToken cancellationToken)
    {
        var normalizedSearch = string.IsNullOrWhiteSpace(search)
            ? null
            : search.Trim();

        return repository.ReadAsync(
            data => BuildCategoryList(
                data,
                normalizedSearch,
                page,
                pageSize,
                usePagination),
            cancellationToken);
    }

    public Task<CategoryResponse?> GetCategoryAsync(
        Guid id,
        CancellationToken cancellationToken) =>
        repository.ReadAsync(
            data =>
            {
                var category = data.Categories.SingleOrDefault(candidate => candidate.Id == id);
                return category is null ? null : MapCategory(category);
            },
            cancellationToken);

    public Task<CategoryCommandResult> CreateCategoryAsync(
        string name,
        CancellationToken cancellationToken) =>
        repository.UpdateAsync(
            data => CreateCategory(data, name.Trim()),
            cancellationToken);

    public Task<CategoryCommandResult> UpdateCategoryAsync(
        Guid id,
        string name,
        CancellationToken cancellationToken) =>
        repository.UpdateAsync(
            data => UpdateCategory(data, id, name.Trim()),
            cancellationToken);

    public Task<CategoryCommandResult> DeleteCategoryAsync(
        Guid id,
        CancellationToken cancellationToken) =>
        repository.UpdateAsync(
            data => DeleteCategory(data, id),
            cancellationToken);

    private static CategoryListResult BuildCategoryList(
        LibraryData data,
        string? search,
        int page,
        int pageSize,
        bool usePagination)
    {
        var categories = data.Categories
            .Where(category => search is null ||
                category.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
            .OrderBy(category => category.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(category => category.Id)
            .ToList();

        if (!usePagination)
        {
            return new CategoryListResult(
                categories.Select(MapCategory).ToList(),
                Pagination: null);
        }

        var totalItems = categories.Count;
        var totalPages = totalItems == 0
            ? 0
            : (int)Math.Ceiling(totalItems / (double)pageSize);
        var offset = (long)(page - 1) * pageSize;
        var items = offset >= totalItems
            ? []
            : categories
                .Skip((int)offset)
                .Take(pageSize)
                .Select(MapCategory)
                .ToList();

        return new CategoryListResult(
            items,
            new CategoryPaginationResponse(
                page,
                pageSize,
                totalItems,
                totalPages));
    }

    private LibraryDataUpdate<CategoryCommandResult> CreateCategory(
        LibraryData data,
        string name)
    {
        if (HasDuplicateName(data, name))
        {
            return Unchanged(CategoryCommandStatus.DuplicateName);
        }

        var category = new CategoryData
        {
            Id = Guid.NewGuid(),
            Name = name,
            CreatedAt = timeProvider.GetUtcNow()
        };
        data.Categories.Add(category);

        return Changed(new CategoryCommandResult(
            CategoryCommandStatus.Succeeded,
            MapCategory(category)));
    }

    private LibraryDataUpdate<CategoryCommandResult> UpdateCategory(
        LibraryData data,
        Guid id,
        string name)
    {
        var category = data.Categories.SingleOrDefault(candidate => candidate.Id == id);
        if (category is null)
        {
            return Unchanged(CategoryCommandStatus.NotFound);
        }

        if (HasDuplicateName(data, name, id))
        {
            return Unchanged(CategoryCommandStatus.DuplicateName);
        }

        category.Name = name;
        category.UpdatedAt = timeProvider.GetUtcNow();

        return Changed(new CategoryCommandResult(
            CategoryCommandStatus.Succeeded,
            MapCategory(category)));
    }

    private static LibraryDataUpdate<CategoryCommandResult> DeleteCategory(
        LibraryData data,
        Guid id)
    {
        var category = data.Categories.SingleOrDefault(candidate => candidate.Id == id);
        if (category is null)
        {
            return Unchanged(CategoryCommandStatus.NotFound);
        }

        if (data.Books.Any(book => book.CategoryId == id))
        {
            return Unchanged(CategoryCommandStatus.ReferencedByBooks);
        }

        data.Categories.Remove(category);
        return Changed(new CategoryCommandResult(CategoryCommandStatus.Succeeded));
    }

    private static bool HasDuplicateName(
        LibraryData data,
        string name,
        Guid? excludedId = null) =>
        data.Categories.Any(category =>
            category.Id != excludedId &&
            string.Equals(category.Name, name, StringComparison.OrdinalIgnoreCase));

    private static CategoryResponse MapCategory(CategoryData category) =>
        new(
            category.Id,
            category.Name,
            category.CreatedAt,
            category.UpdatedAt);

    private static LibraryDataUpdate<CategoryCommandResult> Unchanged(
        CategoryCommandStatus status) =>
        new(new CategoryCommandResult(status), Changed: false);

    private static LibraryDataUpdate<CategoryCommandResult> Changed(
        CategoryCommandResult result) =>
        new(result, Changed: true);
}
