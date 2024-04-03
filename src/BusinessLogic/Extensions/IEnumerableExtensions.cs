namespace Bounan.AniMan.BusinessLogic.Extensions;

public static class EnumerableExtensions
{
	public static IEnumerable<IEnumerable<T>> Split<T>(this IEnumerable<T> source, int chunkSize)
	{
		if (chunkSize <= 0)
		{
			throw new ArgumentException("Chunk size must be greater than 0", nameof(chunkSize));
		}

		var chunk = new List<T>(chunkSize);
		foreach (var item in source)
		{
			chunk.Add(item);
			if (chunk.Count == chunkSize)
			{
				yield return chunk;
				chunk = new List<T>(chunkSize);
			}
		}

		if (chunk.Count > 0)
		{
			yield return chunk;
		}
	}
}