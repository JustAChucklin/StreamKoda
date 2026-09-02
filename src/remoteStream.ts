import { getAppOverview } from "./steamAppStore";

export interface StreamTarget {
  clientId: string;
  clientName: string;
}

/**
 * Mirrors the condition Steam itself uses to show the remote-play arrow:
 * not installed on this device, but installed (and platform-compatible) on
 * at least one other Steam machine tied to this account.
 *
 * Returns the client to stream from, or null if this app should behave
 * normally (locally installed, or not available anywhere else).
 */
const LOCAL_CLIENT_ID = "0";

export function findStreamTarget(appId: number): StreamTarget | null {
  const overview = getAppOverview(appId);
  if (!overview) return null;

  const local = overview.per_client_data?.find((c) => c.clientid === LOCAL_CLIENT_ID);
  if (local?.installed) return null;

  const candidates = (overview.per_client_data ?? []).filter(
    (client) =>
      client.installed === true &&
      client.is_available_on_current_platform &&
      client.clientid !== LOCAL_CLIENT_ID,
  );
  if (candidates.length === 0) return null;

  // Prefer whichever client Steam's own logic already considers the best
  // pick (most_available_clientid) when it's one of our installed
  // candidates; otherwise just take the first installed candidate.
  const preferred =
    candidates.find((c) => c.clientid === overview.most_available_clientid) ??
    candidates[0];

  return { clientId: preferred.clientid, clientName: preferred.client_name };
}

/**
 * Selects `target` as the app's streaming client - the same call Steam's
 * own streaming-target dropdown makes when you manually pick a device from
 * it. Once set, Steam's native action button already reads and acts on
 * this selection itself (shows "Stream", calls StreamGame on click) - we
 * don't need to touch the button or trigger the stream directly at all.
 * The dropdown stays fully native and functional, so switching back to a
 * local install later is just the normal Steam flow.
 */
export function selectStreamTarget(appId: number, target: StreamTarget): void {
  SteamClient.Apps.SetStreamingClientForApp(appId, target.clientId);
}

/**
 * Reverts `appId` back to the local-install target - the same effect as
 * picking "This machine" from Steam's own streaming-target dropdown. Used
 * when the user pulls a game off the stream-by-default list.
 */
export function clearStreamTarget(appId: number): void {
  SteamClient.Apps.SetStreamingClientForApp(appId, LOCAL_CLIENT_ID);
}
