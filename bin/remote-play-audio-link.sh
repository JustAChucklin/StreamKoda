#!/usr/bin/env bash
# Watches Steam's streaming log for Remote Play desktop-capture start and
# links EasyEffects' output (game audio post-EQ) into Steam's streaming
# sink. EasyEffects claims all game audio for local headphone EQ and
# outputs straight to hardware (useDefaultOutputDevice=false), so it never
# reaches Steam's capture on its own. See README.md for how this was
# diagnosed.
#
# No unlink on stop needed: Steam tears down steam-streaming-playback
# itself at stream end, which takes the links with it.
#
# Deliberately does NOT touch display resolution. An earlier version of
# this script also switched the host to a 16:10 mode while streaming
# (matching a Steam Deck OLED's aspect) - testing showed that switch was
# itself causing the letterboxing it was meant to fix (Steam's own
# capture-method churn getting triggered by the resolution change), and a
# static native resolution has no letterboxing at all. See README.md.
set -euo pipefail

LOG="$HOME/.local/share/Steam/logs/streaming_log.txt"
AUDIO_SRC="easyeffects_sink"
AUDIO_DST="steam-streaming-playback"

tail -n0 -F "$LOG" 2>/dev/null | while read -r line; do
	case "$line" in
	*">>> Starting desktop stream"*)
		pw-link "$AUDIO_SRC:monitor_FL" "$AUDIO_DST:playback_1" 2>/dev/null || true
		pw-link "$AUDIO_SRC:monitor_FR" "$AUDIO_DST:playback_2" 2>/dev/null || true
		;;
	esac
done
