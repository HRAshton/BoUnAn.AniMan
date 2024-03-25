using Amazon.Lambda.Core;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Entities;
using Bounan.AniMan.Dal.Repositories;
using Bounan.Common.Enums;
using Bounan.LoanApi.Interfaces;
using Newtonsoft.Json;

namespace Bounan.AniMan.BusinessLogic;

internal class AniMenService : IAniMenService
{
	public AniMenService(
		IFilesRepository filesRepository,
		IBotLoanApiClient botLoanApiClient,
		INotificationService notificationService)
	{
		FilesRepository = filesRepository;
		BotLoanApiClient = botLoanApiClient;
		NotificationService = notificationService;
	}

	private IFilesRepository FilesRepository { get; }

	private IBotLoanApiClient BotLoanApiClient { get; }

	private INotificationService NotificationService { get; }

	public async Task<BotResponse> GetAnimeAsync(BotRequest request, ILambdaContext context)
	{
		context.Logger.LogLine($"Request: {JsonConvert.SerializeObject(request)}");

		var key = new VideoKey(request.MyAnimeListId, request.Dub, request.Episode);
		var video = await FilesRepository.GetAnimeAsync(key);
		context.Logger.LogLine($"Video: {JsonConvert.SerializeObject(video)}");

		switch (video?.Status)
		{
			case VideoStatus.Downloaded or VideoStatus.Failed:
				context.Logger.LogLine("Returning video");
				return new BotResponse(video.Status, video.FileId);

			case VideoStatus.Pending or VideoStatus.Downloading:
				context.Logger.LogLine("Returning pending");
				await FilesRepository.AttachUserToAnimeAsync(video, request.ChatId);
				return new BotResponse(VideoStatus.Pending, null);

			case null:
				context.Logger.LogLine("Adding anime");
				var status = await AddAnimeAsync(request, context);
				return new BotResponse(status, null);

			default:
				throw new InvalidOperationException();
		}
	}

	public async Task<DwnQueueResponse> GetVideoToDownloadAsync(ILambdaContext context)
	{
		var file = await FilesRepository.PopSignedLinkToDownloadAsync();
		return new DwnQueueResponse(file);
	}

	public async Task UpdateVideoStatusAsync(DwnResultNotification notification, ILambdaContext context)
	{
		var key = new VideoKey(notification.MyAnimeListId, notification.Dub, notification.Episode);
		var video = await FilesRepository.GetAnimeAsync(key);
		ArgumentNullException.ThrowIfNull(video);
		context.Logger.LogLine($"Video: {JsonConvert.SerializeObject(video)}");

		var usersToNotify = video.Subscribers;

		if (notification.FileId is null)
		{
			await FilesRepository.MarkAsFailedAsync(video);
			context.Logger.LogLine("Marked as failed");
		}
		else
		{
			await FilesRepository.MarkAsDownloadedAsync(video, notification.FileId);
			context.Logger.LogLine("Marked as downloaded");
		}

		await NotifyUsersAsync(usersToNotify, video, context);
	}

	private async Task<VideoStatus> AddAnimeAsync(BotRequest request, ILambdaContext context)
	{
		var videoInfos = await BotLoanApiClient.SearchAsync(request.MyAnimeListId);
		context.Logger.LogLine($"VideoInfos: {JsonConvert.SerializeObject(videoInfos)}");

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
		context.Logger.LogLine("Added anime");

		await FilesRepository.AttachUserToAnimeAsync(fileEntity, request.ChatId);
		context.Logger.LogLine("Attached user");

		await NotificationService.NotifyDwnAsync();
		context.Logger.LogLine("Notified Dwn");

		return fileEntity.Status;
	}

	private async Task NotifyUsersAsync(ICollection<long>? usersToNotify, FileEntity video, ILambdaContext context)
	{
		if (usersToNotify == null)
		{
			context.Logger.LogLine("No users to notify");
			return;
		}

		context.Logger.LogLine($"Users to notify: {JsonConvert.SerializeObject(usersToNotify)}");
		var botNotification =
			new BotNotification(usersToNotify, video.MyAnimeListId, video.Dub, video.Episode, video.FileId);

		context.Logger.LogLine($"BotNotification: {JsonConvert.SerializeObject(botNotification)}");
		await NotificationService.NotifyBotAsync(botNotification);
	}
}