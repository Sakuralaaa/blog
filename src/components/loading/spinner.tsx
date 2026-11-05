/** Small block spinner shared by route loading, search and archive lists. */
export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner" role={label ? 'status' : undefined} aria-label={label}>
      <span />
      <span />
      <span />
    </span>
  )
}
