import { config } from '../../config/config';
import { VideoKey } from '../../common/ts/interfaces';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

export const sendVideoRegisteredNotification = async (items: VideoKey[]): Promise<void> => {
    const snsClient = new SNSClient();

    const message = {
        default: JSON.stringify(items),
    }

    const command = new PublishCommand({
        TopicArn: config.topics.videoRegisteredTopicArn,
        Message: JSON.stringify(message),
        MessageStructure: 'json',
    });

    await snsClient.send(command);
    console.log('Notification sent: ' + JSON.stringify(message));
}