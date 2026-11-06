'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface PostFiltersProps {
  categories: Array<{ slug: string; name: string; _count: { posts: number } }>
  tags: Array<{ slug: string; name: string; _count: { posts: number } }>
}

export function PostFilters({ categories, tags }: PostFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  // Category is picked with the tabs above; keep it while searching or picking a tag.
  const category = searchParams.get('category') || 'all'
  const [tag, setTag] = useState(searchParams.get('tag') || 'all')

  const handleFilter = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category && category !== 'all') params.set('category', category)
    if (tag && tag !== 'all') params.set('tag', tag)
    router.push(`/posts?${params.toString()}`)
  }

  const handleClear = () => {
    setSearch('')
    setTag('all')
    router.push('/posts')
  }

  return (
    <div className="post-filters">
      <div className="post-filters__row">
        <div className="post-filters__search">
          <Input
            aria-label="搜索文章标题或内容"
            type="search"
            placeholder="搜索文章..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
          />
        </div>

        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger
            aria-label="文章标签"
            className="post-filters__select"
          >
            <SelectValue placeholder="选择标签" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              全部标签
            </SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.slug} value={tag.slug}>
                {tag.name} ({tag._count.posts})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button type="button" className="btn btn--primary" onClick={handleFilter}>
          筛选
        </button>
      </div>

      {(category !== 'all' || tag !== 'all' || search) && (
        <div className="post-filters__active">
          <span>当前筛选：</span>
          {category !== 'all' && (
            <span>
              分类: <strong>{categories.find((c) => c.slug === category)?.name}</strong>
            </span>
          )}
          {tag !== 'all' && (
            <span>
              标签: <strong>{tags.find((t) => t.slug === tag)?.name}</strong>
            </span>
          )}
          {search && (
            <span>
              搜索: <strong>{search}</strong>
            </span>
          )}
          <button type="button" className="text-link" onClick={handleClear}>
            清除筛选
          </button>
        </div>
      )}
    </div>
  )
}
