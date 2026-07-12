import { useState, useEffect } from "react"
import { FaPlus, FaCheck, FaPlay } from "react-icons/fa"
import { shiopaConfig } from "../config.shiopa"

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
  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
    : "https://popr.ink/placeholders/placeholder.svg"

  useEffect(() => {
    if (!shiopaConfig.features.enableWatchlist) return
    const saved = localStorage.getItem("shiopa-watchlist")
    const list = saved ? JSON.parse(saved) : []
    const isAdded = list.some((x: any) => x.id === item.id && x.media_type === item.media_type)
    setInWatchlist(isAdded)
  }, [item.id, item.media_type])

  const handleWatchlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const saved = localStorage.getItem("shiopa-watchlist")
    let list = saved ? JSON.parse(saved) : []
    const isAdded = list.some((x: any) => x.id === item.id && x.media_type === item.media_type)

    if (isAdded) {
      list = list.filter((x: any) => !(x.id === item.id && x.media_type === item.media_type))
      setInWatchlist(false)
    } else {
      list.push(item)
      setInWatchlist(true)
    }

    localStorage.setItem("shiopa-watchlist", JSON.stringify(list))
    if (onWatchlistChange) onWatchlistChange()
  }

  return (
    <div
      className="nano-card"
      onClick={() => onClick(item)}
      style={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        aspectRatio: "2/3",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ width: "100%", height: "100%", position: "relative" }} className="nano-poster-group">
        <img
          src={posterUrl}
          alt={titleText}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "transform 0.3s ease, filter 0.3s ease",
          }}
          className="nano-poster-img"
          loading="lazy"
        />

        <div
          className="nano-play-overlay"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.3s ease",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--accent-color)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              transition: "transform 0.2s ease",
            }}
            className="nano-play-icon-btn"
          >
            <FaPlay style={{ marginLeft: "3px" }} />
          </div>
        </div>

        {shiopaConfig.features.enableWatchlist && (
          <button
            className="nano-watchlist-hover-btn"
            onClick={handleWatchlistToggle}
            aria-label={inWatchlist ? "Remove from List" : "Add to List"}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 10,
              opacity: 0,
              transition: "opacity 0.3s ease",
            }}
          >
            {inWatchlist ? <FaCheck /> : <FaPlus />}
          </button>
        )}
      </div>
    </div>
  )
}
