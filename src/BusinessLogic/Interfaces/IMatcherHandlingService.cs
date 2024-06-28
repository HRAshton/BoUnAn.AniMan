using Bounan.AniMan.BusinessLogic.Models;
using Bounan.Common.Models.DirectInteraction.Matcher;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

public interface IMatcherHandlingService
{
    Task<IMatcherResponse> GetVideosToMatchAsync();

    Task UpdateVideoScenesAsync(MatcherResultRequest response);
}