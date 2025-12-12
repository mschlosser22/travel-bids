import MinimalNav from './MinimalNav'
import SearchNav from './SearchNav'
import HotelNav from './HotelNav'
import CheckoutNav from './CheckoutNav'
import DashboardNav from './DashboardNav'

export type NavigationVariant = 'minimal' | 'search' | 'hotel' | 'checkout' | 'dashboard'

export interface User {
  id: string
  email?: string
}

export interface SearchParams {
  city?: string
  checkIn?: string
  checkOut?: string
  guests?: number
}

export interface NavigationProps {
  variant?: NavigationVariant
  user?: User | null
  searchParams?: SearchParams
}

export default function Navigation({ variant = 'minimal', user, searchParams }: NavigationProps) {
  // Route to appropriate nav based on page context
  switch (variant) {
    case 'minimal':
      return <MinimalNav user={user} />
    case 'search':
      return <SearchNav user={user} searchParams={searchParams} />
    case 'hotel':
      return <HotelNav user={user} searchParams={searchParams} />
    case 'checkout':
      return <CheckoutNav />
    case 'dashboard':
      return user ? <DashboardNav user={user} /> : <MinimalNav user={user} />
    default:
      return <MinimalNav user={user} />
  }
}
