import { Handler } from 'aws-lambda/handler';

import { DownloaderResultRequest } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { publishingDetailsToCamelCase, scenesToCamelCase } from '../../shared/helpers/camelCaseHelper';
import { markVideoDownloaded, markVideoFailed } from './repository';
import { sendVideoDownloadedNotification } from './sns-client';


const markVideo = async (request: DownloaderResultRequest): Promise<VideoEntity> => {
    if (request.messageId) {
        console.log('Video downloaded.');
        return markVideoDownloaded(request.videoKey, request.messageId);
    } else {
        console.warn('Video download failed.');
        return markVideoFailed(request.videoKey);
    }
};

const notify = async (request: DownloaderResultRequest, videoEntity: VideoEntity): Promise<void> => {
    const notification = {
        videoKey: request.videoKey,
        messageId: request.messageId,
        scenes: scenesToCamelCase(videoEntity.Scenes),
        publishingDetails: publishingDetailsToCamelCase(videoEntity.PublishingDetails),
    };

    await sendVideoDownloadedNotification(notification);
    console.log('Video downloaded notification sent.');
};

const process = async (request: DownloaderResultRequest): Promise<void> => {
    const videoEntity = await markVideo(request);
    await notify(request, videoEntity);
}

export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
    await initConfig();
    return retry(async () => await process(request), 3, () => true);
};