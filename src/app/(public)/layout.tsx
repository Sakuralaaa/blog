import { ReadingProvider } from '@/components/layout/reading-context'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { BackToTop } from '@/components/layout/back-to-top'
import { CustomHeadScripts } from '@/components/layout/custom-head-scripts'
import { PageTransition } from '@/components/layout/page-transition'
import { getPublicSettings, getSetting } from '@/lib/settings'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, customHead] = await Promise.all([
    getPublicSettings(),
    getSetting<string>('site.customHeadCode', ''),
  ])
  const rawBg =
    typeof settings['ui.backgroundUrl'] === 'string' ? settings['ui.backgroundUrl'].trim() : ''
  const bgUrl = /^(https?:\/\/|\/)[^\s"'()<>]+$/.test(rawBg) ? rawBg : ''
  const rawOverlay = Number(settings['ui.backgroundOverlay'])
  const bgOverlay = Number.isFinite(rawOverlay) ? Math.min(95, Math.max(0, rawOverlay)) : 70
  return (
    <ReadingProvider>
      <div
        className="pg-public-scope site"
        data-page-scope="public"
        data-bg={bgUrl ? '1' : undefined}
        style={
          bgUrl
            ? ({
                '--site-bg-image': `url(${JSON.stringify(bgUrl)})`,
                '--site-bg-overlay': String(bgOverlay / 100),
              } as React.CSSProperties)
            : undefined
        }
      >
        <span className="site-topline" aria-hidden="true" />
        <CustomHeadScripts raw={customHead || ''} />
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        <Navbar settings={settings} />
        <main id="main-content" className="site-main">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer settings={{ ...settings, 'site.currentYear': new Date().getFullYear() }} />
        <BackToTop />
      </div>
    </ReadingProvider>
  )
}
