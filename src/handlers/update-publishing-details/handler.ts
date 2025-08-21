import { Handler } from 'aws-lambda/handler';

import { PublisherResultRequest } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { savePublishingDetails } from './repository';


const process = async (request: PublisherResultRequest): Promise<void> => {
    for (const item of request.items) {
        await savePublishingDetails(item.videoKey, item.publishingDetails);
    }

    console.log('Publishing details saved.');
}

export const handler: Handler<PublisherResultRequest, void> = async (request) => {
    await initConfig();
    console.log('Request: ' + JSON.stringify(request));
    return retry(async () => await process(request), 3, () => true);
};