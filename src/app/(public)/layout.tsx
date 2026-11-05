import { ReadingProvider } from '@/components/layout/reading-context'
import { RevealContent } from '@/components/layout/reveal-content'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { BackToTop } from '@/components/layout/back-to-top'
import { CustomHeadScripts } from '@/components/layout/custom-head-scripts'
import { StartupLoader } from '@/components/loading/startup-loader'
import { PageTransition } from '@/components/layout/page-transition'
import { getPublicSettings, getSetting } from '@/lib/settings'
import { getPublicCategories } from '@/lib/public-categories'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, customHead] = await Promise.all([
    getPublicSettings(),
    getPublicCategories(3),
    getSetting<string>('site.customHeadCode', ''),
  ])
  const rawBg = typeof settings['ui.backgroundUrl'] === 'string' ? settings['ui.backgroundUrl'].trim() : ''
  const bgUrl = /^(https?:\/\/|\/)[^\s"'()<>]+$/.test(rawBg) ? rawBg : ''
  const rawOverlay = Number(settings['ui.backgroundOverlay'])
  const bgOverlay = Number.isFinite(rawOverlay) ? Math.min(95, Math.max(0, rawOverlay)) : 70
  return (
    <ReadingProvider>
      <div
        className="pg-public-scope schale-site"
        data-page-scope="public"
        data-bg={bgUrl ? '1' : undefined}
        style={
          bgUrl
            ? ({
                '--pg-bg-image': `url(${JSON.stringify(bgUrl)})`,
                '--at-overlay': String(bgOverlay / 100),
              } as React.CSSProperties)
            : undefined
        }
      >
        <span className="at-topline" aria-hidden="true" />
        <StartupLoader />
        <CustomHeadScripts raw={customHead || ''} />
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        <Navbar settings={settings} />
        <main id="main-content" className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer
          settings={{ ...settings, 'site.currentYear': new Date().getFullYear() }}
          categories={categories}
        />
        <BackToTop />
        <RevealContent />
      </div>
    </ReadingProvider>
  )
}
