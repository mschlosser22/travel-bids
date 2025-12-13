'use client'

interface DateRangePickerProps {
  checkIn: string
  checkOut: string
  onCheckInChange: (date: string) => void
  onCheckOutChange: (date: string) => void
  minCheckIn?: string
  required?: boolean
  className?: string
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  minCheckIn,
  required = false,
  className = ''
}: DateRangePickerProps) {
  const today = minCheckIn || new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const minCheckOut = checkIn || tomorrow

  return (
    <div className={className}>
      {/* Check-in Date */}
      <div>
        <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
          Check-in
        </label>
        <input
          type="date"
          id="checkIn"
          required={required}
          min={today}
          value={checkIn}
          onChange={(e) => onCheckInChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Check-out Date */}
      <div>
        <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
          Check-out
        </label>
        <input
          type="date"
          id="checkOut"
          required={required}
          min={minCheckOut}
          value={checkOut}
          onChange={(e) => onCheckOutChange(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  )
}
