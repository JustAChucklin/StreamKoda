import decky


class Plugin:
    # All of this plugin's logic lives in the frontend (src/) via
    # SteamClient calls - no privileged backend work needed, so this file is
    # just the lifecycle stub decky-loader requires.

    async def _main(self):
        decky.logger.info("StreamKoda loaded")

    async def _unload(self):
        decky.logger.info("StreamKoda loaded")

    async def _uninstall(self):
        pass
