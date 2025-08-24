import { ScanCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { docClient } from '../../shared/repository';

type GetEpisodesToMatchResult = Pick<VideoEntity, 'MyAnimeListId' | 'Dub' | 'Episode'>[];

// Get first matching group and all its video keys.
// Does not support concurrency, should be run in a single instance.
export const getEpisodesToMatch = async (): Promise<GetEpisodesToMatchResult> => {
    const groupResponse = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.matcherSecondaryIndexName,
        Limit: 1,
        Select: 'ALL_PROJECTED_ATTRIBUTES',
    }));

    if (!groupResponse.Items || groupResponse.Items.length === 0) {
        return [];
    }

    const group = groupResponse.Items[0].MatchingGroup;
    const videoResponse = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.matcherSecondaryIndexName,
        FilterExpression: 'MatchingGroup = :group',
        ExpressionAttributeValues: {
            ':group': group,
        },
    }));

    return (videoResponse.Items as VideoEntity[]).map(video => ({
        MyAnimeListId: video.MyAnimeListId,
        Dub: video.Dub,
        Episode: video.Episode,
    }));
}
