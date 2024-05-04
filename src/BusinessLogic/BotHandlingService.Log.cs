using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Entities;
using Bounan.LoanApi.Models;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class BotHandlingService
{
    private static partial class Log
    {
        [LoggerMessage(LogLevel.Information, "Received request: {@Request}")]
        public static partial void ReceivedRequest(ILogger logger, BotRequest request);

        [LoggerMessage(LogLevel.Information, "Video fetched from Loan API: {@Video}")]
        public static partial void VideoFetchedFromLoanApi(ILogger logger, ICollection<IVideoKeyWithLink>? video);

        [LoggerMessage(LogLevel.Information, "Video retrieved: {@Video}")]
        public static partial void VideoRetrieved(ILogger logger, FileEntity? video);

        [LoggerMessage(LogLevel.Information, "Returning video as is")]
        public static partial void ReturningVideoAsIs(ILogger logger);

        [LoggerMessage(LogLevel.Information, "Attaching user to anime")]
        public static partial void AttachingUserToAnime(ILogger logger);

        [LoggerMessage(LogLevel.Information, "Adding anime")]
        public static partial void AddingAnime(ILogger logger);

        [LoggerMessage(LogLevel.Information, "Video added to database: {@Video}")]
        public static partial void VideoAddedToDatabase(ILogger logger, FileEntity video);

        [LoggerMessage(LogLevel.Information, "Chat ID attached to anime")]
        public static partial void ChatIdAttachedToAnime(ILogger logger);

        [LoggerMessage(LogLevel.Information, "Notification sent to SNS")]
        public static partial void NotificationSentToSns(ILogger logger);
    }
}