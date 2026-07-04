import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CLIPS = [
  '01_cinematic_temples_aerial',
  '02_family_struggling_find_guruji',
  '03_app_puja_selection',
  '04_map_nearby_gurujis',
  '05_guruji_profile_card',
  '06_live_tracking_guruji',
  '07_guruji_arriving_home',
  '08_puja_happening_realistic',
  '09_ratings_payment_confirmation',
  '10_india_diyas_aerial',
  '11_scale_india_bookings',
  '12_closing_temple_spiritual',
];

const TITLES = [
  'SANATAN GURUJI  -  One Stop Spiritual Solution',
  'The Problem: Finding a Trusted Guruji Takes Days',
  'Step 1: Open App, Choose Your Puja and Location',
  'Step 2: See Verified Gurujis Near You on the Map',
  'Step 3: View Guruji Profile, Ratings and Specializations',
  'Step 4: Booking Confirmed - Track Guruji Live on Map',
  'Step 5: Guruji Arrives at Your Door',
  'Your Puja, Performed with Love and Authenticity',
  'Rate Your Guruji. Payment Instant via UPI.',
  '110 Crore Hindus. Millions of Pujas Every Year.',
  'Scaling Across India - One Booking at a Time',
  'sanatanguruji.com  -  Every Family. Every Puja.',
];

fs.mkdirSync('/tmp/sg_final', { recursive: true });

function getDuration(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', filePath
  ]);
  return parseFloat(result.stdout.toString().trim());
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    console.error(`FAILED: ${cmd} ${args.slice(0, 4).join(' ')}...`);
    console.error(r.stderr.toString().slice(-300));
    return false;
  }
  return true;
}

for (let i = 0; i < CLIPS.length; i++) {
  const idx = String(i + 1).padStart(2, '0');
  const clipName = CLIPS[i];
  const title = TITLES[i];
  const vidSrc = `attached_assets/generated_videos/${clipName}.mp4`;
  const voSrc  = `attached_assets/generated_audio/v${idx}.mp3`;
  const bgMus  = `attached_assets/generated_audio/bg_music.mp3`;
  const outFile = `/tmp/sg_final/clip_${idx}.mp4`;

  const voDur = getDuration(voSrc);
  const totalDur = (voDur + 0.4).toFixed(3);
  const fadeOutSt = (parseFloat(totalDur) - 0.8).toFixed(3);

  console.log(`Processing clip ${idx}: ${voDur.toFixed(2)}s → total ${totalDur}s`);

  const ok = run('ffmpeg', [
    '-y',
    '-stream_loop', '-1', '-i', vidSrc,
    '-i', voSrc,
    '-i', bgMus,
    '-filter_complex', [
      `[0:v]scale=1280:720:force_original_aspect_ratio=decrease,`,
      `pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,`,
      `drawbox=x=0:y=605:w=1280:h=115:color=black@0.72:t=fill,`,
      `drawtext=text='${title}':fontcolor=0xFFD580:fontsize=28:x=(w-text_w)/2:y=628:shadowcolor=black:shadowx=2:shadowy=2,`,
      `drawtext=text='sanatanguruji.com':fontcolor=0xE85D04:fontsize=16:x=(w-text_w)/2:y=676:shadowcolor=black:shadowx=1:shadowy=1,`,
      `fade=t=in:st=0:d=0.4,fade=t=out:st=${fadeOutSt}:d=0.6,`,
      `trim=duration=${totalDur}[v];`,
      `[1:a]apad=pad_dur=1[vo];`,
      `[2:a]aloop=loop=-1:size=2000000000,atrim=duration=${totalDur},volume=0.18[bg];`,
      `[vo][bg]amix=inputs=2:duration=first[a]`,
    ].join(''),
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-t', totalDur,
    outFile,
  ]);

  console.log(ok ? `  ✓ Done` : `  ✗ Failed`);
}

// Build concat list and stitch final video
const concatTxt = CLIPS.map((_, i) => {
  const idx = String(i + 1).padStart(2, '0');
  return `file '/tmp/sg_final/clip_${idx}.mp4'`;
}).join('\n');
fs.writeFileSync('/tmp/sg_final/concat.txt', concatTxt);

console.log('\nStitching final video...');
const final = run('ffmpeg', [
  '-y', '-f', 'concat', '-safe', '0', '-i', '/tmp/sg_final/concat.txt',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '128k',
  'attached_assets/SanatanGuruji_PitchVideo_v3_audio.mp4',
]);

if (final) {
  const { size } = fs.statSync('attached_assets/SanatanGuruji_PitchVideo_v3_audio.mp4');
  console.log(`\n✅ Final video: ${(size / 1024 / 1024).toFixed(1)} MB`);
} else {
  console.log('Final stitch failed');
}
