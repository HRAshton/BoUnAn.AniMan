import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { VideoEntity } from '../../models/video-entity';
import { config } from '../../config/config';
import { docClient } from '../../shared/repository';
import { UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { VideoStatusNum } from '../../models/video-status-num';

type GetEpisodeToDownloadResult = Pick<VideoEntity, 'MyAnimeListId' | 'Dub' | 'Episode'> | undefined;

// Get first matching group and all its video keys
export const getEpisodeToDownloadAndLock = async (): Promise<GetEpisodeToDownloadResult> => {
    const videoToDownload = await docClient.send(new ScanCommand({
        TableName: config.database.tableName,
        IndexName: config.database.secondaryIndexName,
        Select: 'SPECIFIC_ATTRIBUTES',
        ProjectionExpression: 'PrimaryKey, MyAnimeListId, Dub, Episode',
        Limit: 1,
    }));

    const video = videoToDownload.Items?.[0] as GetEpisodeToDownloadResult & { PrimaryKey: string } | undefined;
    if (!video) {
        return undefined;
    }

    const lockResult = await docClient.send(new UpdateItemCommand({
        TableName: config.database.tableName,
        Key: {
            PrimaryKey: { S: video.PrimaryKey },
        },
        UpdateExpression: 'SET #status = :newStatus, #updatedAt = :updatedAt REMOVE #sortKey',
        ConditionExpression: '#status = :oldStatus',
        ExpressionAttributeNames: {
            '#status': 'Status',
            '#sortKey': 'SortKey',
            '#updatedAt': 'UpdatedAt',
        },
        ExpressionAttributeValues: {
            ':oldStatus': { N: VideoStatusNum.Pending.toString() },
            ':newStatus': { N: VideoStatusNum.Downloading.toString() },
            ':updatedAt': { S: new Date().toISOString() },
        },
    }));
    console.log('Lock result: ' + JSON.stringify(lockResult));

    return {
        MyAnimeListId: video.MyAnimeListId,
        Dub: video.Dub,
        Episode: video.Episode,
    };
}
