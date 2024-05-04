using Amazon.Lambda.Annotations;
using Amazon.Lambda.Core;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Bounan.Common.Models;
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
        ServiceProvider = services.BuildServiceProvider();
    }

    private ServiceProvider ServiceProvider { get; }

    [LambdaFunction]
    public Task<BotResponse> GetAnimeAsync(BotRequest request, ILambdaContext context)
    {
        var botHandlingService = ServiceProvider.GetRequiredService<IBotHandlingService>();
        return botHandlingService.GetAnimeAsync(request);
    }

    [LambdaFunction]
    public Task<DwnQueueResponse> GetVideoToDownloadAsync(ILambdaContext context)
    {
        var dwnHandlingService = ServiceProvider.GetRequiredService<IDwnHandlingService>();
        return dwnHandlingService.GetVideoToDownloadAsync();
    }

    [LambdaFunction]
    public Task UpdateVideoStatusAsync(DwnResultNotification notification, ILambdaContext context)
    {
        var dwnHandlingService = ServiceProvider.GetRequiredService<IDwnHandlingService>();
        return dwnHandlingService.UpdateVideoStatusAsync(notification);
    }

    [LambdaFunction]
    public Task<IMatcherResponse> GetSeriesToMatchAsync(ILambdaContext context)
    {
        var matcherHandlingService = ServiceProvider.GetRequiredService<IMatcherHandlingService>();
        return matcherHandlingService.GetVideosToMatchAsync();
    }

    [LambdaFunction]
    public Task UpdateVideoScenesAsync(VideoScenesResponse response, ILambdaContext context)
    {
        var matcherHandlingService = ServiceProvider.GetRequiredService<IMatcherHandlingService>();
        return matcherHandlingService.UpdateVideoScenesAsync(response);
    }
}