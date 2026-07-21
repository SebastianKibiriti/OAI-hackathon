const riskSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    score: { type: 'number' }, confidence: { type: 'string' }, summary: { type: 'string' },
    risks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, level: { type: 'string' }, value: { type: 'number' }, tone: { type: 'string' }, text: { type: 'string' }, evidence: { type: 'array', items: { type: 'string' } }, sources: { type: 'array', items: { type: 'string' } } }, required: ['name', 'level', 'value', 'tone', 'text', 'evidence', 'sources'] } },
    priorities: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, detail: { type: 'string' }, action: { type: 'string' } }, required: ['title', 'detail', 'action'] } },
    questions: { type: 'array', items: { type: 'string' } },
    specialists: { type: 'object', additionalProperties: false, properties: { environmental: { type: 'string' }, infrastructure: { type: 'string' }, community: { type: 'string' }, insurance: { type: 'string' }, investment: { type: 'string' } }, required: ['environmental', 'infrastructure', 'community', 'insurance', 'investment'] },
    dueDiligence: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { item: { type: 'string' }, why: { type: 'string' }, owner: { type: 'string' } }, required: ['item', 'why', 'owner'] } }
  }, required: ['score', 'confidence', 'summary', 'risks', 'priorities', 'questions', 'specialists', 'dueDiligence']
};

async function geocode(address, profile = 'auto') {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ format: 'jsonv2', limit: '1', q: address, ...(profile === 'us' ? { countrycodes: 'us' } : {}), ...(profile === 'za' ? { countrycodes: 'za' } : {}) });
  const response = await fetch(url, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
  const results = await response.json();
  if (!results[0]) throw new Error('Address not found');
  return { lat: Number(results[0].lat), lon: Number(results[0].lon), displayName: results[0].display_name, countryCode: results[0].address?.country_code || null, state: results[0].address?.state || null, stateCode: results[0].address?.['ISO3166-2-lvl4']?.split('-').pop() || null, county: results[0].address?.county || null };
}

function parseHostList(value) {
  return String(value || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
}

function configuredListingHostGroups() {
  return {
    southAfrica: parseHostList(process.env.TERRARISK_ZA_LISTING_HOSTS),
    unitedStates: parseHostList(process.env.TERRARISK_US_LISTING_HOSTS),
    other: parseHostList(process.env.TERRARISK_LISTING_HOSTS)
  };
}

function configuredListingHosts() {
  return [...new Set(Object.values(configuredListingHostGroups()).flat())];
}

function isAllowedListingHost(hostname) {
  return configuredListingHosts().some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

function decodeHtml(value) {
  return String(value || '').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function htmlAttributes(tag) {
  const attributes = {};
  for (const match of String(tag || '').matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) attributes[match[1].toLowerCase()] = decodeHtml(match[3]);
  return attributes;
}

function metaContent(html, names) {
  const accepted = new Set(names.map((name) => name.toLowerCase()));
  for (const match of String(html || '').matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = htmlAttributes(match[0]);
    const key = attributes.property || attributes.name || attributes.itemprop;
    if (key && accepted.has(key.toLowerCase()) && attributes.content) return attributes.content.trim();
  }
  return '';
}

function findListingAddress(value) {
  if (!value || typeof value !== 'object') return null;
  const address = value.address;
  if (typeof address === 'string' && address.length >= 8) return address;
  if (address && typeof address === 'object') {
    const parts = [address.streetAddress, address.addressLocality, address.addressRegion, address.postalCode, address.addressCountry].filter(Boolean);
    if (parts.length >= 2) return parts.join(', ');
  }
  for (const nested of Object.values(value)) {
    if (Array.isArray(nested)) {
      for (const item of nested) { const found = findListingAddress(item); if (found) return found; }
    } else if (nested && typeof nested === 'object') {
      const found = findListingAddress(nested);
      if (found) return found;
    }
  }
  return null;
}

function extractListingMetadata(html) {
  const title = metaContent(html, ['og:title', 'twitter:title']) || decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || 'Property listing');
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].replace(/^<!--[\s\S]*?-->/, '').trim());
      const address = findListingAddress(parsed);
      if (address) return { title, address, extraction: 'JSON-LD' };
    } catch { /* Ignore malformed schema blocks. */ }
  }
  const dataScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).filter((script) => /streetAddress|addressLocality|postalCode|propertyAddress/i.test(script));
  for (const script of dataScripts) {
    try {
      const jsonStart = script.indexOf('{');
      const parsed = JSON.parse(script.slice(jsonStart >= 0 ? jsonStart : 0).replace(/;\s*$/, '').trim());
      const address = findListingAddress(parsed);
      if (address) return { title, address, extraction: 'embedded JSON' };
    } catch { /* Some listing apps wrap JSON in JavaScript assignments. Use the field fallback below. */ }
  }
  const street = scriptField(dataScripts, 'streetAddress');
  const locality = scriptField(dataScripts, 'addressLocality');
  const region = scriptField(dataScripts, 'addressRegion');
  const postal = scriptField(dataScripts, 'postalCode');
  if (street && (locality || region || postal)) return { title, address: [street, locality, region, postal].filter(Boolean).join(', '), extraction: 'embedded address fields' };
  const description = metaContent(html, ['og:description', 'description', 'og:street-address', 'property:street_address']);
  const visibleText = decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  const addressMatch = `${description} ${visibleText}`.match(/(?:located at|property address|street address|address)\s*[:\-]\s*([^.|;]{8,180})/i);
  return { title, address: addressMatch?.[1]?.trim() || null, extraction: addressMatch ? 'page text' : null };
}

function scriptField(scripts, field) {
  for (const script of scripts) {
    const match = String(script).match(new RegExp(`["']${field}["']\\s*:\\s*["']([^"']{3,180})`, 'i'));
    if (match?.[1]) return decodeHtml(match[1]).trim();
  }
  return '';
}

async function listingContext(listingUrl) {
  if (!listingUrl) return null;
  let url;
  try { url = new URL(listingUrl); } catch { throw new Error('Enter a valid property-listing URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || !isAllowedListingHost(url.hostname.toLowerCase())) {
    const hosts = configuredListingHosts();
    throw new Error(hosts.length ? 'That listing host is not enabled for TerraRisk.' : 'Listing URLs are not enabled yet. Add approved domains to TERRARISK_ZA_LISTING_HOSTS, TERRARISK_US_LISTING_HOSTS, or TERRARISK_LISTING_HOSTS.');
  }
  const response = await fetch(url, { headers: { 'User-Agent': 'TerraRiskAI/0.1 public-listing metadata reader' }, redirect: 'manual', signal: AbortSignal.timeout(8000) });
  if (response.status >= 300 && response.status < 400) throw new Error('Listing redirects are not followed. Paste the final listing URL instead.');
  if (!response.ok) throw new Error(`Listing page returned ${response.status}.`);
  if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('That URL did not return an HTML property listing.');
  const length = Number(response.headers.get('content-length') || 0);
  if (length > 1_500_000) throw new Error('Listing page is too large to inspect safely.');
  const metadata = extractListingMetadata((await response.text()).slice(0, 1_500_000));
  if (!metadata.address) throw new Error('The listing page loaded, but it did not publish an address in machine-readable or visible text. Paste the individual listing page with its address visible, or enter the address manually.');
  return { ...metadata, sourceUrl: url.toString() };
}

async function nearbyContext({ lat, lon }, radiusMeters = 6000, { timeoutMs = 15000 } = {}) {
  const radius = Math.max(500, Math.min(25000, Number(radiusMeters) || 6000));
  const query = `[out:json][timeout:15];(nwr(around:${radius},${lat},${lon})[amenity~"school|hospital|clinic|fire_station|police|pharmacy|fuel|place_of_worship|library|bus_station"];nwr(around:${radius},${lat},${lon})[shop~"supermarket|convenience"];nwr(around:${radius},${lat},${lon})[leisure~"park|sports_centre"];nwr(around:${radius},${lat},${lon})[public_transport~"station|platform"];);out center tags;`;
  let data;
  let lastError;
  for (const endpoint of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(endpoint, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' }, body: new URLSearchParams({ data: query }) });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`OpenStreetMap context returned ${response.status}`);
      data = await response.json();
      break;
    } catch (error) { lastError = error; }
  }
  if (!data) throw lastError || new Error('OpenStreetMap context unavailable');
  const mapped = data.elements.map((element) => ({ name: element.tags?.name || 'Unnamed place', category: element.tags?.amenity || element.tags?.shop || element.tags?.leisure || element.tags?.public_transport || 'place', lat: element.lat ?? element.center?.lat, lon: element.lon ?? element.center?.lon }));
  // The first batch keeps the response small for the UI, but police points are
  // also required by the South African station-level historical-crime matcher.
  // Do not let a dense area of amenities silently remove them before matching.
  const selected = [...mapped.slice(0, 160), ...mapped.filter((place) => place.category === 'police')];
  return [...new Map(selected.map((place) => [`${place.category}:${place.name}:${place.lat}:${place.lon}`, place])).values()];
}

function validNumbers(values) { return (values || []).filter((value) => Number.isFinite(Number(value))).map(Number); }
function maxOrNull(values) { const clean = validNumbers(values); return clean.length ? Math.max(...clean) : null; }
function sum(values) { return validNumbers(values).reduce((total, value) => total + value, 0); }

function summarizeHistoricalWeather(daily, startYear, endYear) {
  const precipitation = validNumbers(daily?.precipitation_sum);
  const maxWind = validNumbers(daily?.wind_speed_10m_max);
  const maxTemperature = validNumbers(daily?.temperature_2m_max);
  const yearCount = Math.max(1, endYear - startYear + 1);
  return {
    period: `${startYear}–${endYear}`,
    years: yearCount,
    daysObserved: precipitation.length,
    averageAnnualPrecipitationMm: precipitation.length ? Number((sum(precipitation) / yearCount).toFixed(1)) : null,
    heavyRainDaysOver30mm: precipitation.filter((value) => value >= 30).length,
    heavyRainDaysOver50mm: precipitation.filter((value) => value >= 50).length,
    wettestDayMm: maxOrNull(precipitation),
    highestDailyWindKmh: maxOrNull(maxWind),
    hottestDayC: maxOrNull(maxTemperature),
    source: 'Open-Meteo Historical Weather API (ERA5 reanalysis)'
  };
}

async function environmentalContext({ lat, lon }) {
  const endYear = new Date().getUTCFullYear() - 1;
  const startYear = endYear - 9;
  const archiveUrl = new URL('https://archive-api.open-meteo.com/v1/archive');
  archiveUrl.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    start_date: `${startYear}-01-01`,
    end_date: `${endYear}-12-31`,
    daily: 'precipitation_sum,wind_speed_10m_max,temperature_2m_max',
    wind_speed_unit: 'kmh',
    timezone: 'auto'
  });
  const elevationUrl = new URL('https://api.open-meteo.com/v1/elevation');
  elevationUrl.search = new URLSearchParams({ latitude: lat, longitude: lon });
  const [historyResult, elevationResult] = await Promise.allSettled([fetch(archiveUrl), fetch(elevationUrl)]);
  const read = async (result) => result.status === 'fulfilled' && result.value.ok ? result.value.json() : null;
  const historicalWeather = await read(historyResult);
  const elevation = await read(elevationResult);
  return {
    available: { historicalWeather: Boolean(historicalWeather), elevation: Boolean(elevation) },
    elevationMeters: elevation?.elevation?.[0] ?? null,
    historicalWeather: historicalWeather?.daily ? summarizeHistoricalWeather(historicalWeather.daily, startYear, endYear) : null,
    limitations: ['Historical weather is gridded reanalysis data, not a property-level inspection or loss record', 'No historical insurance claims or verified property-damage record was queried']
  };
}

async function queryArcGISPoint(url, { lat, lon }, { identifyFallback = false } = {}) {
  const query = new URL(url);
  query.search = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: 'false', f: 'json' });
  const response = await fetch(query, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
  if (!response.ok) throw new Error(`ArcGIS returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(`ArcGIS query failed: ${data.error.message || data.error.code || 'unknown error'}`);
  if (data.features?.[0]?.attributes) return data.features[0].attributes;
  if (!identifyFallback || !/\/MapServer\/\d+\/query$/i.test(query.pathname)) return null;
  const identify = new URL(query.toString().replace(/\/\d+\/query$/i, '/identify'));
  const span = 0.05;
  identify.search = new URLSearchParams({ geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', sr: '4326', layers: `all:${query.pathname.match(/\/MapServer\/(\d+)\/query/i)?.[1] || 0}`, tolerance: '4', mapExtent: `${lon - span},${lat - span},${lon + span},${lat + span}`, imageDisplay: '1000,1000,96', returnGeometry: 'false', f: 'json' });
  const identifyResponse = await fetch(identify, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
  if (!identifyResponse.ok) throw new Error(`ArcGIS identify returned ${identifyResponse.status}`);
  const identified = await identifyResponse.json();
  if (identified.error) throw new Error(`ArcGIS identify failed: ${identified.error.message || identified.error.code || 'unknown error'}`);
  return identified.results?.[0]?.attributes ?? null;
}

async function queryArcGISRecords(url, { lat, lon }, { distanceKm = 0, limit = 100, orderBy = '' } = {}) {
  const query = new URL(url);
  const params = { geometry: `${lon},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: '*', returnGeometry: 'false', resultRecordCount: String(limit), f: 'json' };
  if (distanceKm > 0) { params.distance = String(distanceKm); params.units = 'esriSRUnit_Kilometer'; }
  if (orderBy) params.orderByFields = orderBy;
  query.search = new URLSearchParams(params);
  const response = await fetch(query, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
  if (!response.ok) throw new Error(`ArcGIS returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(`ArcGIS query failed: ${data.error.message || data.error.code || 'unknown error'}`);
  return Array.isArray(data.features) ? data.features.map((feature) => feature.attributes || {}).filter((attributes) => Object.keys(attributes).length) : [];
}

function fireHistorySummary(records) {
  const eventsByKey = new Map();
  const currentYear = new Date().getUTCFullYear();
  for (const attributes of records) {
    const year = Number(attributes.FIRE_YEAR_INT || attributes.FIRE_YEAR || attributes.fireyear || attributes.YEAR || attributes.Year) || null;
    if (year && year > currentYear) continue;
    const incident = String(attributes.INCIDENT || attributes.incidentname || attributes.INCIDENTNAME || attributes.FIRE_NAME || attributes.FIRENAME || 'Unnamed perimeter').trim();
    const acreage = Number(attributes.GIS_ACRES || attributes.gisacres || attributes.ACRES || attributes.Shape__Area) || null;
    const key = `${incident.toLowerCase()}-${year || attributes.OBJECTID || eventsByKey.size}`;
    if (!eventsByKey.has(key)) eventsByKey.set(key, { incident, year, acreage });
  }
  const events = [...eventsByKey.values()].sort((a, b) => (b.year || 0) - (a.year || 0));
  const uniqueYears = [...new Set(events.map((event) => event.year).filter(Number.isFinite))].sort((a, b) => a - b);
  return {
    eventCount: events.length,
    rawRecordCount: records.length,
    years: uniqueYears.slice(-12),
    period: uniqueYears.length ? `${Math.min(...uniqueYears)} to ${Math.max(...uniqueYears)}` : 'Historical period not exposed by provider',
    events: events.slice(0, 6),
    totalMappedAcres: Math.round(events.reduce((sum, event) => sum + (event.acreage || 0), 0)) || null
  };
}

function historicalCrimeWindow() {
  const end = new Date();
  end.setUTCDate(1);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(0);
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 5);
  start.setUTCDate(start.getUTCDate() + 1);
  const format = (date) => date.toISOString().slice(0, 10);
  return { start: format(start), end: format(end) };
}

const DEFAULT_ZA_CRIME_STATS_URL = 'https://open.africa/dataset/9cefda6a-f897-4c1a-8f37-0666d2410696/resource/786ddfdb-c192-4fab-bb47-ea41f00cc3cb/download/policestatistics_2005-2018.csv';
const DEFAULT_ZA_POLICE_STATIONS_URL = 'https://data.code4sa.org/api/views/jxjg-hd2g/rows.json?accessType=DOWNLOAD';
const DEFAULT_US_FIRE_HISTORY_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/InterAgencyFirePerimeterHistory_All_Years_View/FeatureServer/0/query';
function zaCrimeStatsUrl() { return process.env.TERRARISK_ZA_CRIME_STATS_URL || DEFAULT_ZA_CRIME_STATS_URL; }
function zaPoliceStationsUrl() { return process.env.TERRARISK_ZA_POLICE_STATIONS_URL || DEFAULT_ZA_POLICE_STATIONS_URL; }
const zaCrimeCache = { stats: null, stations: null, loadedAt: 0 };

function normalizeStationName(value) {
  return String(value || '').toLowerCase().replace(/police|station|saps|[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < String(text || '').length; i += 1) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(field); field = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  if (field || row.length) { row.push(field); if (row.some((value) => String(value).trim())) rows.push(row); }
  return rows;
}

function crimeReportingYear(value) {
  const years = String(value || '').match(/(?:19|20)\d{2}/g) || [];
  // SAPS rows use reporting periods such as "2005-2006". Keep the end year for
  // ordering while retaining the original reporting period for user-facing context.
  return years.length ? Number(years.at(-1)) : NaN;
}

function stationRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function objectValue(object, pattern) {
  const entry = Object.entries(object || {}).find(([key, value]) => pattern.test(key) && value !== '' && value != null);
  return entry?.[1];
}

async function fetchTextOrJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype', Accept: 'application/json,text/csv,*/*' } });
  if (!response.ok) throw new Error(`Crime dataset returned ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (contentType.includes('json') || /^\s*[\[{]/.test(text)) {
    try { return JSON.parse(text); } catch { /* Fall through to CSV parsing. */ }
  }
  return text;
}

async function openAfricaCrimeContext(location, fallbackStations = []) {
  const now = Date.now();
  if (!zaCrimeCache.stats || !zaCrimeCache.stations || now - zaCrimeCache.loadedAt > 6 * 60 * 60 * 1000) {
    const statsPayload = await fetchTextOrJson(zaCrimeStatsUrl());
    let stationsPayload = null;
    try { stationsPayload = await fetchTextOrJson(zaPoliceStationsUrl()); } catch { /* OSM police points can provide a usable fallback below. */ }
    const csvRows = typeof statsPayload === 'string' ? parseCsv(statsPayload) : [];
    const header = (csvRows.shift() || []).map((value) => String(value).trim().toLowerCase());
    const index = (pattern) => header.findIndex((value) => pattern.test(value));
    const stationIndex = index(/police.*station|station/), provinceIndex = index(/province/), crimeIndex = index(/^crime$|crime.*category|category/), yearIndex = index(/year/), incidentIndex = index(/incident|count|reported/);
    if ([stationIndex, crimeIndex, yearIndex, incidentIndex].some((value) => value < 0)) throw new Error('South African crime dataset fields were not recognised');
    zaCrimeCache.stats = csvRows.map((row) => ({
      station: row[stationIndex], province: provinceIndex >= 0 ? row[provinceIndex] : '', crime: row[crimeIndex], reportingPeriod: row[yearIndex], year: crimeReportingYear(row[yearIndex]), incidents: Number(String(row[incidentIndex]).replace(/,/g, '')) || 0
    })).filter((row) => row.station && row.crime && Number.isFinite(row.year));
    zaCrimeCache.stations = stationRows(stationsPayload).map((row) => {
      const source = Array.isArray(row) ? Object.fromEntries(row.map((value, i) => [`column${i}`, value])) : row;
      const lat = Number(objectValue(source, /lat|latitude/i)), lon = Number(objectValue(source, /lon|lng|longitude/i));
      const name = objectValue(source, /station|name/i);
      return { name, lat, lon };
    }).filter((row) => row.name && Number.isFinite(row.lat) && Number.isFinite(row.lon));
    if (!zaCrimeCache.stations.length) {
      zaCrimeCache.stations = fallbackStations.filter((row) => row.category === 'police' && Number.isFinite(row.lat) && Number.isFinite(row.lon)).map((row) => ({ name: row.name, lat: Number(row.lat), lon: Number(row.lon) }));
    }
    if (!zaCrimeCache.stations.length) throw new Error('South African police station coordinates were not recognised; no nearby OSM police point was available as a fallback');
    zaCrimeCache.loadedAt = now;
  }
  const recordsForStation = (stationName) => {
    const wanted = normalizeStationName(stationName);
    if (!wanted) return [];
    return zaCrimeCache.stats.filter((row) => {
      const station = normalizeStationName(row.station);
      return station === wanted || station.includes(wanted) || wanted.includes(station);
    });
  };
  const selectMatchedStation = (stations) => stations.map((station) => ({ ...station, distanceKm: distanceKm(location, station), records: recordsForStation(station.name) })).filter((station) => station.records.length).sort((a, b) => a.distanceKm - b.distanceKm)[0] || null;
  let nearest = selectMatchedStation(zaCrimeCache.stations);
  // data.code4sa.org is intermittently unavailable. If the nearby OSM fallback only
  // found a non-SAPS traffic point, widen the OSM search before giving up.
  if (!nearest) {
    try {
      const broaderPlaces = await nearbyContext(location, 12000, { timeoutMs: 6000 });
      const broaderStations = broaderPlaces.filter((row) => row.category === 'police' && Number.isFinite(row.lat) && Number.isFinite(row.lon)).map((row) => ({ name: row.name, lat: Number(row.lat), lon: Number(row.lon) }));
      nearest = selectMatchedStation(broaderStations);
    } catch { /* Preserve the useful source-specific error below. */ }
  }
  if (!nearest) throw new Error('No nearby SAPS station with a matching historical record was found in the available station sources');
  const records = nearest.records;
  const byCrime = new Map(), byYear = new Map();
  for (const record of records) {
    byCrime.set(record.crime, (byCrime.get(record.crime) || 0) + record.incidents);
    byYear.set(record.year, (byYear.get(record.year) || 0) + record.incidents);
  }
  const categories = [...byCrime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([crime, incidents]) => ({ crime, incidents }));
  const yearly = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, incidents]) => ({ year, incidents }));
  return {
    provider: 'openAFRICA · SAPS Police Statistics', geographicLevel: `nearest SAPS police station (${nearest.name}, ${nearest.distanceKm.toFixed(1)} km away)`, historicalPeriod: `${Math.min(...records.map((row) => row.year))} to ${Math.max(...records.map((row) => row.year))}`,
    data: { station: nearest.name, distanceKm: Number(nearest.distanceKm.toFixed(2)), totalIncidents: yearly.reduce((sum, row) => sum + row.incidents, 0), topCategories: categories, yearly },
    sourceUrl: zaCrimeStatsUrl(), limitations: ['Historical station totals are not a property-level prediction', 'Nearest-station matching is an approximation; official station boundaries should be preferred when available', 'Dataset is historical and should not be presented as current crime activity']
  };
}

async function crimeometerContext(location) {
  const apiKey = process.env.CRIMEOMETER_API_KEY;
  if (!apiKey) return null;
  const period = historicalCrimeWindow();
  const version = process.env.CRIMEOMETER_API_VERSION || '2';
  const url = new URL(`https://api.crimeometer.com/v${version}/incidents/stats`);
  url.search = new URLSearchParams({
    lat: String(location.lat), lon: String(location.lon),
    datetime_ini: `${period.start}T00:00:00.000Z`, datetime_end: `${period.end}T23:59:59.999Z`,
    distance: process.env.CRIMEOMETER_DISTANCE || '3mi'
  });
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
  if (!response.ok) {
    if (response.status === 429) throw new Error('CrimeoMeter rate limit reached (HTTP 429). Retry after the provider quota resets or configure another licensed U.S. crime provider.');
    throw new Error(`CrimeoMeter returned ${response.status}`);
  }
  return { provider: `CrimeoMeter Crime Stats API v${version}`, geographicLevel: `radius around location (${process.env.CRIMEOMETER_DISTANCE || '3mi'})`, historicalPeriod: `${period.start} to ${period.end}`, data: await response.json() };
}

function providerUrl(baseUrl, location) {
  const period = historicalCrimeWindow();
  const tokens = { lat: location.lat, lon: location.lon, state: location.stateCode || '', county: location.county || '', startDate: period.start, endDate: period.end };
  const resolved = String(baseUrl).replace(/\{(lat|lon|state|county|startDate|endDate)\}/g, (_, token) => encodeURIComponent(String(tokens[token])));
  const url = new URL(resolved);
  if (!String(baseUrl).includes('{lat}')) url.searchParams.set('lat', location.lat);
  if (!String(baseUrl).includes('{lon}')) url.searchParams.set('lon', location.lon);
  return url;
}

async function configuredCrimeContext(baseUrl, location, apiKey = '', authHeader = 'x-api-key') {
  if (!baseUrl) return null;
  const response = await fetch(providerUrl(baseUrl, location), { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype', ...(apiKey ? { [authHeader]: apiKey } : {}) } });
  if (!response.ok) throw new Error(`Configured crime provider returned ${response.status}`);
  let provider = 'Configured crime provider';
  try { provider = `Configured crime provider · ${new URL(baseUrl).hostname}`; } catch { /* Keep the generic provider name for an invalid configuration. */ }
  return { provider, geographicLevel: 'Provider-defined geography', historicalPeriod: `${historicalCrimeWindow().start} to ${historicalCrimeWindow().end}`, data: await response.json() };
}

async function crimeContext(location, isUnitedStates, isSouthAfrica, fallbackStations = []) {
  if (isSouthAfrica && (process.env.TERRARISK_ZA_CRIME_STATS_URL !== 'off')) return openAfricaCrimeContext(location, fallbackStations);
  const baseUrl = isUnitedStates ? (process.env.TERRARISK_US_CRIME_URL || process.env.TERRARISK_CRIME_URL) : process.env.TERRARISK_CRIME_URL;
  const apiKey = isUnitedStates ? (process.env.TERRARISK_US_CRIME_API_KEY || process.env.TERRARISK_CRIME_API_KEY || '') : (process.env.TERRARISK_CRIME_API_KEY || '');
  const authHeader = isUnitedStates ? (process.env.TERRARISK_US_CRIME_AUTH_HEADER || process.env.TERRARISK_CRIME_AUTH_HEADER || 'x-api-key') : (process.env.TERRARISK_CRIME_AUTH_HEADER || 'x-api-key');
  if (isUnitedStates && process.env.CRIMEOMETER_API_KEY) return crimeometerContext(location);
  return configuredCrimeContext(baseUrl, location, apiKey, authHeader);
}

async function officialContext(location, profile = 'auto', fallbackStations = []) {
  const isUnitedStates = profile === 'us' || (profile === 'auto' && location.countryCode === 'us');
  const isSouthAfrica = profile === 'za' || (profile === 'auto' && location.countryCode === 'za');
  const wildfireUrl = isUnitedStates
    ? (process.env.TERRARISK_US_WILDFIRE_ARCGIS_URL || 'https://services.arcgis.com/jIL9msH9OI208GCb/ArcGIS/rest/services/USA_Wildfire_Hazard_Potential/FeatureServer/6/query')
    : (process.env.TERRARISK_WILDFIRE_ARCGIS_URL || 'https://bgismaps.sanbi.org/server/rest/services/BGIS_Projects/2010VeldFireRisk2/MapServer/0/query');
  const floodUrl = isUnitedStates
    ? (process.env.TERRARISK_US_FLOOD_ARCGIS_URL || 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query')
    : process.env.TERRARISK_FLOOD_URL;
  const riskUrl = isUnitedStates
    ? (process.env.TERRARISK_US_RISK_ARCGIS_URL || 'https://services.arcgis.com/PcBYuZP9vTIZ3FcN/ArcGIS/rest/services/FEMA_National_Risk_Index/FeatureServer/0/query')
    : null;
  const fireHistoryUrl = isUnitedStates ? (process.env.TERRARISK_US_FIRE_HISTORY_ARCGIS_URL || DEFAULT_US_FIRE_HISTORY_URL) : process.env.TERRARISK_ZA_FIRE_HISTORY_ARCGIS_URL;
  const fetchConfigured = async (baseUrl) => {
    if (!baseUrl) return null;
    const url = providerUrl(baseUrl, location);
    const response = await fetch(url, { headers: { 'User-Agent': 'TerraRiskAI/0.1 hackathon prototype' } });
    return response.ok ? response.json() : null;
  };
  const [wildfireResult, fireHistoryResult, floodResult, riskResult, crimeResult, claimsResult] = await Promise.allSettled([
    queryArcGISPoint(wildfireUrl, location, { identifyFallback: true }),
    fireHistoryUrl ? queryArcGISRecords(fireHistoryUrl, location, { distanceKm: 10, limit: 100, orderBy: isUnitedStates ? 'FIRE_YEAR_INT DESC' : '' }) : Promise.resolve(null),
    floodUrl ? queryArcGISPoint(floodUrl, location) : Promise.resolve(null),
    riskUrl ? queryArcGISPoint(riskUrl, location) : Promise.resolve(null),
    crimeContext(location, isUnitedStates, isSouthAfrica, fallbackStations), fetchConfigured(process.env.TERRARISK_CLAIMS_URL)
  ]);
  const value = (result) => result.status === 'fulfilled' ? result.value : null;
  const crime = value(crimeResult);
  const fireHistory = value(fireHistoryResult);
  const hasConfiguredCrime = Boolean((isSouthAfrica && process.env.TERRARISK_ZA_CRIME_STATS_URL !== 'off') || (isUnitedStates && process.env.CRIMEOMETER_API_KEY) || (isUnitedStates && process.env.TERRARISK_US_CRIME_URL) || process.env.TERRARISK_CRIME_URL);
  return {
    jurisdiction: isUnitedStates ? 'United States' : profile === 'za' || location.countryCode === 'za' ? 'South Africa' : 'Other',
    wildfire: value(wildfireResult), fireHistory: fireHistory ? fireHistorySummary(fireHistory) : null, floodZone: value(floodResult), nationalRiskIndex: value(riskResult), crime, insuranceClaims: value(claimsResult),
    coverage: { wildfire: Boolean(value(wildfireResult)), wildfireHistory: Boolean(fireHistory?.length), wildfireHistoryQueried: fireHistoryResult.status === 'fulfilled' && Boolean(fireHistoryUrl), floodZone: Boolean(value(floodResult)), nationalRiskIndex: Boolean(value(riskResult)), crime: Boolean(crime), insuranceClaims: Boolean(value(claimsResult)) },
    sourceNames: { wildfire: value(wildfireResult) ? (isUnitedStates ? 'U.S. Wildfire Hazard Potential · Hex' : 'CSIR/SANBI VeldFire Risk 2010') : null, fireHistory: fireHistoryResult.status === 'fulfilled' && fireHistoryUrl ? (isUnitedStates ? 'Interagency Fire Perimeter History' : 'Configured fire-history layer') : null, floodZone: value(floodResult) ? (isUnitedStates ? 'FEMA National Flood Hazard Layer' : 'Configured flood layer') : null, nationalRiskIndex: value(riskResult) ? 'FEMA National Risk Index' : null, crime: crime?.provider || null },
    sourceNotes: {
      wildfire: value(wildfireResult) ? (isUnitedStates ? 'U.S. Wildfire Hazard Potential Hex layer; point result is regional context, not a property inspection' : 'CSIR/SANBI VeldFire Risk 2010 polygon layer; point result is regional context, not a property inspection') : wildfireResult.status === 'rejected' ? `Wildfire provider error: ${wildfireResult.reason?.message || 'unknown error'}` : 'No wildfire-risk polygon intersected this point; this is not evidence that fires have never occurred. Verify local fire-history records.',
      fireHistory: fireHistory?.length ? `${isUnitedStates ? 'Interagency U.S. fire-perimeter history' : 'Configured fire-history layer'} returned ${fireHistorySummary(fireHistory).eventCount} distinct perimeter record(s) within approximately 10 km; period ${fireHistorySummary(fireHistory).period}` : fireHistoryResult.status === 'rejected' ? `Fire-history provider error: ${fireHistoryResult.reason?.message || 'unknown error'}` : 'No historical fire perimeter matched within approximately 10 km; absence of a match is not proof that no fire occurred',
      floodZone: isUnitedStates ? 'FEMA National Flood Hazard Layer point query' : 'No country-specific flood-zone provider configured',
      nationalRiskIndex: isUnitedStates ? 'FEMA National Risk Index point query' : 'Not applicable',
      crime: crime ? `${crime.provider}; ${crime.geographicLevel}; historical period ${crime.historicalPeriod}` : hasConfiguredCrime ? `Configured crime provider did not return a usable result for this location${crimeResult.reason?.message ? ` (${crimeResult.reason.message})` : ''}` : 'No point-level crime provider configured; U.S. FBI statistics are generally state/agency level and official SAPS statistics are published as reports',
      insuranceClaims: process.env.TERRARISK_CLAIMS_URL ? 'Configured claims provider' : 'No claims provider configured; claims data is normally licensed and private'
    },
    providerErrors: { wildfire: wildfireResult.status === 'rejected' ? wildfireResult.reason?.message : null, fireHistory: fireHistoryResult.status === 'rejected' ? fireHistoryResult.reason?.message : null, floodZone: floodResult.status === 'rejected' ? floodResult.reason?.message : null, nationalRiskIndex: riskResult.status === 'rejected' ? riskResult.reason?.message : null, crime: crimeResult.status === 'rejected' ? crimeResult.reason?.message : null, insuranceClaims: claimsResult.status === 'rejected' ? claimsResult.reason?.message : null }
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

function selectDiverseEssentials(grouped, limit = 8) {
  const priority = ['school', 'supermarket', 'park', 'hospital', 'clinic', 'pharmacy', 'fire_station', 'police', 'library', 'bus_station', 'station', 'fuel', 'sports_centre', 'convenience', 'place_of_worship'];
  const selected = [];
  const used = new Set();
  for (const category of priority) {
    const place = grouped[category]?.[0];
    if (place && selected.length < limit) { selected.push(place); used.add(`${category}:${place.name}:${place.distanceKm}`); }
  }
  const remainder = Object.values(grouped).flat().sort((a, b) => a.distanceKm - b.distanceKm);
  for (const place of remainder) {
    const key = `${place.category}:${place.name}:${place.distanceKm}`;
    if (!used.has(key) && selected.length < limit) { selected.push(place); used.add(key); }
  }
  return selected;
}

function parseModelJson(content) {
  const cleaned = String(content || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('Model returned invalid JSON');
  }
}

function factualEvidenceForRisk(risk, evidence) {
  const name = String(risk?.name || '').toLowerCase();
  const history = evidence.environment?.historicalWeather;
  const official = evidence.official || {};
  const historicalPeriod = history?.period ? `Historical weather window: ${history.period}` : 'Historical weather data unavailable';
  const rain = history?.heavyRainDaysOver30mm != null ? `${history.heavyRainDaysOver30mm} days with at least 30 mm rainfall in the window` : null;
  const wettestDay = history?.wettestDayMm != null ? `Wettest day in the window: ${history.wettestDayMm} mm` : null;
  const wind = history?.highestDailyWindKmh != null ? `Highest daily wind in the window: ${history.highestDailyWindKmh} km/h` : null;
  const elevation = evidence.environment?.elevationMeters != null ? `Elevation context: ${evidence.environment.elevationMeters} m` : null;
  if (name.includes('flood') || name.includes('drainage')) return [historicalPeriod, rain, wettestDay, official.coverage?.floodZone ? 'Official flood-zone point layer returned' : 'No official flood-zone result returned'].filter(Boolean).slice(0, 3);
  if (name.includes('weather') || name.includes('storm') || name.includes('wind')) return [historicalPeriod, rain, wind].filter(Boolean).slice(0, 3);
  if (name.includes('fire')) return [historicalPeriod, official.coverage?.wildfire ? `Regional wildfire-hazard layer returned${official.wildfire?.MEAN != null ? `; mapped WHP mean ${official.wildfire.MEAN}` : ''}` : official.providerErrors?.wildfire ? `Regional wildfire-hazard provider unavailable: ${official.providerErrors.wildfire}` : 'No wildfire-hazard polygon intersected this point; this is not evidence that fires have never occurred', official.coverage?.wildfireHistory ? official.sourceNotes?.fireHistory : official.providerErrors?.fireHistory ? `Historical fire-perimeter provider unavailable: ${official.providerErrors.fireHistory}` : 'No matching historical fire perimeter was returned within approximately 10 km'].filter(Boolean).slice(0, 3);
  if (name.includes('crime') || name.includes('security') || name.includes('theft') || name.includes('burglary')) return [official.coverage?.crime ? official.sourceNotes?.crime : 'No configured crime dataset returned', official.coverage?.crime ? 'Interpret at the provider geographic level, not as a property-level prediction' : null, historicalPeriod].filter(Boolean).slice(0, 3);
  return [historicalPeriod, elevation, 'No domain-specific historical layer was returned'].filter(Boolean).slice(0, 3);
}

function deterministicWildfireRisk(evidence) {
  const official = evidence.official || {};
  const hazardMean = Number(official.wildfire?.MEAN);
  const hasHazard = Number.isFinite(hazardMean);
  const history = official.fireHistory;
  const eventCount = Number(history?.eventCount) || 0;
  const hasHistory = eventCount > 0;
  const historicBoost = hasHistory ? Math.min(20, 10 + (eventCount * 2)) : 0;
  const value = hasHazard ? Math.round(Math.min(100, (hazardMean * 20) + historicBoost)) : hasHistory ? Math.min(75, 45 + (eventCount * 3)) : 50;
  const level = !hasHazard && !hasHistory
    ? 'Unavailable / verify locally'
    : value >= 70 ? 'High'
      : value >= 45 ? 'Moderate'
        : 'Low';
  const tone = value >= 70 ? 'danger' : value >= 45 ? 'amber' : 'teal';
  const eventNames = (history?.events || []).slice(0, 2).map((event) => `${event.incident}${event.year ? ` (${event.year})` : ''}`).join('; ');
  const evidenceItems = [
    hasHazard ? `Regional U.S. Wildfire Hazard Potential mean: ${hazardMean.toFixed(2)} / 5${official.wildfire?.COUNTY_NAME ? ` · ${official.wildfire.COUNTY_NAME}` : ''}` : official.providerErrors?.wildfire ? `Wildfire-hazard layer unavailable: ${official.providerErrors.wildfire}` : 'No regional wildfire-hazard result was returned',
    hasHistory ? `${eventCount} distinct mapped fire perimeter${eventCount === 1 ? '' : 's'} within approximately 10 km${history?.period ? ` · ${history.period}` : ''}` : official.providerErrors?.fireHistory ? `Historical fire-perimeter layer unavailable: ${official.providerErrors.fireHistory}` : 'No mapped historical fire perimeter was returned within approximately 10 km',
    eventNames ? `Examples from the historical layer: ${eventNames}` : null
  ].filter(Boolean);
  const text = !hasHazard && !hasHistory
    ? 'TerraRisk could not obtain sufficient wildfire-hazard or historical fire-perimeter evidence for this location. This is an unknown result, not evidence of no wildfire risk; verify county and state fire-agency records.'
    : `${hasHazard ? `Regional wildfire hazard potential is ${hazardMean.toFixed(2)} out of 5.` : 'A regional wildfire-hazard score was unavailable.'} ${hasHistory ? `Historical mapping found ${eventCount} nearby fire perimeter${eventCount === 1 ? '' : 's'}${history?.period ? ` spanning ${history.period}` : ''}.` : 'No nearby historical perimeter was returned by the queried layer.'} This is regional and historical context, not a parcel-level fire-safety determination.`;
  const sources = [
    hasHazard ? official.sourceNames?.wildfire : null,
    official.coverage?.wildfireHistoryQueried ? official.sourceNames?.fireHistory : null,
    'Open-Meteo Historical Weather API (10-year context)'
  ].filter(Boolean);
  return { name: 'Wildfire risk', level, value, tone, text, evidence: evidenceItems, sources, factualEvidenceLocked: true };
}

function enforceWildfireRisk(report, evidence) {
  const risks = Array.isArray(report?.risks) ? report.risks : [];
  const wildfirePattern = /wildfire|fire\s*(risk|hazard|exposure)/i;
  const firstIndex = risks.findIndex((risk) => wildfirePattern.test(String(risk?.name || '')));
  const filtered = risks.filter((risk) => !wildfirePattern.test(String(risk?.name || '')));
  const wildfire = deterministicWildfireRisk(evidence);
  const index = firstIndex < 0 ? Math.min(2, filtered.length) : Math.min(firstIndex, filtered.length);
  filtered.splice(index, 0, wildfire);
  return { ...report, risks: filtered };
}

function enforceSecurityRisk(report, evidence) {
  if (evidence.official?.coverage?.crime) return report;
  const risks = Array.isArray(report?.risks) ? report.risks : [];
  const securityPattern = /crime|security|theft|burglary|robbery/i;
  const firstIndex = risks.findIndex((risk) => securityPattern.test(String(risk?.name || '')));
  if (firstIndex < 0) return report;
  const filtered = risks.filter((risk) => !securityPattern.test(String(risk?.name || '')));
  const providerMessage = evidence.official?.providerErrors?.crime || evidence.official?.sourceNotes?.crime || 'No usable crime provider result was returned.';
  filtered.splice(Math.min(firstIndex, filtered.length), 0, {
    name: 'Security / crime context',
    level: 'Unavailable / source required',
    value: null,
    tone: 'unknown',
    excludeFromRating: true,
    text: 'TerraRisk could not obtain usable historical crime statistics for this location. This is a data-availability limitation, not evidence that the area is more or less secure.',
    evidence: [providerMessage, 'Crime data must be interpreted at the provider’s published geographic level, never as a property-level prediction.'],
    sources: evidence.official?.sourceNames?.crime ? [evidence.official.sourceNames.crime] : [],
    factualEvidenceLocked: true
  });
  return { ...report, risks: filtered };
}

function attachFactualEvidence(report, evidence) {
  const sourceNames = ['OpenStreetMap Overpass', 'Open-Meteo Historical Weather API (10-year context)'];
  const officialSources = Object.values(evidence.official?.sourceNames || {}).filter(Boolean);
  return { ...report, risks: (report.risks || []).map((risk) => {
    const name = String(risk?.name || '').toLowerCase();
    const sources = name.includes('crime') || name.includes('security') || name.includes('theft') ? [...officialSources] : name.includes('flood') ? [evidence.official?.sourceNames?.floodZone || 'FEMA National Flood Hazard Layer', ...sourceNames.slice(1)] : name.includes('fire') ? [evidence.official?.sourceNames?.wildfire || 'Wildfire hazard layer', evidence.official?.sourceNames?.fireHistory || 'Historical fire-perimeter layer', ...sourceNames.slice(1)] : name.includes('infrastructure') || name.includes('community') ? [sourceNames[0]] : sourceNames.slice(1);
    const { factualEvidenceLocked, ...publicRisk } = risk;
    return { ...publicRisk, evidence: factualEvidenceLocked ? risk.evidence : factualEvidenceForRisk(risk, evidence), sources: factualEvidenceLocked ? (Array.isArray(risk.sources) ? risk.sources : []) : Array.isArray(risk.sources) && risk.sources.length ? risk.sources : sources };
  }) };
}

function riskValueFromLevel(risk) {
  const value = Number(risk?.value);
  if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
  const level = String(risk?.level || '').toLowerCase();
  return level.includes('high') ? 82 : level.includes('moderate') || level.includes('medium') || level.includes('elevated') ? 55 : level.includes('low') ? 22 : 50;
}

function riskDomain(name) {
  const value = String(name || '').toLowerCase();
  if (/crime|security|theft|burglary|robbery/.test(value)) return 'Security';
  if (/infrastructure|access|emergency|utility|power|water/.test(value)) return 'Infrastructure';
  if (/community|amenity|service|school|shopping|healthcare/.test(value)) return 'Community';
  return 'Environment';
}

function calculateExposureScore(report) {
  const risks = Array.isArray(report?.risks) ? report.risks.filter((risk) => !risk?.excludeFromRating) : [];
  if (!risks.length) return Math.max(0, Math.min(100, Number(report?.score) || 0));
  const domainWeights = { Environment: 0.5, Infrastructure: 0.2, Security: 0.2, Community: 0.1 };
  const domains = {};
  for (const risk of risks) {
    const domain = riskDomain(risk?.name);
    if (!domains[domain]) domains[domain] = [];
    domains[domain].push(riskValueFromLevel(risk));
  }
  const activeDomains = Object.keys(domains);
  const activeWeight = activeDomains.reduce((total, domain) => total + (domainWeights[domain] || 0), 0) || 1;
  const score = activeDomains.reduce((total, domain) => {
    const average = domains[domain].reduce((sum, value) => sum + value, 0) / domains[domain].length;
    return total + average * ((domainWeights[domain] || 0) / activeWeight);
  }, 0);
  return Math.round(Math.max(0, Math.min(100, score)));
}

async function callOpenRouterJson(system, user) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not configured');
  if (!process.env.OPENROUTER_MODEL) throw new Error('OPENROUTER_MODEL is not configured');
  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}),
    ...(process.env.OPENROUTER_SITE_NAME ? { 'X-Title': process.env.OPENROUTER_SITE_NAME } : {})
  };
  const body = {
    model: process.env.OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    ...(process.env.OPENROUTER_JSON_MODE !== 'off' ? { response_format: { type: 'json_object' } } : {})
  };
  let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  // Some OpenRouter models accept chat completions but reject response_format.
  // Retry that narrow compatibility failure without structured-output metadata.
  if (!response.ok && [400, 422].includes(response.status) && body.response_format) {
    delete body.response_format;
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) });
  }
  if (!response.ok) {
    const details = (await response.text()).slice(0, 400);
    throw new Error(`OpenRouter returned ${response.status}${details ? `: ${details}` : ''}`);
  }
  const payload = await response.json();
  return parseModelJson(payload.choices?.[0]?.message?.content);
}

const specialistDefinitions = [
  ['environmental', 'Environmental analyst', 'Assess historical weather, terrain, elevation, wildfire, flood, drainage, vegetation and other natural-hazard context. Focus on observed evidence and uncertainty.'],
  ['infrastructure', 'Infrastructure and emergency analyst', 'Assess nearby roads, hospitals, clinics, fire stations, police points, utilities, transport and access. Do not infer service quality beyond the supplied location data.'],
  ['security', 'Historical security analyst', 'Assess only the supplied historical crime or security data. State the geographic level, station or radius, period, leading categories and limitations. Never describe residents or predict an individual property’s crime probability.'],
  ['community', 'Community context analyst', 'Assess objective access to schools, shops, parks, healthcare, worship facilities and transport. Describe the built environment and available services, never resident character, religion, income or protected traits.'],
  ['insurance', 'Insurance-context analyst', 'Translate observed location signals into questions and coverage topics to discuss with a licensed adviser. Do not recommend buying, removing or rejecting a policy, and do not invent policy terms or claims history.'],
  ['investment', 'Property and resilience analyst', 'Assess long-term location strengths, trade-offs and due-diligence needs using only the supplied evidence. Do not predict property prices, returns or future development without data.']
];

const specialistSystem = 'You are one specialist on TerraRisk, an evidence-led historical location risk analysis team. Reason only from supplied facts. Never invent records, statistics, property characteristics or claims about residents. Keep observed facts separate from interpretation, state missing data and confidence, and return only valid JSON.';

async function runSpecialistAgents(evidence) {
  const results = await Promise.all(specialistDefinitions.map(async ([key, name, remit]) => {
    try {
      const finding = await callOpenRouterJson(specialistSystem, `You are the ${name}. ${remit}\n\nReview the same property evidence as the other specialists. Return JSON with exactly these keys: finding (string), signals (array of short factual strings), concerns (array of short strings), questions (array of short verification questions), confidence (string), sources (array of exact source names). Do not produce a final overall score and do not issue professional advice.\n\nPROPERTY EVIDENCE:\n${JSON.stringify(evidence)}`);
      return { key, name, status: 'complete', finding: finding.finding || '', signals: Array.isArray(finding.signals) ? finding.signals : [], concerns: Array.isArray(finding.concerns) ? finding.concerns : [], questions: Array.isArray(finding.questions) ? finding.questions : [], confidence: finding.confidence || 'Limited confidence', sources: Array.isArray(finding.sources) ? finding.sources : [] };
    } catch (error) {
      return { key, name, status: 'unavailable', finding: `${name} was unavailable for this run.`, signals: [], concerns: [], questions: [], confidence: 'Unavailable', sources: [], error: error.message };
    }
  }));
  return results;
}

async function callChiefAnalyst(evidence, specialists) {
  const system = 'You are TerraRisk’s Chief Risk Analyst. You synthesize independent specialist findings into an evidence-led historical property risk brief. Reason only from supplied facts and specialist outputs. Resolve disagreements by exposing them, never by inventing facts. Never make a current-weather forecast, infer resident character or protected traits, or give direct insurance or purchase instructions. Return only valid JSON.';
  const user = `Synthesize this multi-agent review into the final TerraRisk brief. Required top-level keys: score (number), confidence (string), summary (string), risks (array of {name, level, value, tone, text, evidence, sources}), priorities (array of {title, detail, action}), questions (array of strings), specialists (object with environmental, infrastructure, community, insurance, investment string summaries), dueDiligence (array of {item, why, owner}). Include a security/crime risk only when the supplied evidence contains crime data; otherwise state that it is unavailable in the relevant specialist summary or due diligence. Every risk.evidence must contain 2–3 short factual items from the evidence, preferably with numbers, periods or geographic resolution. Every risk.sources must use exact supplied source names where possible. The score is a decision-support exposure score, not a probability or premium estimate.\n\nPROPERTY EVIDENCE:\n${JSON.stringify(evidence)}\n\nSPECIALIST FINDINGS:\n${JSON.stringify(specialists)}`;
  return callOpenRouterJson(system, user);
}

export async function analyzeLocation(address, profile = 'auto', listingUrl = '') {
  const listing = listingUrl ? await listingContext(listingUrl) : null;
  const requestedAddress = address || listing?.address;
  if (!requestedAddress) throw new Error('Enter an address or a supported listing URL.');
  const location = await geocode(requestedAddress, profile);
  const [placesResult, environmentResult] = await Promise.allSettled([nearbyContext(location), environmentalContext(location)]);
  const places = placesResult.status === 'fulfilled' ? placesResult.value : [];
  const environment = environmentResult.status === 'fulfilled' ? environmentResult.value : { available: {}, error: environmentResult.reason?.message || 'Environmental provider unavailable' };
  const officialResult = await Promise.resolve().then(() => officialContext(location, profile, places)).then((value) => ({ status: 'fulfilled', value })).catch((reason) => ({ status: 'rejected', reason }));
  const official = officialResult.status === 'fulfilled' ? officialResult.value : { jurisdiction: location.countryCode === 'us' ? 'United States' : location.countryCode === 'za' ? 'South Africa' : 'Other', coverage: {}, error: officialResult.reason?.message || 'Official layer unavailable' };
  const limitations = ['No property inspection performed', 'No policy wording supplied', 'Nearby context is sourced from OpenStreetMap and may be incomplete', 'Crime results are station-level historical context, not a property-level prediction', 'Historical weather is context, not a record of losses at this property'];
  if (placesResult.status !== 'fulfilled') limitations.push('Nearby-place provider was unavailable for this request');
  const nearby = summarizeNearby(location, places);
  const evidence = { address: location.displayName, coordinates: location, profile, listing, nearby, environment, official, limitations };
  const specialistResults = await runSpecialistAgents(evidence);
  const report = attachFactualEvidence(enforceSecurityRisk(enforceWildfireRisk(await callChiefAnalyst(evidence, specialistResults), evidence), evidence), evidence);
  const isUnitedStates = location.countryCode === 'us';
  const officialSource = isUnitedStates ? ['FEMA National Flood Hazard Layer', 'FEMA National Risk Index', 'U.S. Wildfire Hazard Potential'] : ['CSIR/SANBI veld-fire risk layer'];
  const configuredSources = Object.values(official.sourceNames || {}).filter(Boolean);
  return { ...report, specialists: report.specialists || {}, agentFindings: specialistResults, agentRun: { mode: 'multi-agent', specialists: specialistResults.map((agent) => agent.name), successful: specialistResults.filter((agent) => agent.status === 'complete').length, total: specialistResults.length, chiefAnalyst: 'OpenRouter chief analyst synthesis' }, score: calculateExposureScore(report), ratingMethod: { name: 'Evidence-weighted exposure score', scale: '0 = lower observed exposure · 100 = higher observed exposure', rule: 'Domain scores are averaged and weighted across environmental, infrastructure, security, and community signals. Missing sources reduce confidence; they are not treated as zero risk.' }, address: location.displayName, locality: location.displayName, coordinates: { lat: location.lat, lon: location.lon }, listing, nearby: selectDiverseEssentials(nearby), sources: ['OpenStreetMap Nominatim', 'OpenStreetMap Overpass', 'Open-Meteo Historical Weather API (10-year context)', ...officialSource, ...configuredSources, `OpenRouter · ${process.env.OPENROUTER_MODEL}`], dataCoverage: { ...environment.available, ...official.coverage }, historical: environment.historicalWeather, jurisdiction: official.jurisdiction, providerErrors: official.providerErrors || {}, live: true };
}

export async function diagnoseLocationSources(address, profile = 'auto') {
  if (!address || String(address).trim().length < 5) throw new Error('Enter a complete address to test the configured data sources.');
  const location = await geocode(String(address).trim(), profile);
  const placesResult = await Promise.resolve().then(() => nearbyContext(location)).then((value) => ({ status: 'fulfilled', value })).catch((reason) => ({ status: 'rejected', reason }));
  const official = await officialContext(location, profile, placesResult.status === 'fulfilled' ? placesResult.value : []);
  return {
    address: location.displayName,
    coordinates: { lat: location.lat, lon: location.lon },
    jurisdiction: official.jurisdiction,
    coverage: official.coverage,
    sourceNames: official.sourceNames,
    sourceNotes: official.sourceNotes,
    providerErrors: official.providerErrors,
    wildfire: official.wildfire ? { mean: official.wildfire.MEAN ?? null, county: official.wildfire.COUNTY_NAME ?? null, state: official.wildfire.STATE_NAME ?? null } : null,
    fireHistory: official.fireHistory,
    crime: official.crime ? { provider: official.crime.provider, geographicLevel: official.crime.geographicLevel, historicalPeriod: official.crime.historicalPeriod } : null,
    nearbyProvider: placesResult.status === 'fulfilled' ? 'connected' : `unavailable: ${placesResult.reason?.message || 'unknown error'}`
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    const listingUrl = typeof req.body?.listingUrl === 'string' ? req.body.listingUrl.trim() : '';
    const profile = ['auto', 'za', 'us'].includes(req.body?.profile) ? req.body.profile : 'auto';
    if (address.length < 5 && !listingUrl) return res.status(400).json({ error: 'Enter a complete address or a supported property-listing URL.' });
    return res.status(200).json(await analyzeLocation(address, profile, listingUrl));
  } catch (error) {
    console.error('[terrarisk/analyze]', error.message);
    const inputError = /listing|address not found|enter an address/i.test(error.message || '');
    return res.status(inputError ? 400 : 503).json({ error: inputError ? 'The listing URL or address could not be processed.' : 'Live analysis is not configured or a provider is unavailable.', ...(process.env.NODE_ENV !== 'production' ? { details: error.message } : {}) });
  }
}
