import { useState, useEffect } from "react"
import VidstackPlayer from "./video-player/vidstack-player"
import Player from "./video-player/player"
import Controls from "./video-player/controls"
import Settings from "./video-player/settings"
import "./nano.css"
import { providerList } from "../../lib/nano/nano.poprink"
import { poprinkConfig } from "./config.poprink"

interface NanoWatchProps {
  id: string
  type: string
  season?: string
  episode?: string
}

interface MediaInfo {
  title: string
  overview: string
  seasons?: SeasonInfo[]
}

interface SeasonInfo {
  season_number: number
  episode_count: number
  name: string
}

interface EpisodeInfo {
  episode_number: number
  name: string
}

const SERVERS = providerList
  .filter((p) => p.enabled)
  .map((p) => ({ id: p.key, name: p.name }))

export default function NanoWatch({ id, type, season, episode }: NanoWatchProps) {
  const [info, setInfo] = useState<MediaInfo | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([])
  const [currentSeason, setCurrentSeason] = useState(Number(season) || 1)
  const [currentEpisode, setCurrentEpisode] = useState(Number(episode) || 1)
  const [activeServer, setActiveServer] = useState(() => {
    const enabled = providerList.filter((p) => p.enabled)
    return poprinkConfig.features.videoPlayer.defaultServer || (enabled.length > 0 ? enabled[0].key : "vidzee")
  })
  const [playerUrl, setPlayerUrl] = useState("")
  const [isDirectPlayer, setIsDirectPlayer] = useState(false)
  const [isM3U8, setIsM3U8] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [scraping, setScraping] = useState(false)
  const playerType = poprinkConfig.features.videoPlayer.useVidstack ? "vidstack" : "default"

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/details?id=${id}&type=${type}`)
        if (cancelled) return
        const data = await res.json()
        
        if (data.blocked || data.adult === true) {
          setBlocked(true)
          setLoading(false)
          return
        }
        
        const seasons = Array.isArray(data.seasons) ? data.seasons : []
        setInfo({
          title: data.title || data.name || "",
          overview: data.overview || "",
          seasons: seasons
            .filter((s: any) => s.season_number > 0)
            .map((s: any) => ({
              season_number: s.season_number,
              episode_count: s.episode_count,
              name: s.name,
            })),
        })
        setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, type])

  useEffect(() => {
    if (type !== "tv") return
    let cancelled = false
    async function loadEpisodes() {
      try {
        const res = await fetch(`/api/details?id=${id}&type=tv&season=${currentSeason}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        const epList = Array.isArray(data.episodes) ? data.episodes : []
        setEpisodes(
          epList.map((ep: any) => ({
            episode_number: ep.episode_number,
            name: ep.name || "",
          }))
        )
      } catch {
        if (!cancelled) setEpisodes([])
      }
    }
    loadEpisodes()
    return () => {
      cancelled = true
    }
  }, [id, currentSeason, type])

  useEffect(() => {
    let cancelled = false
    async function fetchScraped() {
      setScraping(true)
      try {
        const res = await fetch(`/api/scrape?id=${id}&type=${type}&season=${currentSeason}&episode=${currentEpisode}&provider=${activeServer}`)
        if (cancelled) return
        if (!res.ok) {
          setPlayerUrl("")
          setIsDirectPlayer(false)
          setIsM3U8(false)
          setScraping(false)
          return
        }
        const data = await res.json()
        setPlayerUrl(data.url)
        setIsDirectPlayer(data.isDirect || false)
        setIsM3U8(data.isM3U8 || false)
        setScraping(false)
      } catch {
        if (!cancelled) {
          setPlayerUrl("")
          setIsDirectPlayer(false)
          setIsM3U8(false)
          setScraping(false)
        }
      }
    }
    fetchScraped()
    return () => {
      cancelled = true
    }
  }, [id, type, currentSeason, currentEpisode, activeServer])

  const handleEpisodeSelect = (epNum: number) => {
    setCurrentEpisode(epNum)
    window.history.replaceState(null, "", `/watch/${id}?type=tv&season=${currentSeason}&episode=${epNum}`)
  }

  const handleSeasonChange = (seasonNum: number) => {
    setCurrentSeason(seasonNum)
    setCurrentEpisode(1)
    window.history.replaceState(null, "", `/watch/${id}?type=tv&season=${seasonNum}&episode=1`)
  }

  if (loading || scraping) {
    return (
      <div style={{ width: "100vw", height: "100vh", backgroundColor: "#000" }} />
    )
  }

  if (blocked) {
    return (
      <div className="tvko-loading" style={{ flexDirection: "column", gap: "20px" }}>
        <div style={{ fontSize: "48px" }}>🚫</div>
        <div style={{ fontSize: "24px", fontWeight: "bold" }}>Content Blocked</div>
        <div style={{ fontSize: "16px", opacity: 0.7, maxWidth: "400px", textAlign: "center" }}>
          This content has been blocked due to adult content restrictions.
        </div>
        <button 
          onClick={() => window.location.href = "/"} 
          style={{ 
            marginTop: "20px", 
            padding: "12px 24px", 
            fontSize: "16px", 
            backgroundColor: "hsl(var(--theme-hue), 70%, 50%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Go Back Home
        </button>
      </div>
    )
  }

  if (!playerUrl) {
    return (
      <div className="tvko-loading">
        <div style={{ color: '#fff', fontSize: '18px' }}>No stream available</div>
      </div>
    )
  }

  const displayTitle =
    type === "tv"
      ? `${info?.title || ""} - Season ${currentSeason} Episode ${currentEpisode}`
      : info?.title || ""

  return (
    <div className="nano-watch-wrapper" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Controls
        displayTitle={displayTitle}
        servers={SERVERS}
        activeServer={activeServer}
        setActiveServer={setActiveServer}
        isTv={type === "tv"}
        showEpisodes={showEpisodes}
        setShowEpisodes={setShowEpisodes}
      />

      <div className="nano-watch-content" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {playerType === "vidstack" ? (
          <VidstackPlayer
            embedUrl={playerUrl}
            isDirect={isDirectPlayer}
            isM3U8={isM3U8}
            title={displayTitle}
            servers={SERVERS}
            activeServer={activeServer}
            setActiveServer={setActiveServer}
            isTv={type === "tv"}
            showEpisodes={showEpisodes}
            setShowEpisodes={setShowEpisodes}
          />
        ) : (
          <Player
            embedUrl={playerUrl}
            isDirect={isDirectPlayer}
            isM3U8={isM3U8}
            title={displayTitle}
            servers={SERVERS}
            activeServer={activeServer}
            setActiveServer={setActiveServer}
            isTv={type === "tv"}
            showEpisodes={showEpisodes}
            setShowEpisodes={setShowEpisodes}
          />
        )}
        {type === "tv" && showEpisodes && (
          <Settings
            info={info}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
            episodes={episodes}
            handleSeasonChange={handleSeasonChange}
            handleEpisodeSelect={handleEpisodeSelect}
          />
        )}
      </div>
    </div>
  )
}
