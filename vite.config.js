import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createClassifyHandler } from './server/classifyRoute.js'

// Serves POST /api/classify in both dev and preview. The Groq key is read from
// GROQ_API_KEY on the server; it is not a VITE_ variable and is never bundled.
function classifyApi(env) {
  const handler = createClassifyHandler(env)
  return {
    name: 'classify-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), classifyApi(env)],
  }
})
