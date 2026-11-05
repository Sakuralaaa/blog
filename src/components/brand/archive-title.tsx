export function ArchiveTitle({ title, compact = false }: { title: string; compact?: boolean }) {
  if (compact) {
    return (
      <span className="at-brand-text" aria-label={title}>
        <span className="at-brand-logo" aria-hidden="true">
          {Array.from(title)[0] || 'P'}
        </span>
        <span>{title}</span>
      </span>
    )
  }
  return (
    <h1 id="hero-title" className="at-hero-title">
      {title}
    </h1>
  )
}
