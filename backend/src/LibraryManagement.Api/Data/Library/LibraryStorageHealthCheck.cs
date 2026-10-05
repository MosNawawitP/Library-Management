using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace LibraryManagement.Api.Data.Library;

public sealed class LibraryStorageHealthCheck(
    ILibraryRepository repository) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await repository.CheckHealthAsync(cancellationToken);
            return HealthCheckResult.Healthy("Library JSON storage is readable and writable.");
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return HealthCheckResult.Unhealthy(
                "Library JSON storage is unavailable or invalid.",
                exception);
        }
    }
}
