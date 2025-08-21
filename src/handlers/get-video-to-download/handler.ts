import { Handler } from 'aws-lambda/handler';

import { DownloaderResponse } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { videoKeyToCamelCase } from '../../shared/helpers/camelCaseHelper';
import { getEpisodeToDownloadAndLock } from './repository';


const process = async (): Promise<DownloaderResponse> => {
    const videoToDownload = await getEpisodeToDownloadAndLock();
    console.log('Video to download: ' + JSON.stringify(videoToDownload));

    return { videoKey: videoKeyToCamelCase(videoToDownload) };
}

export const handler: Handler<undefined, DownloaderResponse> = async () => {
    await initConfig();
    return retry(async () => await process(), 3, () => true);
};