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
      setError("Please enter a valid StreamID handle")
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
    <div
      className="nano-dialog-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px"
      }}
    >
      <div
        className="nano-dialog-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "380px",
          backgroundColor: "color-mix(in srgb, var(--bg-color) 92%, #ffffff 8%)",
          border: "1px solid color-mix(in srgb, var(--bg-color) 82%, #ffffff 18%)",
          borderRadius: "24px",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          color: "var(--text-color)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: "700", letterSpacing: "-0.02em" }}>
            {t.authTitle || "shiopa auth"}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "var(--text-color)",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "1rem",
              opacity: 0.8
            }}
          >
            &times;
          </button>
        </div>

        {enableStreamId && (
          <div
            style={{
              display: "flex",
              background: "color-mix(in srgb, var(--bg-color) 85%, var(--text-color) 8%)",
              borderRadius: "9999px",
              padding: "4px",
              marginBottom: "20px"
            }}
          >
            <button
              type="button"
              onClick={() => { setAuthType("streamid"); setError(""); }}
              style={{
                flex: 1,
                height: "34px",
                fontSize: "0.82rem",
                fontWeight: authType === "streamid" ? "600" : "500",
                backgroundColor: authType === "streamid" ? "var(--accent-color)" : "transparent",
                color: authType === "streamid" ? "#000000" : "var(--text-color)",
                border: "none",
                borderRadius: "9999px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {t.streamId || "StreamID"}
            </button>
            <button
              type="button"
              onClick={() => { setAuthType("standard"); setError(""); }}
              style={{
                flex: 1,
                height: "34px",
                fontSize: "0.82rem",
                fontWeight: authType === "standard" ? "600" : "500",
                backgroundColor: authType === "standard" ? "var(--accent-color)" : "transparent",
                color: authType === "standard" ? "#000000" : "var(--text-color)",
                border: "none",
                borderRadius: "9999px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {t.username || "username"}
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "8px 12px",
              color: "#f87171",
              fontSize: "0.82rem",
              marginBottom: "16px",
              textAlign: "center"
            }}
          >
            {error}
          </div>
        )}

        {authType === "streamid" && enableStreamId ? (
          <form onSubmit={handleStreamIDSubmit}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", opacity: 0.7, marginBottom: "6px" }}>
                {t.streamIdHandleLabel || "streamid handle"}
              </label>
              <input
                type="text"
                placeholder={t.streamIdHandlePlaceholder || "@user@shiopa.com"}
                value={streamIdHandle}
                onChange={(e) => setStreamIdHandle(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "9999px",
                  padding: "0 16px",
                  background: "color-mix(in srgb, var(--bg-color) 80%, var(--text-color) 10%)",
                  border: "1px solid color-mix(in srgb, var(--bg-color) 75%, var(--text-color) 18%)",
                  color: "var(--text-color)",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>
            <p style={{ fontSize: "0.75rem", opacity: 0.65, margin: "6px 0 20px 0", lineHeight: "1.4" }}>
              Sign in happens on your node. Shiopa only receives OAuth tokens — never your secret key.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "9999px",
                backgroundColor: "var(--accent-color)",
                color: "#000000",
                fontWeight: "700",
                fontSize: "0.9rem",
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.2s ease"
              }}
            >
              {isSubmitting ? t.loading || "connecting..." : t.loginWithStreamId || "sign in with StreamID"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStandardSubmit}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", opacity: 0.7, marginBottom: "6px" }}>
                {t.username}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "9999px",
                  padding: "0 16px",
                  background: "color-mix(in srgb, var(--bg-color) 80%, var(--text-color) 10%)",
                  border: "1px solid color-mix(in srgb, var(--bg-color) 75%, var(--text-color) 18%)",
                  color: "var(--text-color)",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.78rem", opacity: 0.7, marginBottom: "6px" }}>
                {t.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "42px",
                  borderRadius: "9999px",
                  padding: "0 16px",
                  background: "color-mix(in srgb, var(--bg-color) 80%, var(--text-color) 10%)",
                  border: "1px solid color-mix(in srgb, var(--bg-color) 75%, var(--text-color) 18%)",
                  color: "var(--text-color)",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                height: "44px",
                borderRadius: "9999px",
                backgroundColor: "var(--accent-color)",
                color: "#000000",
                fontWeight: "700",
                fontSize: "0.9rem",
                border: "none",
                cursor: "pointer",
                marginBottom: "8px"
              }}
            >
              {mode === "login" ? t.login : t.signUp}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setError("")
              }}
              style={{
                width: "100%",
                height: "36px",
                borderRadius: "9999px",
                background: "transparent",
                color: "var(--text-color)",
                border: "none",
                cursor: "pointer",
                fontSize: "0.82rem",
                opacity: 0.75
              }}
            >
              {mode === "login" ? t.createAccount : t.backToLogin}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
