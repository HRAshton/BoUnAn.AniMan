import { BotRequest, BotResponse } from '../common/ts/interfaces';
import { Handler } from 'aws-lambda/handler';

// The mock handler is a simplified version of the handler that can be used for debugging.

export const handler: Handler<BotRequest, BotResponse> = async (request) => {
    console.log(request);

    if (!request.videoKey.myAnimeListId || !request.videoKey.dub || request.videoKey.episode === null) {
        throw new Error('Invalid request: ' + JSON.stringify(request));
    }

    if (request.videoKey.episode === 1) {
        return {
            status: 'Pending',
            messageId: undefined,
            scenes: undefined,
            publishingDetails: undefined,
        };
    }

    if (request.videoKey.episode === 2) {
        return {
            status: 'Downloading',
            messageId: undefined,
            scenes: undefined,
            publishingDetails: undefined,
        };
    }

    return {
        status: 'Downloaded',
        messageId: 4008,
        scenes: {
            opening: {
                start: 70,
                end: 158,
            },
            ending: {
                start: 1281,
                end: 1372.55,
            },
        },
        publishingDetails: {
            threadId: 6377,
            messageId: 6396,
        },
    };
};