'use client'

import { ComponentProps } from 'react'

export const mdxComponents = {
  h1: ({ className, ...props }: ComponentProps<'h1'>) => (
    <h1 className={className} {...props} />
  ),
  h2: ({ className, ...props }: ComponentProps<'h2'>) => (
    <h2 className={className} {...props} />
  ),
  h3: ({ className, ...props }: ComponentProps<'h3'>) => (
    <h3 className={className} {...props} />
  ),
  h4: ({ className, ...props }: ComponentProps<'h4'>) => (
    <h4 className={className} {...props} />
  ),
  p: ({ className, ...props }: ComponentProps<'p'>) => (
    <p className={className} {...props} />
  ),
  a: ({ className, ...props }: ComponentProps<'a'>) => (
    <a className={className} {...props} />
  ),
  ul: ({ className, ...props }: ComponentProps<'ul'>) => (
    <ul className={className} {...props} />
  ),
  ol: ({ className, ...props }: ComponentProps<'ol'>) => (
    <ol className={className} {...props} />
  ),
  li: ({ className, ...props }: ComponentProps<'li'>) => (
    <li className={className} {...props} />
  ),
  blockquote: ({ className, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote
      className={className}
      {...props}
    />
  ),
  hr: ({ className, ...props }: ComponentProps<'hr'>) => (
    <hr className={className} {...props} />
  ),
  table: ({ className, ...props }: ComponentProps<'table'>) => (
    <div className="table-wrap">
      <table className={className} {...props} />
    </div>
  ),
  thead: ({ className, ...props }: ComponentProps<'thead'>) => (
    <thead className={className} {...props} />
  ),
  tbody: ({ className, ...props }: ComponentProps<'tbody'>) => (
    <tbody className={className} {...props} />
  ),
  tr: ({ className, ...props }: ComponentProps<'tr'>) => (
    <tr className={className} {...props} />
  ),
  th: ({ className, ...props }: ComponentProps<'th'>) => (
    <th className={className} {...props} />
  ),
  td: ({ className, ...props }: ComponentProps<'td'>) => (
    <td className={className} {...props} />
  ),
  img: ({ className, src, alt, ...props }: ComponentProps<'img'>) => {
    const safeSrc = typeof src === 'string' ? src : ''
    return (
      <img
        src={safeSrc}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        className={className}
        {...props}
      />
    )
  },
}
