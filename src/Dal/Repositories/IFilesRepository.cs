using Bounan.AniMan.Dal.Entities;
using Bounan.Common.Models;

namespace Bounan.AniMan.Dal.Repositories;

public interface IFilesRepository
{
    Task<FileEntity?> GetAnimeAsync(IVideoKey videoKey);

    Task<(bool Added, FileEntity Entity)> AddAnimeAsync(IVideoKey videoKey);

    Task MarkAsDownloadedAsync(IVideoKey videoKey, int messageId);

    Task MarkAsFailedAsync(IVideoKey videoKey);

    Task AttachUserToAnimeAsync(IVideoKey videoKey, long requestChatId);

    Task<IVideoKey?> PopSignedLinkToDownloadAsync();

    Task UpdateScenesAsync(IVideoKey videoKey, Scenes scenes);
}