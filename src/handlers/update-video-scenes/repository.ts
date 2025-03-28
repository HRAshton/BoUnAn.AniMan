﻿import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config/config';
import { docClient, getVideoKey } from '../../shared/repository';
import { MatcherResultRequest } from '../../common/ts/interfaces';
import { VideoEntity } from '../../models/video-entity';

export const updateVideoScenes = async (request: MatcherResultRequest): Promise<void> => {
    const updatedAt = new Date().toISOString();

    const updateCommands = request.Items.map(item => {
        const scenes: VideoEntity['Scenes'] = {};

        if (item.Scenes.Opening) {
            scenes.Opening = item.Scenes.Opening;
        }

        if (item.Scenes.Ending) {
            scenes.Ending = item.Scenes.Ending;
        }

        if (item.Scenes.SceneAfterEnding) {
            scenes.SceneAfterEnding = item.Scenes.SceneAfterEnding;
        }

        return new UpdateCommand({
            TableName: config.value.database.tableName,
            Key: { PrimaryKey: getVideoKey(item.VideoKey) },
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
