import { DownloaderResponse } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { Handler } from 'aws-lambda/handler';
import { getEpisodeToDownloadAndLock } from './repository';
import { initConfig } from '../../config/config';


const process = async (): Promise<DownloaderResponse> => {
    const videoToDownload = await getEpisodeToDownloadAndLock();
    console.log('Video to download: ' + JSON.stringify(videoToDownload));

    return { VideoKey: videoToDownload };
}

export const handler: Handler<undefined, DownloaderResponse> = async () => {
    await initConfig();
    return retry(async () => await process(), 3, () => true);
};