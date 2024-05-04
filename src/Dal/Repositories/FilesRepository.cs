using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.DynamoDBv2.Model;
using Bounan.AniMan.Dal.Configuration;
using Bounan.AniMan.Dal.Entities;
using Bounan.AniMan.Dal.Extensions;
using Bounan.Common.Enums;
using Bounan.Common.Models;
using Microsoft.Extensions.Options;

namespace Bounan.AniMan.Dal.Repositories;

internal class FilesRepository(IDynamoDBContext dynamoDbContext, IOptions<StorageConfig> databaseConfig)
    : IFilesRepository
{
    private readonly DynamoDBOperationConfig _dynamoDbOperationConfig = new ()
    {
        OverrideTableName = databaseConfig.Value.TableName,
    };

    private StorageConfig StorageConfig { get; } = databaseConfig.Value;

    private IDynamoDBContext Context { get; } = dynamoDbContext;

    public Task<FileEntity?> GetAnimeAsync(IVideoKey videoKey)
    {
        return Context.LoadAsync<FileEntity?>(videoKey.ToKey(), _dynamoDbOperationConfig);
    }

    public async Task<(bool Added, FileEntity Entity)> AddAnimeAsync(IVideoKey videoKey)
    {
        var fileEntity = await Context.LoadAsync<FileEntity>(videoKey.ToKey(), _dynamoDbOperationConfig);
        if (fileEntity != null)
        {
            return (false, fileEntity);
        }

        fileEntity = new FileEntity
        {
            MyAnimeListId = videoKey.MyAnimeListId,
            Dub = videoKey.Dub,
            Episode = videoKey.Episode,
            Status = VideoStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await Context.SaveAsync(fileEntity, _dynamoDbOperationConfig);

        return (true, fileEntity);
    }

    public async Task MarkAsDownloadedAsync(IVideoKey videoKey, int messageId)
    {
        var video = await Context.LoadAsync<FileEntity>(videoKey.ToKey(), _dynamoDbOperationConfig);

        video.Status = VideoStatus.Downloaded;
        video.MessageId = messageId;
        video.UpdatedAt = DateTime.UtcNow;
        video.Subscribers = null;

        await Context.SaveAsync(video, _dynamoDbOperationConfig);
    }

    public async Task MarkAsFailedAsync(IVideoKey videoKey)
    {
        var video = await Context.LoadAsync<FileEntity>(videoKey.ToKey(), _dynamoDbOperationConfig);

        video.Status = VideoStatus.Failed;
        video.UpdatedAt = DateTime.UtcNow;

        await Context.SaveAsync(video, _dynamoDbOperationConfig);
    }

    public async Task AttachUserToAnimeAsync(IVideoKey videoKey, long requestChatId)
    {
        var video = await Context.LoadAsync<FileEntity>(videoKey.ToKey(), _dynamoDbOperationConfig);

        video.Subscribers ??= [ ];
        video.Subscribers.Add(requestChatId);
        video.UpdatedAt = DateTime.UtcNow;

        await Context.SaveAsync(video, _dynamoDbOperationConfig);
    }

    /// <summary>
    /// Get the next video by the global secondary index.
    /// </summary>
    public async Task<IVideoKey?> PopSignedLinkToDownloadAsync()
    {
        var request = new QueryOperationConfig
        {
            IndexName = StorageConfig.SecondaryIndexName,
            Filter = new QueryFilter(
                "Status",
                QueryOperator.Equal,
                [ new AttributeValue { N = VideoStatus.Pending.ToString("D") } ]
            ),
            Limit = 1,
            BackwardSearch = false
        };

        var query = Context.FromQueryAsync<FileEntity>(request, _dynamoDbOperationConfig);
        var response = await query.GetNextSetAsync();
        if (response.Count == 0)
        {
            return null;
        }

        var key = response.First().PrimaryKey;

        var video = await Context.LoadAsync<FileEntity>(key, _dynamoDbOperationConfig);
        video.Status = VideoStatus.Downloading;
        video.UpdatedAt = DateTime.UtcNow;

        await Context.SaveAsync(video, _dynamoDbOperationConfig);

        return video;
    }

    /// <summary>
    /// Returns all videos for next non-empty MatchingGroup.
    /// </summary>
    /// <returns></returns>
    public async Task<ICollection<IVideoKey>> GetVideosToMatchAsync()
    {
        var firstGroupQueryConfig = new ScanOperationConfig
        {
            IndexName = StorageConfig.MatcherSecondaryIndexName,
            Limit = 1,
            Select = SelectValues.AllProjectedAttributes,
        };

        var firstGroup = await Context
            .FromScanAsync<FileEntity>(firstGroupQueryConfig, _dynamoDbOperationConfig)
            .GetNextSetAsync();
        if (firstGroup.Count == 0)
        {
            return Array.Empty<FileEntity>();
        }

        var group = firstGroup.Single().MatchingGroup;

        var videosQueryConfig = new QueryOperationConfig
        {
            IndexName = StorageConfig.MatcherSecondaryIndexName,
            Filter = new QueryFilter(
                "MatchingGroup",
                QueryOperator.Equal,
                [ new AttributeValue { S = group } ]
            ),
            Select = SelectValues.AllProjectedAttributes,
        };

        var videos = await Context
            .FromQueryAsync<FileEntity>(videosQueryConfig, _dynamoDbOperationConfig)
            .GetRemainingAsync();

        return videos.Cast<IVideoKey>().ToList();
    }

    public async Task UpdateScenesAsync(IVideoKey videoKey, Scenes scenes)
    {
        var video = await Context.LoadAsync<FileEntity>(videoKey.ToKey(), _dynamoDbOperationConfig);

        video.Scenes = scenes;
        video.UpdatedAt = DateTime.UtcNow;

        await Context.SaveAsync(video, _dynamoDbOperationConfig);
    }
}