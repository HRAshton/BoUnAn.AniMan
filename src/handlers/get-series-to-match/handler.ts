import { MatcherResponse } from '../../common/ts-generated';
import { retry } from '../../shared/helpers/retry';
import { Handler } from 'aws-lambda/handler';
import { getEpisodesToMatch } from './repository';


const process = async (): Promise<MatcherResponse> => {
    const episodes = await getEpisodesToMatch();
    console.log('Episodes to match: ' + JSON.stringify(episodes));

    return { VideosToMatch: episodes };
}

export const handler: Handler<undefined, MatcherResponse> = async () => {
    return retry(async () => await process(), 3, () => true);
};