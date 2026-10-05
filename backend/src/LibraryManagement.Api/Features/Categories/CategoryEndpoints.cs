using LibraryManagement.Api.Common.Contracts;
using LibraryManagement.Api.Data.Categories;

namespace LibraryManagement.Api.Features.Categories;

public static class CategoryEndpoints
{
    public static IEndpointRouteBuilder MapCategoryEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/categories")
            .WithTags("Categories")
            .RequireAuthorization();

        group.MapGet("/", GetCategoriesAsync)
            .WithName("GetCategories")
            .Produces<ApiResponse<IReadOnlyList<CategoryResponse>>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{id:guid}", GetCategoryAsync)
            .WithName("GetCategory")
            .Produces<ApiResponse<CategoryResponse>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", CreateCategoryAsync)
            .WithName("CreateCategory")
            .Produces<ApiResponse<CategoryResponse>>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", UpdateCategoryAsync)
            .WithName("UpdateCategory")
            .Produces<ApiResponse<CategoryResponse>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        group.MapDelete("/{id:guid}", DeleteCategoryAsync)
            .WithName("DeleteCategory")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status409Conflict);

        return endpoints;
    }

    private static async Task<IResult> GetCategoriesAsync(
        [AsParameters] CategoryQueryRequest query,
        CategoryService categoryService,
        CancellationToken cancellationToken)
    {
        var page = query.Page ?? 1;
        var pageSize = query.PageSize ?? 10;
        var errors = ValidatePagination(page, pageSize);
        if (errors.Count > 0)
        {
            return ValidationError(errors);
        }

        var result = await categoryService.GetCategoriesAsync(
            query.Search,
            page,
            pageSize,
            query.Search is not null || query.Page.HasValue || query.PageSize.HasValue,
            cancellationToken);

        return Results.Ok(new ApiResponse<IReadOnlyList<CategoryResponse>>(
            true,
            "Categories retrieved successfully.",
            result.Items,
            result.Pagination));
    }

    private static async Task<IResult> GetCategoryAsync(
        Guid id,
        CategoryService categoryService,
        CancellationToken cancellationToken)
    {
        var category = await categoryService.GetCategoryAsync(id, cancellationToken);
        return category is null
            ? NotFound()
            : Results.Ok(Success("Category retrieved successfully.", category));
    }

    private static async Task<IResult> CreateCategoryAsync(
        CreateCategoryRequest request,
        CategoryService categoryService,
        CancellationToken cancellationToken)
    {
        var validation = ValidateName(request.Name);
        if (validation.Errors.Count > 0)
        {
            return ValidationError(validation.Errors);
        }

        var result = await categoryService.CreateCategoryAsync(
            validation.Name,
            cancellationToken);

        return result.Status switch
        {
            CategoryCommandStatus.Succeeded => Results.Created(
                $"/api/categories/{result.Category!.Id}",
                Success("Category created successfully.", result.Category)),
            CategoryCommandStatus.DuplicateName => Conflict(
                "A category with the same name already exists."),
            _ => throw new InvalidOperationException(
                $"Unexpected create category result: {result.Status}.")
        };
    }

    private static async Task<IResult> UpdateCategoryAsync(
        Guid id,
        UpdateCategoryRequest request,
        CategoryService categoryService,
        CancellationToken cancellationToken)
    {
        var validation = ValidateName(request.Name);
        if (validation.Errors.Count > 0)
        {
            return ValidationError(validation.Errors);
        }

        var result = await categoryService.UpdateCategoryAsync(
            id,
            validation.Name,
            cancellationToken);

        return result.Status switch
        {
            CategoryCommandStatus.Succeeded => Results.Ok(
                Success("Category updated successfully.", result.Category!)),
            CategoryCommandStatus.NotFound => NotFound(),
            CategoryCommandStatus.DuplicateName => Conflict(
                "A category with the same name already exists."),
            _ => throw new InvalidOperationException(
                $"Unexpected update category result: {result.Status}.")
        };
    }

    private static async Task<IResult> DeleteCategoryAsync(
        Guid id,
        CategoryService categoryService,
        CancellationToken cancellationToken)
    {
        var result = await categoryService.DeleteCategoryAsync(id, cancellationToken);
        return result.Status switch
        {
            CategoryCommandStatus.Succeeded => Results.NoContent(),
            CategoryCommandStatus.NotFound => NotFound(),
            CategoryCommandStatus.ReferencedByBooks => Conflict(
                "A category referenced by one or more books cannot be deleted."),
            _ => throw new InvalidOperationException(
                $"Unexpected delete category result: {result.Status}.")
        };
    }

    private static CategoryNameValidation ValidateName(string? name)
    {
        var normalizedName = name?.Trim() ?? string.Empty;
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (normalizedName.Length == 0)
        {
            errors[nameof(name)] = ["Name is required."];
        }
        else if (normalizedName.Length > CategoryData.MaximumNameLength)
        {
            errors[nameof(name)] = ["Name cannot exceed 100 characters."];
        }

        return new CategoryNameValidation(normalizedName, errors);
    }

    private static Dictionary<string, string[]> ValidatePagination(
        int page,
        int pageSize)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (page < 1)
        {
            errors[nameof(page)] = ["Page must be at least 1."];
        }

        if (pageSize is < 1 or > 100)
        {
            errors[nameof(pageSize)] = ["PageSize must be between 1 and 100."];
        }

        return errors;
    }

    private static ApiResponse<CategoryResponse> Success(
        string message,
        CategoryResponse category) =>
        new(true, message, category, null);

    private static IResult ValidationError(Dictionary<string, string[]> errors) =>
        Results.BadRequest(new
        {
            message = "One or more validation errors occurred.",
            errors
        });

    private static IResult NotFound() =>
        Results.NotFound(new { message = "Category was not found." });

    private static IResult Conflict(string message) =>
        Results.Conflict(new { message });

    private sealed record CategoryNameValidation(
        string Name,
        Dictionary<string, string[]> Errors);
}
