import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="not-found" aria-labelledby="not-found-title">
      <div className="card not-found__card">
        <p className="not-found__code" aria-hidden="true">
          404
        </p>
        <h1 id="not-found-title">这页找不到了</h1>
        <p>链接可能有误，或页面已被移走。</p>
        <div className="not-found__actions">
          <Link href="/" className="btn btn--primary">
            <ArrowLeft size={16} aria-hidden="true" />
            返回首页
          </Link>
          <Link href="/posts" className="btn">
            浏览文章
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
