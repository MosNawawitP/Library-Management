using System.Text.Json;
using LibraryManagement.Api.Data.Books;
using LibraryManagement.Api.Data.Categories;
using LibraryManagement.Api.Data.Loans;

namespace LibraryManagement.Api.Data.Library;

public sealed class LibraryData
{
    public int SchemaVersion { get; set; } = 1;

    public List<CategoryData> Categories { get; set; } = [];

    public List<BookData> Books { get; set; } = [];

    public List<JsonElement> BookCopies { get; set; } = [];

    public List<JsonElement> Members { get; set; } = [];

    public List<LoanData> Loans { get; set; } = [];

    public List<JsonElement> Reservations { get; set; } = [];
}
