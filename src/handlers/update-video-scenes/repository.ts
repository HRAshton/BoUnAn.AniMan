import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { MatcherResultRequest, MatcherResultRequestItem, Scenes } from '../../common/ts/interfaces';
import { config } from '../../config/config';
import { MatchingStatusNum } from '../../models/matching-status-num';
import { VideoEntity } from '../../models/video-entity';
import { docClient, getVideoKey } from '../../shared/repository';

const getStatus = (item: MatcherResultRequestItem): MatchingStatusNum => {
    if (!item.scenes) {
        return MatchingStatusNum.Failed;
    }

    if (item.scenes.opening || item.scenes.ending || item.scenes.sceneAfterEnding) {
        return MatchingStatusNum.ProcessedWithResults;
    }

    return MatchingStatusNum.ProcessedWithNoResults;
}

const buildScenes = (itemScenes: Scenes): VideoEntity['scenes'] => {
    const scenes: VideoEntity['scenes'] = {};

    if (itemScenes.opening) {
        scenes.opening = {
            start: itemScenes.opening.start,
            end: itemScenes.opening.end,
        };
    }

    if (itemScenes.ending) {
        scenes.ending = {
            start: itemScenes.ending.start,
            end: itemScenes.ending.end,
        };
    }

    if (itemScenes.sceneAfterEnding) {
        scenes.sceneAfterEnding = {
            start: itemScenes.sceneAfterEnding.start,
            end: itemScenes.sceneAfterEnding.end,
        };
    }

    return scenes;
};

const buildUpdateParts = (status: MatchingStatusNum, scenes: VideoEntity['scenes'] | null): {
    updateExpression: string;
    expressionAttributeValues: Record<string, unknown>
} => {
    let updateExpression = 'SET matchingStatus = :status, updatedAt = :updatedAt';
    const expressionAttributeValues: Record<string, unknown> = {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
    };

    if (status === MatchingStatusNum.ProcessedWithResults) {
        updateExpression += ', scenes = :scenes';
        expressionAttributeValues[':scenes'] = scenes;
    }

    if (status === MatchingStatusNum.ProcessedWithResults || status === MatchingStatusNum.ProcessedWithNoResults) {
        updateExpression += ' REMOVE matchingGroup';
    }

    return {
        updateExpression,
        expressionAttributeValues,
    };
};

const createUpdateCommandForItem = (item: MatcherResultRequestItem): UpdateCommand => {
    const status = getStatus(item);

    const scenes = item.scenes
        ? buildScenes(item.scenes)
        : null;

    const { updateExpression, expressionAttributeValues } = buildUpdateParts(status, scenes);

    return new UpdateCommand({
        TableName: config.value.database.tableName,
        Key: { primaryKey: getVideoKey(item.videoKey) },
        ConditionExpression: 'attribute_exists(primaryKey)',
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
    });
};

export const updateVideoScenes = async (request: MatcherResultRequest): Promise<void> => {
    if (!request?.items?.length) {
        console.log('No items to update.');
        return;
    }

    const updateCommands = request.items.map(createUpdateCommandForItem);

    for (const [index, command] of updateCommands.entries()) {
        try {
            const result = await docClient.send(command);
            console.log(`Updated item ${index} - result: ${JSON.stringify(result)}`);
        } catch (err) {
            // Log error and continue with next item
            console.error(`Failed to update item ${index} (videoKey: ${JSON.stringify(request.items[index]?.videoKey)}):`, err);
        }
    }

    console.log('All items processed.');
};
