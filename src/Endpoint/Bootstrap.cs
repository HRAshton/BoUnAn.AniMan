using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.Endpoint;

public static class Bootstrap
{
	public static void ConfigureServices(IServiceCollection services)
	{
		AddLogging(services);
		AddConfiguration(services);

		Dal.Registrar.RegisterServices(services);
		BusinessLogic.Registrar.RegisterServices(services);
		LoanApi.Registrar.RegisterBotServices(services);
	}

	private static void AddConfiguration(IServiceCollection services)
	{
		var configuration = new ConfigurationBuilder()
			.AddEnvironmentVariables()
			.Build();

		LoanApi.Registrar.RegisterConfiguration(services, configuration);
		Dal.Registrar.RegisterConfiguration(services, configuration);
		BusinessLogic.Registrar.RegisterConfiguration(services, configuration);
	}

	private static void AddLogging(IServiceCollection services)
	{
		services.AddLogging(builder =>
		{
			builder.AddSimpleConsole(options =>
			{
				options.SingleLine = true;
				options.TimestampFormat = "yyyy-MM-dd HH:mm:ss.fff ";
			});
		});
	}
}