/**
 * Guards the one place the app hands a URL to the OS browser (Help links, "where
 * to get your API key", etc.). Only http(s) is ever opened — never file:,
 * javascript:, or any custom scheme — so a bad link can't do anything but open a
 * web page in the user's own browser.
 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}
