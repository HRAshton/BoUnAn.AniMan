using Bounan.Common.Enums;
using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <summary>
/// Response from the AniMan to the Bot.
/// Describes the message containing the video.
/// </summary>
public record BotResponse(VideoStatus Status, string? MessageId) : IBotResponse;