using Bounan.Common.Models.DirectInteraction.Downloader;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <summary>
/// Uses for requests from the Downloader to the AniMan.
/// Describes the result of the download.
/// </summary>
public record DwnResultRequest(int MyAnimeListId, string Dub, int Episode, int? MessageId)
    : IDwnResultRequest;