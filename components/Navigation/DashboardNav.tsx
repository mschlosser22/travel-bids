'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from './index'

interface DashboardNavProps {
  user: User
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Hotel Reservation Portal
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              Search Hotels
            </Link>
            <Link
              href="/dashboard"
              className={`font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'text-blue-600'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              My Bookings
            </Link>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-300">
              <div className="text-sm text-gray-600">
                {user.email}
              </div>
              <Link
                href="/api/auth/signout"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
              >
                Sign Out
              </Link>
            </div>
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
            <div className="text-sm text-gray-600 pb-3 border-b border-gray-200">
              {user.email}
            </div>
            <Link
              href="/"
              className="block text-gray-700 hover:text-blue-600 font-medium py-2 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Search Hotels
            </Link>
            <Link
              href="/dashboard"
              className={`block font-medium py-2 transition-colors ${
                isActive('/dashboard')
                  ? 'text-blue-600'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
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
          </div>
        </div>
      )}
    </nav>
  )
}
