namespace LibraryManagement.Api.Data.Loans;

// Loans are not exposed by an API yet. This persisted shape lets Books enforce
// availability and deletion rules when loan data is introduced.
public sealed class LoanData
{
    public Guid Id { get; set; }

    public Guid BookId { get; set; }

    public DateTimeOffset? ReturnedAt { get; set; }
}
