import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

import { VideoKey, VideoRegisteredNotification } from '../../common/ts/interfaces';
import { config } from '../../config/config';

export const sendVideoRegisteredNotification = async (items: VideoKey[]): Promise<void> => {
    const snsClient = new SNSClient();

    const obj: VideoRegisteredNotification = {
        items: items.map(item => ({ videoKey: item })),
    }

    const message = {
        default: JSON.stringify(obj),
    }

    const command = new PublishCommand({
        TopicArn: config.value.topics.videoRegisteredTopicArn,
        Message: JSON.stringify(message),
        MessageStructure: 'json',
    });

    await snsClient.send(command);
    console.log('Notification sent: ' + JSON.stringify(command));
}