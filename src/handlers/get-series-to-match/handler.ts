import { MatcherResponse } from '../../common/ts/interfaces';
import { retry } from '../../common/ts/runtime/retry';
import { Handler } from 'aws-lambda/handler';
import { getEpisodesToMatch } from './repository';
import { initConfig } from '../../config/config';


const process = async (): Promise<MatcherResponse> => {
    const episodes = await getEpisodesToMatch();
    console.log('Episodes to match: ' + JSON.stringify(episodes));

    return { VideosToMatch: episodes };
}

export const handler: Handler<undefined, MatcherResponse> = async () => {
    await initConfig();
    return retry(async () => await process(), 3, () => true);
};