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
    private readonly DynamoDBOperationConfig _dynamoDbOperationConfig = new()
    {
        OverrideTableName = databaseConfig.Value.TableName,
        IndexName = databaseConfig.Value.SecondaryIndexName
    };

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

        video.Subscribers ??= [];
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
            IndexName = _dynamoDbOperationConfig.IndexName,
            Filter = new QueryFilter(
                "Status",
                QueryOperator.Equal,
                [new AttributeValue { N = VideoStatus.Pending.ToString("D") }]
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

        var video = response.First();
        video.Status = VideoStatus.Downloading;
        video.UpdatedAt = DateTime.UtcNow;

        await Context.SaveAsync(video, _dynamoDbOperationConfig);

        return video;
    }
}