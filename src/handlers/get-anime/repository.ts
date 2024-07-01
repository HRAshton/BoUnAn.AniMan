import { BatchWriteCommand, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { VideoEntity } from '../../models/video-entity';
import { VideoKey } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { docClient, getTableKey } from '../../shared/repository';
import { VideoStatusNum } from '../../models/video-status-num';

const getAnimeKey = (myAnimeListId: number, dub: string): string => {
    return `${myAnimeListId}#${dub}`;
}

const getSortKey = (status: VideoStatusNum, hasSubscriber: boolean, createdAt: string): string | undefined => {
    return status === VideoStatusNum.Pending
        ? `${hasSubscriber ? '0' : '1'}#${createdAt}`
        : undefined;
}

export type GetAnimeForUserResult = Pick<VideoEntity, 'Status' | 'MessageId' | 'Scenes'> | undefined;

export const getAnimeForUser = async (videoKey: VideoKey): Promise<GetAnimeForUserResult> => {
    const command = new GetCommand({
        TableName: config.database.tableName,
        Key: { PrimaryKey: getTableKey(videoKey) },
        AttributesToGet: ['Status', 'MessageId', 'Scenes'] as (keyof VideoEntity)[],
    });

    const response = await docClient.send(command);
    return response.Item as (Pick<VideoEntity, 'Status' | 'MessageId' | 'Scenes'> | undefined);
}

export const getRegisteredEpisodes = async (myAnimeListId: number, dub: string): Promise<number[]> => {
    const command = new ScanCommand({
        TableName: config.database.tableName,
        IndexName: config.database.animeKeyIndexName,
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

export const insertVideo = async (videos: VideoKey[]): Promise<void> => {
    const putCommands = videos.map(video => ({
        PrimaryKey: getTableKey(video),
        AnimeKey: getAnimeKey(video.MyAnimeListId, video.Dub),
        SortKey: getSortKey(VideoStatusNum.Pending, false, new Date().toISOString()),
        MatchingGroup: getAnimeKey(video.MyAnimeListId, video.Dub),
        MyAnimeListId: video.MyAnimeListId,
        Dub: video.Dub,
        Episode: video.Episode,
        Status: VideoStatusNum.Pending,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
    } as VideoEntity));

    const batches = putCommands.reduce((acc, item, index) => {
        const batchIndex = Math.floor(index / 25);
        acc[batchIndex] = acc[batchIndex] ?? [];
        acc[batchIndex].push(item);
        return acc;
    }, [] as VideoEntity[][]);

    const commands = batches.map(batch => new BatchWriteCommand({
        RequestItems: {
            [config.database.tableName]: batch.map(item => ({
                PutRequest: {
                    Item: item,
                },
            })),
        },
    }));

    for (const command of commands) {
        const result = await docClient.send(command);
        console.log('Inserted videos: ' + JSON.stringify(result));
    }

    console.log('All videos inserted');
}

export const attachUserToVideo = async (videoKey: VideoKey, chatId: number): Promise<void> => {
    const command = new UpdateCommand({
        TableName: config.database.tableName,
        Key: { PrimaryKey: getTableKey(videoKey) },
        UpdateExpression: 'ADD #subscribers :chatId SET UpdatedAt = :updatedAt, SortKey = :sortKey',
        ExpressionAttributeNames: {
            '#subscribers': 'Subscribers',
        },
        ExpressionAttributeValues: {
            ':chatId': new Set([chatId]),
            ':updatedAt': new Date().toISOString(),
            ':sortKey': getSortKey(VideoStatusNum.Pending, true, new Date().toISOString()),
        },
        ReturnValues: 'NONE',
    });

    const result = await docClient.send(command);
    console.log('Attached user to video: ' + JSON.stringify(result));
}