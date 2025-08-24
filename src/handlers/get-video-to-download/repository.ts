import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { VideoStatusNum } from '../../models/video-status-num';
import { docClient } from '../../shared/repository';

type GetEpisodeToDownloadResult = Pick<VideoEntity, 'MyAnimeListId' | 'Dub' | 'Episode'>;

// Get first video to download and set its status to Downloading.
export const getEpisodeToDownloadAndLock = async (): Promise<GetEpisodeToDownloadResult | undefined> => {
    const videoToDownload = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.secondaryIndexName,
        Limit: 1,
        FilterExpression: '#S = :pending',
        ExpressionAttributeNames: {
            '#S': 'Status',
        },
        ExpressionAttributeValues: {
            ':pending': VideoStatusNum.Pending,
        },
        Select: 'SPECIFIC_ATTRIBUTES',
        ProjectionExpression: 'PrimaryKey, UpdatedAt',
    }));

    const video = videoToDownload.Items?.[0] as Pick<VideoEntity, 'PrimaryKey' | 'UpdatedAt'> | undefined;
    if (!video) {
        return undefined;
    }

    const updateStatusResult = await docClient.send(new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: { PrimaryKey: video.PrimaryKey },
        UpdateExpression: 'SET #S = :downloading, UpdatedAt = :now',
        ConditionExpression: '#S = :pending AND UpdatedAt = :oldUpdatedAt',
        ExpressionAttributeNames: {
            '#S': 'Status',
        },
        ExpressionAttributeValues: {
            ':pending': VideoStatusNum.Pending,
            ':oldUpdatedAt': video.UpdatedAt,
            ':downloading': VideoStatusNum.Downloading,
            ':now': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
    }));

    const videoEntity = updateStatusResult.Attributes as VideoEntity;

    return {
        MyAnimeListId: videoEntity.MyAnimeListId,
        Dub: videoEntity.Dub,
        Episode: videoEntity.Episode,
    };
}
