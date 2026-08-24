#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"

mkdir -p "$HOME/.local/bin"
cp -v "$REPO_DIR/bin/remote-play-audio-link.sh" "$HOME/.local/bin/remote-play-audio-link.sh"
chmod +x "$HOME/.local/bin/remote-play-audio-link.sh"

mkdir -p "$CONFIG_HOME/systemd/user"
cp -v "$REPO_DIR/systemd/remote-play-audio-link.service" "$CONFIG_HOME/systemd/user/remote-play-audio-link.service"

systemctl --user daemon-reload
systemctl --user enable --now remote-play-audio-link.service

echo
echo "Installed. Verify with:"
echo "  systemctl --user status remote-play-audio-link.service"
