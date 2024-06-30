import { VideoStatus as VideoStatusStr } from '../../common/ts/interfaces';
import { VideoStatusNum } from '../../models/video-status-num';

export const videoStatusToStr = (status: VideoStatusNum): VideoStatusStr => {
    switch (status) {
        case VideoStatusNum.Pending:
            return 'Pending';
        case VideoStatusNum.Downloading:
            return 'Downloading';
        case VideoStatusNum.Downloaded:
            return 'Downloaded';
        case VideoStatusNum.Failed:
            return 'Failed';
        case VideoStatusNum.NotAvailable:
            return 'NotAvailable';
        default:
            throw new Error('Unknown status: ' + status);
    }
}