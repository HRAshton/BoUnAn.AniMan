import { DownloaderResponse } from '../../common/ts/interfaces';
import { retry } from '../../shared/helpers/retry';
import { Handler } from 'aws-lambda/handler';
import { getEpisodeToDownloadAndLock } from './repository';


const process = async (): Promise<DownloaderResponse> => {
    const videoToDownload = await getEpisodeToDownloadAndLock();
    console.log('Video to download: ' + JSON.stringify(videoToDownload));

    return { VideoKey: videoToDownload };
}

export const handler: Handler<undefined, DownloaderResponse> = async () => {
    return retry(async () => await process(), 3, () => true);
};