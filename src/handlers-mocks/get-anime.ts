import { BotRequest, BotResponse } from '../common/ts/interfaces';
import { Handler } from 'aws-lambda/handler';

// The mock handler is a simplified version of the handler that can be used for debugging.

export const handler: Handler<BotRequest, BotResponse> = async (request) => {
    if (!request.VideoKey.MyAnimeListId || !request.VideoKey.Dub
        || request.VideoKey.Episode === null || !request.ChatId) {
        throw new Error('Invalid request: ' + JSON.stringify(request));
    }

    if (request.VideoKey.Episode === 1) {
        return {
            Status: 'Pending',
            MessageId: undefined,
            Scenes: undefined,
            PublishingDetails: undefined,
        };
    }

    if (request.VideoKey.Episode === 2) {
        return {
            Status: 'Downloading',
            MessageId: undefined,
            Scenes: undefined,
            PublishingDetails: undefined,
        };
    }

    return {
        Status: 'Downloaded',
        MessageId: 4008,
        Scenes: {
            Opening: {
                Start: 70,
                End: 158,
            },
            Ending: {
                Start: 1281,
                End: 1372.55,
            },
        },
        PublishingDetails: {
            ThreadId: 6377,
            MessageId: 6396,
        },
    };
};