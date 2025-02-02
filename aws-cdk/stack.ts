﻿import { Stack, StackProps, Duration, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LlrtFunction } from 'cdk-lambda-llrt';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cw from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';

import { Config, getConfig } from './config';
import { Config as RuntimeConfig } from '../src/config/config';
import { ExportNames } from '../src/common/ts/cdk/export-names';

const USE_MOCKS = false;

export class AniManCdkStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        if (USE_MOCKS && !this.isStage) {
            throw new Error('Mock handlers can only be used in eu-central-1');
        }

        const config = getConfig(this, '/bounan/animan/deploy-config');

        const { table, indexes } = this.createFilesTable();
        const topics = this.createSnsTopics();
        const logGroup = this.createLogGroup();
        const parameter = this.saveParameters(table, indexes, topics, config);
        const functions = this.createLambdas(table, topics, logGroup, parameter);
        this.setErrorAlarm(logGroup, config);

        this.export({
            AlertEmail: config.alertEmail,
            LoanApiToken: config.loanApiToken,
            VideoRegisteredSnsTopicArn: topics.get(RequiredTopic.VideoRegistered)!.topicArn,
            VideoDownloadedSnsTopicArn: topics.get(RequiredTopic.VideoDownloaded)!.topicArn,
            SceneRecognisedSnsTopicArn: topics.get(RequiredTopic.SceneRecognised)!.topicArn,
            GetAnimeFunctionName: functions.get(LambdaHandler.GetAnime)!.functionName,
            GetVideoToDownloadFunctionName: functions.get(LambdaHandler.GetVideoToDownload)!.functionName,
            UpdateVideoStatusFunctionName: functions.get(LambdaHandler.UpdateVideoStatus)!.functionName,
            GetSeriesToMatchFunctionName: functions.get(LambdaHandler.GetSeriesToMatch)!.functionName,
            UpdateVideoScenesFunctionName: functions.get(LambdaHandler.UpdateVideoScenes)!.functionName,
            UpdatePublishingDetailsFunctionName: functions.get(LambdaHandler.UpdatePublishingDetails)!.functionName,
            RegisterVideosFunctionName: functions.get(LambdaHandler.RegisterVideos)!.functionName,
        });
    }

    private get isStage(): boolean {
        return this.region === 'eu-central-1';
    }

    private createFilesTable(): {
        table: dynamodb.Table,
        indexes: Map<RequiredIndex, dynamodb.GlobalSecondaryIndexProps>,
        // eslint-disable-next-line indent
    } {
        const capacities: Partial<dynamodb.TableProps> = {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            maxReadRequestUnits: 3,
            maxWriteRequestUnits: 2,
        };

        const filesTable = new dynamodb.Table(this, 'FilesTable', {
            partitionKey: { name: 'PrimaryKey', type: dynamodb.AttributeType.STRING },
            removalPolicy: RemovalPolicy.RETAIN,
            deletionProtection: !this.isStage,
            ...capacities,
        });

        const animeKeySecondaryIndex: dynamodb.GlobalSecondaryIndexProps = {
            indexName: RequiredIndex.VideoKey,
            partitionKey: { name: 'AnimeKey', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'Episode', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.INCLUDE,
            nonKeyAttributes: ['MyAnimeListId', 'Dub', 'Episode'],
            ...capacities,
        };

        const dwnSecondaryIndex: dynamodb.GlobalSecondaryIndexProps = {
            indexName: RequiredIndex.DownloadStatusKey,
            partitionKey: { name: 'Status', type: dynamodb.AttributeType.NUMBER },
            sortKey: { name: 'SortKey', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.INCLUDE,
            nonKeyAttributes: ['MyAnimeListId', 'Dub', 'Episode'],
            ...capacities,
        };

        const matcherSecondaryIndex: dynamodb.GlobalSecondaryIndexProps = {
            indexName: RequiredIndex.MatcherStatusKey,
            partitionKey: { name: 'MatchingGroup', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.INCLUDE,
            nonKeyAttributes: ['MyAnimeListId', 'Dub', 'Episode'],
            ...capacities,
        };

        filesTable.addGlobalSecondaryIndex(animeKeySecondaryIndex);
        filesTable.addGlobalSecondaryIndex(dwnSecondaryIndex);
        filesTable.addGlobalSecondaryIndex(matcherSecondaryIndex);

        return {
            table: filesTable,
            indexes: new Map<RequiredIndex, dynamodb.GlobalSecondaryIndexProps>([
                [RequiredIndex.VideoKey, animeKeySecondaryIndex],
                [RequiredIndex.DownloadStatusKey, dwnSecondaryIndex],
                [RequiredIndex.MatcherStatusKey, matcherSecondaryIndex],
            ]),
        };
    }

    private createSnsTopics(): Map<RequiredTopic, sns.Topic> {
        const result = new Map<RequiredTopic, sns.Topic>();
        Object.values(RequiredTopic).forEach((topic) => {
            result.set(topic, new sns.Topic(this, topic));
        });

        return result;
    }

    private createLogGroup(): logs.LogGroup {
        return new logs.LogGroup(this, 'LogGroup', {
            retention: logs.RetentionDays.ONE_WEEK,
        });
    }

    private setErrorAlarm(logGroup: logs.LogGroup, config: Config): void {
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

    private saveParameters(
        filesTable: dynamodb.Table,
        indexes: Map<RequiredIndex, dynamodb.GlobalSecondaryIndexProps>,
        topics: Map<RequiredTopic, sns.Topic>,
        config: Config,
    ): ssm.IStringParameter {
        const value = {
            loanApiConfig: {
                token: config.loanApiToken,
                maxConcurrentRequests: 6,
            },
            database: {
                tableName: filesTable.tableName,
                animeKeyIndexName: indexes.get(RequiredIndex.VideoKey)!.indexName,
                secondaryIndexName: indexes.get(RequiredIndex.DownloadStatusKey)!.indexName,
                matcherSecondaryIndexName: indexes.get(RequiredIndex.MatcherStatusKey)!.indexName,
            },
            topics: {
                videoRegisteredTopicArn: topics.get(RequiredTopic.VideoRegistered)!.topicArn,
                videoDownloadedTopicArn: topics.get(RequiredTopic.VideoDownloaded)!.topicArn,
                sceneRecognisedTopicArn: topics.get(RequiredTopic.SceneRecognised)!.topicArn,
            },
        } as Required<RuntimeConfig>;

        return new ssm.StringParameter(this, '/bounan/animan/runtime-config', {
            parameterName: '/bounan/animan/runtime-config',
            stringValue: JSON.stringify(value, null, 2),
        });
    }

    private createLambdas(
        filesTable: dynamodb.Table,
        topics: Map<RequiredTopic, sns.Topic>,
        logGroup: logs.LogGroup,
        parameter: ssm.IStringParameter,
    ): Map<LambdaHandler, lambda.Function> {
        const functions = new Map<LambdaHandler, lambda.Function>();
        Object.entries(LambdaHandler).forEach(([lambdaName, handlerName]) => {
            const entry = USE_MOCKS
                ? `src/handlers-mocks/${handlerName}.ts`
                : `src/handlers/${handlerName}/handler.ts`;

            const func = new LlrtFunction(this, lambdaName, {
                entry,
                handler: 'handler',
                logGroup: logGroup,
                timeout: Duration.seconds(30),
            });

            filesTable.grantReadWriteData(func);
            parameter.grantRead(func);
            functions.set(handlerName, func);
        });

        topics.get(RequiredTopic.VideoRegistered)!.grantPublish(functions.get(LambdaHandler.GetAnime)!);
        topics.get(RequiredTopic.VideoRegistered)!.grantPublish(functions.get(LambdaHandler.RegisterVideos)!);
        topics.get(RequiredTopic.VideoDownloaded)!.grantPublish(functions.get(LambdaHandler.UpdateVideoStatus)!);
        topics.get(RequiredTopic.SceneRecognised)!.grantPublish(functions.get(LambdaHandler.UpdateVideoStatus)!);
        topics.get(RequiredTopic.SceneRecognised)!.grantPublish(functions.get(LambdaHandler.UpdateVideoScenes)!);

        return functions;
    }

    private export(exports: { [key in keyof typeof ExportNames]: string }): void {
        Object.entries(ExportNames).forEach(([key, value]) => {
            new CfnOutput(this, value, {
                value: exports[key as keyof typeof ExportNames],
                exportName: `bounan:${value}`,
            });
        });
    }
}

// noinspection JSUnusedGlobalSymbols
enum LambdaHandler {
    GetAnime = 'get-anime',
    GetVideoToDownload = 'get-video-to-download',
    UpdateVideoStatus = 'update-video-status',
    GetSeriesToMatch = 'get-series-to-match',
    UpdateVideoScenes = 'update-video-scenes',
    UpdatePublishingDetails = 'update-publishing-details',
    RegisterVideos = 'register-videos',
}

enum RequiredTopic {
    VideoRegistered = 'VideoRegisteredSnsTopic',
    VideoDownloaded = 'VideoDownloadedSnsTopic',
    SceneRecognised = 'SceneRecognisedSnsTopic',
}

enum RequiredIndex {
    VideoKey = 'AnimeKey-Episode-index',
    DownloadStatusKey = 'Status-SortKey-index',
    MatcherStatusKey = 'Matcher-CreatedAt-index',
}