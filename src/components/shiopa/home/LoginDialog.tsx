import { useState } from "react"
import type { FormEvent } from "react"
import { loginWithStreamID } from "../../../lib/nano/streamid"

interface LoginDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (username: string) => void
  t: Record<string, string>
  enableStreamId?: boolean
}

export default function LoginDialog({ isOpen, onClose, onSuccess, t, enableStreamId = true }: LoginDialogProps) {
  const [authType, setAuthType] = useState<"streamid" | "standard">(enableStreamId ? "streamid" : "standard")
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [streamIdHandle, setStreamIdHandle] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleStandardSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, username, password }),
      })
      const data = await res.json()
      if (res.ok) {
        onSuccess(username)
        onClose()
      } else {
        setError(data.error || t.somethingWentWrong)
      }
    } catch {
      setError(t.connectionError)
    }
  }

  const handleStreamIDSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!streamIdHandle.trim()) {
      setError("Please enter a valid StreamID handle (e.g. @user@shiopa.com)")
      return
    }

    setIsSubmitting(true)
    try {
      await loginWithStreamID({ handle: streamIdHandle.trim() })
    } catch (err: any) {
      setError(err?.message || t.connectionError || "StreamID login error")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="nano-dialog-overlay" onClick={onClose}>
      <div className="nano-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="nano-dialog-header">
          <div className="nano-dialog-title">{t.authTitle || "shiopa nano auth"}</div>
          <button className="nano-dialog-close-btn" onClick={onClose}>&times;</button>
        </div>

        {enableStreamId && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)", pb: "8px" }}>
            <button
              type="button"
              className={`nano-btn-full ${authType === "streamid" ? "nano-btn-active" : ""}`}
              onClick={() => { setAuthType("streamid"); setError(""); }}
              style={{
                flex: 1,
                height: "32px",
                fontSize: "0.8rem",
                backgroundColor: authType === "streamid" ? "var(--accent-color)" : "transparent",
                color: authType === "streamid" ? "#000000" : "var(--text-color)",
                border: "none",
                borderRadius: "9999px"
              }}
            >
              {t.streamId || "StreamID"}
            </button>
            <button
              type="button"
              className={`nano-btn-full ${authType === "standard" ? "nano-btn-active" : ""}`}
              onClick={() => { setAuthType("standard"); setError(""); }}
              style={{
                flex: 1,
                height: "32px",
                fontSize: "0.8rem",
                backgroundColor: authType === "standard" ? "var(--accent-color)" : "transparent",
                color: authType === "standard" ? "#000000" : "var(--text-color)",
                border: "none",
                borderRadius: "9999px"
              }}
            >
              {t.username || "Standard"}
            </button>
          </div>
        )}

        {error && <div className="nano-dialog-error" style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" }}>{error}</div>}

        {authType === "streamid" && enableStreamId ? (
          <form onSubmit={handleStreamIDSubmit}>
            <div className="nano-dialog-input-group">
              <label className="nano-dialog-label">{t.streamIdHandleLabel || "StreamID Handle"}</label>
              <input
                type="text"
                className="nano-dialog-input"
                placeholder={t.streamIdHandlePlaceholder || "@user@shiopa.com"}
                value={streamIdHandle}
                onChange={(e) => setStreamIdHandle(e.target.value)}
                required
                style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "0 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>
            <p style={{ fontSize: "0.75rem", opacity: 0.7, margin: "8px 0 16px 0", lineHeight: "1.3" }}>
              Sign in happens on your node. Shiopa only receives OAuth tokens — never your secret key.
            </p>
            <button type="submit" className="nano-dialog-btn" disabled={isSubmitting} style={{ width: "100%", height: "40px", borderRadius: "8px", backgroundColor: "var(--accent-color)", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer" }}>
              {isSubmitting ? t.loading || "Connecting..." : t.loginWithStreamId || "Sign in with StreamID"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStandardSubmit}>
            <div className="nano-dialog-input-group">
              <label className="nano-dialog-label">{t.username}</label>
              <input
                type="text"
                className="nano-dialog-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "0 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>
            <div className="nano-dialog-input-group">
              <label className="nano-dialog-label">{t.password}</label>
              <input
                type="password"
                className="nano-dialog-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", height: "38px", borderRadius: "8px", padding: "0 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
              />
            </div>

            <button type="submit" className="nano-dialog-btn" style={{ width: "100%", height: "40px", borderRadius: "8px", backgroundColor: "var(--accent-color)", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer", marginTop: "12px" }}>
              {mode === "login" ? t.login : t.signUp}
            </button>
            <button
              type="button"
              className="nano-dialog-btn nano-dialog-btn-secondary"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setError("")
              }}
              style={{ width: "100%", height: "36px", borderRadius: "8px", background: "transparent", color: "var(--text-color)", border: "none", cursor: "pointer", marginTop: "8px" }}
            >
              {mode === "login" ? t.createAccount : t.backToLogin}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
