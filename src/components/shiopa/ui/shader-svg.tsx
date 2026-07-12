import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { NANO_PET_BODY_PATH, NANO_PET_VIEWBOX } from "./nano-pet-shape"
import { isHorrorQuery } from "./nano-pet-mood"

interface NanoPetProps {
  lines: string[]
  madLines?: string[]
  horrorLines?: string[]
  searchQuery?: string
  ariaLabel?: string
  className?: string
  locale?: string
  ghostHat?: boolean
  ghostFlying?: boolean
  woozlitApiKey?: string
}

type PetMood = "normal" | "mad" | "horror"

const MAD_HIT_WINDOW_MS = 900
const MAD_HIT_COUNT = 4
const MAD_DURATION_MS = 3500

function clampOffset(value: number, max: number) {
  return Math.max(-max, Math.min(max, value))
}

function renderMarkdown(text: string) {
  if (!text) return null
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|__.*?__|__.*?_|_.*?_)/g)
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={idx}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={idx}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

export function NanoPet({
  lines,
  madLines = [],
  horrorLines = [],
  searchQuery = "",
  ariaLabel,
  className = "",
  locale = "en",
  ghostHat: _ghostHat = false,
  ghostFlying = false,
  woozlitApiKey = "",
}: NanoPetProps) {
  const ghostHat = false;

  const svgRef = useRef<SVGSVGElement>(null)
  const hitTimesRef = useRef<number[]>([])
  const madTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [lineIndex, setLineIndex] = useState(0)
  const [madActive, setMadActive] = useState(false)
  const [madLineIndex, setMadLineIndex] = useState(0)

  const [customSpeech, setCustomSpeech] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)
  const [pos, setPos] = useState({ x: 100, y: 100 })
  const [isTyping, setIsTyping] = useState(false)
  const [isSleeping, setIsSleeping] = useState(false)
  const [realtimeGuess, setRealtimeGuess] = useState<string | null>(null)
  const [idleAction, setIdleAction] = useState<"none" | "sing">("none")

  const linesKey = lines.join("\0")
  const speechLines = useMemo(
    () => lines.filter((line) => line && line.trim().length > 0),
    [linesKey]
  )

  const horrorActive = useMemo(() => isHorrorQuery(searchQuery), [searchQuery])
  const mood: PetMood = horrorActive ? "horror" : madActive ? "mad" : "normal"

  useEffect(() => {
    setLineIndex(0)
    setCustomSpeech("hello human! welcome to shiopa!")
  }, [linesKey])

  useEffect(() => {
    if (speechLines.length < 2 || mood !== "normal" || isSleeping) return
    const timer = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % speechLines.length)
    }, 22000)
    return () => clearInterval(timer)
  }, [speechLines.length, mood, isSleeping])

  useEffect(() => {
    return () => {
      if (madTimerRef.current) clearTimeout(madTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    const onMove = (e: MouseEvent) => {
      if (frame || isSleeping) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const rect = svgRef.current?.getBoundingClientRect()
        if (!rect) return
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height * 0.42
        const deltaX = (e.clientX - centerX) * 0.1
        const deltaY = (e.clientY - centerY) * 0.1
        setEyeOffset({
          x: clampOffset(deltaX, 9),
          y: clampOffset(deltaY, 8),
        })
      })
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [isSleeping])

  useEffect(() => {
    if (!ghostFlying) return
    let animationFrameId: number
    let currentX = pos.x
    let currentY = pos.y
    const speedScale = mood === "horror" ? 8 : 1.5
    let vx = (Math.random() > 0.5 ? 1 : -1) * speedScale
    let vy = (Math.random() > 0.5 ? 1 : -1) * speedScale

    const update = () => {
      const width = 120
      const height = 150
      const maxX = window.innerWidth - width
      const maxY = window.innerHeight - height

      currentX += vx
      currentY += vy

      if (currentX <= 0) {
        currentX = 0
        vx = -vx
      } else if (currentX >= maxX) {
        currentX = maxX
        vx = -vx
      }

      if (currentY <= 0) {
        currentY = 0
        vy = -vy
      } else if (currentY >= maxY) {
        currentY = maxY
        vy = -vy
      }

      const time = Date.now() * 0.003
      const wiggleX = mood === "horror" ? (Math.sin(time * 5) * 2) : (Math.sin(time) * 0.5)
      const wiggleY = mood === "horror" ? (Math.cos(time * 5) * 2) : (Math.cos(time) * 0.5)

      setPos({ x: currentX + wiggleX, y: currentY + wiggleY })
      animationFrameId = requestAnimationFrame(update)
    }

    animationFrameId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animationFrameId)
  }, [ghostFlying, mood])

  const handleHit = useCallback(() => {
    if (horrorActive) return

    setIsSleeping(false)
    setIdleAction("none")

    const now = Date.now()
    hitTimesRef.current = hitTimesRef.current.filter((t) => now - t < MAD_HIT_WINDOW_MS)
    hitTimesRef.current.push(now)

    if (hitTimesRef.current.length >= MAD_HIT_COUNT) {
      hitTimesRef.current = []
      const madOptions = madLines.filter((line) => line && line.trim().length > 0)
      let selectedText = ""
      if (madOptions.length > 0) {
        const idx = Math.floor(Math.random() * madOptions.length)
        setMadLineIndex(idx)
        selectedText = madOptions[idx]
      }
      setMadActive(true)
      if (madTimerRef.current) clearTimeout(madTimerRef.current)
      madTimerRef.current = setTimeout(() => setMadActive(false), MAD_DURATION_MS)
      if (selectedText) setCustomSpeech(selectedText)
      return
    }

    if (woozlitApiKey && woozlitApiKey.trim()) {
      setApiLoading(true)
      const prompt = searchQuery.trim()
        ? `The user is searching for: "${searchQuery}". Say something cute or react to this.`
        : "Say a cute friendly greeting or a movie fact."

      fetch("/api/ghost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a cute little friendly ghost. Always respond in a very short, cute sentence (max 10 words) in the requested language (locale: ${locale}). Do not yap. No markdown, no emojis.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          isCompanion: true
        })
      })
      .then((res) => {
        if (!res.ok) {
          res.text().then(t => console.error("[ghost] API error", res.status, t))
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        const text = data.choices?.[0]?.message?.content
        if (text) setCustomSpeech(text)
        else console.error("[ghost] unexpected API response shape", data)
      })
      .catch((err) => {
        console.error("[ghost] click fetch failed:", err)
        const text = speechLines[lineIndex] || speechLines[0] || ""
        setCustomSpeech(text)
      })
      .finally(() => {
        setApiLoading(false)
      })
    } else {
      const nextIdx = (lineIndex + 1) % speechLines.length
      setLineIndex(nextIdx)
      setCustomSpeech(null)
    }
  }, [horrorActive, madLines, woozlitApiKey, searchQuery, locale, speechLines, lineIndex])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setCustomSpeech(null)
      setRealtimeGuess(null)
      return
    }
    setIsSleeping(false)
    setIdleAction("none")

    const lowerQuery = searchQuery.trim().toLowerCase()
    if (lowerQuery === "i love you" || lowerQuery === "i lov u") {
      setCustomSpeech("I love you too, human!")
      return
    }
    if (lowerQuery === "you are cute" || lowerQuery === "uar cute") {
      setCustomSpeech("Aww, thank you! You make my ghost heart melt!")
      return
    }
    if (lowerQuery === "hello" || lowerQuery === "hi") {
      setCustomSpeech("Hi there! What movie are we watching today?")
      return
    }

    if (woozlitApiKey && woozlitApiKey.trim()) {
      fetch("/api/ghost", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a cute little friendly ghost. Always respond in a very short, cute sentence (max 10 words) in the requested language (locale: ${locale}). Do not yap. No markdown, no emojis. Do NOT answer the search query, do NOT give recommendations.`
            },
            {
              role: "user",
              content: `The user searched for: "${searchQuery}". React to this topic in one short sentence.`
            }
          ],
          isCompanion: true
        })
      })
      .then((res) => {
        if (!res.ok) {
          res.text().then(t => console.error("[ghost] search API error", res.status, t))
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        const text = data.choices?.[0]?.message?.content
        if (text) setCustomSpeech(text)
        else console.error("[ghost] unexpected search API response", data)
      })
      .catch((err) => {
        console.error("[ghost] search fetch failed:", err)
        const text = speechLines[Math.floor(Math.random() * speechLines.length)] || ""
        setCustomSpeech(text)
      })
    } else {
      const isHorror = isHorrorQuery(searchQuery)
      if (isHorror) {
        setCustomSpeech(horrorLines[0] || "horror?! okay my eyes are officially scared")
      } else {
        setCustomSpeech(`searching for "${searchQuery}"? hope it's a good one!`)
      }
    }
  }, [searchQuery, woozlitApiKey, locale, speechLines, horrorLines])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsTyping(false)
      setRealtimeGuess(null)
      return
    }
    setIsSleeping(false)
    setIdleAction("none")
    setIsTyping(true)

    const timer = setTimeout(() => {
      setIsTyping(false)

      const lowerQuery = searchQuery.trim().toLowerCase()
      if (
        lowerQuery === "i love you" || lowerQuery === "i lov u" ||
        lowerQuery === "you are cute" || lowerQuery === "uar cute" ||
        lowerQuery === "hello" || lowerQuery === "hi"
      ) {
        return
      }

      const words = searchQuery.trim().split(/\s+/)

      if (woozlitApiKey && woozlitApiKey.trim() && words.length >= 2) {
        fetch("/api/ghost", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                 content: "You are a cute little friendly ghost. The user is typing a description of a movie. In one extremely short sentence (max 12 words), react to it. Do not yap. No markdown, no emojis."
              },
              {
                role: "user",
                content: `User is typing: "${searchQuery}"`
              }
            ],
            isCompanion: true
          })
        })
        .then(res => {
          if (!res.ok) {
            res.text().then(t => console.error("[ghost] typing API error", res.status, t))
            throw new Error(`HTTP ${res.status}`)
          }
          return res.json()
        })
        .then(data => {
          const reply = (data.choices?.[0]?.message?.content || "").trim()
          if (reply) {
            setRealtimeGuess(reply)
          } else {
            console.error("[ghost] unexpected typing API response", data)
          }
        })
        .catch((err) => {
          console.error("[ghost] typing fetch failed:", err)
          setRealtimeGuess(`hmm... are you looking for something about "${searchQuery.trim().split(" ").slice(0, 3).join(" ")}"?`)
        })
      } else {
        fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => {
            if (!res.ok) throw new Error("Search failed")
            return res.json()
          })
          .then((data) => {
            if (data.results && data.results.length > 0) {
              const top = data.results[0]
              const title = top.title || top.name
              const date = top.release_date || top.first_air_date
              const year = date ? ` (${date.split("-")[0]})` : ""
              setRealtimeGuess(`hmm... are you looking for "${title}"${year}?`)
            } else {
              setRealtimeGuess(`searching for "${searchQuery}"? hope it's a good one!`)
            }
          })
          .catch(() => {
            setRealtimeGuess(`hmm... what exactly are you looking for?`)
          })
      }
    }, 650)

    return () => clearTimeout(timer)
  }, [searchQuery, woozlitApiKey])

  useEffect(() => {
    setIsSleeping(false)
    setIdleAction("none")

    const singTimer = setTimeout(() => {
      if (!searchQuery.trim()) {
        setIdleAction("sing")
        const singNotes = ["la la la~", "hmmm hum hum...", "tra la la~"]
        const note = singNotes[Math.floor(Math.random() * singNotes.length)]
        setCustomSpeech(note)
      }
    }, 9000)

    const sleepTimer = setTimeout(() => {
      setIsSleeping(true)
      setIdleAction("none")
      setEyeOffset({ x: 0, y: 0 })
    }, 20000)

    return () => {
      clearTimeout(singTimer)
      clearTimeout(sleepTimer)
    }
  }, [searchQuery])

  useEffect(() => {
    const handleThink = (e: Event) => {
      const q = (e as CustomEvent).detail
      setIsSleeping(false)
      setIdleAction("none")
      setCustomSpeech(`hmm i see... let me think about ${q}...`)
    }
    const handleFound = (e: Event) => {
      const title = (e as CustomEvent).detail
      setIsSleeping(false)
      setIdleAction("none")
      setCustomSpeech(`found it! you mean "${title}"!`)
    }
    window.addEventListener("ghost-think", handleThink)
    window.addEventListener("ghost-found", handleFound)
    return () => {
      window.removeEventListener("ghost-think", handleThink)
      window.removeEventListener("ghost-found", handleFound)
    }
  }, [])

  const normalSpeech = speechLines[lineIndex] || speechLines[0] || ""
  const madSpeech = madLines[madLineIndex] || madLines[0] || normalSpeech
  const horrorSpeech = horrorLines[0] || normalSpeech

  const bubbleText =
    isSleeping ? "zzz..." :
    isTyping ? "hmm... let me think..." :
    realtimeGuess ? realtimeGuess :
    mood === "horror" ? horrorSpeech :
    mood === "mad" ? madSpeech : (customSpeech || normalSpeech)

  const bubbleKey = `${mood}-${isSleeping ? "sleep" : isTyping ? "type" : realtimeGuess ? `guess-${realtimeGuess.slice(0, 12)}` : mood === "normal" ? lineIndex : mood === "mad" ? madLineIndex : 0}-${customSpeech ? "custom" : "normal"}`

  const wrapClass = [
    "nano-pet-wrap",
    mood === "mad" ? "nano-pet-mad" : "",
    mood === "horror" ? "nano-pet-horror" : "",
  ]
    .filter(Boolean)
    .join(" ")

  const eyeClass = [
    "nano-pet-eye",
    mood === "horror" ? "nano-pet-eye-horror" : "",
    mood === "mad" ? "nano-pet-eye-mad" : "",
  ]
    .filter(Boolean)
    .join(" ")

  const floatStyle = ghostFlying
    ? {
        position: "fixed" as const,
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 1000,
        width: "95px",
        pointerEvents: "auto" as const,
        transition: "none",
      }
    : {}

  return (
    <div
      className={`nano-pet-track ${className}`.trim()}
      aria-label={ariaLabel}
      role="img"
      style={floatStyle}
    >
      <div className={wrapClass} onClick={handleHit}>
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          width="231"
          height="289"
          viewBox={NANO_PET_VIEWBOX}
          className="nano-pet-svg"
          shapeRendering="geometricPrecision"
        >
          <path d={NANO_PET_BODY_PATH} className="nano-pet-body" />
          <g transform={`translate(${eyeOffset.x} ${eyeOffset.y})`}>
            {isSleeping ? (
              <>
                <path d="M 65,116 Q 80,128 95,116" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none" />
                <path d="M 135,116 Q 150,128 165,116" stroke="currentColor" strokeWidth="8" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <ellipse className={eyeClass} cx="80" cy="120" rx="20" ry="30" />
                <ellipse className={eyeClass} cx="150" cy="120" rx="20" ry="30" />
              </>
            )}
          </g>
          {ghostHat && (
            <g transform="scale(0.451) translate(-0.5, -100)">
              <path
                fill="#3d1f00"
                d="M94.32 70.473c-12.257.27-25.32 12.332-36.568 29.64a145.732 145.732 0 0 1 19.855-12.115c-31.622 23.364-46.658 83.72-47.166 122.336C43.54 191.32 70.73 160.196 96 174.964c-28.952-6.018-47.296 38.325-56.428 58.606 22.808-9.36 39.494-24.152 72.428-24.523-32.47 21.4-43.966 44.83-56.428 68.168 23.376-14.505 40.286-22.99 55.528-26.227 13.683-16.43 28.01-33.093 43.728-46.746 11.79-10.24 24.533-18.877 38.37-24.043-16.805-46.114-42.764-88.828-89.626-107.49-3-1.6-6.1-2.307-9.252-2.237z"
              />
              <path
                fill="#1a0a00"
                d="M207.578 194.64c-14.066 3.29-27.57 11.573-40.947 23.192-17.53 15.227-34.353 35.82-50.868 55.703-16.515 19.884-32.62 39.088-50.287 51.707-13.545 9.674-29.157 15.164-45.014 12.565 2.883 14.468 9.866 33.213 19.38 50.42 12.655 22.886 30.036 43.342 44.482 50.59 6.637 3.328 12.566 3.416 21.23 1.243 8.662-2.173 19.453-6.957 32.762-12.52C164.934 416.41 201.78 402.6 256 402.6c54.22 0 91.066 13.81 117.686 24.94 13.31 5.563 24.1 10.347 32.763 12.52 8.662 2.173 14.59 2.085 21.228-1.244 14.446-7.247 31.827-27.703 44.482-50.59 9.514-17.206 16.497-35.95 19.38-50.42-15.858 2.6-31.47-2.89-45.015-12.564-17.667-12.62-33.772-31.823-50.287-51.707s-33.337-40.476-50.87-55.703c-13.376-11.62-26.88-19.902-40.946-23.193 3.024 13.966-.075 26.363-7.594 34.985-10.06 11.535-25.643 16.307-40.828 16.307-15.185 0-30.77-4.772-40.828-16.307-7.52-8.622-10.618-21.02-7.594-34.986z"
              />
              <path
                fill="#8b4513"
                d="M320.618 230.342c8.495-.304 17.71 10.54 7.925 22.465 16.326-15.08 30.872 6.004 13.81 13.808-13.26 6.065-25.986 13.423-37.937 21.86a32.33 32.33 0 0 1 1.584 9.958c0 10.202-2.76 19.5-10.88 26.696l-1.18 1.055-.047 1.582-.11 4.397c13.784 10.594 29.233 19.1 46.635 25.016 20.08 6.825 5.405 31.39-15.922 15.912 18.035 18.658-6.53 32.908-14.275 14.275-4.626-11.13-10.36-21.786-17.02-31.887l-.007.233c-1.505.906-4.646 2.64-9.295 4.308V340.6h-9.343v21.583c-3.997.946-6.635 1.68-11.875 1.94v-20.516h-11.344v20.565c-5-.19-7.527-.81-11.518-1.645V340.6h-9.344v20c-5.884-1.864-9.905-3.948-11.69-4.96l-.01-.298c-6.652 10.092-12.38 20.738-17.003 31.855-7.746 18.632-32.31 4.384-14.274-14.275-21.327 15.48-36.005-9.097-15.924-15.922 17.313-5.885 32.705-14.322 46.435-24.84l-.156-4.687-.05-1.547-1.152-1.032C208.72 317.74 206 308.48 206 298.396c0-3.362.53-6.647 1.533-9.798-11.935-8.415-24.646-15.747-37.883-21.8-17.063-7.806-2.527-28.89 13.8-13.812-9.574-11.666-.968-22.302 7.364-22.474 3.52-.073 6.99 1.722 9.024 6.086 5.733 12.305 12.05 24.032 19.04 35.013 8.91-7.97 21.735-13.142 36.214-13.352H256c14.805 0 27.942 5.186 37.03 13.28 7.024-11.008 13.372-22.763 19.124-35.11 1.926-4.134 5.14-5.967 8.463-6.086z"
              />
              <ellipse cx="224.7" cy="296" rx="15" ry="15" fill="#c8a87a" opacity="0.6" />
              <ellipse cx="287.3" cy="296" rx="15" ry="15" fill="#c8a87a" opacity="0.6" />
              <path fill="#5a3010" d="M248.7 312.19l-7.994 17.84h15.988l-7.994-17.84z" />
            </g>
          )}
        </svg>
        {bubbleText ? (
          <div className="nano-pet-bubble" aria-live="polite">
            <span className="nano-pet-bubble-text" key={bubbleKey}>
              {apiLoading ? "..." : renderMarkdown(bubbleText)}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
