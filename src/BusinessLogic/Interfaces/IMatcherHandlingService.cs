using Bounan.AniMan.BusinessLogic.Models;
using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

public interface IMatcherHandlingService
{
    Task<IMatcherResponse> GetVideosToMatchAsync();

    Task UpdateVideoScenesAsync(VideoScenesResponse response);
}