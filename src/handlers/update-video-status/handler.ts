import { Handler } from 'aws-lambda/handler';

import { DownloaderResultRequest } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { scenesToCamelCase } from '../../shared/helpers/camelCaseHelper';
import { getAnimeForNotification, markVideoDownloaded, markVideoFailed } from './repository';
import { sendVideoDownloadedNotification } from './sns-client';


const process = async (request: DownloaderResultRequest): Promise<void> => {
    if (request.messageId) {
        console.log('Video downloaded.');
        await markVideoDownloaded(request.videoKey, request.messageId);
    } else {
        console.warn('Video download failed.');
        await markVideoFailed(request.videoKey);
    }

    const videoInfo = await getAnimeForNotification(request.videoKey);

    const notification = {
        videoKey: request.videoKey,
        messageId: request.messageId,
        scenes: scenesToCamelCase(videoInfo?.Scenes),
    };

    await sendVideoDownloadedNotification(notification);
    console.log('Video downloaded notification sent.');
}

export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
    await initConfig();
    return retry(async () => await process(request), 3, () => true);
};