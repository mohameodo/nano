import { useState, useEffect, useRef, useCallback } from "react"
import Hls from "hls.js"
import { IoPlay, IoPause } from "react-icons/io5"
import { BiSolidVolumeFull } from "react-icons/bi"
import { ImVolumeMute2 } from "react-icons/im"
import { RiFullscreenFill, RiFullscreenExitFill } from "react-icons/ri"
import { MdDns } from "react-icons/md"
import { HiMiniRectangleStack } from "react-icons/hi2"

interface ServerInfo {
  id: string
  name: string
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
}

interface ProgressBarProps {
  currentTime: number
  duration: number
  buffered: number
  onSeek: (time: number) => void
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
      if (isDragging) {
        onSeek(result.time)
      }
    },
    [getTimeFromEvent, isDragging, onSeek]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(true)
      const result = getTimeFromEvent(e)
      if (result) {
        onSeek(result.time)
      }
    },
    [getTimeFromEvent, onSeek]
  )

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverTime(null)
    }
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
        <div
          className="nano-progress-tooltip"
          style={{ left: hoverX }}
        >
          <div className="nano-progress-tooltip-inner">
            {formatTime(hoverTime)}
          </div>
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
        <div
          className="nano-progress-buffered"
          style={{ width: `${bufferedPercent}%` }}
        />

        <div
          className="nano-progress-current"
          style={{ width: `${progress}%` }}
        />

        <div
          className="nano-progress-handle"
          style={{ left: `calc(${progress}% - 6px)` }}
        />

        {hoverTime !== null && (
          <div
            className="nano-progress-hover-line"
            style={{ left: hoverX }}
          />
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
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentUrlRef = useRef<string>("")

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

  const isHls = useCallback((url: string) => {
    return url.toLowerCase().includes(".m3u8") || url.toLowerCase().includes("/hls/")
  }, [])

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

    if (isHlsUrl && Hls.isSupported()) {
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
        if (data.fatal) {
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
              break
          }
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
    } else {
      video.src = url
      video.addEventListener("loadedmetadata", () => setIsLoading(false), { once: true })
      video.addEventListener("canplay", () => setIsLoading(false), { once: true })
      video.addEventListener("playing", () => setIsLoading(false), { once: true })
      video.play().catch(() => {})
    }
  }, [isHls])

  useEffect(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setBuffered(0)
    setIsLoading(true)
    if (embedUrl) attachSource(embedUrl, isM3U8)
  }, [embedUrl, isM3U8, attachSource])

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.src = ""
      }
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current)
      }
    }
  }, [])

  const showControlsDelayed = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }, [isPlaying])

  const showControlsNow = useCallback(() => {
    showControlsDelayed()
  }, [showControlsDelayed])

  const hideControls = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    if (isPlaying) setShowControls(false)
  }, [isPlaying])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(() => {})
    }
  }

  const handleProgress = () => {
    const video = videoRef.current
    if (!video) return
    if (video.buffered.length > 0) {
      const end = video.buffered.end(video.buffered.length - 1)
      setBuffered(end)
    }
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setCurrentTime(videoRef.current.currentTime)
    handleProgress()
  }

  const handleDurationChange = () => {
    if (!videoRef.current) return
    setDuration(videoRef.current.duration)
  }

  const handleSeek = (time: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
    setCurrentTime(time)
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

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    const video = videoRef.current as any
    const container = containerRef.current as any
    const isCurrentlyFullscreen = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement || !!video?.webkitDisplayingFullscreen

    if (isCurrentlyFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if (video?.webkitExitFullscreen) {
        video.webkitExitFullscreen()
      }
      try {
        screen.orientation?.unlock?.()
      } catch {}
      setIsFullscreen(false)
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          if (video?.webkitEnterFullscreen) {
            video.webkitEnterFullscreen()
          }
        })
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen()
      } else if (video?.webkitEnterFullscreen) {
        video.webkitEnterFullscreen()
      }
      try {
        (screen.orientation as any)?.lock?.("landscape")
      } catch {}
      setIsFullscreen(true)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement || !!(videoRef.current as any)?.webkitDisplayingFullscreen
      setIsFullscreen(fs)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleVolumeMouseEnter = () => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current)
    setShowVolumeSlider(true)
  }

  const handleVolumeMouseLeave = () => {
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
      className="nano-player-container"
      onMouseMove={showControlsNow}
      onMouseLeave={() => hideControls()}
      onClick={showControlsNow}
      onTouchStart={showControlsNow}
      onTouchEnd={() => hideControls()}
    >
      <video
        ref={videoRef}
        className="nano-video-element"
        onClick={togglePlay}
        onPlay={() => { setIsPlaying(true); showControlsDelayed() }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onProgress={handleProgress}
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

      <div className={`nano-player-controls ${showControls ? "nano-player-controls-visible" : ""}`}>
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
          <button className="nano-control-btn" onClick={togglePlay}>
            {isPlaying ? <IoPause /> : <IoPlay />}
          </button>

          <div
            className="nano-volume-container"
            onMouseEnter={handleVolumeMouseEnter}
            onMouseLeave={handleVolumeMouseLeave}
          >
            <button className="nano-control-btn" onClick={toggleMute}>
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

          <span className="nano-player-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="nano-controls-right">
            {isTv && setShowEpisodes && (
              <button
                className={`nano-control-btn ${showEpisodes ? "active" : ""}`}
                onClick={() => setShowEpisodes(!showEpisodes)}
              >
                <HiMiniRectangleStack />
              </button>
            )}

            {servers.length > 0 && setActiveServer && (
              <div className="nano-server-control">
                <button className="nano-control-btn" onClick={() => setServerOpen(!serverOpen)}>
                  <MdDns />
                </button>
                {serverOpen && (
                  <div className="nano-player-dropdown nano-player-dropdown-servers">
                    <div className="nano-dropdown-title">Servers</div>
                    <div className="nano-dropdown-list">
                      {servers.map((server) => (
                        <button
                          key={server.id}
                          className={`nano-dropdown-item ${activeServer === server.id ? "active" : ""}`}
                          onClick={() => { setActiveServer(server.id); setServerOpen(false) }}
                        >
                          {server.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button className="nano-control-btn" onClick={toggleFullscreen}>
              {isFullscreen ? <RiFullscreenExitFill /> : <RiFullscreenFill />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
