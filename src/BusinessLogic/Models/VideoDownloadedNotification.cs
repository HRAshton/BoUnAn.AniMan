using Bounan.Common.Models.Notifications;

namespace Bounan.AniMan.BusinessLogic.Models;

/// <inheritdoc />
internal record VideoDownloadedNotification(
    int MyAnimeListId,
    string Dub,
    int Episode,
    int? MessageId,
    ICollection<long> ChatIds)
    : IVideoDownloadedNotification;