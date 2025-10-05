import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { VideoKey } from '../common/ts/interfaces';
import { config } from '../config/config';
import { VideoEntity } from '../models/video-entity';
import { VideoStatusNum } from '../models/video-status-num';

const dynamoDbClient = new DynamoDBClient();

export const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const getVideoKey = (videoKey: VideoKey): string => {
    return `${videoKey.myAnimeListId}#${videoKey.dub}#${videoKey.episode}`;
}

export const getAnimeKey = (myAnimeListId: number, dub: string): string => {
    return `${myAnimeListId}#${dub}`;
}

const getDownloaderKey = (
    status: VideoStatusNum,
    hasSubscriber: boolean,
    createdAt: string,
    episode: number,
): string | undefined => {
    return status === VideoStatusNum.Pending
        ? `${hasSubscriber ? '0' : '1'}#${createdAt}#${episode.toString().padStart(4, '0')}`
        : undefined;
}

export const insertVideo = async (videos: VideoKey[]): Promise<void> => {
    const putCommands = videos.map(video => ({
        primaryKey: getVideoKey(video),
        animeKey: getAnimeKey(video.myAnimeListId, video.dub),
        sortKey: getDownloaderKey(VideoStatusNum.Pending, false, new Date().toISOString(), video.episode),
        matchingGroup: getAnimeKey(video.myAnimeListId, video.dub),
        myAnimeListId: video.myAnimeListId,
        dub: video.dub,
        episode: video.episode,
        status: VideoStatusNum.Pending,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    } as VideoEntity));

    const batches = putCommands.reduce((acc, item, index) => {
        const batchIndex = Math.floor(index / 25);
        acc[batchIndex] = acc[batchIndex] ?? [];
        acc[batchIndex].push(item);
        return acc;
    }, [] as VideoEntity[][]);

    const commands = batches.map(batch => new BatchWriteCommand({
        RequestItems: {
            [config.value.database.tableName]: batch.map(item => ({
                PutRequest: {
                    Item: item, // TODO: PK check?
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

export const increasePriority = async (videoKey: VideoKey): Promise<void> => {
    const command = new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: { primaryKey: getVideoKey(videoKey) },
        UpdateExpression: 'SET sortKey = :newSortKey, updatedAt = :updatedAt',
        ConditionExpression: 'attribute_exists(primaryKey)',
        ExpressionAttributeValues: {
            ':newSortKey': getDownloaderKey(VideoStatusNum.Pending, true, new Date().toISOString(), videoKey.episode),
            ':updatedAt': new Date().toISOString(),
        },
    });

    await docClient.send(command);
}