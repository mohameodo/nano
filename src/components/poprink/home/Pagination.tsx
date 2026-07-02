import { FaChevronLeft, FaChevronRight } from "react-icons/fa"

interface PaginationProps {
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number | ((prev: number) => number)) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  setCurrentPage,
}: PaginationProps) {
  return (
    <div className="nano-pagination">
      <button
        className="nano-page-btn"
        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
      >
        <FaChevronLeft />
      </button>
      <span className="nano-page-btn nano-page-btn-active">
        {currentPage} / {totalPages}
      </span>
      <button
        className="nano-page-btn"
        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
      >
        <FaChevronRight />
      </button>
    </div>
  )
}
