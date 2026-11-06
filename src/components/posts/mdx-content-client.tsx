'use client'

import 'katex/dist/katex.min.css'

import { ComponentProps, isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypePrismPlus from 'rehype-prism-plus'
import { mdxComponents } from '@/components/mdx/mdx-components.client'
import { Mermaid } from './mermaid'
import { CodeCopyButton } from './code-copy-button'
import { cn } from '@/lib/utils'
import { ArticleImages } from './article-images'

interface MDXContentClientProps {
  content: string
}

type MarkdownCodeProps = ComponentProps<'code'> & {
  inline?: boolean
  node?: unknown
}

const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: '',
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'div',
    'span',
    'details',
    'summary',
    'kbd',
    'mark',
    'section',
    'sup',
    'sub',
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': ['id'],
    div: ['className', 'class'],
    span: ['className', 'class'],
    code: ['className', 'class'],
    pre: ['className', 'class'],
    a: ['href', 'title', 'rel', 'target', 'id', 'aria-describedby'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    sup: ['id'],
    li: ['id', 'className'],
    ol: ['id'],
    ul: ['id', 'className'],
    section: ['id', 'className', 'dataFootnotes'],
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
  },
}

function extractTextFromReact(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractTextFromReact).join('')
  if (isValidElement(node)) {
    return extractTextFromReact((node as { props?: { children?: unknown } }).props?.children)
  }
  return ''
}

export function MDXContentClient({ content }: MDXContentClientProps) {
  let headingIndex = 0

  const HeadingH1 = ({ className, ...props }: ComponentProps<'h1'>) => (
    <h1
      id={`heading-${headingIndex++}`}
      className={className}
      {...props}
    />
  )

  const HeadingH2 = ({ className, ...props }: ComponentProps<'h2'>) => (
    <h2
      id={`heading-${headingIndex++}`}
      className={className}
      {...props}
    />
  )

  const HeadingH3 = ({ className, ...props }: ComponentProps<'h3'>) => (
    <h3
      id={`heading-${headingIndex++}`}
      className={className}
      {...props}
    />
  )

  return (
    <ArticleImages>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema],
          [rehypeKatex, { strict: 'ignore' }],
          [rehypePrismPlus, { ignoreMissing: true }],
        ]}
        components={{
          ...mdxComponents,
          h1: HeadingH1,
          h2: HeadingH2,
          h3: HeadingH3,
          pre({ children }) {
            const child = Array.isArray(children) ? children[0] : children
            if (isValidElement(child)) {
              const childProps = child.props as { className?: string; children?: unknown }
              const className = childProps.className || ''
              const match = /language-(\w+)/.exec(className)
              const language = match ? match[1] : ''
              const rawCode = extractTextFromReact(childProps.children)
              const code = rawCode.replace(/\n$/, '')

              if (language === 'mermaid') {
                return <Mermaid content={code} />
              }

              const renderedChildren = (childProps.children as ReactNode | undefined) ?? code

              return (
                <div data-code-block className="code-block">
                  <div className="code-block__bar">
                    <span className="code-block__lang">
                      {language || 'code'}
                    </span>
                    <CodeCopyButton />
                  </div>

                  <pre className="code-block__pre">
                    <code className={className}>{renderedChildren}</code>
                  </pre>
                </div>
              )
            }

            return <pre>{children}</pre>
          },
          code({ className, children, ...props }: MarkdownCodeProps) {
            return (
              <code
                className={cn(
                  'inline-code',
                  className
                )}
                {...props}
              >
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </ArticleImages>
  )
}
