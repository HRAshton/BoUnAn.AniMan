import { Handler } from 'aws-lambda/handler';

import { DownloaderResponse } from '../common/ts/interfaces';


export const handler: Handler<undefined, DownloaderResponse> = async () => {
    throw new Error('Not implemented');
};