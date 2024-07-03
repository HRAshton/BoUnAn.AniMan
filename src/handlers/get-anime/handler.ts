import { attachUserToVideo, getAnimeForUser, getRegisteredEpisodes, insertVideo } from './repository';
import { BotRequest, BotResponse } from '../../common/ts/interfaces';
import { retry } from '../../shared/helpers/retry';
import { VideoStatusNum } from '../../models/video-status-num';
import { videoStatusToStr } from '../../shared/helpers/video-status-to-str';
import { sendVideoRegisteredNotification } from './sns-client';
import { Handler } from 'aws-lambda/handler';
import { config } from '../../config/config';
import { getExistingVideos, setToken } from '../../loan-api/src/animan-loan-api-client';

setToken(config.loanApiConfig.token);

const addAnime = async (request: BotRequest): Promise<VideoStatusNum> => {
    const videoKey = request.VideoKey;

    const videoInfos = await getExistingVideos(videoKey.MyAnimeListId, videoKey.Dub);
    console.log('Video fetched from LoanAPI: ' + JSON.stringify(videoInfos));

    const dubEpisodes = videoInfos.filter(x => x.MyAnimeListId === videoKey.MyAnimeListId && x.Dub === videoKey.Dub);

    const requestedVideo = dubEpisodes.find(x => x.Episode === videoKey.Episode);
    if (!requestedVideo) {
        console.warn('Video not available: ' + JSON.stringify(request));
        return VideoStatusNum.NotAvailable;
    }

    const registeredEpisodes = await getRegisteredEpisodes(videoKey.MyAnimeListId, videoKey.Dub);
    const videosToRegister = dubEpisodes.filter(n => !registeredEpisodes.includes(n.Episode));
    console.log('Videos to register: ' + JSON.stringify(videosToRegister));

    await insertVideo(videosToRegister);
    console.log('Video added to database');

    await attachUserToVideo(request.VideoKey, request.ChatId);
    console.log('User attached to video');

    await sendVideoRegisteredNotification(videosToRegister);
    console.log('Video registered notification sent: ' + JSON.stringify(videosToRegister));

    return VideoStatusNum.Pending;
}

const process = async (request: BotRequest): Promise<BotResponse> => {
    const video = await getAnimeForUser(request.VideoKey);
    console.log('Video: ' + JSON.stringify(video));

    switch (video?.Status) {
        case VideoStatusNum.Downloaded:
        case VideoStatusNum.Failed: {
            const response = {
                Status: videoStatusToStr(video.Status),
                MessageId: video.MessageId,
                Scenes: video.Scenes,
                PublishingDetails: video.PublishingDetails,
            };
            console.log('Returning video as is: ' + JSON.stringify(response));
            return response;
        }

        case VideoStatusNum.Pending:
        case VideoStatusNum.Downloading: {
            console.log('Attaching user to the video');
            await attachUserToVideo(request.VideoKey, request.ChatId);
            return {
                Status: videoStatusToStr(video.Status),
                MessageId: undefined,
                Scenes: undefined,
                PublishingDetails: undefined,
            };
        }

        case undefined: {
            console.log('Adding anime');
            const status = await addAnime(request);
            return {
                Status: videoStatusToStr(status),
                MessageId: undefined,
                Scenes: undefined,
                PublishingDetails: undefined,
            };
        }

        default:
            throw new RangeError('Incorrect status');
    }
}

export const handler: Handler<BotRequest, BotResponse> = async (request) => {
    if (!request.VideoKey.MyAnimeListId || !request.VideoKey.Dub
        || request.VideoKey.Episode === null || !request.ChatId) {
        throw new Error('Invalid request: ' + JSON.stringify(request));
    }

    return retry(async () => await process(request), 3, () => true);
};