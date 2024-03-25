using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Bounan.AniMan.Dal.Configuration;
using Bounan.AniMan.Dal.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Bounan.AniMan.Dal;

public static class Registrar
{
	public static void RegisterServices(IServiceCollection services)
	{
		services.AddSingleton<IAmazonDynamoDB, AmazonDynamoDBClient>();
		services.AddSingleton<IDynamoDBContext, DynamoDBContext>(serviceProvider =>
		{
			var amazonDynamoDb = serviceProvider.GetRequiredService<IAmazonDynamoDB>();
			return new DynamoDBContext(amazonDynamoDb);
		});
		services.AddSingleton<IFilesRepository, FilesRepository>();
	}

	public static void RegisterConfiguration(IServiceCollection services, IConfiguration configuration)
	{
		services.Configure<StorageConfig>(configuration.GetSection(StorageConfig.SectionName));
	}
}