using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

public record VideoScenesResponse(ICollection<VideoScenesResponseItem> Items)
    : IVideoScenesResponse<VideoScenesResponseItem>;