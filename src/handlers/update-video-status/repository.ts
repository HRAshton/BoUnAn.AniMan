import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config/config';
import { docClient, getTableKey } from '../../shared/repository';
import { VideoKey } from '../../common/ts/interfaces';
import { VideoStatusNum } from '../../models/video-status-num';
import { VideoEntity } from '../../models/video-entity';

export type GetAnimeForNotificationResult = Pick<VideoEntity, 'Subscribers' | 'Scenes'> | undefined;

export const markVideoDownloaded = async (request: VideoKey, messageId: number): Promise<void> => {
    const existingVideo = await docClient.send(new GetCommand({
        TableName: config.database.tableName,
        Key: { PrimaryKey: getTableKey(request) },
    }));
    console.log('Existing video: ' + JSON.stringify(existingVideo));

    const deleteResult = await docClient.send(new DeleteCommand({
        TableName: config.database.tableName,
        Key: { PrimaryKey: getTableKey(request) },
    }));
    console.log('Delete result: ' + JSON.stringify(deleteResult));

    const putResult = await docClient.send(new PutCommand({
        TableName: config.database.tableName,
        Item: {
            ...existingVideo.Item,
            Status: VideoStatusNum.Downloaded,
            MessageId: messageId,
            UpdatedAt: new Date().toISOString(),
        },
    }));
    console.log('Put result: ' + JSON.stringify(putResult));
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