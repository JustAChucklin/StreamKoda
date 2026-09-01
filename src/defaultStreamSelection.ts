import { getAllAppIds } from "./steamAppStore";
import { findStreamTarget, selectStreamTarget } from "./remoteStream";

// Apps we've already set a default stream selection for this session. Once
// set, we leave it alone - if the user manually switches an app back to
// "install locally" via Steam's own dropdown, we don't want to keep
// fighting that choice every time this re-scans. This is session-only
// (resets on Steam/plugin restart), which is an accepted tradeoff for not
// needing backend-persisted settings for v1.
const handledAppIds = new Set<number>();

/**
 * Scans the library for apps that are remote-stream-eligible (per
 * findStreamTarget) and, for any not already handled this session, selects
 * the remote client as their default streaming target - so Steam's own
 * action button already shows/does "Stream" instead of "Install" without
 * the user needing to open the dropdown manually.
 *
 * Pass `force: true` to re-apply even to apps already handled this
 * session (used by the manual "Apply now" QAM button).
 */
export function applyDefaultStreamSelections(options?: { force?: boolean }): number {
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
