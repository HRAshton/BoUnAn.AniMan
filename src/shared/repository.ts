import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { VideoKey } from '../common/ts/interfaces';

const dynamoDbClient = new DynamoDBClient();

export const docClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const getTableKey = (videoKey: VideoKey): string => {
    return `${videoKey.MyAnimeListId}#${videoKey.Dub}#${videoKey.Episode}`;
}
