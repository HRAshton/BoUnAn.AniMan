using System;
using System.Collections.Generic;
using System.Linq;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudWatch;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.Logs;
using Amazon.CDK.AWS.SNS;
using Amazon.CDK.AWS.SNS.Subscriptions;
using Amazon.CDK.AWS.SQS;
using Constructs;
using Microsoft.Extensions.Configuration;
using AssetOptions = Amazon.CDK.AWS.S3.Assets.AssetOptions;
using Attribute = Amazon.CDK.AWS.DynamoDB.Attribute;
using LogGroupProps = Amazon.CDK.AWS.Logs.LogGroupProps;

namespace Bounan.AniMan.AwsCdk;

public class AniManCdkStack : Stack
{
	private readonly string _baseName;

	internal AniManCdkStack(Construct scope, string id, IStackProps? props = null) : base(scope, id, props)
	{
		_baseName = id;

		var config = new ConfigurationBuilder()
			.AddJsonFile("appsettings.json")
			.AddEnvironmentVariables()
			.Build()
			.Get<BounanCdkStackConfig>();
		ArgumentNullException.ThrowIfNull(config, nameof(config));
		config.Validate();

		var (table, index) = CreateFilesTable();
		var botNotificationsQueue = CreateBotNotificationsQueue();
		var dwnNotificationsQueue = CreateDwnNotificationsQueue();

		var logGroup = CreateLogGroup();
		SetErrorAlarm(config, logGroup);

		var (getAnimeLambda, getVideoToDownloadLambda, updateVideoStatusLambda) = CreateLambdas(
			config,
			table,
			index.IndexName,
			botNotificationsQueue,
			dwnNotificationsQueue,
			logGroup);

		Out("Bounan.AniMan.GetAnimeLambdaArn", getAnimeLambda.FunctionArn);
		Out("Bounan.AniMan.GetVideoToDownloadLambdaArn", getVideoToDownloadLambda.FunctionArn);
		Out("Bounan.AniMan.UpdateVideoStatusLambdaArn", updateVideoStatusLambda.FunctionArn);
		Out("Bounan.AniMan.BotNotificationsQueue", botNotificationsQueue.QueueUrl);
		Out("Bounan.AniMan.DwnNotificationsQueue", dwnNotificationsQueue.QueueUrl);
		Out("Bounan.AniMan.FilesTableName", table.TableName);
	}

	private (Table, GlobalSecondaryIndexProps) CreateFilesTable()
	{
		var filesTable = new Table(this, Name("FilesTable"), new TableProps
		{
			PartitionKey = new Attribute
			{
				Name = "PrimaryKey",
				Type = AttributeType.STRING
			},
			RemovalPolicy = RemovalPolicy.RETAIN,
		});

		var globalSecondaryIndexProps = new GlobalSecondaryIndexProps
		{
			IndexName = "Status-SortKey-index",
			PartitionKey = new Attribute
			{
				Name = "Status",
				Type = AttributeType.NUMBER
			},
			SortKey = new Attribute
			{
				Name = "SortKey",
				Type = AttributeType.STRING
			}
		};

		filesTable.AddGlobalSecondaryIndex(globalSecondaryIndexProps);

		return (filesTable, globalSecondaryIndexProps);
	}

	private Queue CreateBotNotificationsQueue()
	{
		return new Queue(this, Name("BotNotificationsSqsQueue"));
	}

	private Queue CreateDwnNotificationsQueue()
	{
		return new Queue(this, Name("DwnNotificationsSqsQueue"), new QueueProps
		{
			RetentionPeriod = Duration.Minutes(1)
		});
	}

	private LogGroup CreateLogGroup()
	{
		return new LogGroup(this, Name("LogGroup"), new LogGroupProps
		{
			Retention = RetentionDays.ONE_WEEK
		});
	}

	private void SetErrorAlarm(BounanCdkStackConfig bounanCdkStackConfig, ILogGroup logGroup)
	{
		var topic = new Topic(this, Name("LogGroupAlarmSnsTopic"), new TopicProps());

		topic.AddSubscription(new EmailSubscription(bounanCdkStackConfig.AlertEmail));

		var errorPattern = new MetricFilter(this, Name("LogGroupErrorPattern"), new MetricFilterProps
		{
			LogGroup = logGroup,
			FilterPattern = FilterPattern.AnyTerm("ERROR", "Error", "error"),
			MetricNamespace = Name("MetricNamespace"),
			MetricName = "ErrorCount"
		});

		_ = new Alarm(this, Name("LogGroupErrorAlarm"), new AlarmProps
		{
			Metric = errorPattern.Metric(),
			Threshold = 1,
			EvaluationPeriods = 1,
			TreatMissingData = TreatMissingData.NOT_BREACHING,
		});
	}

	private (Function, Function, Function) CreateLambdas(
		BounanCdkStackConfig bounanCdkStackConfig,
		Table filesTable,
		string secondaryIndexName,
		Queue botNotificationsQueue,
		Queue dwnNotificationsQueue,
		ILogGroup logGroup)
	{
		string[] methods = ["GetAnime", "GetVideoToDownload", "UpdateVideoStatus"];

		var asset = Code.FromAsset("src", new AssetOptions
		{
			Bundling = new BundlingOptions
			{
				Image = Runtime.DOTNET_8.BundlingImage,
				User = "root",
				OutputType = BundlingOutput.ARCHIVED,
				Command =
				[
					"/bin/sh",
					"-c",
					" dotnet tool install -g Amazon.Lambda.Tools" +
					" && dotnet build Endpoint" +
					" && dotnet lambda package --output-package /asset-output/function.zip --project-location Endpoint"
				]
			}
		});

		var functions = methods
			.Select(name => new Function(this, Name($"LambdaHandlers.{name}"), new FunctionProps
			{
				Runtime = Runtime.DOTNET_8,
				Code = asset,
				Handler = $"Bounan.AniMan.Endpoint::Bounan.AniMan.Endpoint.LambdaHandlers::{name}Async",
				Timeout = Duration.Seconds(300),
				LogGroup = logGroup,
				Environment = new Dictionary<string, string>
				{
					{ "LoanApi__Token", bounanCdkStackConfig.LoanApiToken },
					{ "Storage__TableName", filesTable.TableName },
					{ "Storage__SecondaryIndexName", secondaryIndexName },
					{ "Bot__NotificationQueueUrl", botNotificationsQueue.QueueUrl },
					{ "Dwn__NotificationQueueUrl", dwnNotificationsQueue.QueueUrl }
				}
			}))
			.ToArray();

		foreach (var function in functions)
		{
			filesTable.GrantReadWriteData(function);
			botNotificationsQueue.GrantSendMessages(function);
			dwnNotificationsQueue.GrantSendMessages(function);
		}

		return (functions[0], functions[1], functions[2]);
	}

	private string Name(string name) => $"{_baseName}-{name}";

	private void Out(string key, string value)
	{
		_ = new CfnOutput(this, key, new CfnOutputProps { Value = value });
	}
}