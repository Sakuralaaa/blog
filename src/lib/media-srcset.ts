/** Widths the media route renders for list cards; anything else serves the original. */
export const THUMB_WIDTHS = [480, 960] as const

const MEDIA_PATH = /^\/api\/files\/[A-Za-z0-9_-]{1,64}$/

/** A srcset for an uploaded image (`/api/files/<id>`), or undefined for any other source. */
export function mediaSrcSet(src: string | null | undefined): string | undefined {
  if (!src || !MEDIA_PATH.test(src)) return undefined
  return THUMB_WIDTHS.map((w) => `${src}?w=${w} ${w}w`).join(', ')
}

/** `sizes` for a card in the 3 / 2 / 1 column post grid. */
export const CARD_SIZES = '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 400px'
/** `sizes` for a card that spans a whole grid row. */
export const WIDE_CARD_SIZES = '(max-width: 767px) 100vw, 600px'
