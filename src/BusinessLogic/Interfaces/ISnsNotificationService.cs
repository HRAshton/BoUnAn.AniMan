using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

internal interface ISnsNotificationService
{
    Task NotifyVideoRegisteredAsync();

    Task NotifyVideoDownloaded(VideoDownloadedNotification notification);
}