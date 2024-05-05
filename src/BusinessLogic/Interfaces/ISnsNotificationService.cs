using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

internal interface ISnsNotificationService
{
    Task NotifyVideoRegisteredAsync(CancellationToken cancellationToken = default);

    Task NotifyVideoDownloaded(BotNotification notification, CancellationToken cancellationToken = default);
}