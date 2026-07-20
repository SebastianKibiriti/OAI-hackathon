import { defineConfig, loadEnv } from 'vite';
import analyzeHandler from './api/analyze.js';

function localApiPlugin() {
  return {
    name: 'terrarisk-local-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res, next) => {
        if (req.method !== 'POST') return next();
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', async () => {
          req.body = raw ? JSON.parse(raw) : {};
          const response = {
            status(code) { res.statusCode = code; return this; },
            json(payload) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(payload)); }
          };
          await analyzeHandler(req, response);
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [localApiPlugin()] };
});
