import { config } from '../../config/config';
import { VideoKey, VideoRegisteredNotification } from '../../common/ts/interfaces';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

export const sendVideoRegisteredNotification = async (items: VideoKey[]): Promise<void> => {
    const snsClient = new SNSClient();

    const obj: VideoRegisteredNotification = {
        Items: items.map(item => ({ VideoKey: item })),
    }

    const message = {
        default: JSON.stringify(obj),
    }

    const command = new PublishCommand({
        TopicArn: config.topics.videoRegisteredTopicArn,
        Message: JSON.stringify(message),
        MessageStructure: 'json',
    });

    await snsClient.send(command);
    console.log('Notification sent: ' + JSON.stringify(command));
}