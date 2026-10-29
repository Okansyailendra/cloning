import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'
import httpProxy from 'http-proxy'
import { getCertificate } from '@vitejs/plugin-basic-ssl'

function dualPortPlugin(httpsPort = 5174): Plugin {
  let httpsServer: https.Server | null = null

  return {
    name: 'vite-dual-port-https-proxy',
    configureServer(server) {
      server.httpServer?.once('listening', async () => {
        try {
          const address = server.httpServer?.address()
          const port = typeof address === 'object' && address ? address.port : 5173
          const cert = await getCertificate('./node_modules/.vite/basic-ssl')

          const proxy = httpProxy.createProxyServer({
            target: `http://127.0.0.1:${port}`,
            ws: true,
            changeOrigin: true
          })

          proxy.on('error', (err: any) => {
            if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE') {
              console.warn('[Dual-Port Proxy]:', err.message)
            }
          })

          httpsServer = https.createServer({ key: cert, cert: cert }, (req, res) => {
            proxy.web(req, res)
          })

          httpsServer.on('upgrade', (req, socket, head) => {
            proxy.ws(req, socket, head)
          })

          server.httpServer?.on('close', () => {
            httpsServer?.close()
          })

          httpsServer.listen(httpsPort, '0.0.0.0', () => {
            console.log(`\n  \x1b[32m➜\x1b[0m  \x1b[1mDual-Port Server Siap:\x1b[0m`)
            console.log(`     • \x1b[32mDesktop (Laptop):\x1b[0m \x1b[36mhttp://localhost:${port}/\x1b[0m  (HTTP Biasa, Tanpa Peringatan SSL)`)
            console.log(`     • \x1b[32mHP / Device Lain:\x1b[0m \x1b[36mhttps://172.16.10.141:${httpsPort}/\x1b[0m  (HTTPS, Izin Mikrofon Aktif)\n`)
          })
        } catch (e: any) {
          console.error('[Dual-Port Setup Error]:', e.message)
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dualPortPlugin(5174)],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/samples': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/audio_alarm': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
