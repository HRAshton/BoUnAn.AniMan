using Bounan.Common.Models;

namespace Bounan.AniMan.BusinessLogic.Models;

internal record VideoKey(int MyAnimeListId, string Dub, int Episode) : IVideoKey;