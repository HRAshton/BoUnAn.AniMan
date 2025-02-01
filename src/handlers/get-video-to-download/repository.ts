import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { VideoEntity } from '../../models/video-entity';
import { config } from '../../config/config';
import { docClient } from '../../shared/repository';
import { VideoStatusNum } from '../../models/video-status-num';

type GetEpisodeToDownloadResult = Pick<VideoEntity, 'MyAnimeListId' | 'Dub' | 'Episode'> | undefined;

// Get first matching group and all its video keys
export const getEpisodeToDownloadAndLock = async (): Promise<GetEpisodeToDownloadResult> => {
    const videoToDownload = await docClient.send(new ScanCommand({
        TableName: config.database.tableName,
        IndexName: config.database.secondaryIndexName,
        Select: 'SPECIFIC_ATTRIBUTES',
        ProjectionExpression: 'PrimaryKey',
        Limit: 1,
    }));

    const video = videoToDownload.Items?.[0] as GetEpisodeToDownloadResult & { PrimaryKey: string } | undefined;
    if (!video) {
        return undefined;
    }

    const videoEntityResult = await docClient.send(new GetCommand({
        TableName: config.database.tableName,
        Key: { PrimaryKey: video.PrimaryKey },
    }));
    console.log('Get result: ' + JSON.stringify(videoEntityResult));
    if (!videoEntityResult.Item) {
        throw new Error('Video not found');
    }

    const videoEntity = videoEntityResult.Item as VideoEntity;

    const deleteResult = await docClient.send(new DeleteCommand({
        TableName: config.database.tableName,
        Key: { PrimaryKey: video.PrimaryKey },
    }));
    console.log('Delete result: ' + JSON.stringify(deleteResult));

    const putResult = await docClient.send(new PutCommand({
        TableName: config.database.tableName,
        Item: {
            ...videoEntity,
            Status: VideoStatusNum.Downloading,
            UpdatedAt: new Date().toISOString(),
        },
    }));
    console.log('Put result: ' + JSON.stringify(putResult));

    return {
        MyAnimeListId: videoEntity.MyAnimeListId,
        Dub: videoEntity.Dub,
        Episode: videoEntity.Episode,
    };
}
