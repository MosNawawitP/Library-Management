using LibraryManagement.Api.Common.Contracts;

namespace LibraryManagement.Api.Features.Books;

public static class BookEndpoints
{
    public static IEndpointRouteBuilder MapBookEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/books")
            .WithTags("Books")
            .RequireAuthorization();

        group.MapGet("/", GetBooksAsync)
            .WithName("GetBooks")
            .Produces<ApiResponse<IReadOnlyList<BookResponse>>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{id:guid}", GetBookAsync)
            .WithName("GetBook")
            .Produces<ApiResponse<BookResponse>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", CreateBookAsync)
            .WithName("CreateBook")
            .Produces<ApiResponse<BookResponse>>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", UpdateBookAsync)
            .WithName("UpdateBook")
            .Produces<ApiResponse<BookResponse>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapDelete("/{id:guid}", DeleteBookAsync)
            .WithName("DeleteBook")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        return endpoints;
    }

    private static async Task<IResult> GetBooksAsync(
        [AsParameters] BookListQuery query,
        BookService bookService,
        CancellationToken cancellationToken)
    {
        var page = query.Page ?? 1;
        var pageSize = query.PageSize ?? 10;

        if (page < 1 || pageSize is < 1 or > 100)
        {
            return ValidationError(new Dictionary<string, string[]>
            {
                [nameof(query.Page)] = page < 1 ? ["Page must be at least 1."] : [],
                [nameof(query.PageSize)] = pageSize is < 1 or > 100
                    ? ["PageSize must be between 1 and 100."]
                    : []
            }.Where(pair => pair.Value.Length > 0)
             .ToDictionary(pair => pair.Key, pair => pair.Value));
        }

        var result = await bookService.GetBooksAsync(
            query.Search,
            query.CategoryId,
            page,
            pageSize,
            cancellationToken);

        if (!result.CategoryExists)
        {
            return ValidationError(new Dictionary<string, string[]>
            {
                [nameof(query.CategoryId)] = ["CategoryId does not reference an existing category."]
            });
        }

        return Results.Ok(new ApiResponse<IReadOnlyList<BookResponse>>(
            true,
            "Books retrieved successfully.",
            result.Items,
            result.Pagination));
    }

    private static async Task<IResult> GetBookAsync(
        Guid id,
        BookService bookService,
        CancellationToken cancellationToken)
    {
        var book = await bookService.GetBookAsync(id, cancellationToken);
        return book is null
            ? NotFound()
            : Results.Ok(Success("Book retrieved successfully.", book));
    }

    private static async Task<IResult> CreateBookAsync(
        CreateBookRequest request,
        BookService bookService,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request);
        if (errors.Count > 0)
        {
            return ValidationError(errors);
        }

        var result = await bookService.CreateBookAsync(
            ToInput(request),
            cancellationToken);

        return result.Status switch
        {
            BookCommandStatus.Succeeded => Results.Created(
                $"/api/books/{result.Book!.Id}",
                Success("Book created successfully.", result.Book)),
            BookCommandStatus.UnknownCategory => UnknownCategory(),
            BookCommandStatus.DuplicateBookCode => Conflict(
                "A book with the same bookCode already exists."),
            _ => throw new InvalidOperationException(
                $"Unexpected create book result: {result.Status}.")
        };
    }

    private static async Task<IResult> UpdateBookAsync(
        Guid id,
        UpdateBookRequest request,
        BookService bookService,
        CancellationToken cancellationToken)
    {
        var errors = Validate(request);
        if (errors.Count > 0)
        {
            return ValidationError(errors);
        }

        var result = await bookService.UpdateBookAsync(
            id,
            ToInput(request),
            cancellationToken);

        return result.Status switch
        {
            BookCommandStatus.Succeeded => Results.Ok(
                Success("Book updated successfully.", result.Book!)),
            BookCommandStatus.NotFound => NotFound(),
            BookCommandStatus.UnknownCategory => UnknownCategory(),
            BookCommandStatus.DuplicateBookCode => Conflict(
                "A book with the same bookCode already exists."),
            BookCommandStatus.TotalCopiesBelowActiveLoans => Conflict(
                "TotalCopies cannot be lower than the number of active loans."),
            _ => throw new InvalidOperationException(
                $"Unexpected update book result: {result.Status}.")
        };
    }

    private static async Task<IResult> DeleteBookAsync(
        Guid id,
        BookService bookService,
        CancellationToken cancellationToken)
    {
        var result = await bookService.DeleteBookAsync(id, cancellationToken);
        return result.Status switch
        {
            BookCommandStatus.Succeeded => Results.NoContent(),
            BookCommandStatus.NotFound => NotFound(),
            BookCommandStatus.HasLoanHistory => Conflict(
                "A book with loan history cannot be deleted."),
            _ => throw new InvalidOperationException(
                $"Unexpected delete book result: {result.Status}.")
        };
    }

    private static Dictionary<string, string[]> Validate(CreateBookRequest request) =>
        Validate(
            request.BookCode,
            request.Title,
            request.Author,
            request.CategoryId,
            request.TotalCopies);

    private static Dictionary<string, string[]> Validate(UpdateBookRequest request) =>
        Validate(
            request.BookCode,
            request.Title,
            request.Author,
            request.CategoryId,
            request.TotalCopies);

    private static Dictionary<string, string[]> Validate(
        string? bookCode,
        string? title,
        string? author,
        Guid categoryId,
        int totalCopies)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (string.IsNullOrWhiteSpace(bookCode))
        {
            errors[nameof(bookCode)] = ["BookCode is required."];
        }

        if (string.IsNullOrWhiteSpace(title))
        {
            errors[nameof(title)] = ["Title is required."];
        }

        if (string.IsNullOrWhiteSpace(author))
        {
            errors[nameof(author)] = ["Author is required."];
        }

        if (categoryId == Guid.Empty)
        {
            errors[nameof(categoryId)] = ["CategoryId is required."];
        }

        if (totalCopies <= 0)
        {
            errors[nameof(totalCopies)] = ["TotalCopies must be a positive integer."];
        }

        return errors;
    }

    private static BookInput ToInput(CreateBookRequest request) =>
        new(
            request.BookCode!,
            request.Title!,
            request.Author!,
            request.Isbn,
            request.CategoryId,
            request.TotalCopies);

    private static BookInput ToInput(UpdateBookRequest request) =>
        new(
            request.BookCode!,
            request.Title!,
            request.Author!,
            request.Isbn,
            request.CategoryId,
            request.TotalCopies);

    private static ApiResponse<BookResponse> Success(
        string message,
        BookResponse book) =>
        new(true, message, book, null);

    private static IResult ValidationError(Dictionary<string, string[]> errors) =>
        Results.BadRequest(new
        {
            message = "One or more validation errors occurred.",
            errors
        });

    private static IResult UnknownCategory() =>
        ValidationError(new Dictionary<string, string[]>
        {
            ["categoryId"] = ["CategoryId does not reference an existing category."]
        });

    private static IResult NotFound() =>
        Results.NotFound(new { message = "Book was not found." });

    private static IResult Conflict(string message) =>
        Results.Conflict(new { message });
}
