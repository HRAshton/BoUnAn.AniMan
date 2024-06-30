import { DownloaderResultRequest } from '../../common/ts/interfaces';
import { retry } from '../../shared/helpers/retry';
import { Handler } from 'aws-lambda/handler';
import { markVideoDownloaded, markVideoFailed } from './repository';
import { sendVideoDownloadedNotification } from './sns-client';


const process = async (request: DownloaderResultRequest): Promise<void> => {
    if (request.MessageId) {
        console.log('Video downloaded.');
        await markVideoDownloaded(request.VideoKey, request.MessageId);
    } else {
        console.error('Video download failed.');
        await markVideoFailed(request.VideoKey);
    }

    await sendVideoDownloadedNotification(request);
    console.log('Video downloaded notification sent.');
}

export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
    return retry(async () => await process(request), 3, () => true);
};