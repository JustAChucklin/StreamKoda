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
    <PanelSection title="Remote Stream Button">
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
              title: "Remote Stream Button",
              body: `Set stream as default for ${count} game(s).`,
            });
          }}
        >
          {lastApplied === null ? "Apply now" : `Applied to ${lastApplied} game(s) - reapply`}
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  applyDefaultStreamSelections();

  const deviceRegistration = SteamClient.RemotePlay.RegisterForDevicesChanges(() => {
    applyDefaultStreamSelections();
  });

  // Fires on library data changes (a friend/other device finishing an
  // install, etc.) - the payload is a protobuf ArrayBuffer we don't need to
  // parse, it's just our cue to rescan for newly-eligible apps. Unlike the
  // other Register* calls here, this one's typed to return void, not an
  // Unregisterable - nothing to clean up on dismount.
  SteamClient.Apps.RegisterForAppOverviewChanges(() => {
    applyDefaultStreamSelections();
  });

  return {
    name: "Remote Stream Button",
    titleView: <div className={staticClasses.Title}>Remote Stream Button</div>,
    content: <Content />,
    icon: <FaSatelliteDish />,
    onDismount() {
      deviceRegistration.unregister();
    },
  };
});
