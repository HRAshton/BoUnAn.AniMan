import { MatcherResultRequest } from '../common/ts/interfaces';
import { Handler } from 'aws-lambda/handler';


export const handler: Handler<MatcherResultRequest, void> = async (request) => {
    console.log(request);
    throw new Error('Not implemented');
};