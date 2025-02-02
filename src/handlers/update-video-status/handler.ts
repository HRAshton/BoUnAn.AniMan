import { DownloaderResultRequest } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { Handler } from 'aws-lambda/handler';
import { clearSubscribers, getAnimeForNotification, markVideoDownloaded, markVideoFailed } from './repository';
import { sendVideoDownloadedNotification } from './sns-client';
import { initConfig } from '../../config/config';


const process = async (request: DownloaderResultRequest): Promise<void> => {
    if (request.MessageId) {
        console.log('Video downloaded.');
        await markVideoDownloaded(request.VideoKey, request.MessageId);
    } else {
        console.warn('Video download failed.');
        await markVideoFailed(request.VideoKey);
    }

    const videoInfo = await getAnimeForNotification(request.VideoKey);

    if (videoInfo?.Subscribers?.size) {
        console.log('Subscribers: ' + JSON.stringify(videoInfo.Subscribers));
        await clearSubscribers(request.VideoKey);
    }

    const notification = {
        VideoKey: request.VideoKey,
        MessageId: request.MessageId,
        SubscriberChatIds: videoInfo?.Subscribers ? Array.from(videoInfo.Subscribers) : [],
        Scenes: videoInfo?.Scenes,
    };

    await sendVideoDownloadedNotification(notification);
    console.log('Video downloaded notification sent.');
}

export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
    await initConfig();
    return retry(async () => await process(request), 3, () => true);
};