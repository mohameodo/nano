import type { MediaResult } from '../../api/types.js'
import { MediaCard } from './MediaCard.js'
import './media.css'

export type MediaGridProps = {
  items: MediaResult[]
  onSelect?: (item: MediaResult) => void
  emptyText?: string
}

export function MediaGrid({
  items,
  onSelect,
  emptyText = 'Nothing here yet',
}: MediaGridProps) {
  if (!items.length) {
    return (
      <view className="MediaGrid MediaGrid--empty">
        <text className="MediaGrid__empty">{emptyText}</text>
      </view>
    )
  }

  return (
    <view className="MediaGrid">
      {items.map((item) => (
        <view key={`${item.media_type}-${item.id}`} className="MediaGrid__cell">
          <MediaCard item={item} onPress={onSelect} />
        </view>
      ))}
    </view>
  )
}
