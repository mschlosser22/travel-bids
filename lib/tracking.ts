// UTM Tracking & Session Management
// Phase 1 - Track users from ad click to booking

import Cookies from 'js-cookie'
import { v4 as uuidv4 } from 'uuid'

export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export interface SessionData extends UTMParams {
  session_id: string
  device_type: string
  created_at: string
}

// Cookie names
const SESSION_COOKIE = 'tb_session_id'
const UTM_COOKIE = 'tb_utm_params'

// Get or create session ID
export function getSessionId(): string {
  let sessionId = Cookies.get(SESSION_COOKIE)

  if (!sessionId) {
    sessionId = uuidv4()
    // Session expires in 30 days
    Cookies.set(SESSION_COOKIE, sessionId, { expires: 30 })
  }

  return sessionId
}

// Extract UTM parameters from URL
export function extractUTMParams(url: string): UTMParams {
  const urlParams = new URLSearchParams(new URL(url).search)

  return {
    utm_source: urlParams.get('utm_source') || undefined,
    utm_medium: urlParams.get('utm_medium') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || undefined,
    utm_term: urlParams.get('utm_term') || undefined,
    utm_content: urlParams.get('utm_content') || undefined,
  }
}

// Save UTM params to cookies (persist through booking funnel)
export function saveUTMParams(params: UTMParams): void {
  const existingUTM = Cookies.get(UTM_COOKIE)

  // Only save if we have new UTM params and no existing ones
  // (we want to preserve the original ad click attribution)
  if (!existingUTM && Object.values(params).some(val => val !== undefined)) {
    Cookies.set(UTM_COOKIE, JSON.stringify(params), { expires: 30 })
  }
}

// Get stored UTM params
export function getUTMParams(): UTMParams {
  const utmCookie = Cookies.get(UTM_COOKIE)

  if (utmCookie) {
    try {
      return JSON.parse(utmCookie)
    } catch {
      return {}
    }
  }

  return {}
}

// Get device type
export function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet'
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

// Get complete session data
export function getSessionData(): SessionData {
  return {
    session_id: getSessionId(),
    device_type: getDeviceType(),
    created_at: new Date().toISOString(),
    ...getUTMParams()
  }
}

// Initialize tracking on page load
export function initializeTracking(): void {
  if (typeof window === 'undefined') return

  // Extract and save UTM params from current URL
  const utmParams = extractUTMParams(window.location.href)
  saveUTMParams(utmParams)

  // Ensure session ID exists
  getSessionId()
}
