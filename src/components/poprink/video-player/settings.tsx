interface SeasonInfo {
  season_number: number
  episode_count: number
  name: string
}

interface EpisodeInfo {
  episode_number: number
  name: string
}

interface MediaInfo {
  title: string
  overview: string
  seasons?: SeasonInfo[]
}

interface SettingsProps {
  info: MediaInfo | null
  currentSeason: number
  currentEpisode: number
  episodes: EpisodeInfo[]
  handleSeasonChange: (seasonNum: number) => void
  handleEpisodeSelect: (epNum: number) => void
}

export default function Settings({
  info,
  currentSeason,
  currentEpisode,
  episodes,
  handleSeasonChange,
  handleEpisodeSelect,
}: SettingsProps) {
  if (!info?.seasons || info.seasons.length === 0) return null

  return (
    <div className="nano-sidebar-episodes" style={{ display: "flex", flexDirection: "column", width: "320px", background: "#0a0a0a", borderLeft: "1px solid #1c1c1c", padding: "80px 20px 20px 20px", position: "absolute", right: 0, top: 0, bottom: 0, zIndex: 45 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <span className="nano-sidebar-title" style={{ color: "#fff", fontWeight: 600 }}>Episodes</span>
        <select
          className="nano-season-select"
          value={currentSeason}
          onChange={(e) => handleSeasonChange(Number(e.target.value))}
          style={{ marginLeft: "auto" }}
        >
          {info.seasons.map((s) => (
            <option key={s.season_number} value={s.season_number}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="nano-episode-list" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
        {episodes.map((ep) => (
          <button
            key={ep.episode_number}
            className={`nano-episode-item ${ep.episode_number === currentEpisode ? "nano-episode-item-active" : ""}`}
            onClick={() => handleEpisodeSelect(ep.episode_number)}
            style={{ display: "flex", flexDirection: "column", alignItems: "start" }}
          >
            <span>Episode {ep.episode_number}</span>
            {ep.name && ep.name.toLowerCase().trim() !== `episode ${ep.episode_number}` && (
              <span style={{ fontSize: "11px", color: "#666", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", width: "100%" }}>
                {ep.name}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
