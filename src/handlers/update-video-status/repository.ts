import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { VideoKey } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { VideoStatusNum } from '../../models/video-status-num';
import { docClient, getVideoKey } from '../../shared/repository';

const markVideo = async (
    request: VideoKey,
    status: VideoStatusNum,
    messageId: number | undefined,
): Promise<VideoEntity> => {
    const result = await docClient.send(new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: { PrimaryKey: getVideoKey(request) },
        ConditionExpression: 'attribute_exists(PrimaryKey)',
        UpdateExpression: 'SET #status = :status, #messageId = :messageId, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
            '#status': 'Status',
            '#messageId': 'MessageId',
            '#updatedAt': 'UpdatedAt',
        },
        ExpressionAttributeValues: {
            ':status': status,
            ':messageId': messageId,
            ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
    }));
    console.log('Update result: ' + JSON.stringify(result));
    
    return result.Attributes as VideoEntity;
}

export const markVideoDownloaded = async (request: VideoKey, messageId: number): Promise<VideoEntity> => {
    return markVideo(request, VideoStatusNum.Downloaded, messageId);
}

export const markVideoFailed = async (request: VideoKey): Promise<VideoEntity> => {
    return markVideo(request, VideoStatusNum.Failed, undefined);
}
