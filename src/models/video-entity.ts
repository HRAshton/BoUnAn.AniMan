import { VideoStatusNum } from './video-status-num';

export interface VideoEntity {
    PrimaryKey: string;
    MyAnimeListId: number;
    Dub: string;
    Episode: number;

    CreatedAt: string;
    UpdatedAt: string;
    Status: VideoStatusNum;

    AnimeKey: string;
    SortKey?: string;
    MatchingGroup?: string;

    Subscribers?: Set<number>;
    MessageId?: number;
    Scenes?: {
        Opening?: {
            Start: number;
            End: number;
        };
        Ending?: {
            Start: number;
            End: number;
        };
        SceneAfterEnding?: {
            Start: number;
            End: number;
        };
    };
}