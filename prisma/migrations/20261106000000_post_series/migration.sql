-- Post series: posts sharing the same series name form an ordered collection.
ALTER TABLE "Post" ADD COLUMN "series" TEXT;
ALTER TABLE "Post" ADD COLUMN "seriesOrder" INTEGER;
CREATE INDEX "Post_series_seriesOrder_idx" ON "Post"("series", "seriesOrder");
