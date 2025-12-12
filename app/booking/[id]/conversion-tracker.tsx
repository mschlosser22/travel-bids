'use client'

import { useEffect } from 'react'

interface ConversionTrackerProps {
  bookingId: string
  totalAmount: number
  currency: string
}

declare global {
  interface Window {
    gtag?: (command: string, ...args: any[]) => void
  }
}

export function ConversionTracker({ bookingId, totalAmount, currency }: ConversionTrackerProps) {
  useEffect(() => {
    // Track conversion with Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: bookingId,
        value: totalAmount,
        currency: currency,
        items: [{
          item_id: bookingId,
          item_name: 'Hotel Booking',
        }]
      })

      // Track Google Ads conversion if configured
      const adsConversionLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL
      if (adsConversionLabel) {
        window.gtag('event', 'conversion', {
          send_to: adsConversionLabel,
          value: totalAmount,
          currency: currency,
          transaction_id: bookingId,
        })
      }
    }

    // Track Meta/Facebook pixel if configured
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Purchase', {
        value: totalAmount,
        currency: currency,
      })
    }
  }, [bookingId, totalAmount, currency])

  return null
}
