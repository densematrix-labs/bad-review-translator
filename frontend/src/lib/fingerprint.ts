/**
 * Device fingerprint for anonymous token binding.
 */
import FingerprintJS from '@fingerprintjs/fingerprintjs'

let cachedVisitorId: string | null = null

export async function getDeviceId(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId

  try {
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    cachedVisitorId = result.visitorId
    return cachedVisitorId
  } catch {
    // Fallback to localStorage-based ID
    const fallbackId =
      localStorage.getItem('device_id') ||
      `fallback_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem('device_id', fallbackId)
    return fallbackId
  }
}
