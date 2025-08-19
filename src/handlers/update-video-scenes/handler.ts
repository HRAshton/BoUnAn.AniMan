import { MatcherResultRequest } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { Handler } from 'aws-lambda/handler';
import { updateVideoScenes } from './repository';
import { sendSceneRecognizedNotification } from './sns-client';
import { initConfig } from '../../config/config';


const process = async (request: MatcherResultRequest): Promise<void> => {
    await updateVideoScenes(request);
    console.log('Video scenes updated.');

    await sendSceneRecognizedNotification(request.items);
    console.log('Video recognized notification sent.');
}

export const handler: Handler<MatcherResultRequest, void> = async (request) => {
    await initConfig();
    return retry(async () => await process(request), 3, () => true);
};