import { useState, useEffect } from "react"
import VidstackPlayer from "./video-player/vidstack-player"
import Player from "./video-player/player"
import Controls from "./video-player/controls"
import Settings from "./video-player/settings"
import "./nano.css"
import { providerList } from "../../lib/nano/nano.poprink"
import { poprinkConfig } from "./config.poprink"
import { TRANSLATIONS } from "./locales/translations"
import { getStoredHandle, verifyPermission, loadRinkJson, getLocalFileUrl, storeHandle, getBrowserItems, getBrowserFile, srtToVtt, saveBrowserItems } from "../../lib/nano/local-library"

interface NanoWatchProps {
  id: string
  type: string
  season?: string
  episode?: string
}

interface MediaInfo {
  title: string
  overview: string
  poster?: string
  backdrop?: string
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
  const [mediaType, setMediaType] = useState(type)
  const [localServerPath, setLocalServerPath] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("poprink-local-server-path") || ""
    }
    return ""
  })

  useEffect(() => {
    setMediaType(type)
  }, [type])

  useEffect(() => {
    async function checkLocalItem() {
      let browserItems = await getBrowserItems()
      if (localServerPath.trim()) {
        try {
          const res = await fetch(`/api/library?path=${encodeURIComponent(localServerPath.trim())}`)
          if (res.ok) {
            const list = await res.json()
            browserItems = list
          }
        } catch (e) {}
      }
      const match = browserItems.find((item) => String(item.id) === String(id))
      if (match) {
        setActiveServer("localFolder")
      }
    }
    checkLocalItem()
  }, [id, localServerPath])

  const [locale, setLocale] = useState(poprinkConfig.metadata.defaultLocale || "en")
  const [info, setInfo] = useState<MediaInfo | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeInfo[]>([])
  const [currentSeason, setCurrentSeason] = useState(Number(season) || 1)
  const [currentEpisode, setCurrentEpisode] = useState(Number(episode) || 1)
  const [activeServer, setActiveServer] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const prov = params.get("provider")
      if (prov) return prov
      const lastServer = localStorage.getItem("poprink-last-server")
      if (lastServer && SERVERS.some(s => s.id === lastServer)) {
        return lastServer
      }
    }
    return poprinkConfig.features.videoPlayer.defaultServer || "vidzeeWorks"
  })

  useEffect(() => {
    if (typeof window !== "undefined" && activeServer) {
      localStorage.setItem("poprink-last-server", activeServer)
    }
  }, [activeServer])

  const [localFolderHandle, setLocalFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [localFolderNeedsSetup, setLocalFolderNeedsSetup] = useState(false)
  const [localFolderError, setLocalFolderError] = useState("")

  useEffect(() => {
    async function initLocalFolder() {
      const handle = await getStoredHandle()
      if (handle) {
        setLocalFolderHandle(handle)
      }
    }
    initLocalFolder()
  }, [])
  const [playerUrl, setPlayerUrl] = useState("")
  const [isDirectPlayer, setIsDirectPlayer] = useState(false)
  const [isM3U8, setIsM3U8] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEpisodes, setShowEpisodes] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [msgIndex, setMsgIndex] = useState(0)
  const [subtitles, setSubtitles] = useState<any[]>([])
  const [retryTrigger, setRetryTrigger] = useState(0)
  const playerType = poprinkConfig.features.videoPlayer.useVidstack ? "vidstack" : "default"

  useEffect(() => {
    const savedLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("poprink-locale="))
      ?.split("=")[1] || localStorage.getItem("poprink-locale")
    if (savedLocale && TRANSLATIONS[savedLocale]) {
      setLocale(savedLocale)
    }
  }, [])

  useEffect(() => {
    document.cookie = `poprink-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    localStorage.setItem("poprink-locale", locale)
  }, [locale])

  const messages = ["poprink", TRANSLATIONS[locale]?.searching || "searching", TRANSLATIONS[locale]?.loading || "loading"]

  useEffect(() => {
    if (!loading && !scraping) return
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [loading, scraping, messages.length])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/details?id=${id}&type=${mediaType}`)
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
          poster: data.poster_path || data.poster || "",
          backdrop: data.backdrop_path || data.backdrop || "",
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
  }, [id, mediaType])

  useEffect(() => {
    if (!info?.title || !poprinkConfig.features.enableContinueWatching) return
    const saved = localStorage.getItem("poprink-continue-watching")
    let list = saved ? JSON.parse(saved) : []
    const watchItem = {
      id: Number(id),
      type: mediaType,
      title: info.title,
      poster_path: info.poster || null,
      season: mediaType === "tv" ? currentSeason : undefined,
      episode: mediaType === "tv" ? currentEpisode : undefined,
      updatedAt: new Date().getTime(),
    }
    list = list.filter((item: any) => !(item.id === watchItem.id && item.type === watchItem.type))
    list.unshift(watchItem)
    list = list.slice(0, 12)
    localStorage.setItem("poprink-continue-watching", JSON.stringify(list))
  }, [id, mediaType, info, currentSeason, currentEpisode])

  useEffect(() => {
    if (mediaType !== "tv") return
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
  }, [id, currentSeason, mediaType])

  useEffect(() => {
    let cancelled = false
    async function fetchScraped() {
      setScraping(true)
      setLocalFolderError("")

      const fallbackToNextServer = () => {
        const currentIndex = SERVERS.findIndex((s) => s.id === activeServer)
        if (currentIndex !== -1 && currentIndex < SERVERS.length - 1) {
          const nextServer = SERVERS[currentIndex + 1]
          setActiveServer(nextServer.id)
        } else {
          setPlayerUrl("")
          setIsDirectPlayer(false)
          setIsM3U8(false)
          setScraping(false)
        }
      }
      
      if (activeServer === "localFolder") {
        let browserItems = await getBrowserItems()
        if (localServerPath.trim()) {
          try {
            const res = await fetch(`/api/library?path=${encodeURIComponent(localServerPath.trim())}`)
            if (res.ok) {
              const list = await res.json()
              browserItems = list
              await saveBrowserItems(list)
            }
          } catch (e) {}
        }
        if (cancelled) return
        const match = browserItems.find((item) => String(item.id) === String(id))
        
        if (match) {
          if (match.type && match.type !== mediaType) {
            setMediaType(match.type)
            const url = new URL(window.location.href)
            url.searchParams.set("type", match.type)
            window.history.replaceState(null, "", url.pathname + url.search)
            return
          }
          
          let relativeFilePath = ""
          if (mediaType === "movie") {
            relativeFilePath = match.file || ""
          } else {
            relativeFilePath = match.seasons?.[currentSeason]?.[currentEpisode] || ""
          }
          
          if (!relativeFilePath) {
            setLocalFolderError(`No file mapped for this ${mediaType === "movie" ? "movie" : `Season ${currentSeason} Episode ${currentEpisode}`}`)
            setPlayerUrl("")
            setScraping(false)
            return
          }
          
          let videoUrl = ""
          let isUrlDirect = false
          if (relativeFilePath.startsWith("http://") || relativeFilePath.startsWith("https://") || relativeFilePath.startsWith("blob:")) {
            videoUrl = relativeFilePath
            isUrlDirect = true
          } else if (relativeFilePath.startsWith("browser_file_")) {
            const fileObj = await getBrowserFile(relativeFilePath)
            if (fileObj) {
              videoUrl = URL.createObjectURL(fileObj)
              isUrlDirect = true
            } else {
              setLocalFolderError(`File not found in database: ${relativeFilePath}`)
              setPlayerUrl("")
              setScraping(false)
              return
            }
          } else {
            const isAbsolutePath = relativeFilePath.includes(":") || relativeFilePath.startsWith("/") || relativeFilePath.startsWith("\\")
            if (isAbsolutePath || !localFolderHandle) {
              let streamUrl = `/api/stream?path=${encodeURIComponent(relativeFilePath)}`
              if (localServerPath) {
                streamUrl += `&base=${encodeURIComponent(localServerPath)}`
              }
              videoUrl = streamUrl
              isUrlDirect = true
            } else if (localFolderHandle) {
              try {
                videoUrl = await getLocalFileUrl(localFolderHandle, relativeFilePath)
                isUrlDirect = true
              } catch (e) {
                setLocalFolderError(`Failed to resolve local file path: ${relativeFilePath}`)
                setPlayerUrl("")
                setScraping(false)
                return
              }
            } else {
              setLocalFolderError(`File not found: ${relativeFilePath}. Upload the file or connect your local folder.`)
              setPlayerUrl("")
              setScraping(false)
              return
            }
          }
          
          const resolvedSubs: any[] = []
          if (Array.isArray(match.subtitles)) {
            for (const sub of match.subtitles) {
              if (sub.file.startsWith("http://") || sub.file.startsWith("https://") || sub.file.startsWith("blob:")) {
                resolvedSubs.push({
                  src: sub.file,
                  label: sub.label || "Subtitle",
                  language: sub.language || "en"
                })
              } else if (sub.file.startsWith("browser_file_")) {
                const subFile = await getBrowserFile(sub.file)
                if (subFile) {
                  const text = await subFile.text()
                  const vttText = subFile.name.endsWith(".srt") ? srtToVtt(text) : text
                  const blob = new Blob([vttText], { type: "text/vtt" })
                  resolvedSubs.push({
                    src: URL.createObjectURL(blob),
                    label: sub.label || "Local Sub",
                    language: sub.language || "en"
                  })
                }
              } else {
                const isAbsolutePath = sub.file.includes(":") || sub.file.startsWith("/") || sub.file.startsWith("\\")
                if (isAbsolutePath || !localFolderHandle) {
                  let subUrl = `/api/stream?path=${encodeURIComponent(sub.file)}`
                  if (localServerPath) {
                    subUrl += `&base=${encodeURIComponent(localServerPath)}`
                  }
                  resolvedSubs.push({
                    src: subUrl,
                    label: sub.label || "Local Sub",
                    language: sub.language || "en"
                  })
                } else if (localFolderHandle) {
                  try {
                    const subUrl = await getLocalFileUrl(localFolderHandle, sub.file)
                    resolvedSubs.push({
                      src: subUrl,
                      label: sub.label || "Local Sub",
                      language: sub.language || "en"
                    })
                  } catch (e) {}
                }
              }
            }
          }
          
          setPlayerUrl(videoUrl)
          setIsDirectPlayer(isUrlDirect)
          setIsM3U8(relativeFilePath.toLowerCase().includes(".m3u8") || relativeFilePath.toLowerCase().includes("/hls/"))
          setSubtitles(resolvedSubs)
          setScraping(false)
          return
        }

        if (!localFolderHandle) {
          if (typeof window === "undefined" || typeof (window as any).showDirectoryPicker !== "function") {
            setLocalFolderError("Local Folder Access is not supported on this browser, and this item is not in your browser-stored Local Library.")
            setPlayerUrl("")
            setScraping(false)
            return
          }
          setLocalFolderNeedsSetup(true)
          setPlayerUrl("")
          setIsDirectPlayer(false)
          setIsM3U8(false)
          setSubtitles([])
          setScraping(false)
          return
        }
        
        try {
          const hasPerm = await verifyPermission(localFolderHandle)
          if (!hasPerm) {
            if (cancelled) return
            setLocalFolderNeedsSetup(true)
            setPlayerUrl("")
            setIsDirectPlayer(false)
            setIsM3U8(false)
            setSubtitles([])
            setScraping(false)
            return
          }
          
          setLocalFolderNeedsSetup(false)
          const items = await loadRinkJson(localFolderHandle)
          if (cancelled) return
          
          const folderMatch = items.find((item) => String(item.id) === String(id))
          if (!folderMatch) {
            setLocalFolderError(`Not found in rink.json (ID ${id})`)
            setPlayerUrl("")
            setScraping(false)
            return
          }

          if (folderMatch.type && folderMatch.type !== mediaType) {
            setMediaType(folderMatch.type)
            const url = new URL(window.location.href)
            url.searchParams.set("type", folderMatch.type)
            window.history.replaceState(null, "", url.pathname + url.search)
            return
          }
          
          let relativeFilePath = ""
          if (mediaType === "movie") {
            relativeFilePath = folderMatch.file || ""
          } else {
            relativeFilePath = folderMatch.seasons?.[currentSeason]?.[currentEpisode] || ""
          }
          
          if (!relativeFilePath) {
            setLocalFolderError(`No file mapped for this ${mediaType === "movie" ? "movie" : `Season ${currentSeason} Episode ${currentEpisode}`}`)
            setPlayerUrl("")
            setScraping(false)
            return
          }
          
          const videoUrl = await getLocalFileUrl(localFolderHandle, relativeFilePath)
          if (cancelled) return
          
          const resolvedSubs: any[] = []
          if (Array.isArray(folderMatch.subtitles)) {
            for (const sub of folderMatch.subtitles) {
              try {
                const subUrl = await getLocalFileUrl(localFolderHandle, sub.file)
                resolvedSubs.push({
                  src: subUrl,
                  label: sub.label || "Local Sub",
                  language: sub.language || "en"
                })
              } catch (e) {}
            }
          }
          
          setPlayerUrl(videoUrl)
          setIsDirectPlayer(true)
          setIsM3U8(relativeFilePath.toLowerCase().includes(".m3u8") || relativeFilePath.toLowerCase().includes("/hls/"))
          setSubtitles(resolvedSubs)
          setScraping(false)
        } catch (err: any) {
          if (!cancelled) {
            setLocalFolderError(err.message || "Failed to load local file")
            setPlayerUrl("")
            setScraping(false)
          }
        }
        return
      }

      setLocalFolderNeedsSetup(false)
      try {
        const res = await fetch(`/api/scrape?id=${id}&type=${mediaType}&season=${currentSeason}&episode=${currentEpisode}&provider=${activeServer}`)
        if (cancelled) return
        if (!res.ok) {
          fallbackToNextServer()
          return
        }
        const data = await res.json()
        if (!data || !data.url) {
          fallbackToNextServer()
          return
        }
        setPlayerUrl(data.url)
        setIsDirectPlayer(data.isDirect || false)
        setIsM3U8(data.isM3U8 || false)
        setSubtitles(data.subtitles || [])
        setScraping(false)
      } catch {
        if (!cancelled) {
          fallbackToNextServer()
        }
      }
    }
    fetchScraped()
    return () => {
      cancelled = true
    }
  }, [id, mediaType, currentSeason, currentEpisode, activeServer, localFolderHandle, retryTrigger, localServerPath])

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
    const posterUrl = info?.poster
      ? `https://image.tmdb.org/t/p/w500${info.poster}`
      : ""
    return (
      <div suppressHydrationWarning className="nano-loading-overlay">
        {posterUrl && (
          <>
            <div style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${posterUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              opacity: 0.3,
              filter: "blur(20px)",
              transform: "scale(1.1)",
              zIndex: 0,
            }} />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(10,10,12,0.6) 0%, rgba(10,10,12,0.95) 100%)",
              zIndex: 1,
            }} />
          </>
        )}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
          <h1 
            className="nano-shimmer-text"
            style={{
              fontSize: "3.5rem",
              fontWeight: 900,
              letterSpacing: "-0.05em",
              textTransform: "lowercase",
              margin: 0,
            }}
          >
            {messages[msgIndex]}
          </h1>
        </div>
      </div>
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



  const handleConnectFolder = async () => {
    if (typeof window === "undefined" || typeof (window as any).showDirectoryPicker !== "function") {
      setLocalFolderError("Local Folder Access is not supported on this browser.")
      return
    }
    try {
      const handle = await (window as any).showDirectoryPicker()
      await storeHandle(handle)
      setLocalFolderHandle(handle)
      setLocalFolderNeedsSetup(false)
      setLocalFolderError("")
    } catch (e: any) {
      setLocalFolderError(e.message || "Failed to select directory")
    }
  }

  const renderPlayerContent = () => {
    if (localFolderNeedsSetup) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", backgroundColor: "#0a0a0a", color: "#fff", gap: "16px", padding: "20px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600 }}>Local Folder Setup</h2>
          <p style={{ fontSize: "14px", opacity: 0.7, maxWidth: "450px", textAlign: "center" }}>
            Select the local folder containing your video files and a <code>rink.json</code> configuration.
          </p>
          <button 
            onClick={handleConnectFolder}
            style={{ padding: "12px 24px", fontSize: "14px", fontWeight: 600, backgroundColor: "var(--accent-color)", color: "#000", border: "none", borderRadius: "8px", cursor: "pointer" }}
          >
            Select Local Folder
          </button>
          {localFolderError && <p style={{ color: "#ff4a4a", fontSize: "13px" }}>{localFolderError}</p>}
        </div>
      )
    }
    
    if (localFolderError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", backgroundColor: "#0a0a0a", color: "#fff", gap: "16px", padding: "20px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 600 }}>Local Library Error</h2>
          <p style={{ color: "#ff4a4a", fontSize: "14px", textAlign: "center", maxWidth: "450px" }}>{localFolderError}</p>
          <button 
            onClick={handleConnectFolder}
            style={{ padding: "10px 20px", fontSize: "13px", fontWeight: 600, backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
          >
            Change Local Folder
          </button>
        </div>
      )
    }

    if (!playerUrl) {
      const otherServers = SERVERS.filter(s => s.id !== activeServer);
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", backgroundColor: "#0a0a0a", color: "#fff", gap: "20px", padding: "20px" }}>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--accent-color)" }}>No stream available</div>
          <p style={{ fontSize: "14px", opacity: 0.7, maxWidth: "420px", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            We couldn't resolve a streaming source on <strong>{SERVERS.find(s => s.id === activeServer)?.name || activeServer}</strong>.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
            <button
              onClick={() => setRetryTrigger(prev => prev + 1)}
              style={{
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 600,
                backgroundColor: "var(--accent-color)",
                color: "#000",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
            >
              Try Again
            </button>
            {otherServers.map(server => (
              <button
                key={server.id}
                onClick={() => setActiveServer(server.id)}
                style={{
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "background-color 0.2s"
                }}
              >
                Use {server.name}
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (playerType === "vidstack") {
      return (
        <VidstackPlayer
          embedUrl={playerUrl}
          isDirect={isDirectPlayer}
          isM3U8={isM3U8}
          title={displayTitle}
          subtitles={subtitles}
        />
      )
    }

    return (
      <Player
        embedUrl={playerUrl}
        isDirect={isDirectPlayer}
        isM3U8={isM3U8}
        title={displayTitle}
        servers={SERVERS}
        activeServer={activeServer}
        setActiveServer={setActiveServer}
        isTv={mediaType === "tv"}
        showEpisodes={showEpisodes}
        setShowEpisodes={setShowEpisodes}
        subtitles={subtitles}
      />
    )
  }

  const displayTitle =
    mediaType === "tv"
      ? `${info?.title || ""} - Season ${currentSeason} Episode ${currentEpisode}`
      : info?.title || ""

  return (
    <div className="nano-watch-wrapper" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Controls
        displayTitle={displayTitle}
        servers={SERVERS}
        activeServer={activeServer}
        setActiveServer={setActiveServer}
        isTv={mediaType === "tv"}
        showEpisodes={showEpisodes}
        setShowEpisodes={setShowEpisodes}
      />

      <div className="nano-watch-content" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {renderPlayerContent()}
        {mediaType === "tv" && showEpisodes && (
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
