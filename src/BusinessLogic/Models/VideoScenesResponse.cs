using Bounan.Common.Models.DirectInteraction.Matcher;

namespace Bounan.AniMan.BusinessLogic.Models;

public record MatcherResultRequest(ICollection<MatcherResultRequestItem> Items)
    : IMatcherResultRequest<MatcherResultRequestItem>;