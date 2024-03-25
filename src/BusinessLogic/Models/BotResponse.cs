using Bounan.Common.Enums;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <summary>
/// Response from the AniMan to the Bot.
/// Describes the video to return to the user.
/// </summary>
public record BotResponse(VideoStatus Status, string? FileId);