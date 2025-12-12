import { Suspense } from 'react'
import { HotelDetails } from './HotelDetails'
import { parseHotelUrl } from '@/lib/url-helpers'

export default async function HotelPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; slug: string; hotelId: string }>
  searchParams: Promise<{ provider?: string; checkIn?: string; checkOut?: string; adults?: string; rooms?: string }>
}) {
  // Await params in Next.js 15+
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  const hotelParams = parseHotelUrl(resolvedParams)

  if (!hotelParams) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Hotel Not Found</h1>
          <p className="text-gray-600 mb-6">
            The hotel URL format is invalid or the hotel doesn't exist.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  // Validate required search params
  if (!resolvedSearchParams.provider || !resolvedSearchParams.checkIn || !resolvedSearchParams.checkOut || !resolvedSearchParams.adults || !resolvedSearchParams.rooms) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Missing Search Parameters</h1>
          <p className="text-gray-600 mb-6">
            Please search for hotels from the home page to see availability and pricing.
          </p>
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hotel Details */}
      <Suspense fallback={<LoadingState />}>
        <HotelDetails
          providerHotelId={hotelParams.providerHotelId}
          providerId={resolvedSearchParams.provider!}
          cityCode={hotelParams.cityCode}
          checkInDate={resolvedSearchParams.checkIn!}
          checkOutDate={resolvedSearchParams.checkOut!}
          adults={parseInt(resolvedSearchParams.adults!)}
          rooms={parseInt(resolvedSearchParams.rooms!)}
        />
      </Suspense>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Image gallery skeleton */}
        <div className="bg-gray-200 rounded-lg h-96 mb-6"></div>

        {/* Hotel info skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg p-6">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg p-6">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
