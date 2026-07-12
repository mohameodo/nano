import { useState, useEffect } from "react"
import type { FormEvent } from "react"
import { FaSearch, FaSpinner } from "react-icons/fa"

interface SearchFormProps {
  query: string
  setQuery: (q: string) => void
  placeholder: string
  onSubmit: (e: FormEvent) => void
  compact?: boolean
  t?: Record<string, string>
  locale?: string
  loading?: boolean
}

interface SuggestionItem {
  id: number
  title?: string
  name?: string
  media_type: "movie" | "tv"
  release_date?: string
  first_air_date?: string
}

export default function SearchForm({
  query,
  setQuery,
  placeholder,
  onSubmit,
  compact = false,
  t,
  locale,
  loading = false,
}: SearchFormProps) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const langParam = locale ? `&lang=${locale === "genz" ? "en" : locale}` : ""
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&page=1${langParam}`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions((data.results || []).slice(0, 5))
          setShowDropdown(true)
        }
      } catch {
        setSuggestions([])
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  const getYear = (item: SuggestionItem) => {
    const dateStr = item.media_type === "movie" ? item.release_date : item.first_air_date
    if (!dateStr) return null
    try {
      return new Date(dateStr).getFullYear()
    } catch {
      return null
    }
  }

  const handleSuggestionClick = (item: SuggestionItem) => {
    window.location.href = `/watch/${item.id}?type=${item.media_type}`
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`nano-search-form ${compact ? "nano-search-form-compact" : ""}`}
      style={compact ? undefined : { height: "60px" }}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true)
        }}
        onBlur={() => {
          setTimeout(() => setShowDropdown(false), 200)
        }}
        className="nano-search-input"
      />
      <button
        type="submit"
        className={`nano-search-btn ${loading ? "nano-search-btn-loading" : ""}`}
        aria-label="Search"
        disabled={loading}
      >
        <div className="nano-search-btn-normal">
          <FaSearch />
          <span>{t?.search || "search"}</span>
        </div>
        <div className="nano-search-btn-spinning">
          <FaSpinner className="nano-search-spinner" />
        </div>
      </button>

    </form>
  )
}

