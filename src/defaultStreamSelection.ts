import { getAllAppIds } from "./steamAppStore";
import { findStreamTarget, selectStreamTarget } from "./remoteStream";

interface RemotePlayDeviceStatus {
  clientId: string;
  status: string;
}

// Apps we've already set a default stream selection for this session. Once
// set, we leave it alone - if the user manually switches an app back to
// "install locally" via Steam's own dropdown, we don't want to keep
// fighting that choice every time this re-scans. This is session-only:
// it resets on Steam/plugin restart, and also whenever a Remote Play
// device's status actually changes (see noteDeviceStatuses) - Steam
// silently resets an app's streaming-client selection back to "Install"
// when its remote device drops offline (Deck sleep, the other machine
// restarting Steam, etc), so staying "handled" across a reconnect would
// leave games stuck on Install with nothing to fix them but the manual
// "Boop" button.
const handledAppIds = new Set<number>();
const lastKnownDeviceStatus = new Map<string, string>();

/**
 * Feeds in the latest Remote Play device list so a status change (e.g.
 * offline -> online after a sleep/wake cycle or a Steam restart on the
 * other machine) clears the "already handled" memory above - the next
 * scan then re-applies instead of trusting a selection that may have been
 * silently reset in the meantime.
 */
function noteDeviceStatuses(devices: RemotePlayDeviceStatus[]): void {
  let changed = false;
  for (const device of devices) {
    if (lastKnownDeviceStatus.get(device.clientId) !== device.status) {
      changed = true;
      lastKnownDeviceStatus.set(device.clientId, device.status);
    }
  }
  if (changed) handledAppIds.clear();
}

/**
 * Scans the library for apps that are remote-stream-eligible (per
 * findStreamTarget) and, for any not already handled this session, selects
 * the remote client as their default streaming target - so Steam's own
 * action button already shows/does "Stream" instead of "Install" without
 * the user needing to open the dropdown manually.
 *
 * Pass `force: true` to re-apply even to apps already handled this
 * session (used by the manual "Apply now" QAM button). Pass `devices` on
 * every RegisterForDevicesChanges callback so a real status change can
 * clear the handled memory - see noteDeviceStatuses.
 */
export function applyDefaultStreamSelections(options?: {
  force?: boolean;
  devices?: RemotePlayDeviceStatus[];
}): number {
  if (options?.devices) noteDeviceStatuses(options.devices);

  let applied = 0;
  for (const appId of getAllAppIds()) {
    if (!options?.force && handledAppIds.has(appId)) continue;

    const target = findStreamTarget(appId);
    if (!target) continue;

    selectStreamTarget(appId, target);
    handledAppIds.add(appId);
    applied++;
  }
  return applied;
}
