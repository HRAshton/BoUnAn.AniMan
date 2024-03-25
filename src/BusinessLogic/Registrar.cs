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
		services.AddSingleton<INotificationService, NotificationService>();
		
		services.AddSingleton<IAmazonSQS, AmazonSQSClient>();
	}

	public static void RegisterConfiguration(IServiceCollection services, IConfiguration configuration)
	{
		services.Configure<BotConfig>(configuration.GetSection(BotConfig.SectionName));
		services.Configure<DwnConfig>(configuration.GetSection(DwnConfig.SectionName));
	}
}