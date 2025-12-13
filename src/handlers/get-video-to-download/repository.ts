import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { VideoStatusNum } from '../../models/video-status-num';
import { docClient } from '../../shared/repository';

type GetEpisodeToDownloadResult = Pick<VideoEntity, 'myAnimeListId' | 'dub' | 'episode'>;

// Get first video to download and set its status to Downloading.
export const getEpisodeToDownloadAndLock = async (): Promise<GetEpisodeToDownloadResult | undefined> => {
    const pendingVideosResponse = await docClient.send(new ScanCommand({
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
        Select: 'ALL_PROJECTED_ATTRIBUTES',
    }));

    const video = pendingVideosResponse.Items?.[0] as Pick<VideoEntity, 'primaryKey' | 'updatedAt' | 'myAnimeListId' | 'dub' | 'episode'> | undefined;
    if (!video) {
        return undefined;
    }

    await docClient.send(new UpdateCommand({
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
        ReturnValues: 'NONE',
    }));

    return {
        episode: video.episode,
        myAnimeListId: video.myAnimeListId,
        dub: video.dub,
    };
}
