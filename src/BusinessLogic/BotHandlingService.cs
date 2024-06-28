using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Entities;
using Bounan.AniMan.Dal.Repositories;
using Bounan.Common.Enums;
using Bounan.Common.Models;
using Bounan.Common.Models.DirectInteraction.Bot;
using Bounan.LoanApi.Interfaces;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class BotHandlingService(
    ILogger<BotHandlingService> logger,
    IFilesRepository filesRepository,
    ILoanApiComClient botLoanApiClient,
    ISnsNotificationService snsNotificationService)
    : IBotHandlingService
{
    private ILogger Logger { get; } = logger;

    private IFilesRepository FilesRepository { get; } = filesRepository;

    private ILoanApiComClient BotLoanApiClient { get; } = botLoanApiClient;

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
                return new BotResponse(video.Status, video.MessageId, video.Scenes);

            case VideoStatus.Pending or VideoStatus.Downloading:
                Log.AttachingUserToAnime(Logger);
                await FilesRepository.AttachUserToAnimeAsync(video, request.ChatId);
                return new BotResponse(VideoStatus.Pending, MessageId: null, Scenes: null);

            case null:
                Log.AddingAnime(Logger);
                var status = await AddAnimeAsync(request);
                return new BotResponse(status, MessageId: null, Scenes: null);

            default:
                throw new InvalidOperationException();
        }
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
            await SnsNotificationService.NotifyVideoRegisteredAsync();
            Log.NotificationSentToSns(Logger);
        }

        return requestedFileEntity.Status;
    }
}