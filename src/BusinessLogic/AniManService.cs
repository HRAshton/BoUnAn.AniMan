using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Entities;
using Bounan.AniMan.Dal.Repositories;
using Bounan.Common.Enums;
using Bounan.Common.Models;
using Bounan.LoanApi.Interfaces;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class AniManService : IAniManService
{
	public AniManService(
		ILogger<AniManService> logger,
		IFilesRepository filesRepository,
		IBotLoanApiClient botLoanApiClient,
		INotificationService notificationService)
	{
		Logger = logger;
		FilesRepository = filesRepository;
		BotLoanApiClient = botLoanApiClient;
		NotificationService = notificationService;

		Log.AniManServiceCreated(Logger);
	}

	private ILogger<AniManService> Logger { get; }

	private IFilesRepository FilesRepository { get; }

	private IBotLoanApiClient BotLoanApiClient { get; }

	private INotificationService NotificationService { get; }

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
				return new BotResponse(video.Status, video.FileId);

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

		var usersToNotify = video.Subscribers;

		if (notification.FileId is null)
		{
			await FilesRepository.MarkAsFailedAsync(video);
			Log.MarkedAsFailed(Logger, video);
		}
		else
		{
			await FilesRepository.MarkAsDownloadedAsync(video, notification.FileId);
			Log.MarkedAsDownloaded(Logger, video);
		}

		await NotifyUsersAsync(usersToNotify, video);
	}

	private async Task<VideoStatus> AddAnimeAsync(BotRequest request)
	{
		var videoInfos = await BotLoanApiClient.SearchAsync(request.MyAnimeListId);
		Log.VideoFetchedFromLoanApi(Logger, videoInfos);

		var videoInfo = videoInfos.FirstOrDefault(x =>
			x.MyAnimeListId == request.MyAnimeListId
			&& x.Dub == request.Dub
			&& x.Episode == request.Episode);
		if (videoInfo == null)
		{
			return VideoStatus.NotAvailable;
		}

		var videoKey = new VideoKey(videoInfo.MyAnimeListId, videoInfo.Dub, videoInfo.Episode);
		var fileEntity = await FilesRepository.AddAnimeAsync(videoKey);
		Log.VideoAddedToDatabase(Logger, fileEntity);

		await FilesRepository.AttachUserToAnimeAsync(fileEntity, request.ChatId);
		Log.ChatIdAttachedToAnime(Logger);

		await NotificationService.NotifyDwnAsync();
		Log.DwnHasBeenNotified(Logger);

		return fileEntity.Status;
	}

	private async Task NotifyUsersAsync(ICollection<long>? usersToNotify, FileEntity video)
	{
		if (usersToNotify == null)
		{
			Log.NoUsersToNotify(Logger);
			return;
		}

		Log.UsersToNotify(Logger, usersToNotify);
		var botNotification =
			new BotNotification(usersToNotify, video.MyAnimeListId, video.Dub, video.Episode, video.FileId);

		Log.SendingNotificationToBot(Logger, botNotification);
		await NotificationService.NotifyBotAsync(botNotification);
	}
}