using Bounan.AniMan.BusinessLogic.Models;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class MatcherHandlingService
{
    private static partial class Log
    {
        [LoggerMessage(LogLevel.Information, "Collecting videos to match")]
        public static partial void CollectingVideosToMatch(ILogger logger);

        [LoggerMessage(LogLevel.Information, "Collected {count} videos to match: {@result}")]
        public static partial void CollectedVideosToMatch(ILogger logger, int count, MatcherResponse result);

        [LoggerMessage(LogLevel.Information, "Received response from Matcher: {@notification}")]
        public static partial void ReceivedScenesResponse(ILogger logger, VideoScenesResponse notification);

        [LoggerMessage(LogLevel.Information, "Scenes have not been updated")]
        public static partial void ScenesHaveNotBeenUpdated(ILogger logger);

        [LoggerMessage(LogLevel.Information, "Scenes have been updated")]
        public static partial void ScenesHaveBeenUpdated(ILogger logger);
    }
}