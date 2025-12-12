import { Suspense } from 'react'
import { BookingForm } from './BookingForm'

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ hotelId: string; roomId: string }>
  searchParams: Promise<{
    provider?: string
    checkIn?: string
    checkOut?: string
    adults?: string
    rooms?: string
    type?: string
    offerKey?: string
  }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  // Validate required parameters
  if (!resolvedSearchParams.provider || !resolvedSearchParams.checkIn || !resolvedSearchParams.checkOut) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Missing Parameters</h1>
          <p className="text-gray-600 mb-6">
            Required booking information is missing. Please start your search from the home page.
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
      {/* Booking Form */}
      <Suspense fallback={<LoadingState />}>
        <BookingForm
          hotelId={resolvedParams.hotelId}
          roomId={resolvedParams.roomId}
          providerId={resolvedSearchParams.provider}
          checkInDate={resolvedSearchParams.checkIn}
          checkOutDate={resolvedSearchParams.checkOut}
          adults={parseInt(resolvedSearchParams.adults || '2')}
          rooms={parseInt(resolvedSearchParams.rooms || '1')}
          preferredRoomType={resolvedSearchParams.type}
          offerKey={resolvedSearchParams.offerKey}
        />
      </Suspense>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>

          {/* Form skeleton */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Summary skeleton */}
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
