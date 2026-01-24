# StreamSlice Processor (Render Worker)

This service polls the `exports` table for rows with `status = 'queued'`.

For each job it:
1) Downloads the source video from Supabase Storage (bucket `SOURCES_BUCKET`).
2) Cuts/concats the requested regions with `ffmpeg`.
3) Uploads the mp4 to Supabase Storage (bucket `EXPORTS_BUCKET`).
4) Marks the row `status = 'done'` and writes `output_bucket` and `output_path`.
