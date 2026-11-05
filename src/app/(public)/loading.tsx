import { Spinner } from '@/components/loading/spinner'

export default function Loading() {
  return (
    <div className="route-loading" role="status" data-route-loading>
      <Spinner />
      <span>正在加载…</span>
    </div>
  )
}
