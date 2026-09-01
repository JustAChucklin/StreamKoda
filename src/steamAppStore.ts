// window.appStore is Steam's internal MobX-backed library store. It isn't
// part of any documented decky/Steam API - @decky/ui only ships types for
// window.SteamClient, not this. The shape used here (m_mapApps as a MobX
// ObservableMap keyed by numeric appid) matches what MoonDeck's
// getAppStoreEx() uses in production:
// https://github.com/FrogTheFrog/moondeck/blob/master/src/steam-utils/getAppStoreEx.ts
//
// Field names below are confirmed live via CDP against a real running
// Steam client (window.appStore.m_mapApps.get(appid)), not just guessed
// from typings: there is no local_per_client_data field - the current
// machine's own entry is simply the per_client_data item with
// clientid "0" ("This machine"), sitting alongside the real remote clients.

export interface SteamAppOverviewClientData {
  clientid: string;
  client_name: string;
  installed?: boolean;
  is_available_on_current_platform: boolean;
}

export interface SteamAppOverview {
  appid: number;
  display_name: string;
  per_client_data: SteamAppOverviewClientData[];
  most_available_clientid: string;
}

interface AppStoreGlobal {
  m_mapApps: {
    get(appId: number): SteamAppOverview | undefined;
    keys(): IterableIterator<number>;
  };
}

function getAppStore(): AppStoreGlobal | null {
  return (window as unknown as { appStore?: AppStoreGlobal }).appStore ?? null;
}

export function getAppOverview(appId: number): SteamAppOverview | null {
  return getAppStore()?.m_mapApps.get(appId) ?? null;
}

export function getAllAppIds(): number[] {
  const store = getAppStore();
  return store ? Array.from(store.m_mapApps.keys()) : [];
}
