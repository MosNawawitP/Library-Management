namespace LibraryManagement.Api.Data.Categories;

public sealed class CategoryData
{
    public const int MaximumNameLength = 100;

    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
