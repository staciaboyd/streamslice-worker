import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function atempoFiltersForSpeed(speed) {
  // atempo supports 0.5..2 per filter; chain if needed
  if (!speed || speed === 1) return [];
  const filters = [];
  let s = speed;
  // Normalize common values (0.5, 2, 4)
  // For >2, chain 2x filters
  while (s > 2) {
    filters.push('atempo=2.0');
    s = s / 2;
  }
  while (s < 0.5) {
    // Speed <0.5: chain 0.5 and keep reducing
    filters.push('atempo=0.5');
    s = s / 0.5;
  }
  if (s !== 1) {
    filters.push(`atempo=${s.toFixed(4)}`);
  }
  return filters;
}

export async function exportWithFfmpeg({
  inputPath,
  regions,
  outPath,
  speed = 1,
  outputHeight = 1080,
  crf = 20,
  preset = 'veryfast',
  videoCodec = 'libx264',
  audioCodec = 'aac'
}) {
  if (!Array.isArray(regions) || regions.length === 0) {
    throw new Error('No regions found to export. Add a region first.');
  }

  // temp folder next to out
  const tmpDir = path.join(path.dirname(outPath), 'tmp_segments');
  await mkdir(tmpDir, { recursive: true });

  const segmentFiles = [];
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const start = Number(r.startSec ?? r.start ?? 0);
    const end = Number(r.endSec ?? r.end ?? 0);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new Error(`Invalid region at index ${i}: ${JSON.stringify(r)}`);
    }

    const segPath = path.join(tmpDir, `seg_${String(i).padStart(3, '0')}.mp4`);
    segmentFiles.push(segPath);

    const vf = outputHeight ? `scale=-2:${Math.min(1080, Math.max(144, Math.floor(outputHeight)))}` : null;
    const vFilters = [];
    if (vf) vFilters.push(vf);
    if (speed && speed !== 1) vFilters.push(`setpts=PTS/${speed}`);

    const aFilters = atempoFiltersForSpeed(speed);

    const args = [
      '-y',
      '-i', inputPath,
      '-ss', String(start),
      '-to', String(end)
    ];

    if (vFilters.length) args.push('-vf', vFilters.join(','));
    if (aFilters.length) args.push('-af', aFilters.join(','));

    args.push(
      '-c:v', videoCodec,
      '-preset', preset,
      '-crf', String(crf),
      '-c:a', audioCodec,
      '-movflags', '+faststart',
      segPath
    );

    await run('ffmpeg', args);
  }

  // concat via demuxer
  const concatList = segmentFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n';
  const listPath = path.join(tmpDir, 'concat.txt');
  await writeFile(listPath, concatList, 'utf8');

  const concatArgs = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    outPath
  ];

  await run('ffmpeg', concatArgs);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', (d) => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} exited with code ${code}\n${stderr}`));
    });
  });
}
