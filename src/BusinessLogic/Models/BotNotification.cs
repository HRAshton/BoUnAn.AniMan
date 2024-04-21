using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <summary>
/// Notification from the AniMan to the Bot.
/// </summary>
internal record BotNotification(ICollection<long> ChatIds, int MyAnimeListId, string Dub, int Episode, string? FileId)
    : IBotNotification;