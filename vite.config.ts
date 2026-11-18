import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import aws4 from 'aws4'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  // Development server only. These MINIO_* variables are never exposed as VITE_*.
  const backendEnv = loadEnv(mode, resolve(env.GO_BACKEND_DIR || '../web_backend_percentage'), 'MINIO_')
  const minioTarget = new URL(env.MINIO_URL || 'http://localhost:9000')
  const bucket = env.MINIO_BUCKET_NAME || backendEnv.MINIO_BUCKET_NAME
  const accessKeyId = env.MINIO_ACCESS_KEY || backendEnv.MINIO_ACCESS_KEY
  const secretAccessKey = env.MINIO_SECRET_KEY || backendEnv.MINIO_SECRET_KEY
  const generatedMedia = (path: string) => {
    const pathname = new URL(path, minioTarget).pathname
    return pathname.startsWith(`/${bucket}/`) && /^deposit_month_\d+_(image|video)\.(jpg|png|gif|webp|mp4|webm|mov)$/.test(pathname.slice(`/${bucket}/`.length))
  }
  return {
    plugins: [react(), {
      name: 'read-only-s3-proxy',
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.startsWith('/s3/') && !['GET', 'HEAD'].includes(request.method || '')) {
            response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return
          }
          next()
        })
      },
    }],
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': { target: env.GO_API_URL || 'http://localhost:8080', changeOrigin: true },
        '/s3': {
          target: minioTarget.origin,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/s3/, ''),
          configure(proxy) {
            proxy.on('proxyReq', request => {
              // Sign only known generated image/video names, never bucket listings or writes.
              if (!accessKeyId || !secretAccessKey || !generatedMedia(request.path) || !['GET', 'HEAD'].includes(request.method)) return
              const signed = aws4.sign({ host: minioTarget.host, path: request.path, method: request.method, service: 's3', region: 'us-east-1' }, { accessKeyId, secretAccessKey })
              for (const [name, value] of Object.entries(signed.headers || {})) {
                if (value !== undefined) request.setHeader(name, value)
              }
            })
          },
        },
      },
    },
  }
})
