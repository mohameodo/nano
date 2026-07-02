interface TermsDialogProps {
  isOpen: boolean
  onClose: () => void
  t: Record<string, string>
}

export default function TermsDialog({ isOpen, onClose, t }: TermsDialogProps) {
  if (!isOpen) return null

  return (
    <div className="nano-dialog-overlay" onClick={onClose}>
      <div className="nano-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="nano-dialog-header">
          <div className="nano-dialog-title">{t.termsBtn}</div>
          <button className="nano-dialog-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div style={{ color: "var(--text-color)", fontSize: "0.95rem", lineHeight: "1.5", textAlign: "left" }}>
          <p style={{ margin: "0 0 20px 0" }}>{t.termsContent}</p>
          <div style={{ padding: "16px", backgroundColor: "rgba(255, 255, 255, 0.03)", borderRadius: "12px", textAlign: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              This project is made by <span style={{ color: "var(--accent-color)", fontWeight: "600" }}>poprink</span>.
              {" | "}
              <a 
                href="https://github.com/mohameodo/nano" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: "var(--accent-color)", textDecoration: "underline", fontWeight: "600" }}
              >
                {t.sourceCode}
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
