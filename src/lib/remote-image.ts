import { request as httpRequest, type IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { lookup } from 'node:dns'
import { isIP } from 'node:net'
import { isPublicAddress } from './public-network'

export const REMOTE_IMAGE_MAX_BYTES = 10 * 1024 * 1024
const MAX_REDIRECTS = 3
const TIMEOUT_MS = 20000

export class RemoteImageError extends Error {}

/** Syntactic checks done before any network access (DNS is checked at connect time). */
export function validateRemoteImageUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new RemoteImageError('url 不是合法地址')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RemoteImageError('url 必须是 http(s) 地址')
  }
  if (url.username || url.password) throw new RemoteImageError('url 不能包含账号密码')
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new RemoteImageError('不允许访问本地或内网地址')
  } else if (
    !host.includes('.') ||
    /(?:^|\.)(localhost|local|internal|lan|home|test|invalid|localdomain)$/.test(host) ||
    host === 'metadata.google.internal'
  ) {
    throw new RemoteImageError('不允许访问本地或内网地址')
  }
  return url
}

function requestOnce(url: URL): Promise<IncomingMessage> {
  const send = url.protocol === 'https:' ? httpsRequest : httpRequest
  return new Promise((resolve, reject) => {
    const req = send(
      url,
      {
        method: 'GET',
        headers: { accept: 'image/*', 'accept-encoding': 'identity', 'user-agent': 'blog-mcp/1.0' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // Validate the address actually connected to (defeats DNS rebinding).
        lookup(host, options, callback) {
          lookup(host, { all: true, verbatim: true }, (error, addresses) => {
            if (error) return callback(error, '', 4)
            if (!addresses.length || addresses.some((item) => !isPublicAddress(item.address))) {
              return callback(new RemoteImageError('域名解析到了非公网地址'), '', 4)
            }
            if (typeof options === 'object' && options.all) callback(null, addresses)
            else callback(null, addresses[0].address, addresses[0].family)
          })
        },
      },
      resolve
    )
    req.on('error', reject)
    req.end()
  })
}

/** Download a public image with SSRF protection, manual redirects and a hard size cap. */
export async function fetchRemoteImage(raw: string): Promise<{ bytes: Buffer; type: string; url: URL }> {
  let url = validateRemoteImageUrl(raw)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: IncomingMessage
    try {
      res = await requestOnce(url)
    } catch (error) {
      if (error instanceof RemoteImageError) throw error
      throw new RemoteImageError(`下载图片失败：${error instanceof Error ? error.message : String(error)}`)
    }
    const status = res.statusCode || 502
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume()
      if (hop === MAX_REDIRECTS) throw new RemoteImageError('重定向次数过多')
      url = validateRemoteImageUrl(new URL(res.headers.location, url).toString())
      continue
    }
    if (status < 200 || status >= 300) {
      res.resume()
      throw new RemoteImageError(`下载图片失败：${status}`)
    }
    const declared = Number(res.headers['content-length'] || 0)
    if (declared > REMOTE_IMAGE_MAX_BYTES) {
      res.destroy()
      throw new RemoteImageError('图片超过 10MB')
    }
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of res) {
      size += (chunk as Buffer).length
      if (size > REMOTE_IMAGE_MAX_BYTES) {
        res.destroy()
        throw new RemoteImageError('图片超过 10MB')
      }
      chunks.push(chunk as Buffer)
    }
    const type = String(res.headers['content-type'] || 'application/octet-stream').split(';')[0].trim()
    return { bytes: Buffer.concat(chunks), type, url }
  }
  throw new RemoteImageError('重定向次数过多')
}
