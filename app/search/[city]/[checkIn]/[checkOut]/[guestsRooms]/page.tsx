import { Suspense } from 'react'
import { SearchResults } from './SearchResults'
import { parseSearchUrl } from '@/lib/url-helpers'

export default async function SearchPage({
  params,
}: {
  params: Promise<{ city: string; checkIn: string; checkOut: string; guestsRooms: string }>
}) {
  // Await params in Next.js 15+
  const resolvedParams = await params

  // Parse semantic URL
  const searchParams = parseSearchUrl(resolvedParams)

  if (!searchParams) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Search</h1>
          <p className="text-gray-600 mb-6">
            The search URL format is invalid. Please try searching again.
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="text-2xl font-bold text-blue-600">
            Travel Bids
          </a>
        </div>
      </header>

      {/* Results */}
      <Suspense fallback={<LoadingState />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Search params skeleton */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>

        {/* Results skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6">
              <div className="flex gap-4">
                <div className="w-48 h-32 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="text-right">
                  <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
