import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { VideoKey } from '../common/ts/interfaces';
import { VideoStatusNum } from '../models/video-status-num';
import { VideoEntity } from '../models/video-entity';
import { config } from '../config/config';

const dynamoDbClient = new DynamoDBClient();

export const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const getVideoKey = (videoKey: VideoKey): string => {
    return `${videoKey.MyAnimeListId}#${videoKey.Dub}#${videoKey.Episode}`;
}

export const getAnimeKey = (myAnimeListId: number, dub: string): string => {
    return `${myAnimeListId}#${dub}`;
}

export const getDownloaderKey = (
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
        AnimeKey: getAnimeKey(video.MyAnimeListId, video.Dub),
        SortKey: getDownloaderKey(VideoStatusNum.Pending, false, new Date().toISOString(), video.Episode),
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
