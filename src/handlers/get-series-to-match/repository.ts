import { ScanCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import { VideoEntity } from '../../models/video-entity';
import { docClient } from '../../shared/repository';

type GetEpisodesToMatchResult = Pick<VideoEntity, 'myAnimeListId' | 'dub' | 'episode'>[];

// Get first matching group and all its video keys.
// Does not support concurrency, should be run in a single instance.
export const getEpisodesToMatch = async (): Promise<GetEpisodesToMatchResult> => {
    const groupResponse = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.matcherSecondaryIndexName,
        Limit: 1,
        Select: 'ALL_PROJECTED_ATTRIBUTES',
    })) as unknown as { Items?: VideoEntity[] };

    const video = groupResponse.Items?.[0] as Pick<VideoEntity, 'matchingGroup'> | undefined;
    if (!video) {
        return [];
    }

    const videoResponse = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.matcherSecondaryIndexName,
        FilterExpression: 'matchingGroup = :group',
        ExpressionAttributeValues: {
            ':group': video.matchingGroup,
        },
    })) as unknown as { Items: VideoEntity[] };

    return videoResponse.Items.map(video => ({
        myAnimeListId: video.myAnimeListId,
        dub: video.dub,
        episode: video.episode,
    }));
}
