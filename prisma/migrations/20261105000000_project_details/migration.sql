-- Work detail pages: optional slug, role, period, tags, gallery and Markdown body.
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;
ALTER TABLE "Project" ADD COLUMN "role" TEXT;
ALTER TABLE "Project" ADD COLUMN "period" TEXT;
ALTER TABLE "Project" ADD COLUMN "tags" TEXT;
ALTER TABLE "Project" ADD COLUMN "gallery" TEXT;
ALTER TABLE "Project" ADD COLUMN "content" TEXT;
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
