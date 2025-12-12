'use client'

import Link from 'next/link'

export default function CheckoutNav() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Hotel Reservation Portal
          </Link>

          {/* Secure Checkout Indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="hidden sm:inline font-medium">Secure Checkout</span>
            <span className="sm:hidden font-medium">Secure</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
