import { Handler } from 'aws-lambda/handler';

import { MatcherResponse } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { initConfig } from '../../config/config';
import { getEpisodesToMatch } from './repository';


const process = async (): Promise<MatcherResponse> => {
    const episodes = await getEpisodesToMatch();
    console.log('Episodes to match: ' + JSON.stringify(episodes));

    return { videosToMatch: episodes };
}

export const handler: Handler<undefined, MatcherResponse> = async () => {
    await initConfig();
    return retry(async () => await process(), 3, () => true);
};