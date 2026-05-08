import { defineConfig, loadEnv } from "vite"
import vue from "@vitejs/plugin-vue"
import AutoImport from "unplugin-auto-import/vite"
import Components from "unplugin-vue-components/vite"
import { ElementPlusResolver } from "unplugin-vue-components/resolvers"

function adobeStatusProxyPlugin() {
  return {
    name: "adobe-status-proxy",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/adobe-api/user-status", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ error: "Method not allowed" }))
          return
        }

        try {
          const chunks = []
          for await (const chunk of req) {
            chunks.push(chunk)
          }

          const upstream = await fetch("https://reseller.ado-besoft.com/api/user-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: Buffer.concat(chunks).toString("utf8"),
          })
          const body = await upstream.text()

          res.statusCode = upstream.status
          res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json")
          res.end(body)
        } catch (error) {
          res.statusCode = 502
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({
            error: "Adobe status proxy request failed",
            message: error?.message || "Unknown proxy error",
          }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3002"

  return {
    plugins: [
      vue(),
      adobeStatusProxyPlugin(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
        "/socket.io": {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
