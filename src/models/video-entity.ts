﻿import { VideoStatusNum } from './video-status-num';

export interface VideoEntity {
    primaryKey: string;
    myAnimeListId: number;
    dub: string;
    episode: number;

    status: VideoStatusNum;

    animeKey: string;
    sortKey?: string;
    matchingGroup?: string;

    createdAt: string;
    updatedAt: string;

    messageId?: number;
    scenes?: {
        opening?: {
            start: number;
            end: number;
        };
        ending?: {
            start: number;
            end: number;
        };
        sceneAfterEnding?: {
            start: number;
            end: number;
        };
    };

    publishingDetails?: {
        threadId: number;
        messageId: number;
    };
}