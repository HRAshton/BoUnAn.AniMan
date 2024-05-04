using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Entities;
using Bounan.AniMan.Dal.Repositories;
using Bounan.Common.Enums;
using Bounan.Common.Models;
using Bounan.LoanApi.Interfaces;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class AniManService(
    ILogger<AniManService> logger,
    IFilesRepository filesRepository,
    ILoanApiComClient botLoanApiClient,
    ISqsNotificationService sqsNotificationService,
    ISnsNotificationService snsNotificationService)
    : IAniManService
{
    private ILogger<AniManService> Logger { get; } = logger;

    private IFilesRepository FilesRepository { get; } = filesRepository;

    private ILoanApiComClient BotLoanApiClient { get; } = botLoanApiClient;

    private ISqsNotificationService SqsNotificationService { get; } = sqsNotificationService;

    private ISnsNotificationService SnsNotificationService { get; } = snsNotificationService;

    public async Task<BotResponse> GetAnimeAsync(BotRequest request)
    {
        Log.ReceivedRequest(Logger, request);

        var key = new VideoKey(request.MyAnimeListId, request.Dub, request.Episode);
        var video = await FilesRepository.GetAnimeAsync(key);
        Log.VideoRetrieved(Logger, video);

        switch (video?.Status)
        {
            case VideoStatus.Downloaded or VideoStatus.Failed:
                Log.ReturningVideoAsIs(Logger);
                return new BotResponse(video.Status, video.MessageId);

            case VideoStatus.Pending or VideoStatus.Downloading:
                Log.AttachingUserToAnime(Logger);
                await FilesRepository.AttachUserToAnimeAsync(video, request.ChatId);
                return new BotResponse(VideoStatus.Pending, null);

            case null:
                Log.AddingAnime(Logger);
                var status = await AddAnimeAsync(request);
                return new BotResponse(status, null);

            default:
                throw new InvalidOperationException();
        }
    }

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
        await NotifyUsersAsync(video, usersToNotify, notification.MessageId);
    }

    public async Task UpdateVideoScenesAsync(VideoScenesResponse response)
    {
        Log.ReceivedScenesResponse(Logger, response);
        if (response.Scenes is null)
        {
            Log.ScenesHaveNotBeenUpdated(Logger);
            return;
        }

        await FilesRepository.UpdateScenesAsync(response.VideoKey, response.Scenes);
        Log.ScenesHaveBeenUpdated(Logger);
    }

    private async Task<VideoStatus> AddAnimeAsync(IBotRequest request)
    {
        var videoInfos = await BotLoanApiClient.GetExistingVideos(request.MyAnimeListId);
        Log.VideoFetchedFromLoanApi(Logger, videoInfos);

        var dubEpisodes = videoInfos
            .Where(x => x.MyAnimeListId == request.MyAnimeListId && x.Dub == request.Dub)
            .ToArray();

        var requestedVideo = dubEpisodes.FirstOrDefault(x => x.Episode == request.Episode);
        if (requestedVideo == null)
        {
            return VideoStatus.NotAvailable;
        }

        FileEntity? requestedFileEntity = null;
        var atLeastOneAdded = false;
        foreach (var video in dubEpisodes)
        {
            var (added, fileEntity) = await FilesRepository.AddAnimeAsync(video);
            atLeastOneAdded |= added;
            if (added)
            {
                Log.VideoAddedToDatabase(Logger, fileEntity);
            }

            if (video.Episode == request.Episode)
            {
                requestedFileEntity = fileEntity;
            }
        }

        ArgumentNullException.ThrowIfNull(requestedFileEntity);
        await FilesRepository.AttachUserToAnimeAsync(requestedFileEntity, request.ChatId);
        Log.ChatIdAttachedToAnime(Logger);

        if (atLeastOneAdded)
        {
            await SnsNotificationService.NotifyNewEpisodeAsync();
            Log.DwnHasBeenNotified(Logger);
        }

        return requestedFileEntity.Status;
    }

    private async Task NotifyUsersAsync(IVideoKey videoKey, ICollection<long>? usersToNotify, int? messageId)
    {
        if (usersToNotify is null || usersToNotify.Count == 0)
        {
            Log.NoUsersToNotify(Logger);
            return;
        }

        Log.UsersToNotify(Logger, usersToNotify);
        var botNotification =
            new BotNotification(usersToNotify, videoKey.MyAnimeListId, videoKey.Dub, videoKey.Episode, messageId);

        Log.SendingNotificationToBot(Logger, botNotification);
        await SqsNotificationService.NotifyBotAsync(botNotification);
    }
}