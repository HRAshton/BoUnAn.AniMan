using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Bounan.AniMan.Endpoint;

public static class Bootstrap
{
	public static void ConfigureServices(IServiceCollection services)
	{
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
}