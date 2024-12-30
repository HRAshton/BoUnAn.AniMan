import { MatcherResponse } from '../common/ts/interfaces';
import { Handler } from 'aws-lambda/handler';


export const handler: Handler<undefined, MatcherResponse> = async () => {
    throw new Error('Not implemented');
};