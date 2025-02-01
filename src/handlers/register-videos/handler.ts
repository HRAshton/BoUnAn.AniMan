import { insertVideo } from '../../shared/repository';
import { getExistingVideos } from './repository';
import { RegisterVideosRequest } from '../../common/ts/interfaces';
import { retry } from '../../shared/helpers/retry';
import { sendVideoRegisteredNotification } from './sns-client';
import { Handler } from 'aws-lambda/handler';
import { initConfig } from '../../config/config';

const process = async (request: RegisterVideosRequest): Promise<void> => {
    console.log('Processing request: ' + JSON.stringify(request));

    const existingVideos = await getExistingVideos(request.Items.map(x => x.VideoKey));
    console.log('Existing videos: ' + JSON.stringify(existingVideos));

    const videosToRegister = request.Items
        .map(x => x.VideoKey)
        .filter(x => !existingVideos
            .some(y => y.MyAnimeListId === x.MyAnimeListId && y.Dub === x.Dub && y.Episode === x.Episode));
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
    if (!request || !request.Items || request.Items.length === 0
        || request.Items.some(x => !x.VideoKey?.MyAnimeListId || !x.VideoKey?.Dub || !x.VideoKey?.Episode)) {
        throw new Error('Invalid request: ' + JSON.stringify(request));
    }

    return retry(async () => await process(request), 3, () => true);
};