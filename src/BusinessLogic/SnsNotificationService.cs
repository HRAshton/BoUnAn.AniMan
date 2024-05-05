using System.Text.Json;
using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;
using Bounan.AniMan.BusinessLogic.Configuration;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Microsoft.Extensions.Options;

namespace Bounan.AniMan.BusinessLogic;

internal class SnsNotificationService(
    IAmazonSimpleNotificationService snsClient,
    IOptions<NotificationsConfig> notificationsConfig)
    : ISnsNotificationService
{
    private readonly NotificationsConfig _notificationsConfig = notificationsConfig.Value;

    private IAmazonSimpleNotificationService SnsClient { get; } = snsClient;

    /// <summary>
    /// Sends a notification that a video has been registered.
    /// </summary>
    /// <returns>The task object representing the asynchronous operation.</returns>
    public Task NotifyVideoRegisteredAsync()
    {
        var request = new PublishRequest
        {
            TopicArn = _notificationsConfig.VideoRegisteredTopicArn,
            Message = JsonSerializer.Serialize(new VideoRegisteredNotification()),
        };

        return SnsClient.PublishAsync(request);
    }

    /// <summary>
    /// Sends a notification that a video has been downloaded or failed to download.
    /// </summary>
    /// <param name="notification">The notification to send.</param>
    /// <returns>The task object representing the asynchronous operation.</returns>
    public Task NotifyVideoDownloaded(VideoDownloadedNotification notification)
    {
        var request = new PublishRequest
        {
            TopicArn = _notificationsConfig.VideoDownloadedTopicArn,
            Message = JsonSerializer.Serialize(notification),
        };

        return SnsClient.PublishAsync(request);
    }
}