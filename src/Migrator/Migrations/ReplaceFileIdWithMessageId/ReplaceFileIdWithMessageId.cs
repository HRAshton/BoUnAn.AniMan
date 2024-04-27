using System.Text.Json;
using System.Text.Json.Serialization;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Bounan.AniMan.Dal;
using Bounan.AniMan.Dal.Entities;
using Bounan.Common.Enums;
using Bounan.Common.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Bounan.AniMan.Migrator.Migrations.ReplaceFileIdWithMessageId;

public class ReplaceFileIdWithMessageIdMigration
{
    [Obsolete("Obsolete")]
    public async Task Run()
    {
        var pairs = await ReadOldMessagesFromCsvAsync();
        Console.WriteLine($"Read {pairs.Count} valid message id-base64 pairs");

        var (context, dynamoDbOperationConfig) = GetContextAndConfig();

        var scanConditions = new ScanCondition[]
        {
            new (nameof(FileEntity.MessageId), ScanOperator.IsNull),
            new (nameof(FileEntity.Status), ScanOperator.Equal, VideoStatus.Downloaded),
        };
        var scan = context.ScanAsync<FileEntity>(scanConditions, dynamoDbOperationConfig);

        var i = 0;
        var batchUpdates = new List<FileEntity>();
        while (!scan.IsDone)
        {
            Console.WriteLine($"Processing batch {++i}");

            var files = await scan.GetNextSetAsync();
            Console.WriteLine($"Read {files.Count} files");

            foreach (var file in files)
            {
                var videoKey = new VideoKey(file.MyAnimeListId, file.Dub, file.Episode);
                if (!pairs.TryGetValue(videoKey, out var messageId)) continue;

                file.FileId = null;
                file.MessageId = messageId;
                file.UpdatedAt = DateTime.UtcNow;
                batchUpdates.Add(file);
            }
        }

        Console.WriteLine($"Updating {batchUpdates.Count} files");
        var forumBatch = context.CreateBatchWrite<FileEntity>(dynamoDbOperationConfig);
        forumBatch.AddPutItems(batchUpdates);
        await forumBatch.ExecuteAsync();
    }

    private static async Task<Dictionary<VideoKey, int>> ReadOldMessagesFromCsvAsync()
    {
        var messageIdBase64Pairs = await File.ReadAllLinesAsync(
            @"Migrations\ReplaceFileIdWithMessageId\messageIdBase64Pairs.csv");
        Console.WriteLine($"Read {messageIdBase64Pairs.Length} messageId-base64 pairs");

        var pairs = new Dictionary<VideoKey, int>();
        foreach (var pair in messageIdBase64Pairs)
        {
            try
            {
                var split = pair.Split(',');
                var messageId = int.Parse(split[0]);
                if (messageId <= 0)
                {
                    Console.WriteLine($"Invalid message id {messageId}");
                    continue;
                }

                var base64 = split[1];
                var serializedJson = Convert.FromBase64String(base64);
                var videoKeyContainer = JsonSerializer.Deserialize<VideoKeyContainer>(serializedJson);
                if (videoKeyContainer is not { VideoKey: not null })
                {
                    Console.WriteLine($"Failed to deserialize message id {messageId}");
                    continue;
                }

                pairs[videoKeyContainer.VideoKey] = messageId;
            }
            catch (Exception e)
            {
                Console.WriteLine($"Failed to parse message id {pair}: {e.Message}");
            }
        }

        return pairs;
    }

    private static (IDynamoDBContext, DynamoDBOperationConfig) GetContextAndConfig()
    {
        var diContainer = new ServiceCollection();
        Registrar.RegisterServices(diContainer);
        var serviceProvider = diContainer.BuildServiceProvider();

        var context = serviceProvider.GetRequiredService<IDynamoDBContext>();
        var dynamoDbOperationConfig = new DynamoDBOperationConfig
        {
            OverrideTableName = "",
        };

        return (context, dynamoDbOperationConfig);
    }

    private record VideoKeyContainer(VideoKey VideoKey);

    private record ExportResult
    {
        [JsonPropertyName("messages")] public List<Message> Messages { get; set; }

        public class Message
        {
            [JsonPropertyName("id")] public int Id { get; set; }

            [JsonPropertyName("text")] public string Text { get; set; }
        }
    }
}