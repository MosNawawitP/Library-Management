FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY global.json NuGet.Config LibraryManagement.slnx ./
COPY src/LibraryManagement.Api/LibraryManagement.Api.csproj src/LibraryManagement.Api/
RUN dotnet restore src/LibraryManagement.Api/LibraryManagement.Api.csproj --configfile NuGet.Config

COPY . .
RUN dotnet publish src/LibraryManagement.Api/LibraryManagement.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    Storage__DataDirectory=/app/data

RUN mkdir -p /app/data && chown "$APP_UID:$APP_UID" /app/data

COPY --from=build --chown=$APP_UID:$APP_UID /app/publish .

USER $APP_UID
EXPOSE 8080

ENTRYPOINT ["dotnet", "LibraryManagement.Api.dll"]
