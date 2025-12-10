'use client'

import { useEffect, useState } from 'react'
import type { HotelResult } from '@/lib/hotel-providers/types'
import { buildHotelUrl, formatDateDisplay, calculateNights, CITY_NAMES } from '@/lib/url-helpers'
import { posthog } from '@/lib/posthog'

interface SearchResultsProps {
  searchParams: {
    cityCode: string
    checkInDate: string
    checkOutDate: string
    adults: number
    rooms: number
  }
}

export function SearchResults({ searchParams }: SearchResultsProps) {
  const [hotels, setHotels] = useState<HotelResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { cityCode, checkInDate, checkOutDate, adults, rooms } = searchParams

  useEffect(() => {
    async function searchHotels() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/hotels/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cityCode,
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity: rooms,
            currency: 'USD'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to search hotels')
        }

        const data = await response.json()
        setHotels(data.hotels || [])

        // Track search results
        posthog.capture('search_results_viewed', {
          city: cityCode,
          check_in: checkInDate,
          check_out: checkOutDate,
          nights: calculateNights(checkInDate, checkOutDate),
          adults,
          rooms,
          results_count: data.hotels?.length || 0
        })
      } catch (err: any) {
        console.error('Search error:', err)
        setError(err.message || 'Failed to search hotels')
      } finally {
        setLoading(false)
      }
    }

    searchHotels()
  }, [cityCode, checkInDate, checkOutDate, adults, rooms])

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Searching hotels...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Search Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  // No results
  if (hotels.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Hotels Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any hotels matching your search criteria. Try adjusting your dates or location.
          </p>
          <a href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            New Search
          </a>
        </div>
      </div>
    )
  }

  const nights = calculateNights(checkInDate, checkOutDate)
  const cityName = CITY_NAMES[cityCode] || cityCode
  const checkInDisplay = formatDateDisplay(checkInDate)
  const checkOutDisplay = formatDateDisplay(checkOutDate)

  // Results
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Summary */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 capitalize">
          {hotels.length} Hotels in {cityName.replace(/-/g, ' ')}
        </h1>
        <p className="text-gray-600">
          {checkInDisplay} - {checkOutDisplay} • {nights} {nights === 1 ? 'night' : 'nights'} • {adults} {adults === 1 ? 'guest' : 'guests'} • {rooms} {rooms === 1 ? 'room' : 'rooms'}
        </p>
      </div>

      {/* Results Grid */}
      <div className="space-y-4">
        {hotels.map((hotel) => {
          const hotelUrl = buildHotelUrl({
            cityCode,
            hotelName: hotel.name,
            providerHotelId: hotel.providerHotelId,
            providerId: hotel.providerId,
            checkInDate,
            checkOutDate,
            adults,
            rooms,
          })

          return (
            <div key={`${hotel.providerId}-${hotel.providerHotelId}`} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Hotel Image */}
                <div className="w-full md:w-64 h-48 md:h-auto bg-gradient-to-br from-blue-100 to-blue-200 flex-shrink-0 relative overflow-hidden">
                  {hotel.images && hotel.images.length > 0 ? (
                    <img
                      src={hotel.images[0]}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : null}
                  {(!hotel.images || hotel.images.length === 0) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                      <svg className="w-20 h-20 text-blue-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm font-medium text-blue-700 text-center line-clamp-2">{hotel.name}</span>
                    </div>
                  )}
                </div>

                {/* Hotel Info */}
                <div className="flex-1 p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">
                        {hotel.name}
                      </h2>
                      {hotel.starRating && (
                        <div className="flex items-center mb-2">
                          {[...Array(hotel.starRating)].map((_, i) => (
                            <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      )}
                      <p className="text-gray-600 text-sm mb-2">{hotel.address}</p>
                      {hotel.amenities && hotel.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {hotel.amenities.slice(0, 4).map((amenity, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {amenity}
                            </span>
                          ))}
                          {hotel.amenities.length > 4 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{hotel.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price and CTA */}
                <div className="border-t md:border-t-0 md:border-l border-gray-200 p-6 md:w-64 flex flex-col justify-between bg-gray-50">
                  <div className="mb-4">
                    <div className="text-right mb-1">
                      <span className="text-sm text-gray-600">Total for {nights} {nights === 1 ? 'night' : 'nights'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-gray-900">
                        ${hotel.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-600">
                        ${hotel.pricePerNight?.toFixed(2) || (hotel.price / nights).toFixed(2)}/night
                      </span>
                    </div>
                  </div>

                  <a
                    href={hotelUrl}
                    onClick={() => {
                      posthog.capture('hotel_clicked', {
                        hotel_id: hotel.providerHotelId,
                        hotel_name: hotel.name,
                        provider: hotel.providerId,
                        price: hotel.price,
                        city: cityCode,
                        check_in: checkInDate,
                        check_out: checkOutDate,
                        nights
                      })
                    }}
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
                  >
                    View Details
                  </a>

                  {hotel.roomsAvailable != null && hotel.roomsAvailable > 0 && (
                    <p className="text-xs text-center text-gray-600 mt-2">
                      {hotel.roomsAvailable} {hotel.roomsAvailable === 1 ? 'room' : 'rooms'} available
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
