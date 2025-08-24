import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { VideoStatusNum } from '../../models/video-status-num';
import { docClient } from '../../shared/repository';

type GetEpisodeToDownloadResult = Pick<VideoEntity, 'MyAnimeListId' | 'Dub' | 'Episode'>;

// Get first matching group and all its video keys
export const getEpisodeToDownloadAndLock = async (): Promise<GetEpisodeToDownloadResult | undefined> => {
    const videoToDownload = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.secondaryIndexName,
        Limit: 1,
        Select: 'SPECIFIC_ATTRIBUTES',
        ProjectionExpression: 'PrimaryKey',
    }));

    const video = videoToDownload.Items?.[0] as GetEpisodeToDownloadResult & { PrimaryKey: string } | undefined;
    if (!video) {
        return undefined;
    }

    const updateStatusResult = await docClient.send(new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: { PrimaryKey: video.PrimaryKey },
        UpdateExpression: 'SET #S = :downloading, UpdatedAt = :now',
        ExpressionAttributeNames: {
            '#S': 'Status',
        },
        ExpressionAttributeValues: {
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
