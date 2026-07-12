import { useState } from '@lynx-js/react'
import './media.css'

export type SearchFormProps = {
  initialQuery?: string
  onSubmit: (query: string) => void
  placeholder?: string
  goLabel?: string
}

export function SearchForm({
  initialQuery = '',
  onSubmit,
  placeholder = 'Search movies & TV',
  goLabel = 'Go',
}: SearchFormProps) {
  const [value, setValue] = useState(initialQuery)

  return (
    <view className="SearchForm">
      <view className="SearchForm__field">
        <input
          className="SearchForm__input"
          placeholder={placeholder}
          bindinput={(e) => {
            setValue(e.detail.value)
          }}
        />
      </view>
      <view
        className="SearchForm__go"
        bindtap={() => {
          const trimmed = value.trim() || initialQuery.trim()
          if (trimmed) onSubmit(trimmed)
        }}
      >
        <text className="SearchForm__goText">{goLabel}</text>
      </view>
    </view>
  )
}
