namespace LibraryManagement.Api.Common.Contracts;

public sealed record ApiResponse<T>(
    bool Success,
    string Message,
    T Data,
    object? Meta);
