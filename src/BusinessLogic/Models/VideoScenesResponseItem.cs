using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

public record VideoScenesResponseItem(VideoKey VideoKey, Scenes Scenes) : IVideoScenesResponseItem;