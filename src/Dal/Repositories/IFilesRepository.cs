using Bounan.AniMan.Dal.Entities;
using Bounan.Common.Models;

namespace Bounan.AniMan.Dal.Repositories;

public interface IFilesRepository
{
	Task<FileEntity?> GetAnimeAsync(IVideoKey videoKey);

	Task<FileEntity> AddAnimeAsync(IVideoKey videoKey);

	Task MarkAsDownloadedAsync(IVideoKey videoKey, string fileId);

	Task MarkAsFailedAsync(IVideoKey videoKey);

	Task AttachUserToAnimeAsync(IVideoKey videoKey, long requestChatId);

	Task<IVideoKey?> PopSignedLinkToDownloadAsync();
}