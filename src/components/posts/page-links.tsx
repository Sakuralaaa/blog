import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Server-rendered pagination links for public list pages. */
export function PageLinks({
  page,
  totalPages,
  pathname,
  query = {},
}: {
  page: number
  totalPages: number
  pathname: string
  query?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => start + index)
  const clean = Object.fromEntries(
    Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))
  )
  const href = (target: number) => ({
    pathname,
    query: target > 1 ? { ...clean, page: String(target) } : { ...clean, page: undefined },
  })
  return (
    <nav className="pager" aria-label="分页">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="上一页">
          <ChevronLeft size={16} />
        </Link>
      ) : (
        <span aria-hidden="true" data-disabled>
          <ChevronLeft size={16} />
        </span>
      )}
      {pages.map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? 'page' : undefined}>
          {n}
        </Link>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} aria-label="下一页">
          <ChevronRight size={16} />
        </Link>
      ) : (
        <span aria-hidden="true" data-disabled>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  )
}
