using LibraryManagement.Api.Common.Contracts;
using Microsoft.AspNetCore.Diagnostics;

namespace LibraryManagement.Api.Common.Middleware;

public sealed class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException &&
            httpContext.RequestAborted.IsCancellationRequested)
        {
            return false;
        }

        logger.LogError(
            exception,
            "Unhandled exception while processing {Method} {Path}",
            httpContext.Request.Method,
            httpContext.Request.Path);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var response = new ApiResponse<IReadOnlyDictionary<string, object?>>(
            false,
            "An unexpected error occurred.",
            new Dictionary<string, object?>(),
            null);

        await httpContext.Response.WriteAsJsonAsync(
            response,
            cancellationToken);

        return true;
    }
}
