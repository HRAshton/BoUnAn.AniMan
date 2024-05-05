using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Entities;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class DwnHandlingService
{
    private static partial class Log
    {
        [LoggerMessage(LogLevel.Warning, "Marked as failed: {@video}")]
        public static partial void MarkedAsFailed(ILogger logger, FileEntity video);

        [LoggerMessage(LogLevel.Information, "Marked as downloaded: {@video}")]
        public static partial void MarkedAsDownloaded(ILogger logger, FileEntity video);

        [LoggerMessage(LogLevel.Information, "Video retrieved: {@Video}")]
        public static partial void VideoRetrieved(ILogger logger, FileEntity? video);

        [LoggerMessage(LogLevel.Information, "No users to notify")]
        public static partial void NoUsersToNotify(ILogger logger);

        [LoggerMessage(LogLevel.Information, "Users to notify: {@users}")]
        public static partial void UsersToNotify(ILogger logger, ICollection<long> users);

        [LoggerMessage(LogLevel.Information, "Sending notification to Bot: {@notification}")]
        public static partial void SendingNotificationToBot(ILogger logger, VideoDownloadedNotification notification);
    }
}