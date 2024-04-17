namespace Bounan.AniMan.BusinessLogic.Configuration;

internal class NewEpisodeNotificationConfig
{
    public const string SectionName = "NewEpisodeNotification";

    public required string TopicArn { get; set; }
}