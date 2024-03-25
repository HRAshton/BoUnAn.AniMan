using Amazon.Lambda.Annotations;
using Amazon.Lambda.Core;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Microsoft.Extensions.DependencyInjection;

[assembly: LambdaGlobalProperties(GenerateMain = true)]
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace Bounan.AniMan.Endpoint;

public class LambdaHandlers
{
	public LambdaHandlers()
	{
		var services = new ServiceCollection();
		Bootstrap.ConfigureServices(services);
		var buildServiceProvider = services.BuildServiceProvider();

		AniManService = buildServiceProvider.GetRequiredService<IAniManService>();
	}

	private IAniManService AniManService { get; }

	[LambdaFunction]
	public Task<BotResponse> GetAnimeAsync(BotRequest request, ILambdaContext context)
	{
		return AniManService.GetAnimeAsync(request);
	}

	[LambdaFunction]
	public Task<DwnQueueResponse> GetVideoToDownloadAsync(ILambdaContext context)
	{
		return AniManService.GetVideoToDownloadAsync();
	}

	[LambdaFunction]
	public async Task UpdateVideoStatusAsync(DwnResultNotification notification, ILambdaContext context)
	{
		await AniManService.UpdateVideoStatusAsync(notification);
	}
}