namespace Bounan.AniMan.BusinessLogic.Configuration;

internal record BotConfig
{
	public const string SectionName = "Bot";

	public required string NotificationQueueUrl { get; init; }
}