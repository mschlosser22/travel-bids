'use client'

import { useState, useEffect, useRef } from 'react'
import { searchCities, type City } from '@/lib/data/cities'

interface CityAutocompleteProps {
  value: City | null
  onChange: (city: City | null) => void
  placeholder?: string
  className?: string
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a city...',
  className = ''
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState<City[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Search cities as user types
  useEffect(() => {
    if (query.length >= 2) {
      // First, search static database
      const staticMatches = searchCities(query, 10)

      if (staticMatches.length > 0) {
        setResults(staticMatches)
        setIsOpen(true)
        setSelectedIndex(0)
        setIsLoading(false)
      } else {
        // No static results - fetch from API
        setIsLoading(true)

        fetch(`/api/cities/search?q=${encodeURIComponent(query)}&limit=10`)
          .then(res => res.json())
          .then(data => {
            setResults(data.results || [])
            setIsOpen(data.results?.length > 0)
            setSelectedIndex(0)
            setIsLoading(false)
          })
          .catch(err => {
            console.error('City search error:', err)
            setResults([])
            setIsLoading(false)
          })
      }
    } else {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
    }
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle city selection
  const selectCity = (city: City) => {
    setQuery(`${city.name} (${city.iataCode})`)
    onChange(city)
    setIsOpen(false)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          selectCity(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!e.target.value) {
            onChange(null)
          }
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true)
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((city, index) => (
            <button
              key={city.iataCode}
              type="button"
              onClick={() => selectCity(city)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{city.name}</div>
                  <div className="text-sm text-gray-500">{city.countryCode}</div>
                </div>
                <div className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {city.iataCode}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            Searching all cities...
          </div>
        </div>
      )}

      {/* No results message */}
      {query.length >= 2 && results.length === 0 && !isOpen && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-600">
            No cities found. Try searching for a major city nearby.
          </p>
        </div>
      )}
    </div>
  )
}
