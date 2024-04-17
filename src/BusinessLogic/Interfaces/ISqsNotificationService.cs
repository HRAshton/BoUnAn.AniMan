using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

internal interface ISqsNotificationService
{
	Task NotifyBotAsync(BotNotification notification);
}