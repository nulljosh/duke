#!/bin/sh
# Starts the headless player detached. Frames go to ffmpeg, which serves them to OBS
# as an MPEG-TS feed on udp://127.0.0.1:9000 (OBS: Media Source, input udp://127.0.0.1:9000).
cd "$(dirname "$0")"
ROM="${ROM:-$HOME/roms/sapphire/Pokemon - Sapphire Version (U) (V1.1).gba}"
nohup sh -c "./gba \"$ROM\" 2>gba.log | ffmpeg -loglevel error -f rawvideo -pix_fmt rgb0 -s 240x160 -r 60 -i - \
  -vf scale=720:480:flags=neighbor -c:v libx264 -preset veryfast -tune zerolatency -g 120 \
  -f mpegts udp://127.0.0.1:9000 2>ffmpeg.log" >/dev/null 2>&1 &
echo $! > gba.pid
