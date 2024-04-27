// Allows to migrate database.

using Bounan.AniMan.Migrator.Migrations.ReplaceFileIdWithMessageId;

var migration = new ReplaceFileIdWithMessageIdMigration();
await migration.Run();