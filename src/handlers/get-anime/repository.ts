import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { VideoKey } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { docClient, getAnimeKey, getVideoKey } from '../../shared/repository';

type GetAnimeForUserResult = Pick<VideoEntity, 'Status' | 'MessageId' | 'Scenes' | 'PublishingDetails'> | undefined;

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
