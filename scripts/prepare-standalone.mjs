import { cp, mkdir, copyFile, access, rm, realpath } from 'node:fs/promises'
import path from 'node:path'
import { getLoadablePath } from 'sqlite-vec'

const output = '.next/standalone'
// bootstrap-admin runs outside Next.js tracing. bcryptjs has no runtime dependencies;
// copy the installed package itself so pnpm's development symlink cannot escape the image.
const bcryptDestination = path.join(output, 'node_modules/bcryptjs')
await rm(bcryptDestination, { recursive: true, force: true })
await cp(await realpath('node_modules/bcryptjs'), bcryptDestination, { recursive: true })
// Self-hosted fonts are part of first paint; fail the build instead of shipping fallbacks.
for (const asset of [
  'fonts/inter-5.3.0/inter-latin-wght-normal.woff2',
  'fonts/jetbrains-mono-5.3.0/jetbrains-mono-latin-wght-normal.woff2',
  'fonts/noto-sans-sc-5.3.0/noto-sans-sc-latin-wght-normal.woff2',
  'fonts/source-serif-4-5.3.1/source-serif-4-latin-wght-normal.woff2',
]) {
  await access(path.join('public', asset)).catch(() => {
    throw new Error(`首屏资源缺失：public/${asset}，请确认资源已随仓库检出`)
  })
}
// Also remove leftovers when rebuilding into an existing standalone directory.
await rm(`${output}/public/uploads`, { recursive: true, force: true })
await cp('public', `${output}/public`, {
  recursive: true, filter: source => path.resolve(source) !== path.resolve('public/uploads'),
})
await cp('.next/static', `${output}/.next/static`, { recursive: true })
// The platform extension is optional in npm, but required at runtime for RAG.
const extension = getLoadablePath()
const platformPackage = path.basename(path.dirname(extension))
const destination = path.join(output, 'node_modules', platformPackage)
await mkdir(destination, { recursive: true })
await copyFile(extension, path.join(destination, path.basename(extension)))
console.log('[standalone] static assets and vector extension prepared')
