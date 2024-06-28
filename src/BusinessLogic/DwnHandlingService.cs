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

    public async Task<DwnResponse> GetVideoToDownloadAsync()
    {
        var file = await FilesRepository.PopSignedLinkToDownloadAsync();
        return new DwnResponse(file);
    }

    public async Task UpdateVideoStatusAsync(DwnResultRequest request)
    {
        var key = new VideoKey(request.MyAnimeListId, request.Dub, request.Episode);
        var video = await FilesRepository.GetAnimeAsync(key);
        ArgumentNullException.ThrowIfNull(video);
        Log.VideoRetrieved(Logger, video);

        if (request.MessageId is null)
        {
            await FilesRepository.MarkAsFailedAsync(video);
            Log.MarkedAsFailed(Logger, video);
        }
        else
        {
            await FilesRepository.MarkAsDownloadedAsync(video, request.MessageId.Value);
            Log.MarkedAsDownloaded(Logger, video);
        }

        var usersToNotify = video.Subscribers;
        await NotifySnsAsync(video, usersToNotify, request.MessageId, video.Scenes);
    }

    private async Task NotifySnsAsync(
        IVideoKey videoKey,
        ICollection<long>? usersToNotify,
        int? messageId,
        Scenes? scenes)
    {
        usersToNotify ??= [ ];

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