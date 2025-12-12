'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CancelButtonProps {
  bookingId: string
  estimatedRefund: number
}

export function CancelButton({ bookingId, estimatedRefund }: CancelButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const router = useRouter()

  const handleCancel = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      // Check if it's pending or completed
      if (data.status === 'pending') {
        // Show pending message
        alert(data.message)
        router.refresh() // Refresh the page to show updated status
      } else {
        // Redirect to booking page with cancelled status
        router.push(`/booking/${bookingId}?cancelled=true`)
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  if (!showConfirmation) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Need to cancel?</h2>
        <p className="text-sm text-gray-600 mb-4">
          You can request a cancellation for this booking. We'll confirm with the hotel and process your refund according to the cancellation policy.
        </p>
        <button
          onClick={() => setShowConfirmation(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Request Cancellation
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Cancellation</h2>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-800 mb-2">
          <strong>Are you sure you want to cancel this booking?</strong>
        </p>
        <p className="text-sm text-yellow-700">
          We'll confirm the cancellation with the hotel. Your estimated refund is <strong>${estimatedRefund.toFixed(2)}</strong>.
        </p>
        {estimatedRefund === 0 && (
          <p className="text-sm text-yellow-700 mt-2">
            Note: This booking may not be eligible for a refund based on the cancellation policy.
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {isLoading ? 'Processing...' : 'Yes, Cancel Booking'}
        </button>
        <button
          onClick={() => {
            setShowConfirmation(false)
            setError(null)
          }}
          disabled={isLoading}
          className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          No, Keep Booking
        </button>
      </div>
    </div>
  )
}
