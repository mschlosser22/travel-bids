// Canonical Hotel Landing Page
// Google Ads flow: User lands here first, THEN selects dates
// Route: /h/[slug] where slug is canonical hotel ID

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import HotelLandingPage from './HotelLandingPage'

interface PageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    utm_source?: string
    utm_campaign?: string
    utm_medium?: string
    utm_term?: string
  }>
}

export default async function CanonicalHotelPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  // Fetch canonical hotel data
  const { data: hotel, error } = await supabase
    .from('canonical_hotels')
    .select(`
      id,
      name,
      description,
      latitude,
      longitude,
      city,
      state,
      country,
      star_rating,
      images,
      amenities,
      giata_id,
      ad_approved,
      provider_count
    `)
    .eq('id', resolvedParams.slug)
    .eq('ad_approved', true) // Only show approved hotels
    .maybeSingle()

  if (error || !hotel) {
    notFound()
  }

  // Track page view with UTM params
  // This will be logged to analytics for ad performance tracking

  // Generate schema.org JSON-LD for LLM/SEO optimization
  const location = [hotel.city, hotel.state, hotel.country].filter(Boolean).join(', ')
  const streetAddress = hotel.city ? `${hotel.city}, ${hotel.state || ''}`.trim() : 'Address unavailable'

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    'name': hotel.name,
    'description': hotel.description || `${hotel.name} in ${location}`,
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': streetAddress,
      'addressLocality': hotel.city || undefined,
      'addressRegion': hotel.state || undefined,
      'addressCountry': hotel.country || undefined
    },
    'geo': hotel.latitude && hotel.longitude ? {
      '@type': 'GeoCoordinates',
      'latitude': hotel.latitude,
      'longitude': hotel.longitude
    } : undefined,
    'starRating': hotel.star_rating ? {
      '@type': 'Rating',
      'ratingValue': hotel.star_rating
    } : undefined,
    'identifier': hotel.giata_id ? {
      '@type': 'PropertyValue',
      'name': 'GIATA',
      'value': hotel.giata_id
    } : undefined,
    'amenityFeature': hotel.amenities ? (() => {
      try {
        const parsed = JSON.parse(hotel.amenities)
        return Array.isArray(parsed) ? parsed.slice(0, 10).map((amenity: string) => ({
          '@type': 'LocationFeatureSpecification',
          'name': amenity
        })) : undefined
      } catch {
        return undefined
      }
    })() : undefined,
    'image': hotel.images ? (() => {
      try {
        const parsed = JSON.parse(hotel.images)
        return Array.isArray(parsed) ? parsed.slice(0, 5) : undefined
      } catch {
        return undefined
      }
    })() : undefined
  }

  // Remove undefined fields
  Object.keys(schemaData).forEach(key => {
    if (schemaData[key as keyof typeof schemaData] === undefined) {
      delete schemaData[key as keyof typeof schemaData]
    }
  })

  return (
    <>
      {/* Schema.org JSON-LD for LLMs and search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <HotelLandingPage
        hotel={hotel}
        utmParams={resolvedSearchParams}
      />
    </>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: hotel } = await supabase
    .from('canonical_hotels')
    .select('name, description, city, state, country, images, slug')
    .eq('id', resolvedParams.slug)
    .maybeSingle()

  if (!hotel) {
    return {
      title: 'Hotel Not Found'
    }
  }

  const location = [hotel.city, hotel.state, hotel.country].filter(Boolean).join(', ')

  let images: string[] = []
  try {
    const parsed = hotel.images ? JSON.parse(hotel.images) : []
    images = Array.isArray(parsed) ? parsed : []
  } catch {
    images = []
  }
  const mainImage = images.length > 0 ? images[0] : null

  return {
    title: `${hotel.name} - ${location} | Best Rates Guaranteed`,
    description: hotel.description || `Book ${hotel.name} in ${location}. Compare prices from multiple providers and get the best deal. Free cancellation available.`,
    openGraph: {
      title: `${hotel.name} - ${location}`,
      description: hotel.description || `Book ${hotel.name} in ${location}`,
      type: 'website',
      images: mainImage ? [{ url: mainImage }] : []
    }
  }
}
