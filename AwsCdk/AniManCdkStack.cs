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

        var (table, dwnSecondaryIndex, matcherSecondaryIndex) = CreateFilesTable();
        var videoRegisteredTopic = CreateVideoRegisteredTopic();
        var videoDownloadedTopic = CreateVideoDownloadedTopic();

        var logGroup = CreateLogGroup();
        SetErrorAlarm(config, logGroup);

        var functions = CreateLambdas(
            config,
            table,
            dwnSecondaryIndex.IndexName,
            matcherSecondaryIndex.IndexName,
            videoRegisteredTopic,
            videoDownloadedTopic,
            logGroup);

        CreateWarmer(config, functions[LambdaHandler.GetAnime]);

        Out("Config", JsonConvert.SerializeObject(config));
        Out("VideoRegisteredTopicArn", videoRegisteredTopic.TopicArn);
        Out("VideoDownloadedTopicArn", videoDownloadedTopic.TopicArn);
        Out("FilesTableName", table.TableName);
        functions.ToList().ForEach(kv => Out($"{kv.Key}LambdaName", kv.Value.FunctionName));

        Out("DownloaderConfig", JsonConvert.SerializeObject(new
        {
            config.AlertEmail,
            GetVideoToDownloadLambdaFunctionName = functions[LambdaHandler.GetVideoToDownload].FunctionName,
            UpdateVideoStatusLambdaFunctionName = functions[LambdaHandler.UpdateVideoStatus].FunctionName,
            VideoRegisteredTopicArn = videoRegisteredTopic.TopicArn,
        }));
    }

    private (ITable, IGlobalSecondaryIndexProps, IGlobalSecondaryIndexProps) CreateFilesTable()
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

        var dwnSecondaryIndex = new GlobalSecondaryIndexProps
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

        var matcherSecondaryIndex = new GlobalSecondaryIndexProps
        {
            IndexName = "Matcher-CreatedAt-index",
            PartitionKey = new Attribute
            {
                Name = "MatchingGroup",
                Type = AttributeType.STRING,
            },
            SortKey = new Attribute
            {
                Name = "CreatedAt",
                Type = AttributeType.STRING,
            },
            ProjectionType = ProjectionType.INCLUDE,
            NonKeyAttributes = [ "MyAnimeListId", "Dub", "Episode" ],
        };

        filesTable.AddGlobalSecondaryIndex(dwnSecondaryIndex);
        filesTable.AddGlobalSecondaryIndex(matcherSecondaryIndex);

        return (filesTable, dwnSecondaryIndex, matcherSecondaryIndex);
    }

    private ITopic CreateVideoRegisteredTopic()
    {
        return new Topic(this, "VideoRegisteredSnsTopic");
    }

    private ITopic CreateVideoDownloadedTopic()
    {
        return new Topic(this, "VideoDownloadedSnsTopic");
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

    private Dictionary<LambdaHandler, Function> CreateLambdas(
        BounanCdkStackConfig bounanCdkStackConfig,
        ITable filesTable,
        string dwnSecondaryIndexName,
        string matcherSecondaryIndexName,
        ITopic videoRegisteredTopic,
        ITopic videoDownloadedTopic,
        ILogGroup logGroup)
    {
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

        var functions = Enum.GetValues<LambdaHandler>()
            .ToDictionary(
                name => name,
                name => new Function(this, name.ToString(), new FunctionProps
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
                        { "Storage__SecondaryIndexName", dwnSecondaryIndexName },
                        { "Storage__MatcherSecondaryIndexName", matcherSecondaryIndexName },
                        { "Notifications__VideoRegisteredTopicArn", videoRegisteredTopic.TopicArn },
                        { "Notifications__VideoDownloadedTopicArn", videoDownloadedTopic.TopicArn },
                    }
                }));

        foreach (var function in functions)
        {
            filesTable.GrantReadWriteData(function.Value);
        }

        var getAnimeLambda = functions[LambdaHandler.GetAnime];
        videoRegisteredTopic.GrantPublish(getAnimeLambda);

        var updateVideoStatusLambda = functions[LambdaHandler.UpdateVideoStatus];
        videoDownloadedTopic.GrantPublish(updateVideoStatusLambda);

        return functions;
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

    [SuppressMessage("ReSharper", "UnusedMember.Local")]
    private enum LambdaHandler
    {
        GetAnime,
        GetVideoToDownload,
        UpdateVideoStatus,
        GetSeriesToMatch,
        UpdateVideoScenes,
    }
}