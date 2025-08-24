import { Handler } from 'aws-lambda/handler';

import { BotRequest, BotResponse } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { config, initConfig } from '../../config/config';
import { getExistingVideos, setToken } from '../../loan-api/src/loan-api-client';
import { VideoStatusNum } from '../../models/video-status-num';
import { publishingDetailsToCamelCase, scenesToCamelCase } from '../../shared/helpers/camelCaseHelper';
import { videoStatusToStr } from '../../shared/helpers/video-status-to-str';
import { increasePriority, insertVideo } from '../../shared/repository';
import { getAnimeForUser, getRegisteredEpisodes } from './repository';
import { sendVideoRegisteredNotification } from './sns-client';

const addAnime = async (request: BotRequest): Promise<VideoStatusNum> => {
    const videoKey = request.videoKey;

    const videoInfos = await getExistingVideos(videoKey.myAnimeListId, videoKey.dub);
    console.log('Video fetched from LoanAPI: ' + JSON.stringify(videoInfos));

    const dubEpisodes = videoInfos.filter(x => x.myAnimeListId === videoKey.myAnimeListId && x.dub === videoKey.dub);

    const requestedVideo = dubEpisodes.find(x => x.episode === videoKey.episode);
    if (!requestedVideo) {
        console.warn('Video not available: ' + JSON.stringify(request));
        return VideoStatusNum.NotAvailable;
    }

    const registeredEpisodes = await getRegisteredEpisodes(videoKey.myAnimeListId, videoKey.dub);
    const videosToRegister = dubEpisodes.filter(n => !registeredEpisodes.includes(n.episode));
    console.log('Videos to register: ' + JSON.stringify(videosToRegister));

    await insertVideo(videosToRegister);
    console.log('Video added to database');

    await increasePriority(request.videoKey);
    console.log('Priority increased for requested video: ' + JSON.stringify(requestedVideo));

    await sendVideoRegisteredNotification(videosToRegister);
    console.log('Video registered notification sent: ' + JSON.stringify(videosToRegister));

    return VideoStatusNum.Pending;
}

const process = async (request: BotRequest): Promise<BotResponse> => {
    const video = await getAnimeForUser(request.videoKey);
    console.log('Video: ' + JSON.stringify(video));

    switch (video?.Status) {
        case VideoStatusNum.Downloaded:
        case VideoStatusNum.Failed: {
            const response = {
                status: videoStatusToStr(video.Status),
                messageId: video.MessageId,
                scenes: scenesToCamelCase(video.Scenes),
                publishingDetails: publishingDetailsToCamelCase(video.PublishingDetails),
            };
            console.log('Returning video as is: ' + JSON.stringify(response));
            return response;
        }

        case VideoStatusNum.Pending:
        case VideoStatusNum.Downloading: {
            console.log('Returning video as pending or downloading');
            await increasePriority(request.videoKey);
            return {
                status: videoStatusToStr(video.Status),
                messageId: undefined,
                scenes: undefined,
                publishingDetails: undefined,
            };
        }

        case undefined: {
            console.log('Adding anime');
            const status = await addAnime(request);
            return {
                status: videoStatusToStr(status),
                messageId: undefined,
                scenes: undefined,
                publishingDetails: undefined,
            };
        }

        default:
            throw new RangeError('Incorrect status');
    }
}

export const handler: Handler<BotRequest, BotResponse> = async (request) => {
    await initConfig();
    setToken(config.value.loanApiConfig.token);

    if (!request.videoKey.myAnimeListId || !request.videoKey.dub || request.videoKey.episode === null) {
        throw new Error('Invalid request: ' + JSON.stringify(request));
    }

    return retry(async () => await process(request), 3, () => true);
};