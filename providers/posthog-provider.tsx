'use client'

// PostHog Analytics Provider
// Phase 1 - Initialize analytics and track page views

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'
import { initializeTracking, getSessionData } from '@/lib/tracking'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Initialize PostHog
    initPostHog()

    // Initialize UTM tracking
    initializeTracking()

    // Identify user with session data
    const sessionData = getSessionData()
    if (sessionData.session_id) {
      posthog.identify(sessionData.session_id, {
        device_type: sessionData.device_type,
        utm_source: sessionData.utm_source,
        utm_medium: sessionData.utm_medium,
        utm_campaign: sessionData.utm_campaign,
        utm_term: sessionData.utm_term,
        utm_content: sessionData.utm_content,
      })
    }
  }, [])

  useEffect(() => {
    // Track page view when route changes
    if (pathname) {
      let url = window.location.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
