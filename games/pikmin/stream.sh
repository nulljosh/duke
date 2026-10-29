#!/bin/sh
# Streams Dolphin's window to Twitch: wincap (ScreenCaptureKit, works behind other windows) into ffmpeg, silent audio.
# The key lives only in /Volumes/LaCie/dolphin-duke/twitch.key (mode 600) and is redacted from the log.
cd "$(dirname "$0")"
KEY=$(cat /Volumes/LaCie/dolphin-duke/twitch.key)
./wincap | ffmpeg -hide_banner -loglevel warning -stats_period 30 \
  -f rawvideo -pix_fmt bgra -s 960x720 -r 30 -i - \
  -f lavfi -i anullsrc=r=44100:cl=stereo \
  -vf "pad=1280:720:160:0,format=yuv420p" -c:v h264_videotoolbox -b:v 3000k -maxrate 3000k -bufsize 6000k -g 60 \
  -c:a aac -b:a 64k -f flv "rtmp://live.twitch.tv/app/$KEY" 2>&1 | sed -u "s/$KEY/<key>/g" > stream.log
