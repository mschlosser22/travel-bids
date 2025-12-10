'use client'

export function ConfirmationActions() {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <a
        href="/"
        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
      >
        Book Another Hotel
      </a>
      <button
        onClick={() => window.print()}
        className="flex-1 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-6 rounded-lg border border-gray-300 transition-colors"
      >
        Print Confirmation
      </button>
    </div>
  )
}
