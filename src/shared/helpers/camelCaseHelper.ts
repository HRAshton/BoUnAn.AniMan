import { PublishingDetails, Scenes, VideoKey } from '../../common/ts/interfaces';
import { VideoEntity } from '../../models/video-entity';

export const videoKeyToCamelCase = (
    videoKey: Pick<VideoEntity, 'MyAnimeListId' | 'Dub' | 'Episode'> | undefined,
): VideoKey | undefined => {
    if (!videoKey) {
        return undefined;
    }

    return {
        myAnimeListId: videoKey.MyAnimeListId,
        dub: videoKey.Dub,
        episode: videoKey.Episode,
    };
}

export const scenesToCamelCase = (scenes: VideoEntity['Scenes']): Scenes | undefined => {
    return !scenes ? undefined : {
        opening: !scenes.Opening ? undefined : {
            start: scenes.Opening.Start,
            end: scenes.Opening.End,
        },
        ending: !scenes.Ending ? undefined : {
            start: scenes.Ending.Start,
            end: scenes.Ending.End,
        },
        sceneAfterEnding: !scenes.SceneAfterEnding ? undefined : {
            start: scenes.SceneAfterEnding.Start,
            end: scenes.SceneAfterEnding.End,
        },
    }
}

export const publishingDetailsToCamelCase = (details: VideoEntity['PublishingDetails']): PublishingDetails | undefined => {
    return !details ? undefined : {
        threadId: details.ThreadId,
        messageId: details.MessageId,
    };
}