import { useRef, useState, useEffect } from "react"
import { FaCheck, FaChevronDown } from "react-icons/fa"

type SettingsDropdownProps = {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  ariaLabel: string
  showChevron?: boolean
}

export default function SettingsDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  showChevron = true,
}: SettingsDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find((opt) => opt.value === value)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="nano-settings-control nano-lang-selector">
      <button
        type="button"
        className={`nano-btn-full nano-lang-btn nano-settings-dropdown-btn ${open ? "nano-settings-dropdown-btn-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <span>{current?.label ?? value}</span>
        {showChevron && <FaChevronDown style={{ fontSize: "0.65rem", opacity: 0.6 }} />}
      </button>
      {open && (
        <div className="nano-lang-dropdown nano-settings-dropdown-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`nano-lang-option ${opt.value === value ? "nano-lang-option-active" : ""}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <FaCheck style={{ fontSize: "0.7rem", opacity: 0.7 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
