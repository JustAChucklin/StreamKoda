import { getAllAppIds, getAppOverview } from "./steamAppStore";
import { findStreamTarget, selectStreamTarget, clearStreamTarget } from "./remoteStream";
import { callable } from "@decky/api";

interface RemotePlayDeviceStatus {
  clientId: string;
  status: string;
}

const getExcludedAppIdsFromBackend = callable<[], number[]>("get_excluded_app_ids");
const excludeAppOnBackend = callable<[appId: number], number[]>("exclude_app");
const clearExcludedAppIdsOnBackend = callable<[], number[]>("clear_excluded_app_ids");

// Apps we've already set a default stream selection for this session. Once
// set, we leave it alone - if the user manually switches an app back to
// "install locally" via Steam's own dropdown, we don't want to keep
// fighting that choice every time this re-scans. This is session-only:
// it resets on Steam/plugin restart, and also whenever the Remote Play
// device list actually changes (see noteDeviceStatuses) - Steam silently
// resets an app's streaming-client selection back to "Install" when its
// remote device drops offline (Deck sleep, the other machine restarting
// Steam, etc), so staying "handled" across a reconnect would leave games
// stuck on Install with nothing to fix them but the manual "Boop" button.
const handledAppIds = new Set<number>();
const lastKnownDeviceStatus = new Map<string, string>();

// Apps the user has explicitly pulled back to local install via "Remove"
// in the QAM panel - persisted on the backend (main.py) so it survives
// Steam restarts, not just this session, but is NOT permanent: pressing
// "Boop" again clears this list entirely and re-scans from scratch (see
// applyDefaultStreamSelections' `force` handling), so anything still
// remote-stream-eligible comes right back. Loaded once at startup;
// applyDefaultStreamSelections is a no-op until that load completes, so we
// never risk re-streaming something the user excluded before we knew
// about it.
const excludedAppIds = new Set<number>();
let excludedAppIdsLoaded = false;

/** Loads the persisted exclusion list. Call once at plugin startup. */
export async function loadExcludedAppIds(): Promise<void> {
  const ids = await getExcludedAppIdsFromBackend();
  excludedAppIds.clear();
  for (const id of ids) excludedAppIds.add(id);
  excludedAppIdsLoaded = true;
}

/**
 * Opts `appId` out of the stream-by-default behavior until the next
 * "Boop": reverts it to the local-install target right away and persists
 * the exclusion so no automatic scan - including after a Steam restart -
 * re-applies streaming to it. A forced re-scan (Boop) still clears this.
 */
export async function excludeApp(appId: number): Promise<void> {
  excludedAppIds.add(appId);
  handledAppIds.delete(appId);
  clearStreamTarget(appId);
  await excludeAppOnBackend(appId);
}

/**
 * Games currently defaulted to stream, for display/removal in the QAM
 * panel - derived from what's actually been applied this session, minus
 * anything excluded since.
 */
export function getStreamDefaultedApps(): { appId: number; displayName: string }[] {
  const apps: { appId: number; displayName: string }[] = [];
  for (const appId of handledAppIds) {
    if (excludedAppIds.has(appId)) continue;
    const overview = getAppOverview(appId);
    apps.push({ appId, displayName: overview?.display_name ?? `App ${appId}` });
  }
  return apps;
}

/**
 * Feeds in the latest Remote Play device list so any real change - a
 * device's status flipping (offline -> online after a sleep/wake cycle or
 * a Steam restart on the other machine), or a device dropping out of the
 * list entirely and coming back - clears the "already handled" memory
 * above. The next scan then re-applies instead of trusting a selection
 * that may have been silently reset in the meantime.
 */
function noteDeviceStatuses(devices: RemotePlayDeviceStatus[]): void {
  const nextStatus = new Map(devices.map((d) => [d.clientId, d.status]));

  let changed = nextStatus.size !== lastKnownDeviceStatus.size;
  if (!changed) {
    for (const [clientId, status] of nextStatus) {
      if (lastKnownDeviceStatus.get(clientId) !== status) {
        changed = true;
        break;
      }
    }
  }

  lastKnownDeviceStatus.clear();
  for (const [clientId, status] of nextStatus) lastKnownDeviceStatus.set(clientId, status);

  if (changed) handledAppIds.clear();
}

/**
 * Scans the library for apps that are remote-stream-eligible (per
 * findStreamTarget) and, for any not already handled this session, selects
 * the remote client as their default streaming target - so Steam's own
 * action button already shows/does "Stream" instead of "Install" without
 * the user needing to open the dropdown manually. Apps in the persisted
 * exclusion list (see excludeApp) are skipped by automatic scans.
 *
 * Pass `force: true` for a full reset (used by the manual "Boop" QAM
 * button): re-applies even to apps already handled this session, AND
 * clears the entire exclusion list first, so anything previously removed
 * comes back if it's still remote-stream-eligible. Pass `devices` on every
 * RegisterForDevicesChanges callback so a real change can clear the
 * handled memory - see noteDeviceStatuses.
 */
export function applyDefaultStreamSelections(options?: {
  force?: boolean;
  devices?: RemotePlayDeviceStatus[];
}): number {
  if (!excludedAppIdsLoaded) return 0;
  if (options?.devices) noteDeviceStatuses(options.devices);

  if (options?.force && excludedAppIds.size > 0) {
    excludedAppIds.clear();
    clearExcludedAppIdsOnBackend().catch(() => {});
  }

  let applied = 0;
  for (const appId of getAllAppIds()) {
    if (excludedAppIds.has(appId)) continue;
    if (!options?.force && handledAppIds.has(appId)) continue;

    const target = findStreamTarget(appId);
    if (!target) continue;

    selectStreamTarget(appId, target);
    handledAppIds.add(appId);
    applied++;
  }
  return applied;
}
