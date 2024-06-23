namespace Bounan.AniMan.BusinessLogic.Configuration;

internal class NotificationsConfig
{
    public const string SectionName = "Notifications";

    public required string VideoRegisteredTopicArn { get; init; }

    public required string VideoDownloadedTopicArn { get; init; }

    public required string SceneRecognisedTopicArn { get; init; }
}