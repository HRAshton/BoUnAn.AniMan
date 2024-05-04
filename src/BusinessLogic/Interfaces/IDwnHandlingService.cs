using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

public interface IDwnHandlingService
{
    Task<DwnQueueResponse> GetVideoToDownloadAsync();

    Task UpdateVideoStatusAsync(DwnResultNotification notification);
}