using Bounan.Common.Models;
using Bounan.Common.Models.DirectInteraction.Matcher;

namespace Bounan.AniMan.BusinessLogic.Models;

public record MatcherResponse : IMatcherResponse
{
    public required ICollection<VideoKey> VideosToMatch { get; init; }
}