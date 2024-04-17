namespace Bounan.AniMan.BusinessLogic.Interfaces;

internal interface ISnsNotificationService
{
    Task NotifyNewEpisodeAsync(CancellationToken cancellationToken = default);
}