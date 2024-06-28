using Bounan.Common.Models;
using Bounan.Common.Models.Notifications;

namespace Bounan.AniMan.BusinessLogic.Models;

internal record SceneRecognisedNotificationItem(
    int MyAnimeListId,
    string Dub,
    int Episode,
    Scenes? Scenes)
    : ISceneRecognisedNotificationItem;