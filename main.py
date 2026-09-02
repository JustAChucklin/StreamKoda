import json
import os

import decky

# Apps the user has explicitly pulled back to local install - persisted so
# the plugin never re-defaults them to streaming again, including across
# Steam restarts, until the user presses "Boop" again (which clears this
# list entirely - see clear_excluded_app_ids). Frontend logic (src/)
# reads/writes this via the calls below.
SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "excluded_apps.json")


def _load_excluded_app_ids() -> list[int]:
    try:
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f).get("excluded_app_ids", [])
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _save_excluded_app_ids(app_ids: list[int]) -> None:
    with open(SETTINGS_FILE, "w") as f:
        json.dump({"excluded_app_ids": app_ids}, f)


class Plugin:
    async def _main(self):
        decky.logger.info("StreamKoda loaded")

    async def _unload(self):
        decky.logger.info("StreamKoda unloaded")

    async def _uninstall(self):
        pass

    async def get_excluded_app_ids(self) -> list[int]:
        return _load_excluded_app_ids()

    async def exclude_app(self, app_id: int) -> list[int]:
        excluded = _load_excluded_app_ids()
        if app_id not in excluded:
            excluded.append(app_id)
            _save_excluded_app_ids(excluded)
        return excluded

    async def clear_excluded_app_ids(self) -> list[int]:
        _save_excluded_app_ids([])
        return []
