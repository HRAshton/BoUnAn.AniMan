using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

internal record SceneRecognisedNotificationItem(
    int MyAnimeListId,
    string Dub,
    int Episode,
    Scenes? Scenes)
    : ISceneRecognisedNotificationItem;