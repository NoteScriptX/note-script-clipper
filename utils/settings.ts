export const NSX_SETTINGS_KEY = "nsx_settings_v1"

export type NsXSettings = {
  loggedIn: boolean
  apiEndpoint: string
  defaultTableId: string
}

export const getSettings = async (): Promise<NsXSettings> => {
  const res = await chrome.storage.local.get(NSX_SETTINGS_KEY)
  const raw = res?.[NSX_SETTINGS_KEY]
  const base: NsXSettings = {
    loggedIn: true,
    apiEndpoint: "",
    defaultTableId: "tbl_123456"
  }
  if (!raw || typeof raw !== "object") return base
  const r = raw as Partial<NsXSettings>
  return {
    loggedIn: typeof r.loggedIn === "boolean" ? r.loggedIn : base.loggedIn,
    apiEndpoint: typeof r.apiEndpoint === "string" ? r.apiEndpoint : base.apiEndpoint,
    defaultTableId:
      typeof r.defaultTableId === "string" ? r.defaultTableId : base.defaultTableId
  }
}

export const setSettings = async (next: NsXSettings): Promise<void> => {
  await chrome.storage.local.set({
    [NSX_SETTINGS_KEY]: next
  })
}

export const patchSettings = async (
  patch: Partial<NsXSettings>
): Promise<NsXSettings> => {
  const cur = await getSettings()
  const next: NsXSettings = { ...cur, ...patch }
  await setSettings(next)
  return next
}
