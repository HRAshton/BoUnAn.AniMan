using System.Text.Json;
using Bounan.AniMan.BusinessLogic.Interfaces;
using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Dal.Repositories;
using Bounan.Common.Models;
using Bounan.Common.Models.DirectInteraction.Matcher;
using Microsoft.Extensions.Logging;

namespace Bounan.AniMan.BusinessLogic;

internal partial class MatcherHandlingService(
    ILogger<MatcherHandlingService> logger,
    IFilesRepository filesRepository,
    ISnsNotificationService sns)
    : IMatcherHandlingService
{
    private ILogger Logger { get; } = logger;

    private IFilesRepository FilesRepository { get; } = filesRepository;

    public async Task<IMatcherResponse> GetVideosToMatchAsync()
    {
        Log.CollectingVideosToMatch(Logger);
        var videos = await FilesRepository.GetVideosToMatchAsync();
        var result = new MatcherResponse
        {
            VideosToMatch = videos
                .Select(v => new VideoKey(v.MyAnimeListId, v.Dub, v.Episode))
                .ToList(),
        };
        Log.CollectedVideosToMatch(Logger, result.VideosToMatch.Count, JsonSerializer.Serialize(result));

        return result;
    }

    public async Task UpdateVideoScenesAsync(MatcherResultRequest response)
    {
        Log.ReceivedScenesResponse(Logger, response);
        foreach (var item in response.Items)
        {
            try
            {
                await FilesRepository.UpdateScenesAsync(item.VideoKey, item.Scenes);
                Log.ScenesHaveBeenUpdated(Logger, item);
            }
            catch (NullReferenceException ex)
            {
                Log.FailedToUpdateScenes(Logger, item, ex);
            }
        }

        var notification = new SceneRecognisedNotification(response.Items
            .Select(x => new SceneRecognisedNotificationItem(
                x.VideoKey.MyAnimeListId,
                x.VideoKey.Dub,
                x.VideoKey.Episode,
                x.Scenes))
            .ToArray());
        await sns.NotifySceneRecognised(notification);

        Log.AllScenesHaveBeenUpdated(Logger);
    }
}