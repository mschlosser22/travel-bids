'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User } from './index'

interface MinimalNavProps {
  user?: User | null
}

export default function MinimalNav({ user }: MinimalNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
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
                className="block bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold px-6 py-3 rounded-lg transition-colors"
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
