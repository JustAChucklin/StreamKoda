# stream-koda

Fix for no audio on Steam Remote Play sessions, on a Linux host running the
niri desktop with EasyEffects for local headphone EQ.

## Description
This host runs EasyEffects for headphone EQ (`easyeffects-xvfb` wrapper,
`hifiman` preset, output to a Schiit Modi 3 USB DAC). Its config
(`~/.config/easyeffects/db/easyeffectsrc`) has `useDefaultOutputDevice=false`
— it claims all game audio into `easyeffects_sink` and always outputs
straight to the DAC, never following whatever sink Steam sets as default
for capture. Confirmed live with `pactl list sink-inputs` / `pw-link -l`:
game audio was linked only to `easyeffects_sink`, never reaching Steam's
`steam-streaming-playback` capture sink — hence no sound on the Deck.

Moving the sink-input (`pactl move-sink-input`) didn't stick. Fix is a
parallel link instead of a move — PipeWire lets one source feed multiple
destinations, so EasyEffects keeps doing its local EQ'd output to the DAC
*and* the same audio also reaches the streaming sink:

```
pw-link easyeffects_sink:monitor_FL steam-streaming-playback:playback_1
pw-link easyeffects_sink:monitor_FR steam-streaming-playback:playback_2
```

`bin/remote-play-audio-link.sh` tails
`~/.local/share/Steam/logs/streaming_log.txt` for the
`>>> Starting desktop stream` marker Steam writes on Remote Play connect,
and runs those two links (best-effort, `steam-streaming-playback` only
exists once a stream is active). No unlink needed on stop — Steam tears the
sink down itself and takes the links with it.
`systemd/remote-play-audio-link.service` runs it as a niri-session user
service.

## Install

```
./install.sh
```

## Revert

```
systemctl --user disable --now remote-play-audio-link.service
rm ~/.config/systemd/user/remote-play-audio-link.service
rm ~/.local/bin/remote-play-audio-link.sh
systemctl --user daemon-reload
```

## Verify

```
systemctl --user status remote-play-audio-link.service
```
