import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/artwork': {
          target: 'https://c.saavncdn.com',
          changeOrigin: true,
          rewrite: (requestPath) => {
            const requestUrl = new URL(requestPath, 'http://localhost')
            const artworkUrl = requestUrl.searchParams.get('url')
            if (!artworkUrl) return '/'

            try {
              const parsed = new URL(artworkUrl)
              if (parsed.protocol !== 'https:' || parsed.hostname !== 'c.saavncdn.com') return '/'
              return `${parsed.pathname}${parsed.search}`
            } catch {
              return '/'
            }
          },
        },
        '/api': {
          target: env.VITE_SAAVN_API_URL || 'https://saavn.sumit.co',
          changeOrigin: true,
        },
      },
    },
  }
})
