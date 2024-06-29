import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { VideoEntity } from '../../models/video-entity';
import { config } from '../../config/config';
import { docClient } from '../../shared/repository';

type GetEpisodesToMatchResult = Pick<VideoEntity, 'MyAnimeListId' | 'Dub' | 'Episode'>[];

// Get first matching group and all its video keys
export const getEpisodesToMatch = async (): Promise<GetEpisodesToMatchResult> => {
    const groupResponse = await docClient.send(new ScanCommand({
        TableName: config.database.tableName,
        IndexName: config.database.matcherSecondaryIndexName,
        Select: 'ALL_PROJECTED_ATTRIBUTES',
        Limit: 1,
    }));

    if (!groupResponse.Items || groupResponse.Items.length === 0) {
        return [];
    }

    const group = groupResponse.Items[0].MatchingGroup;
    const videoResponse = await docClient.send(new ScanCommand({
        TableName: config.database.tableName,
        IndexName: config.database.matcherSecondaryIndexName,
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
