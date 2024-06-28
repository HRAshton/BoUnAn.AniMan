using Bounan.Common.Models.DirectInteraction.Bot;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <summary>
/// Request from the Bot to the AniMan.
/// </summary>
public record BotRequest(int MyAnimeListId, string Dub, int Episode, long ChatId) : IBotRequest;