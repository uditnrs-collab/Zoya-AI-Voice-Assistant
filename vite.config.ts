import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

function youtubeSearchPlugin() {
  return {
    name: 'youtube-search-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/youtube-search', async (req: any, res: any) => {
        try {
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          const q = urlObj.searchParams.get('q');
          if (!q) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing query' }));
            return;
          }

          const cleanQ = q.replace(/^(play|chalao|sunao|search)\s+/i, '')
                          .replace(/\s+(play|chalao|sunao|song|video)$/i, '')
                          .trim();

          const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ || q)}`;
          const ytRes = await fetch(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });

          if (!ytRes.ok) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ watchUrl: searchUrl }));
            return;
          }

          const html = await ytRes.text();
          const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
          if (match && match[1]) {
            const videoId = match[1];
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              videoId, 
              watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
              searchUrl 
            }));
            return;
          }

          const watchMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
          if (watchMatch && watchMatch[1]) {
            const videoId = watchMatch[1];
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              videoId, 
              watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
              searchUrl 
            }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ watchUrl: searchUrl }));
        } catch (e) {
          console.error("YouTube search error:", e);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ watchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(req.url || '')}` }));
        }
      });
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), youtubeSearchPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
