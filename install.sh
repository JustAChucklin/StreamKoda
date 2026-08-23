#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"

# gamescope-session drop-in
GAMESCOPE_SRC_DIR="$REPO_DIR/systemd/gamescope-session.service.d"
GAMESCOPE_DEST_DIR="$CONFIG_HOME/systemd/user/gamescope-session.service.d"

mkdir -p "$GAMESCOPE_DEST_DIR"
cp -v "$GAMESCOPE_SRC_DIR/override.conf" "$GAMESCOPE_DEST_DIR/override.conf"

# niri output-mode watcher
mkdir -p "$HOME/.local/bin"
cp -v "$REPO_DIR/bin/remote-play-mode-watch.sh" "$HOME/.local/bin/remote-play-mode-watch.sh"
chmod +x "$HOME/.local/bin/remote-play-mode-watch.sh"

mkdir -p "$CONFIG_HOME/systemd/user"
cp -v "$REPO_DIR/systemd/remote-play-mode-watch.service" "$CONFIG_HOME/systemd/user/remote-play-mode-watch.service"

systemctl --user daemon-reload
systemctl --user enable --now remote-play-mode-watch.service

echo
echo "Installed."
echo
echo "gamescope-session drop-in (manual switch, only relevant inside the"
echo "gamescope session) - verify with:"
echo "  systemctl --user cat gamescope-session.service | grep DRM_MODE"
echo
echo "niri output-mode watcher (automatic, only relevant when Steam runs"
echo "under niri) - verify with:"
echo "  systemctl --user status remote-play-mode-watch.service"
