import { definePlugin, toaster } from "@decky/api";
import { ButtonItem, PanelSection, PanelSectionRow, staticClasses } from "@decky/ui";
import { useEffect, useState } from "react";
import { FaSatelliteDish } from "react-icons/fa";
import { applyDefaultStreamSelections } from "./defaultStreamSelection";

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

function Content() {
  const devices = useRemotePlayDevices();
  const [lastApplied, setLastApplied] = useState<number | null>(null);

  return (
    <PanelSection title="StreamKoda">
      <PanelSectionRow>
        <div style={{ fontSize: "0.8em", opacity: 0.8 }}>
          Games not installed locally but installed on another of these devices
          default to streaming from that device - Steam's own streaming-target
          dropdown still lets you switch back to installing locally any time.
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
            toaster.toast({
              title: "StreamKoda",
              body: `Set stream as default for ${count} game(s).`,
            });
          }}
        >
          {lastApplied === null ? "Boop" : `Applied to ${lastApplied} game(s) - Re-Boop`}
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  applyDefaultStreamSelections();

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
