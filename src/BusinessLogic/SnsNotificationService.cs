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

    public Task NotifyVideoRegisteredAsync(CancellationToken cancellationToken = default)
    {
        var request = new PublishRequest
        {
            TopicArn = _notificationsConfig.VideoRegisteredTopicArn,
            Message = JsonSerializer.Serialize(new { NewEpisode = true }),
        };

        return SnsClient.PublishAsync(request, cancellationToken);
    }

    public Task NotifyVideoDownloaded(BotNotification notification, CancellationToken cancellationToken = default)
    {
        var request = new PublishRequest
        {
            TopicArn = _notificationsConfig.VideoDownloadedTopicArn,
            Message = JsonSerializer.Serialize(notification),
        };

        return SnsClient.PublishAsync(request, cancellationToken);
    }
}