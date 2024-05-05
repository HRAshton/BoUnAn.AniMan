﻿namespace Bounan.AniMan.BusinessLogic.Configuration;

internal class NotificationsConfig
{
    public const string SectionName = "Notifications";

    public required string VideoRegisteredTopicArn { get; set; }

    public required string VideoDownloadedTopicArn { get; set; }
}