import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config/config';
import { docClient, getVideoKey } from '../../shared/repository';
import { PublishingDetails, VideoKey } from '../../common/ts/interfaces';

export const savePublishingDetails = async (videoKey: VideoKey, details: PublishingDetails): Promise<void> => {
    const result = await docClient.send(new UpdateCommand({
        TableName: config.database.tableName,
        Key: { PrimaryKey: getVideoKey(videoKey) },
        UpdateExpression: 'SET #publishingDetails = :publishingDetails, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
            '#publishingDetails': 'PublishingDetails',
            '#updatedAt': 'UpdatedAt',
        },
        ExpressionAttributeValues: {
            ':publishingDetails': {
                ThreadId: details.ThreadId,
                MessageId: details.MessageId,
            },
            ':updatedAt': new Date().toISOString(),
        },
    }));

    console.log('Update result: ' + JSON.stringify(result));
}