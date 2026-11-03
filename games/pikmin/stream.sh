#!/bin/bash
# Streams Dolphin to Twitch: wincap (ScreenCaptureKit, works behind other windows) for video, and the game's own sound
# from Dolphin's audio dump (Dolphin.ini [DSP] DumpAudio + DumpAudioSilent, so nothing plays on the Mac's speakers).
# The dump is two growing WAVs per boot: dspdump (sound effects, ~32 kHz) and dtkdump (streamed music, ~48 kHz).
# Each is tailed from its current end, aligned to a 4-byte stereo frame, and mixed.
# ponytail: the dump grows at emulation speed, so above 1x the sound runs ahead; fine for a watch stream.
# The key lives only in /Volumes/LaCie/dolphin-duke/twitch.key (mode 600) and is redacted from the log.
cd "$(dirname "$0")"
KEY=$(cat /Volumes/LaCie/dolphin-duke/twitch.key)
DUMP=/Volumes/LaCie/dolphin-duke/Dump/Audio
DSP=$(ls -t "$DUMP"/*dspdump.wav | head -1)
DTK=$(ls -t "$DUMP"/*dtkdump.wav | head -1)
FIFO=$(mktemp -d)
mkfifo "$FIFO/dsp" "$FIFO/dtk"
from() { local n; n=$(stat -f %z "$1"); echo $(( 44 + (n - 44) / 4 * 4 + 1 )); }
tail -c +"$(from "$DSP")" -f "$DSP" > "$FIFO/dsp" &
tail -c +"$(from "$DTK")" -f "$DTK" > "$FIFO/dtk" &
trap 'kill $(jobs -p) 2>/dev/null; rm -rf "$FIFO"' EXIT
./wincap | ffmpeg -hide_banner -loglevel warning -stats_period 30 \
  -f rawvideo -pix_fmt bgra -s 960x720 -r 30 -i - \
  -f s16le -ar 32028 -ac 2 -i "$FIFO/dsp" \
  -f s16le -ar 48042 -ac 2 -i "$FIFO/dtk" \
  -filter_complex "[0:v]pad=1280:720:160:0,format=yuv420p[v];[1:a]aresample=48000[a1];[2:a]aresample=48000[a2];[a1][a2]amix=inputs=2:duration=longest:normalize=0[a]" \
  -map "[v]" -map "[a]" -c:v h264_videotoolbox -b:v 3000k -maxrate 3000k -bufsize 6000k -g 60 \
  -c:a aac -b:a 128k -f flv "rtmp://live.twitch.tv/app/$KEY" 2>&1 | sed -u "s/$KEY/<key>/g" > stream.log
