import { Handler } from 'aws-lambda/handler';

import { RegisterVideosRequest } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { insertVideo } from '../../shared/repository';
import { getExistingVideos } from './repository';
import { sendVideoRegisteredNotification } from './sns-client';

const process = async (request: RegisterVideosRequest): Promise<void> => {
    console.log('Processing request: ' + JSON.stringify(request));

    const existingVideos = await getExistingVideos(request.items.map(x => x.videoKey));
    console.log('Existing videos: ' + JSON.stringify(existingVideos));

    const videosToRegister = request.items
        .map(x => x.videoKey)
        .filter(x => !existingVideos
            .some(y => y.myAnimeListId === x.myAnimeListId && y.dub === x.dub && y.episode === x.episode));
    console.log('Videos to register: ' + JSON.stringify(videosToRegister));
    if (videosToRegister.length === 0) {
        console.log('No videos to register');
        return;
    }

    await insertVideo(videosToRegister);
    console.log('Videos added');

    await sendVideoRegisteredNotification(videosToRegister);
    console.log('Notification sent');
}

export const handler: Handler<RegisterVideosRequest> = async (request) => {
    await initConfig();
    if (!request || !request.items || request.items.length === 0
        || request.items.some(x => !x.videoKey?.myAnimeListId || !x.videoKey?.dub || !x.videoKey?.episode)) {
        throw new Error('Invalid request: ' + JSON.stringify(request));
    }

    return retry(async () => await process(request), 3, () => true);
};