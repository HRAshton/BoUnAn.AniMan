import { Handler } from 'aws-lambda/handler';

import { MatcherResultRequest } from '../common/ts/interfaces';


export const handler: Handler<MatcherResultRequest, void> = async (request) => {
    console.log(request);
    throw new Error('Not implemented');
};