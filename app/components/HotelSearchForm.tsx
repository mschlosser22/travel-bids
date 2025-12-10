'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildSearchUrl } from '@/lib/url-helpers'

interface SearchFormData {
  cityCode: string
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
}

export function HotelSearchForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<SearchFormData>({
    cityCode: '',
    checkInDate: '',
    checkOutDate: '',
    adults: 2,
    rooms: 1
  })

  // Popular cities for autocomplete
  const popularCities = [
    { code: 'NYC', name: 'New York' },
    { code: 'LON', name: 'London' },
    { code: 'PAR', name: 'Paris' },
    { code: 'LAX', name: 'Los Angeles' },
    { code: 'MIA', name: 'Miami' },
    { code: 'LAS', name: 'Las Vegas' },
    { code: 'CHI', name: 'Chicago' },
    { code: 'SFO', name: 'San Francisco' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Build LLM-friendly semantic URL
    const searchUrl = buildSearchUrl({
      cityCode: formData.cityCode,
      checkInDate: formData.checkInDate,
      checkOutDate: formData.checkOutDate,
      adults: formData.adults,
      rooms: formData.rooms
    })

    // Navigate to search results
    router.push(searchUrl)
  }

  // Set minimum dates (today for check-in, tomorrow for check-out)
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* City/Destination */}
          <div className="lg:col-span-2">
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
              Destination
            </label>
            <select
              id="city"
              required
              value={formData.cityCode}
              onChange={(e) => setFormData({ ...formData, cityCode: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a city</option>
              {popularCities.map((city) => (
                <option key={city.code} value={city.code}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          {/* Check-in Date */}
          <div>
            <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700 mb-2">
              Check-in
            </label>
            <input
              type="date"
              id="checkIn"
              required
              min={today}
              value={formData.checkInDate}
              onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Check-out Date */}
          <div>
            <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700 mb-2">
              Check-out
            </label>
            <input
              type="date"
              id="checkOut"
              required
              min={formData.checkInDate || tomorrow}
              value={formData.checkOutDate}
              onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Guests */}
          <div>
            <label htmlFor="adults" className="block text-sm font-medium text-gray-700 mb-2">
              Guests
            </label>
            <select
              id="adults"
              value={formData.adults}
              onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <div className="mt-6">
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg hover:shadow-xl"
          >
            Search Hotels
          </button>
        </div>

        {/* Quick stats below search */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Free Cancellation</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Best Price Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Instant Confirmation</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
