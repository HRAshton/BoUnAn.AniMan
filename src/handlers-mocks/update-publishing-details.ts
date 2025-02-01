import { PublisherResultRequest } from '../common/ts/interfaces';
import { Handler } from 'aws-lambda/handler';


export const handler: Handler<PublisherResultRequest, void> = async (request) => {
    console.log(request);
    throw new Error('Not implemented');
};