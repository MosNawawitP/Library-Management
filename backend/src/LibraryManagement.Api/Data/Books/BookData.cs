namespace LibraryManagement.Api.Data.Books;

public sealed class BookData
{
    public Guid Id { get; set; }

    public string BookCode { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Author { get; set; } = string.Empty;

    public string? Isbn { get; set; }

    public Guid CategoryId { get; set; }

    public int TotalCopies { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
