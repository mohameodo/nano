import { useState, useEffect, type ComponentType } from "react"
import type { ShaderBgStyle } from "./shader-types"

interface NanoDeferredShaderProps {
  variant: ShaderBgStyle
  themeMode: "dark" | "light"
  themeHue: number
  monochrome?: boolean
}

export function NanoDeferredShader(props: NanoDeferredShaderProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () => {
      if (alive) setReady(true)
    }
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(load, { timeout: 250 })
      return () => {
        alive = false
        window.cancelIdleCallback(id)
      }
    }
    const t = window.setTimeout(load, 32)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [])

  if (!ready) return null

  return <NanoShaderLoader {...props} />
}

function NanoShaderLoader(props: NanoDeferredShaderProps) {
  const [Layer, setLayer] = useState<ComponentType<NanoDeferredShaderProps> | null>(null)

  useEffect(() => {
    let alive = true
    import("./NanoShaderLayer").then((m) => {
      if (alive) setLayer(() => m.NanoShaderLayer)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!Layer) return null
  return <Layer {...props} />
}
