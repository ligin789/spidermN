#!/usr/bin/env bash
# Pre-renders the final greeting so every browser hears the same voice.
# Uses the macOS speech engine; swap in your own recording at
# public/audio/happy-birthday-ray-baby.wav (or .mp3, see src/config/party.ts).
set -euo pipefail
cd "$(dirname "$0")/.."
VOICE="${VOICE:-Daniel}"
OUT=public/audio/happy-birthday-ray-baby.wav
TMP="$(mktemp -d)"
say -v "$VOICE" -r 168 -o "$TMP/voice.aiff" "[[pbas +4]] [[pmod +30]] Happy Birthday, [[slnc 60]] [[emph +]] Ray [[slnc 20]] Baby!"
afconvert -f WAVE -d LEI16@44100 -c 1 "$TMP/voice.aiff" "$OUT"
rm -rf "$TMP"
afinfo "$OUT" | grep -E "duration|format"
