using Amazon.Lambda.TestUtilities;
using Bounan.AniMan.BusinessLogic.Models;
using Bounan.AniMan.Endpoint;
using Bounan.Common.Enums;
using Newtonsoft.Json;

var lambdaHandlers = new LambdaHandlers();
var context = new TestLambdaContext();
BotResponse response;
DwnQueueResponse videoToDownload;
DwnResultNotification notification;

// 1. Request anime that does not exist
// Should return Failed
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(-1, "AniDUB", 1, 2000000000000003), context);
Console.WriteLine(JsonConvert.SerializeObject(response));
Assert(response.Status == VideoStatus.NotAvailable, "1. Request anime that doesn't exist");

// 2. Request anime that exists but requested in first time
// Should add the anime with the Pending status, attach the user, add the anime to the queue, and return Pending
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(10686, "AniDUB", 0, 2000000000000003), context);
Console.WriteLine(JsonConvert.SerializeObject(response));
Assert(response.Status == VideoStatus.Pending, "2. Request anime that exists");

// 3. Request anime that exists and is already requested by the same user
// Should return Pending with no changes
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(10686, "AniDUB", 0, 2000000000000003), context);
Console.WriteLine(JsonConvert.SerializeObject(response));
Assert(response.Status == VideoStatus.Pending, "3. Request anime that exists");

// 4. Request anime that exists and is already requested by another user
// Should attach the user to the anime and return Pending
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(10686, "AniDUB", 0, 2000000000000004), context);
Console.WriteLine(JsonConvert.SerializeObject(response));
Assert(response.Status == VideoStatus.Pending, "4. Request anime that exists");

// 5. Get the video to download
// Should return the video to download
videoToDownload = await lambdaHandlers.GetVideoToDownloadAsync(context);
Console.WriteLine(JsonConvert.SerializeObject(videoToDownload));
Assert(videoToDownload.VideoKey is not null, "5. Get the video to download");

// 6. Response from the downloader that the video is downloaded
// Should update the status to Downloaded, attach the fileId, and notify the Bot
notification = new DwnResultNotification(10686, "AniDUB", 0, "FileId");
await lambdaHandlers.UpdateVideoStatusAsync(notification, context);
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(10686, "AniDUB", 0, 2000000000000003), context);
Console.WriteLine(response);
Assert(response.Status == VideoStatus.Downloaded, "6. Response from the downloader");

// 7. Request anime that exists and is already downloaded
// Should return Downloaded with fileId
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(10686, "AniDUB", 0, 2000000000000002), context);
Console.WriteLine(response);
Assert(response is { Status: VideoStatus.Downloaded, FileId: "FileId" }, "7. Request anime that exists");

// 8. Response from the downloader that the video failed to download
// Should update the status to Failed and notify the Bot
await lambdaHandlers.GetAnimeAsync(new BotRequest(37786, "AniDUB", 1, 2000000000000003), context);
await lambdaHandlers.GetAnimeAsync(new BotRequest(37786, "AniDUB", 1, 2000000000000004), context);
await lambdaHandlers.UpdateVideoStatusAsync(new DwnResultNotification(37786, "AniDUB", 1, null), context);
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(37786, "AniDUB", 1, 2000000000000003), context);
Console.WriteLine(response);
Assert(response.Status == VideoStatus.Failed, "8. Response from the downloader that the video failed to download");

// 9. Request anime that exists and is already failed
// Should return Failed
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(37786, "AniDUB", 1, 2000000000000003), context);
Console.WriteLine(response);
Assert(response.Status == VideoStatus.Failed, "9. Request anime that exists and is already failed");

// 10. Response from the downloader that the video failed to download, but with no attached users
// Should update the status to Failed and should not notify the Bot
await lambdaHandlers.GetAnimeAsync(new BotRequest(1, "AniDUB", 1, 2000000000000003), context);
await lambdaHandlers.UpdateVideoStatusAsync(new DwnResultNotification(37786, "AniDUB", 1, "FileId"), context);
await lambdaHandlers.UpdateVideoStatusAsync(new DwnResultNotification(37786, "AniDUB", 1, null), context);
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(37786, "AniDUB", 1, 2000000000000003), context);
Console.WriteLine(response);
Assert(
	response.Status == VideoStatus.Failed,
	"10. Response from the downloader that the video failed to download, but with no attached users");

// 11. Request anime that exists but the episode does not exist
// Should return NotAvailable
response = await lambdaHandlers.GetAnimeAsync(new BotRequest(10686, "AniDUB", 1, 2000000000000003), context);
Console.WriteLine(JsonConvert.SerializeObject(response));
Assert(response.Status == VideoStatus.NotAvailable, "11. Request anime that exists but the episode does not exist");

return;

static void Assert(bool condition, string message = "")
{
	if (!condition)
	{
		throw new Exception(message);
	}
}