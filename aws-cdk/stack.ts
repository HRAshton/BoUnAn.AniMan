import { Stack, StackProps, Duration, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { LlrtFunction } from 'cdk-lambda-llrt';

import { config } from './config';

export class AniManCdkStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const { table, animeKeySecondaryIndex, dwnSecondaryIndex, matcherSecondaryIndex } = this.createFilesTable();
        const videoRegisteredTopic = this.createVideoRegisteredTopic();
        const videoDownloadedTopic = this.createVideoDownloadedTopic();
        const sceneRecognisedTopic = this.createSceneRecognisedTopic();
        const logGroup = this.createLogGroup();

        this.setErrorAlarm(logGroup);

        const functions = this.createLambdas(
            table,
            animeKeySecondaryIndex.indexName,
            dwnSecondaryIndex.indexName,
            matcherSecondaryIndex.indexName,
            videoRegisteredTopic,
            videoDownloadedTopic,
            sceneRecognisedTopic,
            logGroup,
        );

        this.out('Config', JSON.stringify(config));
        this.out('VideoRegisteredTopicArn', videoRegisteredTopic.topicArn);
        this.out('VideoDownloadedTopicArn', videoDownloadedTopic.topicArn);
        this.out('SceneRecognisedTopicArn', sceneRecognisedTopic.topicArn);
        this.out('FilesTableName', table.tableName);
        functions.forEach((func, key) => this.out(`${key}-LambdaName`, func.functionName));

        this.out('DownloaderConfig', {
            alertEmail: config.alertEmail,
            GetVideoToDownloadLambdaFunctionName: functions.get(LambdaHandler.GetVideoToDownload)!.functionName,
            UpdateVideoStatusLambdaFunctionName: functions.get(LambdaHandler.UpdateVideoStatus)!.functionName,
            VideoRegisteredTopicArn: videoRegisteredTopic.topicArn,
        });

        this.out('BotConfig', {
            alertEmail: config.alertEmail,
            loanApiToken: config.loanApiToken,
            GetAnimeFunctionName: functions.get(LambdaHandler.GetAnime)!.functionName,
            VideoDownloadedTopicArn: videoDownloadedTopic.topicArn,
            TelegramBotToken: 0,
            TelegramBotVideoChatId: 0,
            TelegramBotForwardingChatId: 0,
            WarmupTimeoutMinutes: 5,
        });

        this.out('MatcherConfig', {
            alertEmail: config.alertEmail,
            loanApiToken: config.loanApiToken,
            GetSeriesToMatchLambdaName: functions.get(LambdaHandler.GetSeriesToMatch)!.functionName,
            UpdateVideoScenesLambdaName: functions.get(LambdaHandler.UpdateVideoScenes)!.functionName,
            VideoRegisteredTopicArn: videoRegisteredTopic.topicArn,
        });

        this.out('PublisherConfig', {
            alertEmail: config.alertEmail,
            updatePublishingDetailsFunctionName: functions.get(LambdaHandler.UpdatePublishingDetails)!.functionName,
            videoDownloadedTopicArn: videoDownloadedTopic.topicArn,
            sceneRecognisedTopicArn: sceneRecognisedTopic.topicArn,
        });

        this.out('OngoingConfig', {
            alertEmail: config.alertEmail,
            loanApiToken: config.loanApiToken,
            registerVideosFunctionName: functions.get(LambdaHandler.RegisterVideos)!.functionName,
            videoRegisteredTopicArn: videoRegisteredTopic.topicArn,
        });
    }

    private createFilesTable(): {
        table: dynamodb.Table,
        animeKeySecondaryIndex: dynamodb.GlobalSecondaryIndexProps,
        dwnSecondaryIndex: dynamodb.GlobalSecondaryIndexProps,
        matcherSecondaryIndex: dynamodb.GlobalSecondaryIndexProps
        } {
        const filesTable = new dynamodb.Table(this, 'FilesTable', {
            partitionKey: { name: 'PrimaryKey', type: dynamodb.AttributeType.STRING },
            removalPolicy: RemovalPolicy.RETAIN,
        });

        const animeKeySecondaryIndex: dynamodb.GlobalSecondaryIndexProps = {
            indexName: 'AnimeKey-Episode-index',
            partitionKey: { name: 'AnimeKey', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'Episode', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.INCLUDE,
            nonKeyAttributes: ['MyAnimeListId', 'Dub', 'Episode'],
        };

        const dwnSecondaryIndex: dynamodb.GlobalSecondaryIndexProps = {
            indexName: 'Status-SortKey-index',
            partitionKey: { name: 'Status', type: dynamodb.AttributeType.NUMBER },
            sortKey: { name: 'SortKey', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.INCLUDE,
            nonKeyAttributes: ['MyAnimeListId', 'Dub', 'Episode'],
        };

        const matcherSecondaryIndex: dynamodb.GlobalSecondaryIndexProps = {
            indexName: 'Matcher-CreatedAt-index',
            partitionKey: { name: 'MatchingGroup', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.INCLUDE,
            nonKeyAttributes: ['MyAnimeListId', 'Dub', 'Episode'],
        };

        filesTable.addGlobalSecondaryIndex(animeKeySecondaryIndex);
        filesTable.addGlobalSecondaryIndex(dwnSecondaryIndex);
        filesTable.addGlobalSecondaryIndex(matcherSecondaryIndex);

        return { table: filesTable, animeKeySecondaryIndex, dwnSecondaryIndex, matcherSecondaryIndex };
    }

    private createVideoRegisteredTopic(): sns.Topic {
        return new sns.Topic(this, 'VideoRegisteredSnsTopic');
    }

    private createVideoDownloadedTopic(): sns.Topic {
        return new sns.Topic(this, 'VideoDownloadedSnsTopic');
    }

    private createSceneRecognisedTopic(): sns.Topic {
        return new sns.Topic(this, 'SceneRecognisedSnsTopic');
    }

    private createLogGroup(): logs.LogGroup {
        return new logs.LogGroup(this, 'LogGroup', {
            retention: logs.RetentionDays.ONE_WEEK,
        });
    }

    private setErrorAlarm(logGroup: logs.LogGroup): void {
        const topic = new sns.Topic(this, 'LogGroupAlarmSnsTopic');
        topic.addSubscription(new subs.EmailSubscription(config.alertEmail));

        const metricFilter = logGroup.addMetricFilter('ErrorMetricFilter', {
            filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Error', 'error', 'fail'),
            metricNamespace: this.stackName,
            metricName: 'ErrorCount',
            metricValue: '1',
        });

        const alarm = new cw.Alarm(this, 'LogGroupErrorAlarm', {
            metric: metricFilter.metric(),
            threshold: 1,
            evaluationPeriods: 1,
            treatMissingData: cw.TreatMissingData.NOT_BREACHING,
        });

        alarm.addAlarmAction(new cloudwatchActions.SnsAction(topic));
    }

    private createLambdas(
        filesTable: dynamodb.Table,
        animeKeySecondaryIndexName: string,
        dwnSecondaryIndexName: string,
        matcherSecondaryIndexName: string,
        videoRegisteredTopic: sns.ITopic,
        videoDownloadedTopic: sns.ITopic,
        sceneRecognisedTopic: sns.ITopic,
        logGroup: logs.LogGroup,
    ): Map<LambdaHandler, lambda.Function> {
        const functions = new Map<LambdaHandler, lambda.Function>();
        Object.entries(LambdaHandler).forEach(([lambdaName, handlerName]) => {
            const func = new LlrtFunction(this, lambdaName, {
                entry: `src/handlers/${handlerName}/handler.ts`,
                handler: 'handler',
                logGroup: logGroup,
                environment: {
                    LOAN_API_TOKEN: config.loanApiToken,
                    LOAN_API_MAX_CONCURRENT_REQUESTS: '6',
                    DATABASE_TABLE_NAME: filesTable.tableName,
                    DATABASE_ANIMEKEY_INDEX_NAME: animeKeySecondaryIndexName,
                    DATABASE_SECONDARY_INDEX_NAME: dwnSecondaryIndexName,
                    DATABASE_MATCHER_SECONDARY_INDEX_NAME: matcherSecondaryIndexName,
                    VIDEO_REGISTERED_TOPIC_ARN: videoRegisteredTopic.topicArn,
                    VIDEO_DOWNLOADED_TOPIC_ARN: videoDownloadedTopic.topicArn,
                    SCENE_RECOGNISED_TOPIC_ARN: sceneRecognisedTopic.topicArn,
                },
                timeout: Duration.seconds(30),
            });

            filesTable.grantReadWriteData(func);
            functions.set(handlerName, func);
        });

        videoRegisteredTopic.grantPublish(functions.get(LambdaHandler.GetAnime)!);
        videoRegisteredTopic.grantPublish(functions.get(LambdaHandler.RegisterVideos)!);
        videoDownloadedTopic.grantPublish(functions.get(LambdaHandler.UpdateVideoStatus)!);
        sceneRecognisedTopic.grantPublish(functions.get(LambdaHandler.UpdateVideoStatus)!);
        sceneRecognisedTopic.grantPublish(functions.get(LambdaHandler.UpdateVideoScenes)!);

        return functions;
    }

    private out(key: string, value: object | string): void {
        const output = typeof value === 'string' ? value : JSON.stringify(value);
        new CfnOutput(this, key, { value: output });
    }
}

enum LambdaHandler {
    GetAnime = 'get-anime',
    GetVideoToDownload = 'get-video-to-download',
    UpdateVideoStatus = 'update-video-status',
    GetSeriesToMatch = 'get-series-to-match',
    UpdateVideoScenes = 'update-video-scenes',
    UpdatePublishingDetails = 'update-publishing-details',
    RegisterVideos = 'register-videos',
}
