'use client'

import { useState } from 'react'
import Image from 'next/image'
import { DateRangePicker } from '@/app/components/shared/DateRangePicker'

interface Hotel {
  id: string
  name: string
  description: string | null
  latitude: number | null
  longitude: number | null
  city: string | null
  state: string | null
  country: string | null
  star_rating: number | null
  images: string[] | null
  amenities: string[] | null
  giata_id: string | null
  ad_approved: boolean
  provider_count: number
}

interface Props {
  hotel: Hotel
  utmParams: {
    utm_source?: string
    utm_campaign?: string
    utm_medium?: string
    utm_term?: string
  }
}

interface PriceResult {
  provider: string
  price: number
  currency: string
  available: boolean
  roomsAvailable: number
}

export default function HotelLandingPage({ hotel, utmParams }: Props) {
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [rooms, setRooms] = useState(1)
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState<PriceResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const location = [hotel.city, hotel.state, hotel.country].filter(Boolean).join(', ')
  const images = hotel.images || []
  const amenities = hotel.amenities || []

  const handleSearch = async () => {
    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/hotels/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalHotelId: hotel.id,
          checkIn,
          checkOut,
          adults,
          rooms,
          utmSource: utmParams.utm_source,
          utmCampaign: utmParams.utm_campaign
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }

      const data = await response.json()
      setPrices(data.prices || [])
    } catch (err: any) {
      setError(err.message || 'Failed to search prices')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hotel Info */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {hotel.name}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                {hotel.star_rating && (
                  <div className="flex items-center text-yellow-500">
                    {Array.from({ length: hotel.star_rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                )}
                <span className="text-gray-600">{location}</span>
              </div>
              <p className="text-gray-700 mb-6">
                {hotel.description || `Experience luxury and comfort at ${hotel.name} in ${location}`}
              </p>

              {/* Main Image */}
              {images.length > 0 && (
                <div className="relative h-64 rounded-lg overflow-hidden mb-6">
                  <Image
                    src={images[0]}
                    alt={hotel.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            {/* Date Picker & Search */}
            <div className="bg-blue-50 p-6 rounded-lg h-fit sticky top-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Check Availability
              </h2>

              <div className="space-y-4">
                <DateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onCheckInChange={setCheckIn}
                  onCheckOutChange={setCheckOut}
                  required={false}
                />

                {/* Guests */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adults
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={adults}
                      onChange={(e) => setAdults(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rooms
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={rooms}
                      onChange={(e) => setRooms(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
                  disabled={loading || !checkIn || !checkOut}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Searching...' : 'Search Availability & Prices'}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
              </div>

              {/* Price Results */}
              {prices.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Available Rates
                  </h3>
                  {prices.map((price, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm text-gray-600 capitalize">
                            {price.provider}
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            ${price.price.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {price.roomsAvailable} rooms available
                          </div>
                        </div>
                        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Amenities */}
      {amenities.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {amenities.slice(0, 12).map((amenity, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <span className="text-gray-700">{amenity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      {images.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.slice(1, 9).map((image, idx) => (
              <div key={idx} className="relative h-48 rounded-lg overflow-hidden">
                <Image
                  src={image}
                  alt={`${hotel.name} - Photo ${idx + 2}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LLM-Optimized Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-gray-600">
        <p>
          Hotel ID: {hotel.id} | GIATA: {hotel.giata_id} | Providers: {hotel.provider_count}
        </p>
      </div>
    </div>
  )
}
