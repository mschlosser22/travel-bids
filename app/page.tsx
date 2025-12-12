import { HotelSearchForm } from './components/HotelSearchForm'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 md:py-20">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Find Your Perfect Hotel
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
            Search thousands of hotels worldwide. Best prices guaranteed.
          </p>
        </div>

        {/* Search Form */}
        <HotelSearchForm />

        {/* Trust Signals */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">

          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Best Price Guarantee
            </h3>
            <p className="text-gray-600">
              Find a lower price? We'll match it and give you 10% off
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Instant Confirmation
            </h3>
            <p className="text-gray-600">
              Get your booking confirmed immediately via email
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Secure Booking
            </h3>
            <p className="text-gray-600">
              Your payment information is encrypted and secure
            </p>
          </div>

        </div>

        {/* Social Proof */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Trusted by travelers worldwide</p>
          <div className="flex justify-center items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-gray-700 font-semibold">4.8/5</span>
            <span className="text-gray-500">(12,000+ reviews)</span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p>&copy; {new Date().getFullYear()} Hotel Reservation Portal. All rights reserved.</p>
            <div className="mt-2 flex justify-center gap-6">
              <a href="/privacy" className="hover:text-gray-900">Privacy Policy</a>
              <a href="/terms" className="hover:text-gray-900">Terms of Service</a>
              <a href="/contact" className="hover:text-gray-900">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
