using Bounan.Common.Models.Notifications;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <inheritdoc />
internal record SceneRecognisedNotification(ICollection<SceneRecognisedNotificationItem> Items)
    : ISceneRecognisedNotification<SceneRecognisedNotificationItem>;