using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

public interface IAniManService
{
	Task<BotResponse> GetAnimeAsync(BotRequest request);

	Task<DwnQueueResponse> GetVideoToDownloadAsync();

	Task UpdateVideoStatusAsync(DwnResultNotification notification);
}