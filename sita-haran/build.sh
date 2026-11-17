#!/bin/sh
# Rebuild "Sita Haran" from scratch: sh build.sh   (LIB = the Lemo-Opuscar library folder)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../lemo-opuscar" 2>/dev/null && pwd)}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
# mux.sh wants ffmpeg 7+; use a newer local build if the system one is older (see README)
[ -x "$HERE/bin/ffmpeg" ] && export PATH="$HERE/bin:$PATH"
sh "$HERE/tools/fonts.sh"
cd "$LIB"
PY="$LIB/.venv/bin/python"
$PY core/tts/tts.py "$HERE/lines.json" "$HERE/voices"                        # 1. Kokoro narrator (af_heart)
$PY core/tts/asr_check.py "$HERE/lines.json" "$HERE/voices" --lang en || echo "! speech check skipped or failed (needs a Whisper model from huggingface.co)"
node core/render/events.mjs "$HERE"                                          # 2. picture events -> events.json
$PY "$HERE/mix.py"                                                           # 3. score + ambience + foley + voice -> out/mix.wav
$PY "$HERE/tools/subs.py" && $PY core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_en.srt"   # 4. subtitles
node core/render/readcheck.mjs "$HERE"                                       # 5. on-screen text reading time
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"   # 6. frames
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/sita-haran.mp4" 24 0   # 7. mux, -14 LUFS, no grain
node core/render/still.mjs "$HERE" 66.5 --out "$HERE/out/still" --prefix po_ >/dev/null && cp "$HERE/out/still/po_66.5.jpg" "$HERE/poster.jpg"
