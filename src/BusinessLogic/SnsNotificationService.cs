using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;
using Bounan.AniMan.BusinessLogic.Configuration;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Bounan.AniMan.BusinessLogic;

internal class SnsNotificationService(
    IAmazonSimpleNotificationService snsClient,
    IOptions<NewEpisodeNotificationConfig> newEpisodeConfig)
    : ISnsNotificationService
{
    private readonly string _newEpisodeNotificationTopicArn = newEpisodeConfig.Value.TopicArn;

    private IAmazonSimpleNotificationService SnsClient { get; } = snsClient;

    public Task NotifyNewEpisodeAsync(CancellationToken cancellationToken = default)
    {
        var request = new PublishRequest
        {
            TopicArn = _newEpisodeNotificationTopicArn,
            Message = JsonConvert.SerializeObject(new { NewEpisode = true })
        };

        return SnsClient.PublishAsync(request, cancellationToken);
    }
}