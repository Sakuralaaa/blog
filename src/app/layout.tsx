import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { SessionProvider } from '@/components/auth/session-provider'
import { Toaster } from '@/components/ui/toaster'
import { getSetting } from '@/lib/settings'
import { getSiteUrl } from '@/lib/seo'
import { ScrollProgress } from '@/components/layout/scroll-progress'
import { DEFAULT_SITE_STYLE, buildStyleBootScript, normalizeSiteStyle } from '@/lib/site-styles'

export async function generateMetadata(): Promise<Metadata> {
  const title = (await getSetting<string>('site.title', '个人主页')) || '个人主页'
  const description =
    (await getSetting<string>('site.description', '作品、项目与文章')) || '作品、项目与文章'
  const faviconUrl = (await getSetting<string>('site.faviconUrl', '')) || ''
  const metadataBase = getSiteUrl()

  return {
    metadataBase,
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    alternates: {
      canonical: '/',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      url: '/',
      siteName: title,
      title,
      description,
      images: [{ url: '/api/og/site', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/api/og/site'],
    },
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [theme, styleSetting, allowStyleSwitch] = await Promise.all([
    getSetting<string>('site.defaultTheme', 'system'),
    getSetting<string>('ui.style', DEFAULT_SITE_STYLE),
    getSetting<boolean>('ui.allowStyleSwitch', true),
  ])
  const siteStyle = normalizeSiteStyle(styleSetting)
  return (
    <html
      lang="zh"
      data-scroll-behavior="smooth"
      data-style={siteStyle}
      data-style-default={siteStyle}
      data-style-switch={allowStyleSwitch === false ? '0' : '1'}
      suppressHydrationWarning
    >
      <head>
        <script
          data-cfasync="false"
          // Applies the visitor's stored style before first paint (see site-styles.ts).
          dangerouslySetInnerHTML={{ __html: buildStyleBootScript() }}
        />
        {/* Page metadata replaces `alternates`, so the feed link lives here to reach every page. */}
        <link rel="alternate" type="application/rss+xml" title="RSS" href="/feed.xml" />
      </head>
      <body id="site-page" className="font-sans antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme={theme || 'system'}
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <ScrollProgress />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
