import { DownloaderResultRequest } from '../common/ts/interfaces';
import { Handler } from 'aws-lambda/handler';


export const handler: Handler<DownloaderResultRequest, void> = async (request) => {
    console.log(request);
    throw new Error('Not implemented');
};