import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

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
        PrimaryKey: getVideoKey(video),
        AnimeKey: getAnimeKey(video.myAnimeListId, video.dub),
        SortKey: getDownloaderKey(VideoStatusNum.Pending, false, new Date().toISOString(), video.episode),
        MatchingGroup: getAnimeKey(video.myAnimeListId, video.dub),
        MyAnimeListId: video.myAnimeListId,
        Dub: video.dub,
        Episode: video.episode,
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
