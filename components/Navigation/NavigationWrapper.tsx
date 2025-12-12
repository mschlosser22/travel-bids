'use client'

import { usePathname } from 'next/navigation'
import Navigation, { NavigationVariant, User } from './index'

interface NavigationWrapperProps {
  user: User | null
}

export default function NavigationWrapper({ user }: NavigationWrapperProps) {
  const pathname = usePathname()

  // Determine navigation variant based on current route
  const getNavigationVariant = (): NavigationVariant => {
    // Dashboard pages
    if (pathname?.startsWith('/dashboard')) {
      return 'dashboard'
    }

    // Search results pages
    if (pathname?.startsWith('/search/')) {
      return 'search'
    }

    // Hotel details pages
    if (pathname?.startsWith('/hotel/')) {
      return 'hotel'
    }

    // Booking/checkout pages
    if (pathname?.startsWith('/book/')) {
      return 'checkout'
    }

    // Booking confirmation, login, and all other pages use minimal
    return 'minimal'
  }

  // Extract search params from URL if on search/hotel pages
  const getSearchParams = () => {
    if (!pathname) return undefined

    // Search page: /search/[city]/[checkIn]/[checkOut]/[guestsRooms]
    const searchMatch = pathname.match(/^\/search\/([^/]+)\/([^/]+)\/([^/]+)\/(\d+)-guests-(\d+)-rooms/)
    if (searchMatch) {
      return {
        city: decodeURIComponent(searchMatch[1]),
        checkIn: searchMatch[2],
        checkOut: searchMatch[3],
        guests: parseInt(searchMatch[4]),
      }
    }

    // Hotel page: extract from query params (would need useSearchParams for this)
    // For now, return undefined and let the navigation handle it
    return undefined
  }

  const variant = getNavigationVariant()
  const searchParams = getSearchParams()

  return <Navigation variant={variant} user={user} searchParams={searchParams} />
}
