import { config } from '../../config/config';
import { SceneRecognisedNotification, SceneRecognisedNotificationItem } from '../../common/ts/interfaces';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

export const sendSceneRecognizedNotification = async (items: SceneRecognisedNotificationItem[]): Promise<void> => {
    const snsClient = new SNSClient();

    const obj: SceneRecognisedNotification = { items: items };

    const message = {
        default: JSON.stringify(obj),
    }

    const command = new PublishCommand({
        TopicArn: config.value.topics.sceneRecognisedTopicArn,
        Message: JSON.stringify(message),
        MessageStructure: 'json',
    });

    await snsClient.send(command);
    console.log('Notification sent: ' + JSON.stringify(message));
}