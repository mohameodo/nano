import { useState, useEffect } from "react"
import { FaPlus, FaCheck } from "react-icons/fa"
import { poprinkConfig } from "../config.poprink"

interface MediaItem {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  media_type: "movie" | "tv"
  release_date?: string
  first_air_date?: string
  popularity?: number
}

interface MediaCardProps {
  item: MediaItem
  t: Record<string, string>
  onClick: (item: MediaItem) => void
  getReleaseYear: (item: MediaItem) => number | null
  onWatchlistChange?: () => void
}

export default function MediaCard({
  item,
  t,
  onClick,
  getReleaseYear,
  onWatchlistChange,
}: MediaCardProps) {
  const [inWatchlist, setInWatchlist] = useState(false)
  const titleText = item.title || item.name || ""
  const year = getReleaseYear(item)
  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
    : "https://popr.ink/placeholders/placeholder.svg"

  useEffect(() => {
    if (!poprinkConfig.features.enableWatchlist) return
    const saved = localStorage.getItem("poprink-watchlist")
    const list = saved ? JSON.parse(saved) : []
    const isAdded = list.some((x: any) => x.id === item.id && x.media_type === item.media_type)
    setInWatchlist(isAdded)
  }, [item.id, item.media_type])

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const saved = localStorage.getItem("poprink-watchlist")
    let list = saved ? JSON.parse(saved) : []
    const isAdded = list.some((x: any) => x.id === item.id && x.media_type === item.media_type)

    if (isAdded) {
      list = list.filter((x: any) => !(x.id === item.id && x.media_type === item.media_type))
      setInWatchlist(false)
    } else {
      list.push(item)
      setInWatchlist(true)
    }

    localStorage.setItem("poprink-watchlist", JSON.stringify(list))
    if (onWatchlistChange) onWatchlistChange()
  }

  return (
    <div className="nano-card" onClick={() => onClick(item)}>
      <span className="nano-card-badge">HD</span>
      <span className="nano-card-type-badge">
        {item.media_type === "movie" ? t.movie : t.tv}
      </span>
      <div className="nano-poster-container">
        <img
          src={posterUrl}
          alt={titleText}
          className="nano-poster"
          loading="lazy"
        />
        {poprinkConfig.features.enableWatchlist && (
          <button
            className="nano-watchlist-hover-btn"
            onClick={handleWatchlistToggle}
            aria-label={inWatchlist ? "Remove from List" : "Add to List"}
          >
            {inWatchlist ? <FaCheck /> : <FaPlus />}
          </button>
        )}
      </div>
      <div className="nano-card-info">
        <h3 className="nano-card-title">{titleText}</h3>
        <div className="nano-card-meta">
          <span>{item.media_type === "movie" ? t.movie : t.tv}</span>
          {year && <span>{year}</span>}
        </div>
      </div>
    </div>
  )
}
