using Bounan.Common.Models;
using Bounan.Common.Models.DirectInteraction.Downloader;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <summary>
/// Uses for requests from the Downloader to the AniMan.
/// Describes the next video to download.
/// </summary>
public record DwnResponse(IVideoKey? VideoKey) : IDwnResponse<IVideoKey>;