using Bounan.AniMan.BusinessLogic.Models;

namespace Bounan.AniMan.BusinessLogic.Interfaces;

public interface IBotHandlingService
{
    Task<BotResponse> GetAnimeAsync(BotRequest request);
}