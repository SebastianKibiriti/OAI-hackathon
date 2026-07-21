import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import analyzeHandler from './api/analyze.js';
import chatHandler from './api/chat.js';
import diagnosticsHandler from './api/diagnostics.js';

function readProjectEnv(root) {
  try {
    const raw = fs.readFileSync(path.join(root, '.env'), 'utf8');
    const values = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || match[1].startsWith('#')) continue;
      values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
    return values;
  } catch { return {}; }
}

function parseHostList(value) {
  return String(value || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
}

function listingHostGroups() {
  return {
    southAfrica: parseHostList(process.env.TERRARISK_ZA_LISTING_HOSTS),
    unitedStates: parseHostList(process.env.TERRARISK_US_LISTING_HOSTS),
    other: parseHostList(process.env.TERRARISK_LISTING_HOSTS)
  };
}

function localApiPlugin() {
  return {
    name: 'terrarisk-local-api',
    configureServer(server) {
      const refreshRuntimeEnv = () => Object.assign(process.env, loadEnv(server.config.mode, server.config.root, ''), readProjectEnv(server.config.root));
      server.middlewares.use('/api/health', (req, res, next) => {
        if (req.method !== 'GET') return next();
        refreshRuntimeEnv();
        res.setHeader('Content-Type', 'application/json');
        const listingHosts = listingHostGroups();
        res.end(JSON.stringify({ service: 'TerraRisk local API', openRouterKeyLoaded: Boolean(process.env.OPENROUTER_API_KEY), model: process.env.OPENROUTER_MODEL || null, wildfire: { usHazardLayerConfigured: Boolean(process.env.TERRARISK_US_WILDFIRE_ARCGIS_URL), usHistoryLayerConfigured: Boolean(process.env.TERRARISK_US_FIRE_HISTORY_ARCGIS_URL), zaHazardLayerConfigured: Boolean(process.env.TERRARISK_WILDFIRE_ARCGIS_URL) }, crime: { southAfricaHistoricalAdapter: process.env.TERRARISK_ZA_CRIME_STATS_URL !== 'off', southAfricaStatsUrlSource: process.env.TERRARISK_ZA_CRIME_STATS_URL ? 'environment' : 'built-in default', southAfricaStationUrlSource: process.env.TERRARISK_ZA_POLICE_STATIONS_URL ? 'environment' : 'built-in default with OSM fallback', usCrimeometerKeyLoaded: Boolean(process.env.CRIMEOMETER_API_KEY), usCustomProviderConfigured: Boolean(process.env.TERRARISK_US_CRIME_URL || process.env.TERRARISK_CRIME_URL) }, listingHosts: [...new Set(Object.values(listingHosts).flat())], listingHostGroups: listingHosts }));
      });
      const attachJsonRoute = (path, handler) => server.middlewares.use(path, async (req, res, next) => {
        if (req.method !== 'POST') return next();
        // Reload env for local API calls so changes to .env are picked up after a Vite restart.
        refreshRuntimeEnv();
        let raw = '';
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', async () => {
          req.body = raw ? JSON.parse(raw) : {};
          const response = {
            status(code) { res.statusCode = code; return this; },
            json(payload) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(payload)); }
          };
          await handler(req, response);
        });
      });
      attachJsonRoute('/api/analyze', analyzeHandler);
      attachJsonRoute('/api/chat', chatHandler);
      attachJsonRoute('/api/diagnostics', diagnosticsHandler);
      server.config.logger.info(`[terrarisk] OpenRouter ${process.env.OPENROUTER_API_KEY ? 'key loaded' : 'key missing'} · model ${process.env.OPENROUTER_MODEL || 'unset'}`);
    }
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [localApiPlugin()] };
});
