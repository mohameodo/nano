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
}

export default function MediaCard({
  item,
  t,
  onClick,
  getReleaseYear,
}: MediaCardProps) {
  const titleText = item.title || item.name || ""
  const year = getReleaseYear(item)
  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
    : "https://popr.ink/placeholders/placeholder.svg"

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
