# stream-koda

Temporary fix for Steam Remote Play not matching resolution/aspect ratio to a 16:10
Steam Deck OLED client, on a Linux host normally running the niri desktop
 > * This is a temporary fix until valve can add dynamic switching to their game mode.

## niri output-mode watcher (automatic)

Steam is run as a normal app under niri (not the gamescope session) for
day-to-day play. niri has a clean, scriptable, *temporary* output mode
command — no config file changes, no restart needed:

```
niri msg output DP-2 mode "1280x800@59.810"   # switch
niri msg output DP-2 mode "2560x1440@179.952" # revert
```

`bin/remote-play-mode-watch.sh` tails
`~/.local/share/Steam/logs/streaming_log.txt` for the
`>>> Started desktop stream` / `>>> Stopped desktop stream` markers Steam
writes on Remote Play connect/disconnect, and runs the switch/revert above in
response. `systemd/remote-play-mode-watch.service` runs it as a niri-session
user service. Confirmed end-to-end on 2026-08-23: appending the marker lines
to the log directly triggers a real mode change (verified with
`niri msg outputs`), and reverts on the stop marker.

This means: play locally at full `2560x1440`, and the moment a Remote Play
client connects, the host drops to `1280x800` (matching the Deck's aspect)
for the stream and pops back to native the moment it disconnects — no manual
steps.

Caveats:
- Hardcodes the output name (`DP-2`) and both modes for this monitor —
  intentionally not generalized; check `niri msg outputs` and adjust the
  script if you're adapting this to a different monitor/GPU.
- The monitor briefly blanks/flickers during the mode switch, same as any
  resolution change. If that's a problem (e.g. you're doing something else
  on this screen while a Remote Play session elsewhere is active), see "Idea
  not yet pursued: dedicated dummy-plug output" below.


## Install

```
./install.sh
```

Installs both fixes:
- the niri output-mode watcher (`bin/remote-play-mode-watch.sh` +
  `systemd/remote-play-mode-watch.service`), enabled and started immediately
- the gamescope-session `DRM_MODE=cvt` drop-in, for the fallback path above

## Revert

```
systemctl --user disable --now remote-play-mode-watch.service
rm ~/.config/systemd/user/remote-play-mode-watch.service
rm ~/.local/bin/remote-play-mode-watch.sh

rm ~/.config/systemd/user/gamescope-session.service.d/override.conf
systemctl --user daemon-reload
```

## Verify

```
systemctl --user status remote-play-mode-watch.service
systemctl --user cat gamescope-session.service | grep DRM_MODE
```
