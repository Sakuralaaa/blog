import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 } as const

const INK = '#141413'
const PAPER = '#F0EEE6'
const MUTED = '#5E5D59'
const CHIP = '#E3DFD3'

const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-77.5 -36 372 372"><g transform="translate(108.5 0) scale(0.93 1) translate(-108.5 0) skewX(-16)"><rect width="50" height="300" fill="#141413"/><path d="M137.0 0V300M137.0 25.0H229.0C279.0 25.0 299.0 55.0 299.0 87.0C299.0 123.0 273.0 146 229.0 146H137.0M229.0 146H241.0C293.0 146 319.0 176 319.0 210C319.0 250 291.0 275.0 241.0 275.0H137.0" fill="none" stroke="#141413" stroke-width="50"/></g></svg>'
const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString('base64')}`

type FontData = { regular: Buffer; bold: Buffer }
let fontPromise: Promise<FontData> | null = null

function loadFonts(): Promise<FontData> {
  if (!fontPromise) {
    const dir = path.join(process.cwd(), 'public', 'fonts', 'og')
    fontPromise = Promise.all([
      readFile(path.join(dir, 'NotoSansSC-Regular-subset.otf')),
      readFile(path.join(dir, 'NotoSansSC-Bold-subset.otf')),
    ])
      .then(([regular, bold]) => ({ regular, bold }))
      .catch((error) => {
        fontPromise = null
        throw error
      })
  }
  return fontPromise
}

export type OgCardInput = {
  siteName: string
  /** Small label after the site name, e.g. the category. */
  kicker?: string | null
  title: string
  description?: string | null
  /** Chips on the bottom left (series, tags). */
  chips?: string[]
  /** Text on the bottom right (date, reading time). */
  meta?: string[]
}

function clip(value: string | null | undefined, max: number) {
  const text = (value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function titleSize(title: string) {
  const n = title.length
  if (n <= 16) return 72
  if (n <= 28) return 62
  if (n <= 44) return 54
  return 46
}

export async function renderOgCard(input: OgCardInput) {
  const fonts = await loadFonts()
  const title = clip(input.title, 72)
  // Keep the card to five text lines: a three-line title leaves room for two of summary.
  const description = clip(input.description, title.length > 28 ? 66 : 110)
  const chips = (input.chips || []).map((c) => clip(c, 14)).filter(Boolean).slice(0, 4)
  const meta = (input.meta || []).filter(Boolean)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: PAPER,
          color: INK,
          fontFamily: 'Noto Sans SC',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '64px 80px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 30 }}>
            <img src={LOGO_DATA_URI} width={52} height={52} alt="" />
            <span style={{ marginLeft: 16, fontWeight: 700 }}>{clip(input.siteName, 24)}</span>
            {input.kicker ? (
              <span style={{ marginLeft: 14, color: MUTED }}>{`/ ${clip(input.kicker, 20)}`}</span>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              marginTop: 52,
              fontSize: titleSize(title),
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </div>

          {description ? (
            <div
              style={{
                display: 'flex',
                marginTop: 28,
                fontSize: 28,
                lineHeight: 1.5,
                color: MUTED,
              }}
            >
              {description}
            </div>
          ) : null}

          <div style={{ display: 'flex', flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 24 }}>
            <div style={{ display: 'flex' }}>
              {chips.map((chip, i) => (
                <span
                  key={`${chip}-${i}`}
                  style={{
                    display: 'flex',
                    marginRight: 12,
                    padding: '6px 18px',
                    borderRadius: 999,
                    background: CHIP,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', color: MUTED }}>{meta.join(' · ')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', height: 14, background: INK }} />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Noto Sans SC', data: fonts.regular, weight: 400, style: 'normal' },
        { name: 'Noto Sans SC', data: fonts.bold, weight: 700, style: 'normal' },
      ],
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  )
}

export function formatOgDate(value: Date | string | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(d)
}
