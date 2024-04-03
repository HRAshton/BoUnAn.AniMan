using Amazon.DynamoDBv2.DataModel;
using Bounan.AniMan.Dal.Extensions;
using Bounan.Common.Enums;
using Bounan.Common.Models;

namespace Bounan.AniMan.Dal.Entities;

[DynamoDBTable("DUMMY")]
public class FileEntity : IVideoKey
{
	[DynamoDBHashKey]
	public string PrimaryKey
	{
		get => this.ToKey();
		// ReSharper disable once ValueParameterNotUsed - Required by DynamoDB
		private init { }
	}

	[DynamoDBProperty]
	public string? SortKey
	{
		get => Status == VideoStatus.Pending
			? $"{(Subscribers is null ? 1 : 0)}#{CreatedAt:O}"
			: null;
		// ReSharper disable once ValueParameterNotUsed - Required by DynamoDB
		private init { }
	}

	[DynamoDBProperty]
	public required int MyAnimeListId { get; init; }

	[DynamoDBProperty]
	public required string Dub { get; init; }

	[DynamoDBProperty]
	public required int Episode { get; init; }

	[DynamoDBProperty]
	public required DateTime CreatedAt { get; init; }

	[DynamoDBProperty]
	public required VideoStatus Status { get; set; }

	[DynamoDBProperty]
	public required DateTime UpdatedAt { get; set; }

	[DynamoDBProperty]
	public HashSet<long>? Subscribers { get; set; }

	[DynamoDBProperty]
	public string? FileId { get; set; }
}