const riskSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    score: { type: 'number' }, confidence: { type: 'string' }, summary: { type: 'string' },
    risks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, level: { type: 'string' }, value: { type: 'number' }, tone: { type: 'string' }, text: { type: 'string' } }, required: ['name', 'level', 'value', 'tone', 'text'] } },
    priorities: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, detail: { type: 'string' }, action: { type: 'string' } }, required: ['title', 'detail', 'action'] } },
    questions: { type: 'array', items: { type: 'string' } }
  }, required: ['score', 'confidence', 'summary', 'risks', 'priorities', 'questions']
};

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
  const results = await response.json();
  if (!results[0]) throw new Error('Address not found');
  return { lat: Number(results[0].lat), lon: Number(results[0].lon), displayName: results[0].display_name, countryCode: results[0].address?.country_code || null, state: results[0].address?.state || null };
}

async function nearbyContext({ lat, lon }) {
  const query = `[out:json][timeout:15];(nwr(around:6000,${lat},${lon})[amenity~"school|hospital|fire_station|police|pharmacy|fuel|place_of_worship"];nwr(around:6000,${lat},${lon})[shop~"supermarket|convenience"];nwr(around:6000,${lat},${lon})[leisure~"park|sports_centre"];);out center tags;`;
  const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' }, body: new URLSearchParams({ data: query }) });
  if (!response.ok) throw new Error(`OpenStreetMap context returned ${response.status}`);
  const data = await response.json();
  return data.elements.slice(0, 120).map((element) => ({ name: element.tags?.name || 'Unnamed place', category: element.tags?.amenity || element.tags?.shop || element.tags?.leisure || 'place', lat: element.lat ?? element.center?.lat, lon: element.lon ?? element.center?.lon }));
}

async function environmentalContext({ lat, lon }) {
  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.search = new URLSearchParams({ latitude: lat, longitude: lon, current: 'temperature_2m,precipitation,wind_speed_10m,weather_code', daily: 'precipitation_sum,wind_gusts_10m_max', forecast_days: '7', timezone: 'auto' });
  const floodUrl = new URL('https://flood-api.open-meteo.com/v1/flood');
  floodUrl.search = new URLSearchParams({ latitude: lat, longitude: lon, daily: 'river_discharge', forecast_days: '7', timezone: 'auto' });
  const elevationUrl = new URL('https://api.open-meteo.com/v1/elevation');
  elevationUrl.search = new URLSearchParams({ latitude: lat, longitude: lon });
  const [forecastResult, floodResult, elevationResult] = await Promise.allSettled([
    fetch(forecastUrl), fetch(floodUrl), fetch(elevationUrl)
  ]);
  const read = async (result) => result.status === 'fulfilled' && result.value.ok ? result.value.json() : null;
  const forecast = await read(forecastResult);
  const flood = await read(floodResult);
  const elevation = await read(elevationResult);
  return {
    available: { weather: Boolean(forecast), riverDischarge: Boolean(flood), elevation: Boolean(elevation) },
    elevationMeters: elevation?.elevation?.[0] ?? null,
    currentWeather: forecast?.current ?? null,
    sevenDayWeather: forecast?.daily ?? null,
    sevenDayRiverDischarge: flood?.daily ?? null,
    limitations: ['Open-Meteo weather and flood values are model-derived signals, not property-level hazard determinations', 'No official flood-zone, wildfire, crime, or insurance-claims dataset was queried']
  };
}

async function queryArcGISPoint(url, { lat, lon }) {
  const query = new URL(url);
  query.search = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: 'false', f: 'json' });
  const response = await fetch(query, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
  if (!response.ok) throw new Error(`ArcGIS returned ${response.status}`);
  const data = await response.json();
  return data.features?.[0]?.attributes ?? null;
}

async function officialContext(location) {
  const isUnitedStates = location.countryCode === 'us';
  const wildfireUrl = isUnitedStates
    ? (process.env.TERRARISK_US_WILDFIRE_ARCGIS_URL || 'https://services.arcgis.com/jIL9msH9OI208GCb/ArcGIS/rest/services/USA_Wildfire_Hazard_Potential/FeatureServer/0/query')
    : (process.env.TERRARISK_WILDFIRE_ARCGIS_URL || 'https://bgismaps.sanbi.org/server/rest/services/BGIS_Projects/2010VeldFireRisk2/MapServer/0/query');
  const floodUrl = isUnitedStates
    ? (process.env.TERRARISK_US_FLOOD_ARCGIS_URL || 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query')
    : process.env.TERRARISK_FLOOD_URL;
  const riskUrl = isUnitedStates
    ? (process.env.TERRARISK_US_RISK_ARCGIS_URL || 'https://services.arcgis.com/PcBYuZP9vTIZ3FcN/ArcGIS/rest/services/FEMA_National_Risk_Index/FeatureServer/0/query')
    : null;
  const fetchConfigured = async (baseUrl) => {
    if (!baseUrl) return null;
    const url = new URL(baseUrl);
    url.searchParams.set('lat', location.lat);
    url.searchParams.set('lon', location.lon);
    const response = await fetch(url, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
    return response.ok ? response.json() : null;
  };
  const [wildfireResult, floodResult, riskResult, crimeResult, claimsResult] = await Promise.allSettled([
    queryArcGISPoint(wildfireUrl, location),
    floodUrl ? queryArcGISPoint(floodUrl, location) : Promise.resolve(null),
    riskUrl ? queryArcGISPoint(riskUrl, location) : Promise.resolve(null),
    fetchConfigured(process.env.TERRARISK_CRIME_URL), fetchConfigured(process.env.TERRARISK_CLAIMS_URL)
  ]);
  const value = (result) => result.status === 'fulfilled' ? result.value : null;
  return {
    jurisdiction: isUnitedStates ? 'United States' : location.countryCode === 'za' ? 'South Africa' : 'Other',
    wildfire: value(wildfireResult), floodZone: value(floodResult), nationalRiskIndex: value(riskResult), crime: value(crimeResult), insuranceClaims: value(claimsResult),
    coverage: { wildfire: Boolean(value(wildfireResult)), floodZone: Boolean(value(floodResult)), nationalRiskIndex: Boolean(value(riskResult)), crime: Boolean(value(crimeResult)), insuranceClaims: Boolean(value(claimsResult)) },
    sourceNotes: {
      wildfire: isUnitedStates ? 'U.S. Wildfire Hazard Potential ArcGIS layer; point result is regional context, not a property inspection' : 'CSIR/SANBI national veld-fire risk ArcGIS layer; point result is regional context, not a property inspection',
      floodZone: isUnitedStates ? 'FEMA National Flood Hazard Layer point query' : 'No country-specific flood-zone provider configured',
      nationalRiskIndex: isUnitedStates ? 'FEMA National Risk Index point query' : 'Not applicable',
      crime: process.env.TERRARISK_CRIME_URL ? 'Configured crime provider' : 'No point-level crime provider configured; official SAPS statistics are published as reports',
      insuranceClaims: process.env.TERRARISK_CLAIMS_URL ? 'Configured claims provider' : 'No claims provider configured; claims data is normally licensed and private'
    }
  };
}

function distanceKm(a, b) {
  const r = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function summarizeNearby(origin, places) {
  const grouped = {};
  for (const place of places) {
    if (place.lat == null || place.lon == null) continue;
    grouped[place.category] ||= [];
    grouped[place.category].push({ ...place, distanceKm: Number(distanceKm(origin, place).toFixed(2)) });
  }
  return Object.fromEntries(Object.entries(grouped).map(([key, value]) => [key, value.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8)]));
}

function parseModelJson(content) {
  const cleaned = String(content || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Model returned invalid JSON');
  }
}

async function callOpenRouter(evidence) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
  if (!process.env.OPENROUTER_MODEL) throw new Error('OPENROUTER_MODEL is not configured');
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
      ...(process.env.OPENROUTER_SITE_NAME ? { 'X-Title': process.env.OPENROUTER_SITE_NAME } : {})
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: 'You are TerraRisk, an evidence-led location risk analyst. Reason only from supplied facts. Never invent hazard records, crime statistics, insurance terms, or claims about residents. This is decision support, not insurance advice. Use cautious language and surface uncertainty. Return only valid JSON matching the requested structure.' },
        { role: 'user', content: `Analyse this property context and return a concise, explainable risk brief as JSON. Required top-level keys: score (number), confidence (string), summary (string), risks (array of {name, level, value, tone, text}), priorities (array of {title, detail, action}), questions (array of strings).\n\n${JSON.stringify(evidence)}` }
      ],
      ...(process.env.OPENROUTER_JSON_MODE !== 'off' ? { response_format: { type: 'json_object' } } : {})
    })
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 400);
    throw new Error(`OpenRouter returned ${response.status}${details ? `: ${details}` : ''}`);
  }
  const payload = await response.json();
  return parseModelJson(payload.choices?.[0]?.message?.content);
}

export async function analyzeLocation(address) {
  const location = await geocode(address);
  const [places, environment, official] = await Promise.all([nearbyContext(location), environmentalContext(location), officialContext(location)]);
  const evidence = { address: location.displayName, coordinates: location, nearby: summarizeNearby(location, places), environment, official, limitations: ['No property inspection performed', 'No policy wording supplied', 'Nearby context is sourced from OpenStreetMap and may be incomplete', 'Official crime and insurance-claims feeds are not assumed without a configured provider'] };
  const report = await callOpenRouter(evidence);
  const isUnitedStates = location.countryCode === 'us';
  const officialSource = isUnitedStates ? ['FEMA National Flood Hazard Layer', 'FEMA National Risk Index', 'U.S. Wildfire Hazard Potential'] : ['CSIR/SANBI veld-fire risk layer'];
  return { ...report, address: location.displayName, locality: location.displayName, nearby: Object.values(evidence.nearby).flat().slice(0, 8), sources: ['OpenStreetMap Nominatim', 'OpenStreetMap Overpass', 'Open-Meteo forecast, flood, and elevation APIs', ...officialSource, `OpenRouter · ${process.env.OPENROUTER_MODEL}`], dataCoverage: { ...environment.available, ...official.coverage }, jurisdiction: official.jurisdiction, live: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    if (address.length < 5) return res.status(400).json({ error: 'Enter a complete address.' });
    return res.status(200).json(await analyzeLocation(address));
  } catch (error) {
    console.error('[terrarisk/analyze]', error.message);
    return res.status(503).json({ error: 'Live analysis is not configured or a provider is unavailable.' });
  }
}
