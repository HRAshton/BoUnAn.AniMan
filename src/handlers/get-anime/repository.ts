import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { VideoKey } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { docClient, getAnimeKey, getVideoKey } from '../../shared/repository';

type GetAnimeForUserResult = Pick<VideoEntity, 'status' | 'messageId' | 'scenes' | 'publishingDetails'> | undefined;

export const getAnimeForUser = async (videoKey: VideoKey): Promise<GetAnimeForUserResult> => {
    const command = new GetCommand({
        TableName: config.value.database.tableName,
        Key: { primaryKey: getVideoKey(videoKey) },
        AttributesToGet: ['status', 'messageId', 'scenes', 'publishingDetails'] as (keyof VideoEntity)[],
    });

    const response = await docClient.send(command);
    return response.Item as (Pick<VideoEntity, 'status' | 'messageId' | 'scenes' | 'publishingDetails'> | undefined);
}

export const getRegisteredEpisodes = async (myAnimeListId: number, dub: string): Promise<number[]> => {
    const command = new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.animeKeyIndexName,
        Select: 'SPECIFIC_ATTRIBUTES',
        ProjectionExpression: 'episode',
        FilterExpression: 'animeKey = :animeKey',
        ExpressionAttributeValues: {
            ':animeKey': getAnimeKey(myAnimeListId, dub),
        },
    });

    const response = await docClient.send(command) as unknown as { Items?: { episode: number }[] };
    return response.Items?.map(item => item.episode) ?? [];
}
