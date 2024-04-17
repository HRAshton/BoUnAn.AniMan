using Amazon.SQS;
using Bounan.AniMan.BusinessLogic.Configuration;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Bounan.AniMan.BusinessLogic;

internal class SqsNotificationService(IAmazonSQS sqsClient, IOptions<BotConfig> botConfig) : ISqsNotificationService
{
    private readonly string _botTopicArn = botConfig.Value.NotificationQueueUrl;

    private IAmazonSQS SqsClient { get; } = sqsClient;

    public Task NotifyBotAsync(BotNotification notification)
    {
        var message = JsonConvert.SerializeObject(notification);
        return SqsClient.SendMessageAsync(_botTopicArn, message);
    }
}