import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { PublishingDetails, VideoKey } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { docClient, getVideoKey } from '../../shared/repository';

export const savePublishingDetails = async (videoKey: VideoKey, details: PublishingDetails): Promise<void> => {
    const result = await docClient.send(new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: { primaryKey: getVideoKey(videoKey) },
        ConditionExpression: 'attribute_exists(primaryKey)',
        UpdateExpression: 'SET #publishingDetails = :publishingDetails, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
            '#publishingDetails': 'publishingDetails',
            '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
            ':publishingDetails': {
                threadId: details.threadId,
                messageId: details.messageId,
            },
            ':updatedAt': new Date().toISOString(),
        },
    }));

    console.log('Update result: ' + JSON.stringify(result));
}