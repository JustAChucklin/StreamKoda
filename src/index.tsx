import { definePlugin, toaster } from "@decky/api";
import { ButtonItem, DropdownItem, PanelSection, PanelSectionRow, staticClasses } from "@decky/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaSatelliteDish } from "react-icons/fa";
import {
  applyDefaultStreamSelections,
  excludeApp,
  getStreamDefaultedApps,
  loadExcludedAppIds,
} from "./defaultStreamSelection";

interface RemotePlayDevice {
  clientId: string;
  clientName: string;
  status: string;
}

function useRemotePlayDevices(): RemotePlayDevice[] {
  const [devices, setDevices] = useState<RemotePlayDevice[]>([]);

  useEffect(() => {
    const registration = SteamClient.RemotePlay.RegisterForDevicesChanges((next) =>
      setDevices(next as unknown as RemotePlayDevice[]),
    );
    return () => registration.unregister();
  }, []);

  return devices;
}

// Mirrors the selected dropdown app outside React state. The QAM flyout
// appears to remount Content around dropdown interaction - a plain
// setSelectedAppId queued right as that happens gets silently discarded
// along with the unmounting instance (confirmed: our own "Selected: X"
// line, driven purely by React state, stayed stuck on the top item just
// like Steam's native dropdown label did). A synchronous assignment to a
// module-level variable isn't subject to that discard, and the next mount's
// lazy useState initializer picks it back up.
let persistedSelectedAppId: number | null = null;

function Content() {
  const devices = useRemotePlayDevices();
  const [lastApplied, setLastApplied] = useState<number | null>(null);
  const [streamedApps, setStreamedApps] = useState<{ appId: number; displayName: string }[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(() => persistedSelectedAppId);

  const refreshStreamedApps = () => {
    const apps = getStreamDefaultedApps();
    setStreamedApps(apps);
    const next = apps.some((a) => a.appId === persistedSelectedAppId)
      ? persistedSelectedAppId
      : (apps[0]?.appId ?? null);
    persistedSelectedAppId = next;
    setSelectedAppId(next);
  };

  useEffect(() => {
    refreshStreamedApps();
  }, []);

  // Stable reference across unrelated re-renders (e.g. useRemotePlayDevices
  // firing on background device events) so those don't reset an
  // in-progress pick.
  const dropdownOptions = useMemo(
    () => streamedApps.map((a) => ({ data: a.appId, label: a.displayName })),
    [streamedApps],
  );
  const onSelectStreamedApp = useCallback((option: { data: number }) => {
    persistedSelectedAppId = option.data;
    setSelectedAppId(option.data);
  }, []);

  const selectedApp = streamedApps.find((a) => a.appId === selectedAppId) ?? null;

  return (
    <PanelSection title="StreamKoda">
      <PanelSectionRow>
        <div style={{ fontSize: "0.8em", opacity: 0.8 }}>
          Games not installed locally but installed on another of these devices
          default to streaming from that device. Pick one below and hit Remove
          to keep it on local install - pressing Boop again brings it back if
          it's still remote-stream-eligible.
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: "0.8em" }}>
          {devices.length === 0
            ? "No other Remote Play devices online."
            : devices.map((d) => `${d.clientName} (${d.status})`).join(", ")}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => {
            const count = applyDefaultStreamSelections({ force: true });
            setLastApplied(count);
            refreshStreamedApps();
            toaster.toast({
              title: "StreamKoda",
              body: `Set stream as default for ${count} game(s).`,
            });
          }}
        >
          {lastApplied === null ? "Boop" : `Applied to ${lastApplied} game(s) - Re-Boop`}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <DropdownItem
          label="Streamed by default"
          rgOptions={dropdownOptions}
          selectedOption={selectedAppId}
          strDefaultLabel="No games streamed by default"
          onChange={onSelectStreamedApp}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: "0.8em", opacity: 0.8 }}>
          Selected: {selectedApp?.displayName ?? "none"}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={selectedApp === null}
          onClick={async () => {
            if (selectedApp === null) return;
            await excludeApp(selectedApp.appId);
            refreshStreamedApps();
            toaster.toast({
              title: "StreamKoda",
              body: `${selectedApp.displayName} will stay on local install until the next Boop.`,
            });
          }}
        >
          Remove
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  loadExcludedAppIds().then(() => applyDefaultStreamSelections());

  const deviceRegistration = SteamClient.RemotePlay.RegisterForDevicesChanges((devices) => {
    applyDefaultStreamSelections({ devices: devices as unknown as RemotePlayDevice[] });
  });

  // Deliberately NOT using SteamClient.Apps.RegisterForAppOverviewChanges
  // here: it's typed to return void, not an Unregisterable, so there is no
  // way to ever tear it down - every plugin reload (Decky hot-reloads on
  // every file write during dev) leaves another one permanently stacked.
  // Worse, SetStreamingClientForApp itself triggers that same event (each
  // one is a library-data change), so N stacked listeners each reacting by
  // calling SetStreamingClientForApp again is a real feedback loop - this
  // caused a genuine OOM crash (58GB+) during development. Confirmed via
  // live CDP test that a single call only fires the event once on its
  // own; the danger was purely the leaked/stacked listeners compounding
  // it. RegisterForDevicesChanges below is a real Unregisterable and is
  // only triggered by external device state, not by our own writes, so it
  // can't self-loop the same way.

  return {
    name: "StreamKoda",
    titleView: <div className={staticClasses.Title}>StreamKoda</div>,
    content: <Content />,
    icon: <FaSatelliteDish />,
    onDismount() {
      deviceRegistration.unregister();
    },
  };
});
