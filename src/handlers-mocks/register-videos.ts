import { RegisterVideosRequest } from '../common/ts/interfaces';
import { Handler } from 'aws-lambda/handler';


export const handler: Handler<RegisterVideosRequest> = async (request) => {
    console.log(request);
    throw new Error('Not implemented');
};