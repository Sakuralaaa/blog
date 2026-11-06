/** What every settings section needs from the page: read and write one setting by key. */
export type SettingsFieldProps = {
  getVal: (key: string) => unknown
  getBoolVal: (key: string, defaultValue?: boolean) => boolean
  setVal: (key: string, value: unknown) => void
}
