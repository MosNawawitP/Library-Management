using System.Text;
using System.Text.Json;
using LibraryManagement.Api.Common.Contracts;
using Microsoft.AspNetCore.WebUtilities;

namespace LibraryManagement.Api.Common.Middleware;

public sealed class ApiResponseMiddleware(RequestDelegate next)
{
    private const string SuccessMessage = "Operation completed successfully";

    public async Task InvokeAsync(HttpContext context)
    {
        if (ShouldBypassEnvelope(context.Request))
        {
            await next(context);
            return;
        }

        var originalBody = context.Response.Body;

        await using var responseBuffer = new MemoryStream();
        context.Response.Body = responseBuffer;

        try
        {
            await next(context);
            await WriteEnvelopeAsync(context, originalBody, responseBuffer);
        }
        finally
        {
            context.Response.Body = originalBody;
        }
    }

    private static bool ShouldBypassEnvelope(HttpRequest request) =>
        HttpMethods.IsOptions(request.Method) ||
        request.Path.StartsWithSegments("/openapi");

    private static async Task WriteEnvelopeAsync(
        HttpContext context,
        Stream originalBody,
        MemoryStream responseBuffer)
    {
        var body = await ReadBodyAsync(responseBuffer, context.RequestAborted);

        if (IsAlreadyEnveloped(body, context.Response.ContentType))
        {
            await CopyOriginalResponseAsync(context, originalBody, responseBuffer);
            return;
        }

        if (!CanEnvelope(context.Response.ContentType, body))
        {
            await CopyOriginalResponseAsync(context, originalBody, responseBuffer);
            return;
        }

        var isSuccess = context.Response.StatusCode is >= 200 and < 400;
        var data = CreateData(body, context.Response.ContentType, isSuccess);
        var message = CreateMessage(
            body,
            context.Response.ContentType,
            context.Response.StatusCode,
            isSuccess);

        context.Response.Body = originalBody;
        context.Response.ContentLength = null;
        context.Response.ContentType = "application/json; charset=utf-8";

        var response = new ApiResponse<object>(isSuccess, message, data, null);
        await context.Response.WriteAsJsonAsync(response, context.RequestAborted);
    }

    private static async Task<string> ReadBodyAsync(
        MemoryStream responseBuffer,
        CancellationToken cancellationToken)
    {
        responseBuffer.Position = 0;

        using var reader = new StreamReader(
            responseBuffer,
            Encoding.UTF8,
            detectEncodingFromByteOrderMarks: true,
            leaveOpen: true);

        return await reader.ReadToEndAsync(cancellationToken);
    }

    private static bool IsAlreadyEnveloped(string body, string? contentType)
    {
        if (string.IsNullOrWhiteSpace(body) || !IsJson(contentType))
        {
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;

            return root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("success", out _) &&
                root.TryGetProperty("message", out _) &&
                root.TryGetProperty("data", out _) &&
                root.TryGetProperty("meta", out _);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool CanEnvelope(string? contentType, string body) =>
        string.IsNullOrWhiteSpace(body) ||
        string.IsNullOrWhiteSpace(contentType) ||
        IsJson(contentType) ||
        contentType.StartsWith("text/plain", StringComparison.OrdinalIgnoreCase);

    private static object CreateData(
        string body,
        string? contentType,
        bool isSuccess)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return new Dictionary<string, object?>();
        }

        if (!IsJson(contentType))
        {
            return isSuccess
                ? body
                : new Dictionary<string, object?>();
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.Clone();
        }
        catch (JsonException)
        {
            return isSuccess
                ? body
                : new Dictionary<string, object?>();
        }
    }

    private static string CreateMessage(
        string body,
        string? contentType,
        int statusCode,
        bool isSuccess)
    {
        if (isSuccess)
        {
            return SuccessMessage;
        }

        var jsonMessage = TryReadErrorMessage(body, contentType);
        if (!string.IsNullOrWhiteSpace(jsonMessage))
        {
            return jsonMessage;
        }

        if (!string.IsNullOrWhiteSpace(body) && !IsJson(contentType))
        {
            return body;
        }

        return ReasonPhrases.GetReasonPhrase(statusCode) is { Length: > 0 } reason
            ? reason
            : "The operation failed.";
    }

    private static string? TryReadErrorMessage(string body, string? contentType)
    {
        if (string.IsNullOrWhiteSpace(body) || !IsJson(contentType))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;

            foreach (var propertyName in new[] { "message", "detail", "title" })
            {
                if (root.TryGetProperty(propertyName, out var value) &&
                    value.ValueKind == JsonValueKind.String)
                {
                    return value.GetString();
                }
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }

    private static bool IsJson(string? contentType) =>
        contentType?.Contains("json", StringComparison.OrdinalIgnoreCase) == true;

    private static async Task CopyOriginalResponseAsync(
        HttpContext context,
        Stream originalBody,
        MemoryStream responseBuffer)
    {
        context.Response.Body = originalBody;
        context.Response.ContentLength = responseBuffer.Length;
        responseBuffer.Position = 0;
        await responseBuffer.CopyToAsync(originalBody, context.RequestAborted);
    }
}
