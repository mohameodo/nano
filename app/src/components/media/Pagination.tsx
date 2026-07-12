import './media.css'

export type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
  prevLabel?: string
  nextLabel?: string
}

export function Pagination({
  page,
  totalPages,
  onChange,
  prevLabel = 'Prev',
  nextLabel = 'Next',
}: PaginationProps) {
  if (totalPages <= 1) return null
  const prev = page > 1
  const next = page < totalPages

  return (
    <view className="Pagination">
      <view
        className={`Pagination__btn${prev ? '' : ' Pagination__btn--disabled'}`}
        bindtap={() => {
          if (prev) onChange(page - 1)
        }}
      >
        <text className="Pagination__btnText">{prevLabel}</text>
      </view>
      <text className="Pagination__label">
        {page} / {totalPages}
      </text>
      <view
        className={`Pagination__btn${next ? '' : ' Pagination__btn--disabled'}`}
        bindtap={() => {
          if (next) onChange(page + 1)
        }}
      >
        <text className="Pagination__btnText">{nextLabel}</text>
      </view>
    </view>
  )
}
