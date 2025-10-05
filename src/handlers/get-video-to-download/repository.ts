import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { VideoStatusNum } from '../../models/video-status-num';
import { docClient } from '../../shared/repository';

type GetEpisodeToDownloadResult = Pick<VideoEntity, 'myAnimeListId' | 'dub' | 'episode'>;

// Get first video to download and set its status to Downloading.
export const getEpisodeToDownloadAndLock = async (): Promise<GetEpisodeToDownloadResult | undefined> => {
    const videoToDownload = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.secondaryIndexName,
        Limit: 10, // Scan a few items to reduce chance of empty result
        FilterExpression: '#S = :pending',
        ExpressionAttributeNames: {
            '#S': 'status',
        },
        ExpressionAttributeValues: {
            ':pending': VideoStatusNum.Pending,
        },
        Select: 'SPECIFIC_ATTRIBUTES',
        ProjectionExpression: 'primaryKey, updatedAt, episode, myAnimeListId, dub',
    }));

    const video = videoToDownload.Items?.[0] as Pick<VideoEntity, 'primaryKey' | 'updatedAt' | 'episode' | 'myAnimeListId' | 'dub'> | undefined;
    if (!video) {
        return undefined;
    }

    const updateStatusResult = await docClient.send(new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: { primaryKey: video.primaryKey },
        UpdateExpression: 'SET #S = :downloading, updatedAt = :now',
        ConditionExpression: '#S = :pending AND updatedAt = :oldUpdatedAt',
        ExpressionAttributeNames: {
            '#S': 'status',
        },
        ExpressionAttributeValues: {
            ':pending': VideoStatusNum.Pending,
            ':downloading': VideoStatusNum.Downloading,
            ':oldUpdatedAt': video.updatedAt,
            ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
    }));

    const videoEntity = updateStatusResult.Attributes as VideoEntity;

    return {
        episode: videoEntity.episode,
        myAnimeListId: videoEntity.myAnimeListId,
        dub: videoEntity.dub,
    };
}
