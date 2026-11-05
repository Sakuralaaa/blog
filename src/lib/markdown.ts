import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { visit } from 'unist-util-visit'

export type MarkdownHeading = {
  text: string
  level: number
}

type MdastNode = {
  type: string
  value?: string
  depth?: number
  children?: MdastNode[]
}

function extractText(node: MdastNode | undefined): string {
  if (!node) return ''
  if (typeof node.value === 'string') return node.value
  if (!node.children || node.children.length === 0) return ''
  return node.children.map(extractText).join('')
}

export function extractHeadingsFromMarkdown(markdown: string, maxDepth = 3): MarkdownHeading[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdastNode
  const headings: MarkdownHeading[] = []

  visit(tree as MdastNode, 'heading', (node: MdastNode) => {
    const depth = typeof node.depth === 'number' ? node.depth : 0
    if (!depth || depth > maxDepth) return
    const text = extractText(node).trim()
    if (!text) return
    headings.push({ text, level: depth })
  })

  return headings
}

/**
 * Drop a leading `# Title` line when it repeats the post title, so the article page
 * does not show the same H1 twice (header + body).
 */
export function stripLeadingTitle(markdown: string, title: string): string {
  const normalize = (value: string) =>
    value
      .replace(/[*_`~]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
  const match = markdown.match(/^(?:\s*\n)*#[ \t]+(.+?)[ \t#]*(?:\r?\n|$)/)
  if (!match || normalize(match[1]) !== normalize(title)) return markdown
  return markdown.slice(match[0].length).replace(/^\s*\n/, '')
}
