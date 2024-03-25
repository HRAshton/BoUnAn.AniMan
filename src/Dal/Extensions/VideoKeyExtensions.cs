using Bounan.Common.Models;

namespace Bounan.AniMan.Dal.Extensions;

internal static class VideoKeyExtensions
{
	public static string ToKey(this IVideoKey videoKey)
	{
		return $"{videoKey.MyAnimeListId}#{videoKey.Dub}#{videoKey.Episode}";
	}
}