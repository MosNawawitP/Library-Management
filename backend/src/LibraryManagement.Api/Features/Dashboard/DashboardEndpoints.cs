using LibraryManagement.Api.Common.Contracts;

namespace LibraryManagement.Api.Features.Dashboard;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/dashboard", GetDashboardAsync)
            .WithName("GetDashboard")
            .WithTags("Dashboard")
            .RequireAuthorization()
            .Produces<ApiResponse<DashboardResponse>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        return endpoints;
    }

    private static async Task<IResult> GetDashboardAsync(
        DashboardService dashboardService,
        CancellationToken cancellationToken)
    {
        var dashboard = await dashboardService.GetDashboardAsync(cancellationToken);
        return Results.Ok(new ApiResponse<DashboardResponse>(
            true,
            "Dashboard retrieved successfully.",
            dashboard,
            null));
    }
}
