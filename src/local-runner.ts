/* eslint @typescript-eslint/no-explicit-any: 0 */

import { handler as getAnime } from './handlers/get-anime/handler';
import { handler as getSeriesToMatch } from './handlers/get-series-to-match/handler';
import { handler as getVideoToDownload } from './handlers/get-video-to-download/handler';
import { handler as updateVideoScenes } from './handlers/update-video-scenes/handler';
import { handler as updateVideoStatus } from './handlers/update-video-status/handler';

const main = async () => {
    const myAnimeListId = 37105;
    const dub = 'AniLibria.TV';
    const episode = 2;

    const s1 = await getAnime({
        videoKey: {
            myAnimeListId: myAnimeListId,
            dub: dub,
            episode: episode,
        },
    }, null as any, null as any);
    console.log(s1);

    const s2 = await getSeriesToMatch(null as any, null as any, null as any);
    console.log(s2);

    const s3 = await getVideoToDownload(null as any, null as any, null as any);
    console.log(s3);

    const s4 = await updateVideoScenes({
        items: [
            {
                videoKey: {
                    myAnimeListId: myAnimeListId,
                    dub: dub,
                    episode: episode,
                },
                scenes: {
                    opening: {
                        start: 0,
                        end: 10,
                    },
                    ending: {
                        start: 0,
                        end: 10,
                    },
                }
            },
        ],
    }, null as any, null as any);
    console.log(s4);

    const s5 = await updateVideoStatus({
        videoKey: {
            myAnimeListId: myAnimeListId,
            dub: dub,
            episode: episode,
        },
        messageId: 1,
    }, null as any, null as any);
    console.log(s5);
}

main();
