import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { MatcherResultRequest } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { docClient, getVideoKey } from '../../shared/repository';

export const updateVideoScenes = async (request: MatcherResultRequest): Promise<void> => {
    const updatedAt = new Date().toISOString();

    const updateCommands = request.items.map(item => {
        const scenes: VideoEntity['Scenes'] = {};

        if (item.scenes.opening) {
            scenes.Opening = {
                Start: item.scenes.opening.start,
                End: item.scenes.opening.end,
            }
        }

        if (item.scenes.ending) {
            scenes.Ending = {
                Start: item.scenes.ending.start,
                End: item.scenes.ending.end,
            }
        }

        if (item.scenes.sceneAfterEnding) {
            scenes.SceneAfterEnding = {
                Start: item.scenes.sceneAfterEnding.start,
                End: item.scenes.sceneAfterEnding.end,
            }
        }

        return new UpdateCommand({
            TableName: config.value.database.tableName,
            Key: { PrimaryKey: getVideoKey(item.videoKey) },
            ConditionExpression: 'attribute_exists(PrimaryKey)',
            UpdateExpression: 'SET Scenes = :scenes, UpdatedAt = :updatedAt REMOVE MatchingGroup',
            ExpressionAttributeValues: {
                ':scenes': scenes,
                ':updatedAt': updatedAt,
            },
        });
    });

    for (const command of updateCommands) {
        const result = await docClient.send(command);
        console.log('Update result: ' + JSON.stringify(result));
    }

    console.log('All items updated.');
}
