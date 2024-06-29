import { config } from '../../config/config';
import { VideoDownloadedNotification } from '../../common/ts-generated';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

export const sendVideoDownloadedNotification = async (notification: VideoDownloadedNotification): Promise<void> => {
    const snsClient = new SNSClient();

    const message = {
        default: JSON.stringify(notification),
    }

    const command = new PublishCommand({
        TopicArn: config.topics.videoDownloadedTopicArn,
        Message: JSON.stringify(message),
        MessageStructure: 'json',
    });

    await snsClient.send(command);
    console.log('Notification sent: ' + JSON.stringify(message));
}