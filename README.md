# decky-remote-stream

Decky Loader plugin for the Steam Deck's Big Picture / gamescope UI. For any
game that's **not installed locally but is installed on another of your
Steam machines**, it sets that other machine as the app's default streaming
target - so Steam's own native action button already shows/does "Stream"
instead of "Install", without needing to open the streaming-target dropdown
manually every time.

## How it works

`src/defaultStreamSelection.ts::applyDefaultStreamSelections` scans the
library (`window.appStore.m_mapApps`, Steam's internal MobX store) for apps
where `src/remoteStream.ts::findStreamTarget` returns a match - not
installed on this device (`per_client_data` has no `clientid: "0"` entry
with `installed: true`), but installed and platform-compatible on some
other client. For each match it calls
`SteamClient.Apps.SetStreamingClientForApp(appId, clientId)` - the exact
same call Steam's own streaming-target dropdown makes when you manually
pick a device from it.

That's the whole mechanism. No DOM patching, no button hunting: Steam's own
UI already knows how to render and handle a "streaming target selected"
app correctly (label, icon, click behavior, gamepad navigation), because
this is the same state its own dropdown produces. The dropdown itself is
never touched, so switching a given game back to "install locally" later
(e.g. once it works well enough on the Deck) is just the normal Steam flow.

This runs at plugin load, and again whenever the Remote Play device list
changes or Steam's library data changes
(`RegisterForAppOverviewChanges`). Each app is only auto-selected **once
per session** (`defaultStreamSelection.ts`'s `handledAppIds` set) - if you
manually switch an app back to local install via the dropdown, the plugin
won't re-fight that choice on its own for the rest of the session. The QAM
panel's "Apply now" button force-reapplies to every currently-eligible app
if you want to override that.

### Earlier approaches, abandoned

Two prior designs were built and tested live before landing on this one -
worth knowing if picking this back up:

- **DOM button relabeling/hijacking** - found and patched the real
  Install button's DOM node in place (confirmed live: it's not a
  `<button>`, it's a `<div>` holding a direct text node, wrapped in a
  `Focusable` ancestor div; the icon is a nested `<svg fill="currentColor">`
  - note `SVGElement.tagName` is lowercase `"svg"`, unlike HTMLElement's
    uppercase, a footgun that silently broke an early icon-hiding check).
  Worked functionally, but fighting Steam's own focus-highlight styling and
  pseudo-element icons was fragile and looked inconsistent with native UI.
- **Inserting a second button** - left Install alone and inserted a new
  Stream button before it. Technically worked but wasn't what was wanted:
  the goal was one native-looking button whose default action is Stream,
  not two buttons.

Both are preserved in git history if DOM-level control is ever needed
again (e.g. if `SetStreamingClientForApp` alone stops being sufficient).

## Known unknowns

- `StreamGame`'s third argument, and `StreamGame` itself, are no longer
  called by this plugin at all - Steam's own button calls it once you
  click, using whatever `SetStreamingClientForApp` last selected.
- `SteamAppOverview` field names (`per_client_data`, `most_available_clientid`)
  were confirmed live via CDP against a real running Steam client
  (`window.appStore.m_mapApps.get(appid)`), not just guessed from typings -
  see `src/steamAppStore.ts`'s comments.
- The "handled once per session" behavior means a fresh Steam/plugin
  restart re-applies the stream default even to apps you'd manually
  switched back to local install. No backend persistence yet to remember
  that across restarts.

## Setup

Standard [decky-plugin-template](https://github.com/SteamDeckHomebrew/decky-plugin-template)
workflow:

```
pnpm i
pnpm run build
```

Then deploy via the VS Code `builddeploy` task (needs `.vscode/config.sh`
run once to set your Deck's IP/user/key) or manually per the [decky wiki](https://wiki.deckbrew.xyz/en/user-guide/home#plugin-development).
