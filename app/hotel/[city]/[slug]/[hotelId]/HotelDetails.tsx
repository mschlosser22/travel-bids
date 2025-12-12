'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { HotelDetails as HotelDetailsType } from '@/lib/hotel-providers/types'
import { formatDateDisplay, calculateNights, CITY_NAMES } from '@/lib/url-helpers'
import { posthog } from '@/lib/posthog'

interface HotelDetailsProps {
  providerHotelId: string
  providerId: string
  cityCode: string
  checkInDate: string
  checkOutDate: string
  adults: number
  rooms: number
}

export function HotelDetails({
  providerHotelId,
  providerId,
  cityCode,
  checkInDate,
  checkOutDate,
  adults,
  rooms,
}: HotelDetailsProps) {
  const [hotel, setHotel] = useState<HotelDetailsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    async function fetchHotelDetails() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/hotels/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerHotelId,
            providerId,
            cityCode,
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity: rooms,
            currency: 'USD'
          })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch hotel details')
        }

        const data = await response.json()
        setHotel(data.hotel)
      } catch (err: any) {
        console.error('Hotel details error:', err)
        setError(err.message || 'Failed to load hotel details')
      } finally {
        setLoading(false)
      }
    }

    fetchHotelDetails()
  }, [providerHotelId, providerId, cityCode, checkInDate, checkOutDate, adults, rooms])

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hotel details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !hotel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Hotel</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  const nights = calculateNights(checkInDate, checkOutDate)
  const cityName = CITY_NAMES[cityCode] || cityCode
  const checkInDisplay = formatDateDisplay(checkInDate)
  const checkOutDisplay = formatDateDisplay(checkOutDate)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="flex text-sm text-gray-600">
          <a href="/" className="hover:text-blue-600">Home</a>
          <span className="mx-2">/</span>
          <a href={`/search/${cityName}/${checkInDate}/${checkOutDate}/${adults}-guests-${rooms}-rooms`} className="hover:text-blue-600 capitalize">
            {cityName.replace(/-/g, ' ')}
          </a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{hotel.name}</span>
        </nav>
      </div>

      {/* Hotel Name & Rating */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {hotel.name}
        </h1>
        <div className="flex items-center gap-4">
          {hotel.starRating && (
            <div className="flex items-center">
              {[...Array(hotel.starRating)].map((_, i) => (
                <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          )}
          <p className="text-gray-600">{hotel.address}</p>
        </div>
      </div>

      {/* Image Gallery */}
      {hotel.images && hotel.images.length > 0 && (
        <div className="mb-8">
          <div className="bg-gray-200 rounded-lg overflow-hidden mb-4 relative h-96">
            <Image
              src={hotel.images[selectedImageIndex]}
              alt={hotel.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
          </div>
          {hotel.images.length > 1 && (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
              {hotel.images.slice(0, 6).map((image, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all h-20 ${
                    selectedImageIndex === i ? 'border-blue-600' : 'border-transparent'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${hotel.name} - ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {hotel.description && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About This Hotel</h2>
              <p className="text-gray-700 leading-relaxed">{hotel.description}</p>
            </div>
          )}

          {/* Amenities */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {hotel.amenities.map((amenity, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Policies */}
          {hotel.policies && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Policies</h2>
              <div className="space-y-3">
                {hotel.policies.checkIn && (
                  <div>
                    <span className="font-medium text-gray-900">Check-in:</span>{' '}
                    <span className="text-gray-700">{hotel.policies.checkIn}</span>
                  </div>
                )}
                {hotel.policies.checkOut && (
                  <div>
                    <span className="font-medium text-gray-900">Check-out:</span>{' '}
                    <span className="text-gray-700">{hotel.policies.checkOut}</span>
                  </div>
                )}
                {hotel.policies.cancellation && (
                  <div>
                    <span className="font-medium text-gray-900">Cancellation:</span>{' '}
                    <span className="text-gray-700">{hotel.policies.cancellation}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Available Rooms */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Available Rooms</h2>
            <div className="space-y-4">
              {hotel.rooms.map((room) => {
                return (
                  <div key={room.roomId} className="border border-gray-200 rounded-lg p-4 hover:border-blue-600 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {room.roomType}
                        </h3>
                        {room.description && (
                          <p className="text-sm text-gray-600 mb-2">{room.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                          {room.maxOccupancy && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {room.maxOccupancy} guests
                            </span>
                          )}
                          {room.bedType && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              {room.bedType}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            ${room.price.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">
                            ${(room.price / nights).toFixed(2)}/night
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              // Cache the offer via API before redirecting to booking page
                              const cacheResponse = await fetch('/api/cache/offer', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  providerId,
                                  providerHotelId,
                                  room,
                                  searchParams: {
                                    checkInDate,
                                    checkOutDate,
                                    adults,
                                    rooms
                                  },
                                  hotelInfo: {
                                    name: hotel.name,
                                    address: hotel.address
                                  }
                                })
                              })

                              if (!cacheResponse.ok) {
                                console.error('Failed to cache offer, proceeding without cache')
                              }

                              const { cacheKey } = await cacheResponse.json()

                              // Track booking initiated with cache key
                              posthog.capture('booking_initiated', {
                                hotel_id: providerHotelId,
                                hotel_name: hotel.name,
                                provider: providerId,
                                room_id: room.roomId,
                                room_type: room.roomType,
                                price: room.price,
                                city: cityCode,
                                check_in: checkInDate,
                                check_out: checkOutDate,
                                nights,
                                adults,
                                rooms,
                                cache_key: cacheKey
                              })

                              // Redirect to booking page with cache key
                              const bookingUrl = `/book/${providerHotelId}/${room.roomId}?provider=${providerId}&checkIn=${checkInDate}&checkOut=${checkOutDate}&adults=${adults}&rooms=${rooms}&offerKey=${encodeURIComponent(cacheKey)}`
                              window.location.href = bookingUrl
                            } catch (error) {
                              console.error('Error caching offer:', error)
                              // Fallback: redirect without cache key
                              const bookingUrl = `/book/${providerHotelId}/${room.roomId}?provider=${providerId}&checkIn=${checkInDate}&checkOut=${checkOutDate}&adults=${adults}&rooms=${rooms}`
                              window.location.href = bookingUrl
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Booking Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Stay</h2>

            <div className="space-y-3 mb-6">
              <div>
                <div className="text-sm text-gray-600">Check-in</div>
                <div className="font-medium text-gray-900">{checkInDisplay}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Check-out</div>
                <div className="font-medium text-gray-900">{checkOutDisplay}</div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600">Duration</div>
                <div className="font-medium text-gray-900">{nights} {nights === 1 ? 'night' : 'nights'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Guests</div>
                <div className="font-medium text-gray-900">{adults} {adults === 1 ? 'guest' : 'guests'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Rooms</div>
                <div className="font-medium text-gray-900">{rooms} {rooms === 1 ? 'room' : 'rooms'}</div>
              </div>
            </div>

            {hotel.rooms.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Starting from</div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${Math.min(...hotel.rooms.map(r => r.price)).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  ${(Math.min(...hotel.rooms.map(r => r.price)) / nights).toFixed(2)}/night
                </div>
              </div>
            )}

            {/* Contact Info */}
            {hotel.contactInfo && (hotel.contactInfo.phone || hotel.contactInfo.email) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Hotel</h3>
                <div className="space-y-2 text-sm">
                  {hotel.contactInfo.phone && (
                    <div className="text-gray-700">{hotel.contactInfo.phone}</div>
                  )}
                  {hotel.contactInfo.email && (
                    <div className="text-gray-700">{hotel.contactInfo.email}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
