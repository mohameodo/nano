import { posterUrl } from '../../config/env.js'
import type { MediaResult } from '../../api/types.js'
import { mediaTitle, mediaTypeOf, yearOf } from './utils.js'
import './media.css'

export type MediaCardProps = {
  item: MediaResult
  onPress?: (item: MediaResult) => void
}

export function MediaCard({ item, onPress }: MediaCardProps) {
  const title = mediaTitle(item)
  const type = mediaTypeOf(item)
  const year = yearOf(item)
  const poster = posterUrl(item.poster_path)

  return (
    <view className="MediaCard" focusable={true} bindtap={() => onPress?.(item)}>
      <view className="MediaCard__poster">
        {poster ? (
          <image className="MediaCard__image" src={poster} mode="aspectFill" />
        ) : (
          <view className="MediaCard__placeholder">
            <text className="MediaCard__placeholderText">
              {title.slice(0, 1).toUpperCase()}
            </text>
          </view>
        )}
      </view>
      <text className="MediaCard__title" text-maxline="2">
        {title}
      </text>
      <text className="MediaCard__meta">
        {type}
        {year ? ` · ${year}` : ''}
      </text>
    </view>
  )
}
