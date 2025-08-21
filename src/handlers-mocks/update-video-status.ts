import { Handler } from 'aws-lambda/handler';

import { DownloaderResultRequest } from '../common/ts/interfaces';


export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
    console.log(request);
    throw new Error('Not implemented');
};