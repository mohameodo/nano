import { useState } from "react"
import type { FormEvent } from "react"

interface LoginDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (username: string) => void
  t: Record<string, string>
}

export default function LoginDialog({ isOpen, onClose, onSuccess, t }: LoginDialogProps) {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <div className="nano-dialog-overlay" onClick={onClose}>
      <div className="nano-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="nano-dialog-header">
          <div className="nano-dialog-title">{t.authTitle}</div>
          <button className="nano-dialog-close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="nano-dialog-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="nano-dialog-input-group">
            <label className="nano-dialog-label">{t.username}</label>
            <input
              type="text"
              className="nano-dialog-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
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
            />
          </div>

          <button type="submit" className="nano-dialog-btn">
            {mode === "login" ? t.login : t.signUp}
          </button>
          <button
            type="button"
            className="nano-dialog-btn nano-dialog-btn-secondary"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login")
              setError("")
            }}
          >
            {mode === "login" ? t.createAccount : t.backToLogin}
          </button>
        </form>
      </div>
    </div>
  )
}
