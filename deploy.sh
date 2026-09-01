#!/usr/bin/env bash
# Builds and deploys this plugin to a Decky Loader install on another
# machine over SSH (e.g. a real Steam Deck). Mirrors exactly what was done
# locally during development - no compiled backend, so the decky CLI
# isn't needed, just these four files.
#
# Usage: ./deploy.sh <ssh-host> [remote-plugins-dir]
#   ssh-host            required, e.g. deck@steamdeck.local or an SSH config alias
#   remote-plugins-dir   default: homebrew/plugins (relative to the ssh user's home)
#
# Prereqs on the target:
#   - Decky Loader installed and plugin_loader.service running
#   - SSH reachable (on a real Deck: Settings > System > enable Developer
#     Mode, then enable SSH and set a password/key)
#   - passwordless sudo, OR run this interactively so the remote sudo
#     prompt can be answered

set -euo pipefail

HOST="${1:?Usage: ./deploy.sh <ssh-host> [remote-plugins-dir]}"
REMOTE_PLUGINS_DIR="${2:-homebrew/plugins}"
PLUGIN_NAME="decky-remote-stream"
REMOTE_DIR="${REMOTE_PLUGINS_DIR}/${PLUGIN_NAME}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building..."
pnpm run build

echo "Deploying to ${HOST}:${REMOTE_DIR}..."
ssh "$HOST" "sudo mkdir -p ~/${REMOTE_DIR}/dist"
scp main.py plugin.json package.json "${HOST}:~/${REMOTE_DIR}/" >/dev/null
scp dist/index.js "${HOST}:~/${REMOTE_DIR}/dist/" >/dev/null
ssh "$HOST" "sudo chown -R root:root ~/${REMOTE_DIR} && sudo systemctl restart plugin_loader"

echo "Done. Check the plugin shows up in Decky's Quick Access Menu on ${HOST}."
