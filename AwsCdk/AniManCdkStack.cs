using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using Amazon.CDK;
using Amazon.CDK.AWS.CloudWatch;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Events;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.Logs;
using Amazon.CDK.AWS.SNS;
using Amazon.CDK.AWS.SNS.Subscriptions;
using Amazon.CDK.AWS.SQS;
using Constructs;
using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using AssetOptions = Amazon.CDK.AWS.S3.Assets.AssetOptions;
using Attribute = Amazon.CDK.AWS.DynamoDB.Attribute;
using AlarmActions = Amazon.CDK.AWS.CloudWatch.Actions;
using LogGroupProps = Amazon.CDK.AWS.Logs.LogGroupProps;
using Targets = Amazon.CDK.AWS.Events.Targets;

namespace Bounan.AniMan.AwsCdk;

[SuppressMessage("Performance", "CA1859: Use concrete types when possible for improved performance")]
public class AniManCdkStack : Stack
{
    internal AniManCdkStack(Construct scope, string id, IStackProps? props = null) : base(scope, id, props)
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json")
            .AddEnvironmentVariables()
            .Build()
            .Get<BounanCdkStackConfig>();
        ArgumentNullException.ThrowIfNull(config, nameof(config));
        config.Validate();

        var (table, index) = CreateFilesTable();
        var botNotificationsQueue = CreateBotNotificationsQueue();
        var newEpisodeTopic = CreateNewEpisodeTopic();

        var logGroup = CreateLogGroup();
        SetErrorAlarm(config, logGroup);

        var (getAnimeLambda, getVideoToDownloadLambda, updateVideoStatusLambda) = CreateLambdas(
            config,
            table,
            index.IndexName,
            botNotificationsQueue,
            newEpisodeTopic,
            logGroup);

        CreateWarmer(config, getAnimeLambda);

        Out("Bounan.Downloader.Config", JsonConvert.SerializeObject(config));
        Out("Bounan.AniMan.GetAnimeLambdaArn", getAnimeLambda.FunctionArn);
        Out("Bounan.AniMan.GetVideoToDownloadLambdaName", getVideoToDownloadLambda.FunctionName);
        Out("Bounan.AniMan.UpdateVideoStatusLambdaName", updateVideoStatusLambda.FunctionName);
        Out("Bounan.AniMan.BotNotificationsQueueUrl", botNotificationsQueue.QueueUrl);
        Out("Bounan.AniMan.BotNotificationsQueueArn", botNotificationsQueue.QueueArn);
        Out("Bounan.AniMan.NewEpisodeTopicArn", newEpisodeTopic.TopicArn);
        Out("Bounan.AniMan.FilesTableName", table.TableName);
    }

    private (ITable, IGlobalSecondaryIndexProps) CreateFilesTable()
    {
        var filesTable = new Table(this, "FilesTable", new TableProps
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

    private IQueue CreateBotNotificationsQueue()
    {
        return new Queue(this, "BotNotificationsSqsQueue");
    }

    private ITopic CreateNewEpisodeTopic()
    {
        return new Topic(this, "NewEpisodeSnsTopic");
    }

    private ILogGroup CreateLogGroup()
    {
        return new LogGroup(this, "LogGroup", new LogGroupProps
        {
            Retention = RetentionDays.ONE_WEEK
        });
    }

    private void SetErrorAlarm(BounanCdkStackConfig bounanCdkStackConfig, ILogGroup logGroup)
    {
        var topic = new Topic(this, "LogGroupAlarmSnsTopic", new TopicProps());

        topic.AddSubscription(new EmailSubscription(bounanCdkStackConfig.AlertEmail));

        var metricFilter = logGroup.AddMetricFilter("ErrorMetricFilter", new MetricFilterOptions
        {
            FilterPattern = FilterPattern.AnyTerm("ERROR", "Error", "error", "fail"),
            MetricNamespace = StackName,
            MetricName = "ErrorCount",
            MetricValue = "1"
        });

        var alarm = new Alarm(this, "LogGroupErrorAlarm", new AlarmProps
        {
            Metric = metricFilter.Metric(),
            Threshold = 1,
            EvaluationPeriods = 1,
            TreatMissingData = TreatMissingData.NOT_BREACHING,
        });
        alarm.AddAlarmAction(new AlarmActions.SnsAction(topic));
    }

    private (IFunction, IFunction, IFunction) CreateLambdas(
        BounanCdkStackConfig bounanCdkStackConfig,
        ITable filesTable,
        string secondaryIndexName,
        IQueue botNotificationsQueue,
        ITopic newEpisodeTopic,
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
            .Select(name => new Function(this, $"LambdaHandlers.{name}", new FunctionProps
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
                    { "NewEpisodeNotification__TopicArn", newEpisodeTopic.TopicArn },
                    { "Bot__NotificationQueueUrl", botNotificationsQueue.QueueUrl },
                }
            }))
            .ToArray();

        foreach (var function in functions)
        {
            filesTable.GrantReadWriteData(function);
        }

        var getAnimeLambda = functions[0];
        botNotificationsQueue.GrantSendMessages(getAnimeLambda);
        newEpisodeTopic.GrantPublish(getAnimeLambda);

        return (functions[0], functions[1], functions[2]);
    }

    private void CreateWarmer(BounanCdkStackConfig bounanCdkStackConfig, IFunction webhookHandler)
    {
        var rule = new Rule(this, "WarmerRule", new RuleProps
        {
            Schedule = Schedule.Rate(Duration.Minutes(bounanCdkStackConfig.WarmupTimeoutMinutes)),
        });

        rule.AddTarget(new Targets.LambdaFunction(webhookHandler));
    }

    private void Out(string key, string value)
    {
        _ = new CfnOutput(this, key, new CfnOutputProps { Value = value });
    }
}