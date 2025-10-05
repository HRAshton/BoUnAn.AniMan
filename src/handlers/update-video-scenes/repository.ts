import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { MatcherResultRequest } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { docClient, getVideoKey } from '../../shared/repository';

export const updateVideoScenes = async (request: MatcherResultRequest): Promise<void> => {
    const updateCommands = request.items.map(item => {
        const scenes: VideoEntity['scenes'] = {};

        if (item.scenes.opening) {
            scenes.opening = {
                start: item.scenes.opening.start,
                end: item.scenes.opening.end,
            }
        }

        if (item.scenes.ending) {
            scenes.ending = {
                start: item.scenes.ending.start,
                end: item.scenes.ending.end,
            }
        }

        if (item.scenes.sceneAfterEnding) {
            scenes.sceneAfterEnding = {
                start: item.scenes.sceneAfterEnding.start,
                end: item.scenes.sceneAfterEnding.end,
            }
        }

        return new UpdateCommand({
            TableName: config.value.database.tableName,
            Key: { primaryKey: getVideoKey(item.videoKey) },
            ConditionExpression: 'attribute_exists(primaryKey)',
            UpdateExpression: 'SET scenes = :scenes, updatedAt = :updatedAt REMOVE matchingGroup',
            ExpressionAttributeValues: {
                ':scenes': scenes,
                ':updatedAt': new Date().toISOString(),
            },
        });
    });

    for (const command of updateCommands) {
        const result = await docClient.send(command);
        console.log('Update result: ' + JSON.stringify(result));
    }

    console.log('All items updated.');
}
