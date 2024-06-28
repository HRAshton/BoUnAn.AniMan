using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

public interface IDwnHandlingService
{
    Task<DwnResponse> GetVideoToDownloadAsync();

    Task UpdateVideoStatusAsync(DwnResultRequest resultRequest);
}