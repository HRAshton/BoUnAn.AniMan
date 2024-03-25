using Amazon.Lambda.Core;
using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

public interface IAniMenService
{
	Task<BotResponse> GetAnimeAsync(BotRequest request, ILambdaContext context);

	Task<DwnQueueResponse> GetVideoToDownloadAsync(ILambdaContext context);

	Task UpdateVideoStatusAsync(DwnResultNotification notification, ILambdaContext context);
}