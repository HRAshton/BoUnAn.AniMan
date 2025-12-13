import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { config } from '../../config/config';
import { MatchingStatusNum } from '../../models/matching-status-num';
import { VideoEntity } from '../../models/video-entity';
import { docClient } from '../../shared/repository';

type GetEpisodesToMatchResult = Pick<VideoEntity, 'myAnimeListId' | 'dub' | 'episode'>[];

export const getEpisodesToMatch = async (): Promise<GetEpisodesToMatchResult> => {
    const pendingVideosResponse = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.matcherSecondaryIndexName,
        Limit: 100,
        FilterExpression: '#S = :pending',
        ExpressionAttributeNames: {
            '#S': 'matchingStatus',
        },
        ExpressionAttributeValues: {
            ':pending': MatchingStatusNum.Pending,
        },
        Select: 'ALL_PROJECTED_ATTRIBUTES',
    }));

    const firstVideo = pendingVideosResponse.Items?.[0] as Pick<VideoEntity, 'primaryKey' | 'updatedAt' | 'myAnimeListId' | 'dub' | 'episode' | 'matchingStatus' | 'matchingGroup'> | undefined;
    if (!firstVideo) {
        return [];
    }

    const groupVideos = await docClient.send(new ScanCommand({
        TableName: config.value.database.tableName,
        IndexName: config.value.database.matcherSecondaryIndexName,
        FilterExpression: 'matchingGroup = :group AND #S = :pending',
        ExpressionAttributeNames: {
            '#S': 'matchingStatus',
        },
        ExpressionAttributeValues: {
            ':group': firstVideo.matchingGroup,
            ':pending': MatchingStatusNum.Pending,
        },
        Select: 'ALL_PROJECTED_ATTRIBUTES',
    })) as unknown as { Items: VideoEntity[] };
    if (!groupVideos.Items || groupVideos.Items.length === 0) {
        return [];
    }

    // Potential race condition here, but acceptable for now
    for (const video of groupVideos.Items) {
        await docClient.send(new UpdateCommand({
            TableName: config.value.database.tableName,
            Key: { primaryKey: video.primaryKey },
            UpdateExpression: 'SET #S = :processing, updatedAt = :now',
            ConditionExpression: '#S = :pending AND updatedAt = :oldUpdatedAt',
            ExpressionAttributeNames: {
                '#S': 'matchingStatus',
            },
            ExpressionAttributeValues: {
                ':pending': MatchingStatusNum.Pending,
                ':processing': MatchingStatusNum.Processing,
                ':oldUpdatedAt': video.updatedAt,
                ':now': new Date().toISOString(),
            },
            ReturnValues: 'NONE',
        }));
    }

    return groupVideos.Items.map(v => ({
        myAnimeListId: v.myAnimeListId,
        dub: v.dub,
        episode: v.episode,
    }));
}
