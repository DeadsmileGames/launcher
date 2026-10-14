namespace Deadsmile.Core;


public static class LauncherErrors
{
    public static int Number(Exception error) => error switch
    {
        LauncherException { Code: "NETWORK_ERROR" } => 6794,
        OperationCanceledException or HttpRequestException => 6794,
        LauncherException { Code: "INVALID_RESPONSE" } => 6795,
        LauncherException { Status: 401 } => 6796,
        LauncherException { Status: 403 } => 6797,
        LauncherException { Status: 429 } => 6798,
        LauncherException { Status: >= 500 } => 6799,
        IOException => 6800,
        UnauthorizedAccessException => 6801,
        _ => 6802
    };
}
