using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

internal interface INotificationService
{
	Task NotifyBotAsync(BotNotification notification);

	Task NotifyDwnAsync();
}