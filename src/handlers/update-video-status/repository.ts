import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config/config';
import { docClient, getTableKey } from '../../shared/repository';
import { VideoKey } from '../../common/ts/interfaces';
import { VideoStatusNum } from '../../models/video-status-num';
import { VideoEntity } from '../../models/video-entity';

export type GetAnimeForNotificationResult = Pick<VideoEntity, 'Subscribers' | 'Scenes'> | undefined;

export const markVideoDownloaded = async (request: VideoKey, messageId: number): Promise<void> => {
    const result = await docClient.send(new UpdateCommand({
        TableName: config.database.tableName,
        Key: {
            PrimaryKey: getTableKey(request),
        },
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
        TableName: config.database.tableName,
        Key: {
            PrimaryKey: getTableKey(request),
        },
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
        TableName: config.database.tableName,
        Key: { PrimaryKey: getTableKey(request) },
        AttributesToGet: ['Subscribers', 'Scenes'] as (keyof VideoEntity)[],
    });

    const response = await docClient.send(command);
    return response.Item;
}

export const clearSubscribers = async (request: VideoKey): Promise<void> => {
    const result = await docClient.send(new UpdateCommand({
        TableName: config.database.tableName,
        Key: {
            PrimaryKey: getTableKey(request),
        },
        UpdateExpression: 'REMOVE #subscribers',
        ExpressionAttributeNames: {
            '#subscribers': 'Subscribers',
        },
    }));
    console.log('Clear subscribers result: ' + JSON.stringify(result));
}