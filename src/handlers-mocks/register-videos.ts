import { Handler } from 'aws-lambda/handler';

import { RegisterVideosRequest } from '../common/ts/interfaces';


export const handler: Handler<RegisterVideosRequest> = async (request) => {
    console.log(request);
    throw new Error('Not implemented');
};