import { GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { VideoEntity } from '../../models/video-entity';
import { VideoKey } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { docClient, getAnimeKey, getDownloaderKey, getVideoKey } from '../../shared/repository';
import { VideoStatusNum } from '../../models/video-status-num';

export type GetAnimeForUserResult
    = Pick<VideoEntity, 'Status' | 'MessageId' | 'Scenes' | 'PublishingDetails'> | undefined;

export const getAnimeForUser = async (videoKey: VideoKey): Promise<GetAnimeForUserResult> => {
    const command = new GetCommand({
        TableName: config.value.database.tableName,
        Key: { PrimaryKey: getVideoKey(videoKey) },
        AttributesToGet: ['Status', 'MessageId', 'Scenes', 'PublishingDetails'] as (keyof VideoEntity)[],
    });

    const response = await docClient.send(command);
    return response.Item as (Pick<VideoEntity, 'Status' | 'MessageId' | 'Scenes' | 'PublishingDetails'> | undefined);
}

export const getRegisteredEpisodes = async (myAnimeListId: number, dub: string): Promise<number[]> => {
    const command = new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.animeKeyIndexName,
        Select: 'SPECIFIC_ATTRIBUTES',
        ProjectionExpression: 'Episode',
        FilterExpression: 'AnimeKey = :animeKey',
        ExpressionAttributeValues: {
            ':animeKey': getAnimeKey(myAnimeListId, dub),
        },
    });

    const response = await docClient.send(command);
    return response.Items?.map(item => item.Episode) ?? [];
}

export const attachUserToVideo = async (videoKey: VideoKey, chatId: number): Promise<void> => {
    const command = new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: { PrimaryKey: getVideoKey(videoKey) },
        ConditionExpression: 'attribute_exists(PrimaryKey)',
        UpdateExpression: 'ADD #subscribers :chatId SET UpdatedAt = :updatedAt, SortKey = :sortKey',
        ExpressionAttributeNames: {
            '#subscribers': 'Subscribers',
        },
        ExpressionAttributeValues: {
            ':chatId': new Set([chatId]),
            ':updatedAt': new Date().toISOString(),
            ':sortKey': getDownloaderKey(VideoStatusNum.Pending, true, new Date().toISOString(), videoKey.Episode),
        },
        ReturnValues: 'NONE',
    });

    const result = await docClient.send(command);
    console.log('Attached user to video: ' + JSON.stringify(result));
}