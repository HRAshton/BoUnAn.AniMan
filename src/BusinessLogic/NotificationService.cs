using Amazon.SQS;
using Amazon.SQS.Model;
using Bounan.AniMan.BusinessLogic.Configuration;
using Bounan.AniMan.BusinessLogic.Extensions;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Bounan.AniMan.BusinessLogic;

internal class NotificationService : INotificationService
{
	private readonly string _botTopicArn;
	private readonly string _dwnTopicArn;

	public NotificationService(
		IAmazonSQS sqsClient,
		IOptions<BotConfig> botConfig,
		IOptions<DwnConfig> dwnConfig)

	{
		SqsClient = sqsClient;
		_botTopicArn = botConfig.Value.NotificationQueueUrl;
		_dwnTopicArn = dwnConfig.Value.NotificationQueueUrl;
	}

	private IAmazonSQS SqsClient { get; }

	public Task NotifyBotAsync(BotNotification notification)
	{
		var message = JsonConvert.SerializeObject(notification);
		return SqsClient.SendMessageAsync(_botTopicArn, message);
	}

	public Task NotifyDwnAsync(int numberOfNotifications)
	{
		const int maxInBatch = 10;
		var messages = Enumerable.Range(1, numberOfNotifications)
			.Select(i => new SendMessageBatchRequestEntry(i.ToString(), "0"))
			.Split(maxInBatch);

		var tasks = messages.Select(m => SqsClient.SendMessageBatchAsync(_dwnTopicArn, m.ToList()));

		return Task.WhenAll(tasks);
	}
}