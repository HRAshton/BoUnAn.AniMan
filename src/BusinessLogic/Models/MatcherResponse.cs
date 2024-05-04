using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

public record MatcherResponse : IMatcherResponse
{
    public required ICollection<VideoKey> VideosToMatch { get; init; }
}