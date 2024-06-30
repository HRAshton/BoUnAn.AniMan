import { config } from '../../config/config';
import { SceneRecognisedNotificationItem } from '../../common/ts/interfaces';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

export const sendSceneRecognizedNotification = async (items: SceneRecognisedNotificationItem[]): Promise<void> => {
    const snsClient = new SNSClient();

    const message = {
        default: JSON.stringify(items),
    }

    const command = new PublishCommand({
        TopicArn: config.topics.sceneRecognisedTopicArn,
        Message: JSON.stringify(message),
        MessageStructure: 'json',
    });

    await snsClient.send(command);
    console.log('Notification sent: ' + JSON.stringify(message));
}