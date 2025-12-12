'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApproveButtonProps {
  bookingId: string
  guestName: string
}

export function ApproveButton({ bookingId, guestName }: ApproveButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const router = useRouter()

  const handleApprove = async () => {
    if (!notes.trim()) {
      setError('Please enter admin notes describing how you confirmed the cancellation')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/approve-cancellation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve cancellation')
      }

      // Refresh the page to show updated data
      router.refresh()

      // Show success message
      alert(`Cancellation approved successfully! Refund of $${data.refundAmount.toFixed(2)} processed.`)
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="space-y-4">
        <div>
          <label
            htmlFor={`notes-${bookingId}`}
            className="block text-sm font-medium text-gray-700"
          >
            Admin Notes (required)
          </label>
          <textarea
            id={`notes-${bookingId}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            placeholder="Describe how you confirmed the cancellation with the provider (e.g., 'Called hotel, confirmed cancellation, reference #12345')"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={isLoading || !notes.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Approve & Process Refund'}
          </button>
          <button
            type="button"
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
}
