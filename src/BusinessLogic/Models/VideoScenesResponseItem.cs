using Bounan.Common.Models;
using Bounan.Common.Models.DirectInteraction.Matcher;

namespace Bounan.AniMan.BusinessLogic.Models;

public record MatcherResultRequestItem(VideoKey VideoKey, Scenes Scenes) : IMatcherResultRequestItem;