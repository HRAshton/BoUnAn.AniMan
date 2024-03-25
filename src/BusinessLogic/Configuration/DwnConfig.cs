namespace Bounan.AniMan.BusinessLogic.Configuration;

internal record DwnConfig
{
	public const string SectionName = "Dwn";

	public required string NotificationQueueUrl { get; init; }
}