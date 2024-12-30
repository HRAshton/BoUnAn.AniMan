import { DownloaderResponse } from '../common/ts/interfaces';
import { Handler } from 'aws-lambda/handler';


export const handler: Handler<undefined, DownloaderResponse> = async () => {
    throw new Error('Not implemented');
};