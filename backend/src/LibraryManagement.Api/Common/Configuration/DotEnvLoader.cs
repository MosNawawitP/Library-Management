namespace LibraryManagement.Api.Common.Configuration;

public static class DotEnvLoader
{
    public static void LoadFromRepositoryTree()
    {
        var directory = new DirectoryInfo(Directory.GetCurrentDirectory());

        while (directory is not null)
        {
            var envPath = FindEnvironmentFile(directory.FullName);
            if (envPath is not null)
            {
                Load(envPath);
                return;
            }

            if (Directory.Exists(Path.Combine(directory.FullName, ".git")))
            {
                return;
            }

            directory = directory.Parent;
        }
    }

    private static string? FindEnvironmentFile(string directory)
    {
        var directPath = Path.Combine(directory, ".env");
        if (File.Exists(directPath))
        {
            return directPath;
        }

        var backendPath = Path.Combine(directory, "backend", ".env");
        return File.Exists(backendPath) ? backendPath : null;
    }

    private static void Load(string path)
    {
        var lineNumber = 0;

        foreach (var rawLine in File.ReadLines(path))
        {
            lineNumber++;
            var line = rawLine.Trim();

            if (line.Length == 0 || line.StartsWith('#'))
            {
                continue;
            }

            if (line.StartsWith("export ", StringComparison.Ordinal))
            {
                line = line[7..].TrimStart();
            }

            var separatorIndex = line.IndexOf('=');
            if (separatorIndex <= 0)
            {
                throw new InvalidDataException(
                    $"Invalid .env entry at line {lineNumber}. Expected KEY=VALUE.");
            }

            var key = line[..separatorIndex].Trim();
            var value = Unquote(line[(separatorIndex + 1)..].Trim());

            if (!IsValidKey(key))
            {
                throw new InvalidDataException(
                    $"Invalid .env key at line {lineNumber}.");
            }

            if (Environment.GetEnvironmentVariable(key) is null)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }

    private static string Unquote(string value)
    {
        if (value.Length >= 2 &&
            ((value[0] == '"' && value[^1] == '"') ||
             (value[0] == '\'' && value[^1] == '\'')))
        {
            return value[1..^1];
        }

        return value;
    }

    private static bool IsValidKey(string key)
    {
        if (key.Length == 0 || !(char.IsLetter(key[0]) || key[0] == '_'))
        {
            return false;
        }

        return key.All(character =>
            char.IsLetterOrDigit(character) || character == '_');
    }
}
