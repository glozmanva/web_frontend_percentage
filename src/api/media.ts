export function mediaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  if (value.startsWith('/')) return value
  try {
    const url = new URL(value)
    const configured = new URL(import.meta.env.VITE_MINIO_ORIGIN || 'http://localhost:9000')
    const loopback = ['localhost', '127.0.0.1', '[::1]']
    const localMinio = loopback.includes(url.hostname) && loopback.includes(configured.hostname) && url.port === configured.port
    if (url.origin === configured.origin || localMinio) return `/s3${url.pathname}${url.search}`
  } catch { /* Let the image/video fallback handle an invalid URL. */ }
  return value
}
