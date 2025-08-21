import { Handler } from 'aws-lambda/handler';

import { PublisherResultRequest } from '../common/ts/interfaces';


export const handler: Handler<PublisherResultRequest, void> = async (request) => {
    console.log(request);
    throw new Error('Not implemented');
};