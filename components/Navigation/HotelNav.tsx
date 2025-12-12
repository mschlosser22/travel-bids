'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, SearchParams } from './index'

interface HotelNavProps {
  user?: User | null
  searchParams?: SearchParams
}

export default function HotelNav({ user, searchParams }: HotelNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Build search URL to go back to results
  const buildSearchUrl = () => {
    if (!searchParams?.city) return '/search'

    const { city, checkIn, checkOut, guests } = searchParams
    const rooms = 1 // Default to 1 room
    return `/search/${city}/${checkIn}/${checkOut}/${guests}-guests-${rooms}-rooms`
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Back to Search */}
          <Link
            href={buildSearchUrl()}
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to Results</span>
            <span className="sm:hidden">Back</span>
          </Link>

          {/* Logo - Center */}
          <Link href="/" className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Hotel Reservation Portal
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  My Bookings
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Sign Out
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-4 py-3 space-y-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Bookings
                </Link>
                <Link
                  href="/api/auth/signout"
                  className="block text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Out
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="block text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
