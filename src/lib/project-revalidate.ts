import { revalidatePath } from 'next/cache'
import { projectPath } from './projects'

/** Refresh the home page, the works list and the detail pages of the given works at once. */
export function revalidateProjects(...projects: Array<{ id: string; slug?: string | null }>) {
  try {
    revalidatePath('/')
    revalidatePath('/projects')
    // Neighbours show prev/next links, so refresh every detail page.
    revalidatePath('/projects/[slug]', 'page')
    for (const project of projects) {
      revalidatePath(projectPath(project))
      revalidatePath(`/projects/${project.id}`)
    }
  } catch (error) {
    console.error('刷新作品页面缓存失败:', error)
  }
}
