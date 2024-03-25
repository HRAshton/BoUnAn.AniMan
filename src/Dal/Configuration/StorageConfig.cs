namespace Bounan.AniMan.Dal.Configuration;

public class StorageConfig
{
	public const string SectionName = "Storage";

	public required string TableName { get; init; }

	public required string SecondaryIndexName { get; init; }
}