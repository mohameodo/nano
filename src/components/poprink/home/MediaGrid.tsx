import MediaCard from "./MediaCard"

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

interface MediaGridProps {
  results: MediaItem[]
  t: Record<string, string>
  onClick: (item: MediaItem) => void
  getReleaseYear: (item: MediaItem) => number | null
  onWatchlistChange?: () => void
}

export default function MediaGrid({
  results,
  t,
  onClick,
  getReleaseYear,
  onWatchlistChange,
}: MediaGridProps) {
  return (
    <div className="nano-grid">
      {results.map((item) => (
        <MediaCard
          key={`${item.media_type}-${item.id}`}
          item={item}
          t={t}
          onClick={onClick}
          getReleaseYear={getReleaseYear}
          onWatchlistChange={onWatchlistChange}
        />
      ))}
    </div>
  )
}
