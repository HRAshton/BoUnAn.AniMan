import { docClient, getVideoKey } from '../../shared/repository';
import { BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import { VideoKey } from '../../common/ts/interfaces';
import { config } from '../../config/config';

const GET_OPERATION_LIMIT = 100;
const TABLE_PRIMARY_KEY = 'PrimaryKey';

export const getExistingVideos = async (videoKeys: VideoKey[]): Promise<VideoKey[]> => {
    const keyValuePairs = Object.fromEntries(videoKeys.map(x => [getVideoKey(x), x]));

    const keys = Object.keys(keyValuePairs).map(x => ({ [TABLE_PRIMARY_KEY]: x }));
    const chunks = Array.from(
        { length: Math.ceil(keys.length / GET_OPERATION_LIMIT) },
        (_, i) => keys.slice(i * GET_OPERATION_LIMIT, (i + 1) * GET_OPERATION_LIMIT),
    );

    const foundPrimaryKeys: string[] = [];
    for (const chunk of chunks) {
        const command = new BatchGetCommand({
            RequestItems: {
                [config.database.tableName]: {
                    Keys: chunk,
                    AttributesToGet: [TABLE_PRIMARY_KEY],
                },
            },
        });

        const response = await docClient.send(command);
        const chunkResult = response.Responses?.[config.database.tableName] ?? [];
        const foundKeys = chunkResult.map(x => x[TABLE_PRIMARY_KEY]);
        console.log('Found keys: ' + JSON.stringify(foundKeys));

        foundPrimaryKeys.push(...foundKeys);
    }

    return foundPrimaryKeys.map(x => keyValuePairs[x]);
}
