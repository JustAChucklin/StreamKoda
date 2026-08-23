#!/usr/bin/env bash
# Watches Steam's streaming log for Remote Play desktop-capture start/stop
# and temporarily switches the host's DP-2 output to a 16:10 mode (matching
# a Steam Deck OLED's aspect ratio) for the duration, reverting to native
# when the stream ends. See README.md for why this is needed.
set -euo pipefail

LOG="$HOME/.local/share/Steam/logs/streaming_log.txt"
OUTPUT="DP-2"
STREAM_MODE="1280x800@59.810"
NATIVE_MODE="2560x1440@179.952"

tail -n0 -F "$LOG" 2>/dev/null | while read -r line; do
	case "$line" in
	*">>> Started desktop stream"*)
		niri msg output "$OUTPUT" mode "$STREAM_MODE"
		;;
	*">>> Stopped desktop stream"*)
		niri msg output "$OUTPUT" mode "$NATIVE_MODE"
		;;
	esac
done
