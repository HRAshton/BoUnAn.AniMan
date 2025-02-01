import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config/config';
import { docClient, getVideoKey } from '../../shared/repository';
import { VideoKey } from '../../common/ts/interfaces';
import { VideoStatusNum } from '../../models/video-status-num';
import { VideoEntity } from '../../models/video-entity';

export type GetAnimeForNotificationResult
    = Pick<VideoEntity, 'Subscribers' | 'Scenes' | 'PublishingDetails'> | undefined;

export const markVideoDownloaded = async (request: VideoKey, messageId: number): Promise<void> => {
    const result = await docClient.send(new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: {
            PrimaryKey: getVideoKey(request),
            SortKey: undefined,
        },
        ConditionExpression: 'attribute_exists(PrimaryKey)',
        UpdateExpression: 'SET #status = :status, #messageId = :messageId, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
            '#status': 'Status',
            '#messageId': 'MessageId',
            '#updatedAt': 'UpdatedAt',
        },
        ExpressionAttributeValues: {
            ':status': VideoStatusNum.Downloaded,
            ':messageId': messageId,
            ':updatedAt': new Date().toISOString(),
        },
    }));
    console.log('Update result: ' + JSON.stringify(result));
}

export const markVideoFailed = async (request: VideoKey): Promise<void> => {
    const result = await docClient.send(new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: {
            PrimaryKey: getVideoKey(request),
        },
        ConditionExpression: 'attribute_exists(PrimaryKey)',
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
            '#status': 'Status',
            '#updatedAt': 'UpdatedAt',
        },
        ExpressionAttributeValues: {
            ':status': VideoStatusNum.Failed,
            ':updatedAt': new Date().toISOString(),
        },
    }));
    console.log('Update result: ' + JSON.stringify(result));
}

export const getAnimeForNotification = async (request: VideoKey): Promise<GetAnimeForNotificationResult> => {
    const command = new GetCommand({
        TableName: config.value.database.tableName,
        Key: { PrimaryKey: getVideoKey(request) },
        AttributesToGet: ['Subscribers', 'Scenes', 'PublishingDetails'] as (keyof VideoEntity)[],
    });

    const response = await docClient.send(command);
    return response.Item;
}

export const clearSubscribers = async (request: VideoKey): Promise<void> => {
    const result = await docClient.send(new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: {
            PrimaryKey: getVideoKey(request),
        },
        UpdateExpression: 'REMOVE #subscribers',
        ExpressionAttributeNames: {
            '#subscribers': 'Subscribers',
        },
    }));
    console.log('Clear subscribers result: ' + JSON.stringify(result));
}