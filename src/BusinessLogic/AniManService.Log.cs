using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Entities;
using Bounan.LoanApi.Models;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class AniManService
{
    private static partial class Log
    {
        [LoggerMessage(1, LogLevel.Information, "Received request: {@request}")]
        public static partial void ReceivedRequest(ILogger logger, BotRequest request);

        [LoggerMessage(2, LogLevel.Information, "Video retrieved: {@video}")]
        public static partial void VideoRetrieved(ILogger logger, FileEntity? video);

        [LoggerMessage(3, LogLevel.Information, "Returning video as is")]
        public static partial void ReturningVideoAsIs(ILogger logger);

        [LoggerMessage(4, LogLevel.Information, "Attaching user to anime")]
        public static partial void AttachingUserToAnime(ILogger logger);

        [LoggerMessage(5, LogLevel.Information, "Adding anime")]
        public static partial void AddingAnime(ILogger logger);

        [LoggerMessage(6, LogLevel.Warning, "Marked as failed: {@video}")]
        public static partial void MarkedAsFailed(ILogger logger, FileEntity video);

        [LoggerMessage(7, LogLevel.Information, "Marked as downloaded: {@video}")]
        public static partial void MarkedAsDownloaded(ILogger logger, FileEntity video);

        [LoggerMessage(8, LogLevel.Information, "Video fetched from Loan API: {@video}")]
        public static partial void VideoFetchedFromLoanApi(ILogger logger, ICollection<SearchResultItem>? video);

        [LoggerMessage(9, LogLevel.Information, "Video added to database: {@video}")]
        public static partial void VideoAddedToDatabase(ILogger logger, FileEntity video);

        [LoggerMessage(10, LogLevel.Information, "Chat ID attached to anime")]
        public static partial void ChatIdAttachedToAnime(ILogger logger);

        [LoggerMessage(11, LogLevel.Information, "Dwn has been notified")]
        public static partial void DwnHasBeenNotified(ILogger logger);

        [LoggerMessage(12, LogLevel.Information, "No users to notify")]
        public static partial void NoUsersToNotify(ILogger logger);

        [LoggerMessage(13, LogLevel.Information, "Users to notify: {@users}")]
        public static partial void UsersToNotify(ILogger logger, ICollection<long> users);

        [LoggerMessage(14, LogLevel.Information, "Sending notification to Bot: {@notification}")]
        public static partial void SendingNotificationToBot(ILogger logger, BotNotification notification);
    }
}