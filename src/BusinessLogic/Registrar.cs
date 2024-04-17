using Amazon.SimpleNotificationService;
using Amazon.SQS;
using Bounan.AniMan.BusinessLogic.Configuration;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Bounan.AniMan.BusinessLogic;

public static class Registrar
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<IAniManService, AniManService>();
        services.AddSingleton<ISqsNotificationService, SqsNotificationService>();
        services.AddSingleton<ISnsNotificationService, SnsNotificationService>();

        services.AddSingleton<IAmazonSQS, AmazonSQSClient>();
        services.AddSingleton<IAmazonSimpleNotificationService, AmazonSimpleNotificationServiceClient>();
    }

    public static void RegisterConfiguration(IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<BotConfig>(configuration.GetSection(BotConfig.SectionName));
        services.Configure<NewEpisodeNotificationConfig>(
            configuration.GetSection(NewEpisodeNotificationConfig.SectionName));
    }
}