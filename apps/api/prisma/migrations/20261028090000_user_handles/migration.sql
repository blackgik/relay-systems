-- AlterTable
ALTER TABLE "User" ADD COLUMN     "handle" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");


-- Give existing users a neutral placeholder handle. New accounts get a
-- generated word handle at sign-up, and anyone can rename theirs in settings.
UPDATE "User" SET "handle" = 'courier-' || substr(md5("id"), 1, 8) WHERE "handle" IS NULL;
