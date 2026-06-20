interface WatermarksProps {
  renderMixedText: (text: string) => React.ReactNode
}

export default function Watermarks({ renderMixedText }: WatermarksProps) {
  return (
    <>
      <div className="nano-watermark-container">
        <div className="nano-bottom-cutoff">
          {renderMixedText("poprink")}
        </div>
      </div>

      <div className="nano-watermark-container-right">
        <div className="nano-bottom-cutoff-right">
          {renderMixedText("movies and shows")}
        </div>
      </div>
    </>
  )
}
