using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

public record VideoScenesResponse(VideoKey VideoKey, Scenes? Scenes) : IVideoScenesResponse;