import type { ReactNode } from 'react'

/** Compact page title band shared by list pages (posts, projects, archive…). */
export function PageHeader({
  title,
  description,
  eyebrow,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="page-head container">
      {eyebrow && <p className="page-head__eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p className="page-head__desc">{description}</p>}
      {children}
    </header>
  )
}
