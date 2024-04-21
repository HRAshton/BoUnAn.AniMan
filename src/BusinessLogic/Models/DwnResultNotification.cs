using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <summary>
/// Uses for requests from the Downloader to the AniMan.
/// Describes the result of the download.
/// </summary>
public record DwnResultNotification(int MyAnimeListId, string Dub, int Episode, string? FileId)
    : IDwnResultNotification;