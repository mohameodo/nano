import { useEffect, useState } from "react"

interface MatrixTextProps {
  text: string
  renderText?: (text: string) => React.ReactNode
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$#@%&?_"

export default function MatrixText({ text, renderText }: MatrixTextProps) {
  const [displayText, setDisplayText] = useState(text)

  useEffect(() => {
    let frame = 0
    const target = text
    const duration = 20
    let interval: NodeJS.Timeout

    interval = setInterval(() => {
      setDisplayText(
        target
          .split("")
          .map((char, index) => {
            if (char === " ") return " "
            if (index < (frame / duration) * target.length) {
              return target[index]
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)]
          })
          .join("")
      )

      frame++
      if (frame > duration) {
        clearInterval(interval)
        setDisplayText(target)
      }
    }, 45)

    return () => clearInterval(interval)
  }, [text])

  return renderText ? <>{renderText(displayText)}</> : <span>{displayText}</span>
}
