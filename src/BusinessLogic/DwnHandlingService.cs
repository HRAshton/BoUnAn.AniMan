using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Repositories;
using Bounan.Common.Models;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class DwnHandlingService(
    ILogger<DwnHandlingService> logger,
    IFilesRepository filesRepository,
    ISnsNotificationService snsNotificationService)
    : IDwnHandlingService
{
    private ILogger Logger { get; } = logger;

    private IFilesRepository FilesRepository { get; } = filesRepository;

    private ISnsNotificationService SnsNotificationService { get; } = snsNotificationService;

    public async Task<DwnQueueResponse> GetVideoToDownloadAsync()
    {
        var file = await FilesRepository.PopSignedLinkToDownloadAsync();
        return new DwnQueueResponse(file);
    }

    public async Task UpdateVideoStatusAsync(DwnResultNotification notification)
    {
        var key = new VideoKey(notification.MyAnimeListId, notification.Dub, notification.Episode);
        var video = await FilesRepository.GetAnimeAsync(key);
        ArgumentNullException.ThrowIfNull(video);
        Log.VideoRetrieved(Logger, video);

        if (notification.MessageId is null)
        {
            await FilesRepository.MarkAsFailedAsync(video);
            Log.MarkedAsFailed(Logger, video);
        }
        else
        {
            await FilesRepository.MarkAsDownloadedAsync(video, notification.MessageId.Value);
            Log.MarkedAsDownloaded(Logger, video);
        }

        var usersToNotify = video.Subscribers;
        await NotifyUsersAsync(video, usersToNotify, notification.MessageId, video.Scenes);
    }

    private async Task NotifyUsersAsync(
        IVideoKey videoKey,
        ICollection<long>? usersToNotify,
        int? messageId,
        Scenes? scenes)
    {
        if (usersToNotify is null || usersToNotify.Count == 0)
        {
            Log.NoUsersToNotify(Logger);
            return;
        }

        Log.UsersToNotify(Logger, usersToNotify);
        var botNotification = new VideoDownloadedNotification(
            videoKey.MyAnimeListId,
            videoKey.Dub,
            videoKey.Episode,
            messageId,
            usersToNotify,
            scenes);

        Log.SendingNotificationToBot(Logger, botNotification);
        await SnsNotificationService.NotifyVideoDownloaded(botNotification);
    }
}