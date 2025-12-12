'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

interface MetaPixelProps {
  pixelId: string
}

declare global {
  interface Window {
    fbq: (command: string, ...args: any[]) => void
    _fbq: any
  }
}

export function MetaPixel({ pixelId }: MetaPixelProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pixelId || typeof window === 'undefined') return

    // Track page views on route change
    window.fbq?.('track', 'PageView')
  }, [pathname, searchParams, pixelId])

  if (!pixelId) return null

  return (
    <>
      <script
        id="facebook-pixel"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  )
}

// Helper function to track custom events
export function trackMetaEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, eventParams)
  }
}
