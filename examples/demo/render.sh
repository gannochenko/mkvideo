#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Rendering video project..."
echo ""

ffmpeg \
  -y \
  -i ./images/20251224_110757.jpg \
  -i ./effects/digital_glitch_01.mp4 \
  -i ./input/20251224_110901.mp4 \
  -i ./audio/instrumental-acoustic-guitar-music-401434.mp3 \
  -filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fade=t=out:st=4:d=1[s0f0];
   [1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p[s0f1];
   [2:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p[s0f2];
   [1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p[s0f3];
   [2:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p[s0f4];
   color=c=black:s=1920x1080:r=30:d=3[s0f5];
   [s0f0][s0f2][s0f4][s0f5]concat=n=4:v=1:a=0[seq0_base];
   [seq0_base][s0f1]overlay=(W-w)/2:0:enable='between(t,4.5,9.5)'[seq0_overlay0];
   [seq0_overlay0][s0f3]overlay=(W-w)/2:0:enable='between(t,9.5,14.5)'[seq0]" \
  -map \
  [seq0] \
  -r \
  30 \
  -s \
  1920x1080 \
  -c:v \
  libx264 \
  -preset \
  medium \
  -crf \
  23 \
  ./output/for_youtube.mp4

echo ""
echo "✓ Render complete! Output: ./output/for_youtube.mp4"
