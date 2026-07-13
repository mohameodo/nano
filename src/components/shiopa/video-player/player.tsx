import { useState, useEffect, useRef, useCallback } from "react"
import Hls from "hls.js"
import { IoPlay, IoPause, IoSettings } from "react-icons/io5"
import { MdSubtitles } from "react-icons/md"
import { HiMiniRectangleStack } from "react-icons/hi2"
import { BiSolidVolumeFull } from "react-icons/bi"
import { ImVolumeMute2 } from "react-icons/im"
import { RiFullscreenFill, RiFullscreenExitFill } from "react-icons/ri"
import { TRANSLATIONS } from "../locales/translations"

interface ServerInfo {
  id: string
  name: string
  status?: "queued" | "checking" | "online" | "error"
}

interface PlayerProps {
  embedUrl: string
  isDirect: boolean
  isM3U8?: boolean
  title?: string
  servers?: ServerInfo[]
  activeServer?: string
  setActiveServer?: (server: string) => void
  isTv?: boolean
  showEpisodes?: boolean
  setShowEpisodes?: (show: boolean) => void
  subtitles?: any[]
  qualities?: Array<{ label: string; url: string }>
  locale?: string
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onError?: (error: string) => void
  onFatalError?: () => void
}

interface ProgressBarProps {
  currentTime: number
  duration: number
  buffered: number
  onSeek: (time: number) => void
}

function isAppleMobile() {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

function ProgressBar({ currentTime, duration, buffered, onSeek }: ProgressBarProps) {
  const progressRef = useRef<HTMLDivElement>(null)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const progress = duration ? (currentTime / duration) * 100 : 0
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0

  const getTimeFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!progressRef.current) return null
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    const validDuration = (isFinite(duration) && duration > 0) ? duration : 0
    return { time: percent * validDuration, x }
  }, [duration])

  const getTimeFromTouch = useCallback((e: TouchEvent | React.TouchEvent) => {
    if (!progressRef.current || !e.touches.length) return null
    const rect = progressRef.current.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    const validDuration = (isFinite(duration) && duration > 0) ? duration : 0
    return { time: percent * validDuration, x }
  }, [duration])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const result = getTimeFromEvent(e)
      if (!result) return
      setHoverTime(result.time)
      setHoverX(result.x)
      if (isDragging) onSeek(result.time)
    },
    [getTimeFromEvent, isDragging, onSeek]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(true)
      const result = getTimeFromEvent(e)
      if (result) onSeek(result.time)
    },
    [getTimeFromEvent, onSeek]
  )

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) setHoverTime(null)
  }, [isDragging])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation()
      setIsDragging(true)
      const result = getTimeFromTouch(e)
      if (result) {
        setHoverTime(result.time)
        setHoverX(result.x)
        onSeek(result.time)
      }
    },
    [getTimeFromTouch, onSeek]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.stopPropagation()
      const result = getTimeFromTouch(e)
      if (result) {
        setHoverTime(result.time)
        setHoverX(result.x)
        onSeek(result.time)
      }
    },
    [getTimeFromTouch, onSeek]
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    setHoverTime(null)
  }, [])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const result = getTimeFromEvent(e)
      if (result) {
        setHoverTime(result.time)
        setHoverX(result.x)
        onSeek(result.time)
      }
    }

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setHoverTime(null)
      }
    }

    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove)
      window.addEventListener("mouseup", handleGlobalMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove)
      window.removeEventListener("mouseup", handleGlobalMouseUp)
    }
  }, [isDragging, getTimeFromEvent, onSeek])

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00"
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const parts = []
    if (hrs > 0) parts.push(hrs.toString().padStart(2, "0"))
    parts.push(mins.toString().padStart(2, "0"))
    parts.push(secs.toString().padStart(2, "0"))
    return parts.join(":")
  }

  return (
    <div className="nano-progress-container">
      {hoverTime !== null && (
        <div className="nano-progress-tooltip" style={{ left: hoverX }}>
          <div className="nano-progress-tooltip-inner">{formatTime(hoverTime)}</div>
        </div>
      )}

      <div
        ref={progressRef}
        className={`nano-progress-track ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="nano-progress-buffered" style={{ width: `${bufferedPercent}%` }} />
        <div className="nano-progress-current" style={{ width: `${progress}%` }} />
        <div className="nano-progress-handle" style={{ left: `calc(${progress}% - 6px)` }} />
        {hoverTime !== null && (
          <div className="nano-progress-hover-line" style={{ left: hoverX }} />
        )}
      </div>
    </div>
  )
}

export default function Player({
  embedUrl,
  isDirect,
  isM3U8 = false,
  title,
  servers = [],
  activeServer = "",
  setActiveServer,
  isTv = false,
  showEpisodes = false,
  setShowEpisodes,
  subtitles = [],
  qualities = [],
  locale = "en",
  onEnded,
  onTimeUpdate,
  onDurationChange,
  onError,
  onFatalError,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentUrlRef = useRef<string>("")
  const appleMobile = isAppleMobile()

  const t = TRANSLATIONS[locale] || TRANSLATIONS.en
  const label = (key: string, fallback: string, vars?: Record<string, string | number>) => {
    let value = t[key] || TRANSLATIONS.en?.[key] || fallback
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(`{${k}}`, String(v))
      }
    }
    return value
  }

  const [activeUrl, setActiveUrl] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [subtitleOpen, setSubtitleOpen] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState(() => {
    const idx = subtitles.findIndex((track) => track.default)
    return idx !== -1 ? idx : -1
  })
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [serverOpen, setServerOpen] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const menuOpen = serverOpen || settingsOpen || subtitleOpen

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const tracks = video.textTracks
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = i === activeSubtitle ? "showing" : "disabled"
    }
  }, [activeSubtitle, subtitles, embedUrl])

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate
  }, [playbackRate])

  const isHls = useCallback((url: string) => {
    return url.toLowerCase().includes(".m3u8") || url.toLowerCase().includes("/hls/")
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.setAttribute("playsinline", "true")
    video.setAttribute("webkit-playsinline", "true")
    video.setAttribute("x-webkit-airplay", "deny")
    video.controls = false
    video.disablePictureInPicture = true
    try {
      ;(video as any).disableRemotePlayback = true
    } catch {}
  }, [isDirect, embedUrl])

  const attachSource = useCallback((url: string, m3u8Hint?: boolean) => {
    const video = videoRef.current
    if (!video) return
    currentUrlRef.current = url
    setIsLoading(true)

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    video.removeAttribute("src")
    video.load()

    const isHlsUrl = m3u8Hint || isHls(url)
    const canNativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== ""

    if (isHlsUrl && Hls.isSupported() && !appleMobile) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 180,
        maxBufferSize: 180 * 1024 * 1024,
        backBufferLength: 30,
        startLevel: -1,
        autoStartLoad: true,
        capLevelToPlayerSize: true,
        enableWorker: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false
        },
      })
      hlsRef.current = hls

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        const msg = `${data.type}:${data.details || "error"}`
        onError?.(msg)
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError()
            break
          default:
            hls.destroy()
            hlsRef.current = null
            setIsLoading(false)
            onFatalError?.()
            break
        }
      })

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        video.play().catch(() => {})
      })

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        setIsLoading(false)
      })

      hls.loadSource(url)
      hls.attachMedia(video)
    } else if (isHlsUrl && canNativeHls) {
      video.src = url
      video.addEventListener("loadedmetadata", () => setIsLoading(false), { once: true })
      video.addEventListener("canplay", () => setIsLoading(false), { once: true })
      video.addEventListener("playing", () => setIsLoading(false), { once: true })
      video.addEventListener("error", () => {
        setIsLoading(false)
        onError?.("mediaerror:nativehls")
        onFatalError?.()
      }, { once: true })
      video.play().catch(() => {})
    } else {
      video.src = url
      video.addEventListener("loadedmetadata", () => setIsLoading(false), { once: true })
      video.addEventListener("canplay", () => setIsLoading(false), { once: true })
      video.addEventListener("playing", () => setIsLoading(false), { once: true })
      video.addEventListener("error", () => {
        setIsLoading(false)
        onError?.("mediaerror:src")
        onFatalError?.()
      }, { once: true })
      video.play().catch(() => {})
    }
  }, [appleMobile, isHls, onError, onFatalError])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setBuffered(0)
    setIsLoading(true)
    if (embedUrl) {
      setActiveUrl(embedUrl)
      attachSource(embedUrl, isM3U8)
    }
  }, [embedUrl, isM3U8, attachSource])

  const handleQualitySelect = (url: string) => {
    if (url === activeUrl) return
    const video = videoRef.current
    if (!video) return
    const prevTime = video.currentTime
    const prevPlaying = !video.paused

    setActiveUrl(url)
    attachSource(url, isM3U8)

    const onCanPlay = () => {
      video.currentTime = prevTime
      if (prevPlaying) video.play().catch(() => {})
      video.removeEventListener("canplay", onCanPlay)
    }
    video.addEventListener("canplay", onCanPlay)
  }

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.removeAttribute("src")
        videoRef.current.load()
      }
      if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [])

  const showControlsDelayed = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !menuOpen) setShowControls(false)
    }, 3500)
  }, [isPlaying, menuOpen])

  const showControlsNow = useCallback(() => {
    showControlsDelayed()
  }, [showControlsDelayed])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
    showControlsDelayed()
  }

  const handleProgress = () => {
    const video = videoRef.current
    if (!video) return
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1))
    }
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    const time = videoRef.current.currentTime
    setCurrentTime(time)
    onTimeUpdate?.(time)
    handleProgress()
  }

  const handleDurationChange = () => {
    if (!videoRef.current) return
    const next = videoRef.current.duration
    setDuration(next)
    onDurationChange?.(next)
  }

  const handleSeek = (time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
    setCurrentTime(time)
    showControlsDelayed()
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const val = parseFloat(e.target.value)
    videoRef.current.volume = val
    setVolume(val)
    if (val > 0) {
      videoRef.current.muted = false
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const nextMuted = !isMuted
    videoRef.current.muted = nextMuted
    setIsMuted(nextMuted)
  }

  const exitCssFullscreen = () => {
    containerRef.current?.classList.remove("nano-player-ios-fs")
    document.documentElement.classList.remove("nano-ios-fs-active")
    document.body.classList.remove("nano-ios-fs-active")
  }

  const enterCssFullscreen = () => {
    containerRef.current?.classList.add("nano-player-ios-fs")
    document.documentElement.classList.add("nano-ios-fs-active")
    document.body.classList.add("nano-ios-fs-active")
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    const container = containerRef.current as any

    if (appleMobile) {
      if (isFullscreen) {
        exitCssFullscreen()
        setIsFullscreen(false)
      } else {
        enterCssFullscreen()
        setIsFullscreen(true)
        try {
          ;(screen.orientation as any)?.lock?.("landscape")
        } catch {}
      }
      showControlsDelayed()
      return
    }

    const isCurrentlyFullscreen =
      !!document.fullscreenElement ||
      !!(document as any).webkitFullscreenElement

    if (isCurrentlyFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if ((document as any).webkitExitFullscreen) {
        ;(document as any).webkitExitFullscreen()
      }
      try {
        screen.orientation?.unlock?.()
      } catch {}
      setIsFullscreen(false)
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          enterCssFullscreen()
          setIsFullscreen(true)
        })
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen()
      } else {
        enterCssFullscreen()
        setIsFullscreen(true)
      }
      try {
        ;(screen.orientation as any)?.lock?.("landscape")
      } catch {}
      setIsFullscreen(true)
    }
    showControlsDelayed()
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs =
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!containerRef.current?.classList.contains("nano-player-ios-fs")
      setIsFullscreen(fs)
      if (!fs) exitCssFullscreen()
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      exitCssFullscreen()
    }
  }, [])

  const handleVolumeMouseEnter = () => {
    if (appleMobile) return
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current)
    setShowVolumeSlider(true)
  }

  const handleVolumeMouseLeave = () => {
    if (appleMobile) return
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false)
    }, 300)
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00"
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const parts = []
    if (hrs > 0) parts.push(hrs.toString().padStart(2, "0"))
    parts.push(mins.toString().padStart(2, "0"))
    parts.push(secs.toString().padStart(2, "0"))
    return parts.join(":")
  }

  if (!isDirect) {
    return (
      <div className="nano-player-wrapper" style={{ flex: 1, position: "relative", paddingTop: "70px" }}>
        <iframe
          src={embedUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`nano-player-container ${showControls ? "nano-player-controls-active" : ""}`}
      onMouseMove={showControlsNow}
      onMouseLeave={() => {
        if (isPlaying && !menuOpen) setShowControls(false)
      }}
      onClick={showControlsNow}
      onTouchStart={showControlsNow}
      onTouchEnd={showControlsDelayed}
    >
      <video
        ref={videoRef}
        className="nano-video-element"
        playsInline
        webkitplaysinline="true"
        autoPlay
        controls={false}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        preload="auto"
        onClick={(e) => {
          e.stopPropagation()
          togglePlay()
        }}
        onPlay={() => {
          setIsPlaying(true)
          showControlsDelayed()
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onProgress={handleProgress}
        onEnded={() => onEnded?.()}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onLoadedData={() => setIsLoading(false)}
        style={{ width: "100%", height: "100%" }}
        crossOrigin="anonymous"
      >
        {subtitles.map((track, index) => (
          <track
            key={index}
            src={track.src}
            label={track.label}
            srcLang={track.language || track.srclang}
            kind="subtitles"
            default={track.default}
          />
        ))}
      </video>

      {isLoading && (
        <div className="nano-player-loading-overlay">
          <div className="tvko-spinner" />
        </div>
      )}

      <div
        className={`nano-player-controls ${showControls ? "nano-player-controls-visible" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="nano-player-controls-top">
          {title && <span className="nano-player-title">{title}</span>}
        </div>

        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onSeek={handleSeek}
        />

        <div className="nano-controls-row">
          <button type="button" className="nano-control-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <IoPause /> : <IoPlay />}
          </button>

          {!appleMobile && (
            <div
              className="nano-volume-container"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              <button type="button" className="nano-control-btn" onClick={toggleMute}>
                {isMuted || volume === 0 ? <ImVolumeMute2 /> : <BiSolidVolumeFull />}
              </button>

              <div className={`nano-volume-slider-wrapper ${showVolumeSlider ? "visible" : ""}`}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="nano-volume-slider"
                  style={{ "--volume-percent": `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties}
                />
              </div>
            </div>
          )}

          <span className="nano-player-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="nano-controls-right">
            {isTv && setShowEpisodes && (
              <button
                type="button"
                className={`nano-control-btn ${showEpisodes ? "active" : ""}`}
                onClick={() => setShowEpisodes(!showEpisodes)}
                aria-label={label("episodes", "Episodes")}
              >
                <HiMiniRectangleStack />
              </button>
            )}



            {subtitles.length > 0 && (
              <div className="nano-server-control">
                <button
                  type="button"
                  className={`nano-control-btn ${activeSubtitle !== -1 ? "active" : ""}`}
                  onClick={() => {
                    setSubtitleOpen(!subtitleOpen)
                    setSettingsOpen(false)
                    setServerOpen(false)
                  }}
                  aria-label={label("playerSubtitles", "Subtitles")}
                >
                  <MdSubtitles />
                </button>
                {subtitleOpen && (
                  <div className="nano-player-dropdown" style={{ width: "220px", bottom: "100%", right: 0 }}>
                    <div className="nano-dropdown-title">{label("playerSubtitles", "Subtitles")}</div>
                    <div className="nano-dropdown-list">
                      <button
                        type="button"
                        className={`nano-dropdown-item ${activeSubtitle === -1 ? "active" : ""}`}
                        onClick={() => {
                          setActiveSubtitle(-1)
                          setSubtitleOpen(false)
                        }}
                      >
                        {label("playerOff", "Off")}
                      </button>
                      {subtitles.map((track, idx) => (
                        <button
                          type="button"
                          key={idx}
                          className={`nano-dropdown-item ${activeSubtitle === idx ? "active" : ""}`}
                          onClick={() => {
                            setActiveSubtitle(idx)
                            setSubtitleOpen(false)
                          }}
                        >
                          {track.label || `Track ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="nano-server-control" style={{ position: "relative" }}>
              <button
                type="button"
                className={`nano-control-btn ${settingsOpen ? "active" : ""}`}
                onClick={() => {
                  setSettingsOpen(!settingsOpen)
                  setServerOpen(false)
                  setSubtitleOpen(false)
                }}
                aria-label={label("setSectionPlayer", "player")}
              >
                <IoSettings />
              </button>
              {settingsOpen && (
                <div className="nano-player-dropdown nano-player-dropdown-servers" style={{ bottom: "100%", right: 0, minWidth: "180px" }}>
                  {qualities.length > 0 && (
                    <>
                      <div className="nano-dropdown-title">{label("playerQuality", "Quality")}</div>
                      <div className="nano-dropdown-list">
                        {qualities.map((q, idx) => (
                          <button
                            type="button"
                            key={idx}
                            className={`nano-dropdown-item ${activeUrl === q.url ? "active" : ""}`}
                            onClick={() => {
                              handleQualitySelect(q.url)
                              setSettingsOpen(false)
                            }}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {servers.length > 0 && setActiveServer && (
                    <>
                      <div className="nano-dropdown-title" style={qualities.length > 0 ? { marginTop: "12px" } : undefined}>
                        {label("playerServers", "Servers")}
                      </div>
                      <div className="nano-dropdown-list">
                        {servers.map((server) => (
                          <button
                            type="button"
                            key={server.id}
                            className={`nano-dropdown-item ${activeServer === server.id ? "active" : ""}`}
                            onClick={() => {
                              setActiveServer(server.id)
                              setSettingsOpen(false)
                            }}
                          >
                            {server.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="nano-dropdown-title" style={(qualities.length > 0 || servers.length > 0) ? { marginTop: "12px" } : undefined}>
                    {label("playerSpeed", "Speed")}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        type="button"
                        key={rate}
                        className={`nano-dropdown-item ${playbackRate === rate ? "active" : ""}`}
                        onClick={() => {
                          setPlaybackRate(rate)
                          if (videoRef.current) videoRef.current.playbackRate = rate
                        }}
                        style={{ flex: 1, textAlign: "center", padding: "6px 4px", fontSize: "12px", minWidth: "48px" }}
                      >
                        {rate === 1 ? "1x" : `${rate}x`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button type="button" className="nano-control-btn" onClick={toggleFullscreen}>
              {isFullscreen ? <RiFullscreenExitFill /> : <RiFullscreenFill />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
