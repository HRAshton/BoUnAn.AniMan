using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <summary>
/// Uses for requests from the Downloader to the AniMan.
/// Describes the next video to download.
/// </summary>
public record DwnQueueResponse(IVideoKey? VideoKey);
