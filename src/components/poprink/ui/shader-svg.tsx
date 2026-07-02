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
}

type PetMood = "normal" | "mad" | "horror"

const MAD_HIT_WINDOW_MS = 900
const MAD_HIT_COUNT = 4
const MAD_DURATION_MS = 3500

function clampOffset(value: number, max: number) {
  return Math.max(-max, Math.min(max, value))
}

export function NanoPet({
  lines,
  madLines = [],
  horrorLines = [],
  searchQuery = "",
  ariaLabel,
  className = "",
}: NanoPetProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const hitTimesRef = useRef<number[]>([])
  const madTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [lineIndex, setLineIndex] = useState(0)
  const [madActive, setMadActive] = useState(false)
  const [madLineIndex, setMadLineIndex] = useState(0)

  const linesKey = lines.join("\0")
  const speechLines = useMemo(
    () => lines.filter((line) => line && line.trim().length > 0),
    [linesKey]
  )

  const horrorActive = useMemo(() => isHorrorQuery(searchQuery), [searchQuery])

  const mood: PetMood = horrorActive ? "horror" : madActive ? "mad" : "normal"

  useEffect(() => {
    setLineIndex(0)
  }, [linesKey])

  useEffect(() => {
    if (speechLines.length < 2 || mood !== "normal") return
    const timer = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % speechLines.length)
    }, 22000)
    return () => clearInterval(timer)
  }, [speechLines.length, mood])

  useEffect(() => {
    return () => {
      if (madTimerRef.current) clearTimeout(madTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let frame = 0
    const onMove = (e: MouseEvent) => {
      if (frame) return
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
  }, [])

  const handleHit = useCallback(() => {
    if (horrorActive) return
    const now = Date.now()
    hitTimesRef.current = hitTimesRef.current.filter((t) => now - t < MAD_HIT_WINDOW_MS)
    hitTimesRef.current.push(now)
    if (hitTimesRef.current.length < MAD_HIT_COUNT) return
    hitTimesRef.current = []
    const madOptions = madLines.filter((line) => line && line.trim().length > 0)
    if (madOptions.length > 0) {
      setMadLineIndex(Math.floor(Math.random() * madOptions.length))
    }
    setMadActive(true)
    if (madTimerRef.current) clearTimeout(madTimerRef.current)
    madTimerRef.current = setTimeout(() => setMadActive(false), MAD_DURATION_MS)
  }, [horrorActive, madLines])

  const normalSpeech = speechLines[lineIndex] || speechLines[0] || ""
  const madSpeech = madLines[madLineIndex] || madLines[0] || normalSpeech
  const horrorSpeech = horrorLines[0] || normalSpeech
  const bubbleText =
    mood === "horror" ? horrorSpeech : mood === "mad" ? madSpeech : normalSpeech
  const bubbleKey = `${mood}-${mood === "normal" ? lineIndex : mood === "mad" ? madLineIndex : 0}`

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

  return (
    <div className={`nano-pet-track ${className}`.trim()} aria-label={ariaLabel} role="img">
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
            <ellipse className={eyeClass} cx="80" cy="120" rx="20" ry="30" />
            <ellipse className={eyeClass} cx="150" cy="120" rx="20" ry="30" />
          </g>
        </svg>
        {bubbleText ? (
          <div className="nano-pet-bubble" aria-live="polite">
            <span className="nano-pet-bubble-text" key={bubbleKey}>
              {bubbleText}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
