import { PublisherResultRequest } from '../../common/ts/interfaces';
import { retry } from '../../shared/helpers/retry';
import { Handler } from 'aws-lambda/handler';
import { savePublishingDetails } from './repository';


const process = async (request: PublisherResultRequest): Promise<void> => {
    for (const item of request.Items) {
        await savePublishingDetails(item.VideoKey, item.PublishingDetails);
    }

    console.log('Publishing details saved.');
}

export const handler: Handler<PublisherResultRequest, void> = async (request) => {
    console.log('Request: ' + JSON.stringify(request));
    return retry(async () => await process(request), 3, () => true);
};