import './styles.css';
import './overrides.css';

const icons = {
  logo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.8 6.7v6.8c0 3.5 2.5 5.9 7.2 7.8 4.7-1.9 7.2-4.3 7.2-7.8V6.7L12 3Z"/><path d="m8.3 12.1 2.3 2.3 5-5"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.2"/><path d="m16 16 4.2 4.2"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10.2c0 5.1-7 10-7 10s-7-4.9-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2"/><path d="M12 7v5l3.2 2"/></svg>',
  spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.8 6.7v6.8c0 3.5 2.5 5.9 7.2 7.8 4.7-1.9 7.2-4.3 7.2-7.8V6.7L12 3Z"/><path d="M8.7 12.2h6.6M12 8.9v6.6"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v4h14v-4"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 10.5v5M12 7.5h.01"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
};

const sample = {
  address: '14 Oak Avenue, Constantia, Cape Town',
  locality: 'Constantia, Cape Town · Western Cape',
  score: 68,
  confidence: 'Moderate confidence',
  summary: 'A relatively sheltered suburban location with strong access to everyday services. The main items to investigate are wildfire exposure during dry season and storm-water drainage around the property.',
  risks: [
    { name: 'Flood & drainage', level: 'Low', value: 26, tone: 'teal', text: 'No mapped flood zone at the selected point. A seasonal watercourse sits 1.8 km east; verify local drainage and basement exposure.', evidence: ['No mapped flood-zone signal returned for the point', 'Nearest seasonal watercourse: approximately 1.8 km east', 'Property-level drainage record not available'] },
    { name: 'Wildfire', level: 'Moderate', value: 57, tone: 'amber', text: 'Dense vegetation and a dry-season wind corridor increase exposure at the neighbourhood edge.', evidence: ['Regional vegetation context indicates a dry-season exposure', 'Public hazard layer used as regional context', 'No property inspection or mitigation record supplied'] },
    { name: 'Severe weather', level: 'Moderate', value: 49, tone: 'amber', text: 'Historical winter rainfall and wind events are the more relevant weather questions for this address.', evidence: ['Historical weather window: 2016–2025', 'Review past heavy-rain and wind days in Evidence & sources', 'Not a forecast of upcoming weather'] },
    { name: 'Seismic', level: 'Low', value: 11, tone: 'teal', text: 'No elevated seismic signal surfaced in the available regional data.', evidence: ['No elevated regional seismic layer was supplied', 'This is not a building-specific engineering assessment'] }
  ],
  nearby: [
    ['Primary school', 'Oak Primary', '0.9 km'], ['Supermarket', 'Constantia Village', '1.1 km'], ['Park', 'Greenbelt access', '1.4 km'], ['Pharmacy', 'Local pharmacy', '1.2 km'], ['Fire station', 'Nearest station', '3.2 km'], ['Hospital', 'Nearest hospital', '5.6 km']
  ],
  priorities: [
    { title: 'Wildfire conditions', detail: 'Vegetation and dry-season winds', action: 'Investigate' },
    { title: 'Storm-water drainage', detail: 'Local property-level verification', action: 'Verify' },
    { title: 'Emergency access', detail: 'Fire station context', action: 'Context' }
  ],
  specialists: {
    environmental: 'Dry-season vegetation and historical rainfall are the main environmental signals to investigate.',
    infrastructure: 'Emergency services are present nearby, while property-level drainage and utility information remains incomplete.',
    community: 'The area has access to schools, shopping, parks and healthcare; this describes available services, not resident behaviour.',
    insurance: 'Storm, wildfire and drainage questions deserve discussion with an insurer; this brief does not recommend or remove cover.',
    investment: 'The location has strong everyday-service access, with long-term resilience dependent on local hazard and development verification.'
  },
  dueDiligence: [
    { item: 'Verify local drainage and flood records', why: 'Nearby terrain and water context do not replace a property-level inspection.', owner: 'Municipality / surveyor' },
    { item: 'Ask for the property’s current insurance exclusions', why: 'The location signals should be compared with the actual policy wording.', owner: 'Insurer / broker' },
    { item: 'Visit during peak traffic and after heavy rain', why: 'Access and drainage conditions can differ from map-based context.', owner: 'Buyer' }
  ],
  sources: ['OpenStreetMap', 'Google Maps context', 'Regional climate layers', 'Public hazard datasets']
};
sample.coordinates = { lat: -34.02, lon: 18.43 };
sample.historical = { period: '2016–2025', years: 10, averageAnnualPrecipitationMm: 824, heavyRainDaysOver30mm: 13, heavyRainDaysOver50mm: 3, wettestDayMm: 76, highestDailyWindKmh: 94, hottestDayC: 36, source: 'Demonstration historical context' };
sample.dataCoverage = { historicalWeather: true, elevation: true, wildfire: true, wildfireHistory: false, floodZone: false, nationalRiskIndex: false, crime: false, insuranceClaims: false };
sample.ratingMethod = { name: 'Evidence-weighted exposure score', scale: '0 = lower observed exposure · 100 = higher observed exposure', rule: 'Domain scores are averaged and weighted across available signals. Missing sources reduce confidence; they are not treated as zero risk.' };
sample.agentRun = { mode: 'demo', specialists: ['Environmental analyst', 'Infrastructure and emergency analyst', 'Historical security analyst', 'Community context analyst', 'Insurance-context analyst', 'Property and resilience analyst'], successful: 6, total: 6, chiefAnalyst: 'Chief analyst synthesis' };
sample.risks = sample.risks.map((risk) => ({ ...risk, sources: risk.name.includes('weather') ? ['Open-Meteo Historical Weather API (10-year context)'] : risk.name.includes('Wildfire') ? ['Regional climate layers', 'Public hazard datasets'] : ['Public hazard datasets', 'OpenStreetMap'] }));
sample.score = deriveExposureScore(sample.risks, sample.score);

let state = { analyzed: false, analyzing: false, live: false, profile: 'auto', address: '', listingUrl: '', listingHelp: false, activeTab: 'overview', selectedRisk: 0, chatOpen: false, chatMessages: [], chatLoading: false, questionAnswers: {}, questionLoading: null, error: '', policyFile: '' };
let runtimeConfig = { listingHosts: [], listingHostGroups: {} };

function icon(name, cls = '') { return `<span class="icon ${cls}">${icons[name] || ''}</span>`; }
function riskClass(tone) { const value = String(tone || '').toLowerCase(); return ['teal', 'green', 'good', 'low'].includes(value) ? 'good' : ['amber', 'yellow', 'watch', 'moderate', 'medium', 'unknown', 'unavailable'].includes(value) ? 'watch' : 'danger'; }
function riskValue(value) { return Math.max(0, Math.min(100, Number(value) || 0)); }
function riskHeadline(score) { const value = Number(score) || 0; return value >= 75 ? 'Higher overall exposure' : value >= 50 ? 'Elevated overall exposure' : value >= 25 ? 'Moderate overall exposure' : 'Lower overall exposure'; }
function ratingDomain(name) { const value = String(name || '').toLowerCase(); if (/crime|security|theft|burglary|robbery/.test(value)) return 'Security'; if (/infrastructure|access|emergency|utility|power|water/.test(value)) return 'Infrastructure'; if (/community|amenity|service|school|shopping|healthcare/.test(value)) return 'Community'; return 'Environment'; }
function ratingValue(risk) { const value = Number(risk?.value); if (Number.isFinite(value)) return Math.max(0, Math.min(100, value)); const level = String(risk?.level || '').toLowerCase(); return level.includes('high') ? 82 : level.includes('moderate') || level.includes('medium') || level.includes('elevated') ? 55 : level.includes('low') ? 22 : 50; }
function deriveExposureScore(risks, fallback = 0) { const scoredRisks = Array.isArray(risks) ? risks.filter((risk) => !risk?.excludeFromRating) : []; if (!scoredRisks.length) return Math.max(0, Math.min(100, Number(fallback) || 0)); const weights = { Environment: 0.5, Infrastructure: 0.2, Security: 0.2, Community: 0.1 }; const grouped = {}; scoredRisks.forEach((risk) => { const domain = ratingDomain(risk.name); (grouped[domain] ||= []).push(ratingValue(risk)); }); const active = Object.keys(grouped); const activeWeight = active.reduce((sum, domain) => sum + (weights[domain] || 0), 0) || 1; return Math.round(active.reduce((sum, domain) => sum + (grouped[domain].reduce((a, b) => a + b, 0) / grouped[domain].length) * ((weights[domain] || 0) / activeWeight), 0)); }
function scoreRingStyle(score) { const value = riskValue(score); const color = value >= 75 ? '#cd6e63' : value >= 50 ? '#d6a042' : '#4ea999'; return `--score-angle:${value}%;--score-color:${color}`; }
function safeExternalUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : ''; } catch { return ''; } }
function listingHelpMarkup() { const groups = runtimeConfig.listingHostGroups || {}; const groupMarkup = [['South African listings', groups.southAfrica], ['U.S. listings', groups.unitedStates], ['Other approved listings', groups.other]].filter(([, hosts]) => Array.isArray(hosts) && hosts.length).map(([label, hosts]) => `<div><strong>${label}</strong><span>${hosts.map((host) => `<code>${escapeHtml(host)}</code>`).join(', ')}</span></div>`).join(''); const hosts = groupMarkup || (runtimeConfig.listingHosts.length ? runtimeConfig.listingHosts.map((host) => `<code>${escapeHtml(host)}</code>`).join(', ') : '<span>No listing domains are configured yet.</span>'); return `<div class="listing-help" role="note"><span>Accepted domains</span><div class="listing-host-groups">${hosts}</div><small>Only public HTML/JSON-LD metadata is read. Logins, paywalls, CAPTCHAs, and redirects are not supported.</small></div>`; }
function normalizeReport(report) {
  return {
    ...report,
    score: deriveExposureScore(Array.isArray(report?.risks) ? report.risks : [], Number.isFinite(Number(report?.score)) ? Math.round(Number(report.score)) : 0),
    confidence: report?.confidence || 'Limited confidence',
    summary: report?.summary || 'The available evidence was not sufficient to produce a detailed summary.',
    risks: Array.isArray(report?.risks) ? report.risks : [],
    priorities: Array.isArray(report?.priorities) ? report.priorities : [],
    questions: Array.isArray(report?.questions) ? report.questions : [],
    specialists: { environmental: report?.specialists?.environmental || 'No environmental specialist summary was returned.', infrastructure: report?.specialists?.infrastructure || 'No infrastructure specialist summary was returned.', community: report?.specialists?.community || 'No community-context specialist summary was returned.', insurance: report?.specialists?.insurance || 'No insurance-context specialist summary was returned.', investment: report?.specialists?.investment || 'No investment-context specialist summary was returned.' },
    dueDiligence: Array.isArray(report?.dueDiligence) ? report.dueDiligence : [],
    ratingMethod: report?.ratingMethod || { name: 'Evidence-weighted exposure score', scale: '0 = lower observed exposure · 100 = higher observed exposure', rule: 'Available risk domains are averaged and weighted. Missing data lowers confidence, not the score.' },
    agentRun: report?.agentRun || { mode: 'single-agent', specialists: [], successful: 0, total: 0, chiefAnalyst: 'Chief analyst synthesis' },
    providerErrors: report?.providerErrors && typeof report.providerErrors === 'object' ? report.providerErrors : {},
    nearby: Array.isArray(report?.nearby) ? report.nearby : [],
    sources: Array.isArray(report?.sources) ? report.sources : [],
  };
}

function render() {
  const app = document.querySelector('#app');
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <a class="brand" href="#top" aria-label="TerraRisk AI home">${icon('logo')}<span>TerraRisk <em>AI</em></span></a>
        <nav class="nav"><a href="#how-it-works">How it works</a><a href="#methodology">Methodology</a><a href="#about">About</a></nav>
        <button class="menu-btn" aria-label="Open menu">${icon('menu')}</button>
        <div class="status-pill"><span></span> Live risk intelligence</div>
      </header>

      <main id="top">
        <section class="hero">
          <div class="hero-copy">
            <div class="eyebrow">LOCATION RISK INTELLIGENCE <span>•</span> MODEL-AGNOSTIC VIA OPENROUTER</div>
            <h1>Know what your<br/><span>address is exposed to.</span></h1>
            <p class="hero-lead">TerraRisk turns complex environmental and community data into a clear, explainable risk brief—so you can ask better questions before you insure, buy, or build.</p>
            <form class="search-card" id="analysis-form">
              <div class="search-label">START WITH AN ADDRESS</div>
              <div class="profile-switch" aria-label="Analysis profile"><span>PROFILE</span>${[['auto','Auto detect'],['za','South Africa'],['us','United States']].map(([value,label]) => `<button type="button" class="profile-option ${state.profile === value ? 'active' : ''}" data-profile="${value}">${label}</button>`).join('')}</div>
              <div class="search-row">${icon('search')}<input id="address-input" value="${escapeHtml(state.address)}" placeholder="Enter a property address" aria-label="Property address"/><button type="submit">Analyse location ${icon('arrow')}</button></div>
              <div class="listing-input"><span>OR</span><input id="listing-url-input" value="${escapeHtml(state.listingUrl)}" placeholder="Paste a supported public property-listing URL" aria-label="Property listing URL"/><button type="button" class="listing-help-btn" id="listing-help-btn" aria-label="Show accepted listing domains" aria-expanded="${state.listingHelp}">${icon('info')}</button></div>${state.listingHelp ? listingHelpMarkup() : ''}
              <div class="search-hint">${icon('pin')} Try the demo: <button type="button" class="demo-link" id="demo-btn">14 Oak Avenue, Constantia</button><span>· Historical context, not a forecast</span></div>
            </form>${state.analyzing ? `<div class="analysis-loading">${icon('spark')} Gathering historical location context and preparing your evidence brief…</div>` : ''}${state.error && !state.analyzed ? `<div class="analysis-error" role="alert">${icon('info')} <span>${escapeHtml(state.error)}</span></div>` : ''}
            <div class="hero-trust"><span>${icon('shield')} Evidence-led</span><span>${icon('clock')} Ready in under a minute</span><span>${icon('spark')} Explainable AI</span></div>
          </div>
          <div class="hero-visual" aria-label="Abstract terrain visualization">
            <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="terrain terrain-back"></div><div class="terrain terrain-mid"></div><div class="terrain terrain-front"></div><div class="map-pin">${icon('pin')}<span>your address</span></div>
            <div class="visual-note note-top"><strong>4</strong><span>risk domains<br/>assessed</span></div><div class="visual-note note-bottom"><span class="pulse"></span><span>Signal confidence</span><strong>68%</strong></div>
          </div>
        </section>

        ${state.analyzed ? reportView() : landingBelow()}
      </main>
      <footer class="footer"><div class="brand footer-brand">${icon('logo')}<span>TerraRisk <em>AI</em></span></div><p>Location intelligence for decisions that matter.</p><div class="footer-note">Prototype · Not insurance advice</div></footer>
    </div>`;
  bindEvents();
}

function landingBelow() {
  return `<section class="proof-strip"><div><strong>One address.</strong><span>Multiple risk signals.</span></div><div class="proof-items"><span><b>01</b> Environmental</span><span><b>02</b> Infrastructure</span><span><b>03</b> Community context</span><span><b>04</b> AI reasoning</span></div></section>
    <section class="section intro" id="how-it-works"><div class="section-kicker">THE SERVICE</div><div class="two-col"><h2>A clearer picture of the place behind the property.</h2><div><p>Important location signals are scattered across maps, hazard layers, climate reports, and public infrastructure data. TerraRisk brings them together and makes the trade-offs legible.</p><a class="text-link" href="#methodology">See how the analysis works ${icon('arrow')}</a></div></div></section>
    <section class="feature-grid" id="methodology"><article class="feature-card feature-dark"><div class="feature-number">01</div>${icon('shield','feature-icon')}<h3>Risk, with context.</h3><p>See which signals matter most for your location, from flood exposure and wildfire conditions to emergency access and surrounding land use.</p><div class="mini-bars"><span style="width:82%"></span><span style="width:58%"></span><span style="width:36%"></span></div></article><article class="feature-card"><div class="feature-number">02</div>${icon('spark','feature-icon')}<h3>Reasoning you can follow.</h3><p>The selected OpenRouter model translates structured evidence into plain-language findings, including what is known, what is uncertain, and what to verify next.</p><div class="quote">“The signal is moderate because the property sits near dense vegetation—not because of a generic regional label.”</div></article><article class="feature-card"><div class="feature-number">03</div>${icon('check','feature-icon')}<h3>Questions worth asking.</h3><p>Leave with a focused due-diligence checklist for your insurer, broker, seller, or building professional.</p><div class="check-list"><span>${icon('check')} Verify local drainage</span><span>${icon('check')} Ask about storm cover</span></div></article></section>
    <section class="cta-band" id="about"><div><div class="section-kicker">MAKE THE INVISIBLE VISIBLE</div><h2>Start with one address.<br/><span>Leave with a better brief.</span></h2></div><button class="cta-button" id="cta-demo">Try the demo ${icon('arrow')}</button></section>`;
}

function reportView() {
  const listingUrl = safeExternalUrl(sample.listing?.sourceUrl);
  const listingNote = listingUrl ? `<p class="listing-note">${icon('check')} Listing metadata read from <a href="${escapeHtml(listingUrl)}" target="_blank" rel="noreferrer">${escapeHtml(sample.listing?.title || 'the supplied listing')}</a></p>` : '';
  return `<section class="report-shell"><div class="report-header"><div><div class="section-kicker">LOCATION BRIEF <span class="live-dot"></span> ${state.live ? 'LIVE ANALYSIS' : 'DEMO ANALYSIS'}</div><h2>${escapeHtml(sample.address)}</h2><p>${icon('pin')} ${escapeHtml(sample.locality || sample.address)}</p>${listingNote}</div><div class="report-actions"><button class="ghost-btn" id="reset-btn">New analysis</button><button class="primary-btn" id="download-btn">Print / save PDF ${icon('arrow')}</button></div></div>
    ${state.error ? `<div class="analysis-error" role="alert">${icon('info')} <span><strong>Demo data shown.</strong> ${escapeHtml(state.error)} Try again or use a different address.</span></div>` : ''}
    <div class="report-tabs"><button class="${state.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button><button class="${state.activeTab === 'analysis' ? 'active' : ''}" data-tab="analysis">Risk analysis</button><button class="${state.activeTab === 'evidence' ? 'active' : ''}" data-tab="evidence">Evidence & sources</button><button class="${state.activeTab === 'questions' ? 'active' : ''}" data-tab="questions">Questions to ask</button></div>
    ${state.activeTab === 'overview' ? overviewTab() : state.activeTab === 'analysis' ? analysisTab() : state.activeTab === 'evidence' ? evidenceTab() : questionsTab()}
    <div class="disclaimer">${icon('info')} This is an early decision-support prototype, not a quote, underwriting decision, or insurance recommendation. Always verify findings with authoritative local sources and a licensed professional.</div>
    <button class="chat-fab" id="chat-btn">${icon('spark')} Ask about this brief</button>${state.chatOpen ? chatPanel() : ''}</section>`;
}

function overviewTab() {
  const rawNearby = Array.isArray(sample.nearby) && sample.nearby.length && !Array.isArray(sample.nearby[0]) && typeof sample.nearby[0] === 'object' ? sample.nearby : [];
  const categoryLabels = { school: 'School', hospital: 'Hospital', clinic: 'Clinic', fire_station: 'Fire station', police: 'Police station', pharmacy: 'Pharmacy', fuel: 'Fuel station', supermarket: 'Supermarket', convenience: 'Convenience store', park: 'Park', sports_centre: 'Sports centre', place_of_worship: 'Place of worship', library: 'Library', bus_station: 'Bus station', station: 'Public transport' };
  const nearby = rawNearby.length ? rawNearby.map(x => [categoryLabels[x.category] || x.category || 'Nearby place', x.name || 'Unnamed place', `${Number(x.distanceKm || 0).toFixed(1)} km`]) : (Array.isArray(sample.nearby) ? sample.nearby.filter(Array.isArray) : []);
  const priorities = sample.priorities?.length ? sample.priorities.slice(0, 3) : [];
  const risks = Array.isArray(sample.risks) ? sample.risks : [];
  const priorityMarkup = priorities.length ? priorities.map((p, i) => `<div class="priority-item"><b>0${i + 1}</b><span><strong>${escapeHtml(p.title || 'Priority')}</strong><small>${escapeHtml(p.detail || 'Verify with a local source')}</small></span><em>${escapeHtml(p.action || 'Review')}</em></div>`).join('') : '<div class="empty-state">No priority items were returned for this analysis.</div>';
  const riskMarkup = risks.length ? risks.map((r, index) => { const evidence = Array.isArray(r.evidence) ? r.evidence.slice(0, 3) : []; const evidenceMarkup = evidence.length ? `<ul class="risk-evidence">${evidence.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''; return `<div class="risk-row" role="button" tabindex="0" data-risk-index="${index}" aria-label="Open details for ${escapeHtml(r.name || 'risk domain')}"><div class="risk-main"><span class="risk-icon ${riskClass(r.tone)}">${String(r.name || '').toLowerCase().includes('flood') ? '≈' : String(r.name || '').toLowerCase().includes('fire') ? '✦' : String(r.name || '').toLowerCase().includes('weather') ? '↗' : '○'}</span><div><strong>${escapeHtml(r.name || 'Risk domain')}</strong><p>${escapeHtml(r.text || 'No explanation was returned.')}</p>${evidenceMarkup}</div></div><div class="risk-meter"><span class="${riskClass(r.tone)}" style="width:${riskValue(r.value)}%"></span></div><div class="risk-label ${riskClass(r.tone)}">${escapeHtml(r.level || 'Review')} ${icon('arrow')}</div></div>`; }).join('') : '<div class="empty-state">No risk domains were returned. Review the evidence tab and retry the analysis.</div>';
  const nearbyMarkup = nearby.length ? nearby.map(x => `<div class="nearby-item"><span>${icon('pin')}</span><div><strong>${escapeHtml(x[0] || 'Nearby place')}</strong><small>${escapeHtml(x[1] || 'Unnamed place')} · ${escapeHtml(x[2] || 'distance unavailable')} away</small></div></div>`).join('') : '<div class="empty-state">No nearby essentials were returned by the location provider.</div>';
  const point = sample.coordinates;
  const hasCoordinates = Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lon));
  const latitude = Number(point?.lat), longitude = Number(point?.lon);
  const latitudeSpan = 0.032;
  const longitudeSpan = 0.032 / Math.max(0.25, Math.cos(latitude * Math.PI / 180));
  const bbox = hasCoordinates ? [longitude - longitudeSpan, latitude - latitudeSpan, longitude + longitudeSpan, latitude + latitudeSpan].map((value) => value.toFixed(6)).join(',') : '';
  const mapUrl = hasCoordinates ? `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude.toFixed(6)},${longitude.toFixed(6)}`)}` : '';
  const mapMarkup = hasCoordinates
    ? `<div class="map-card"><div class="map-head"><span>LOCATION CONTEXT</span><span>${icon('pin')} approximately 6 km radius</span></div><div class="location-map"><iframe title="Map preview for ${escapeHtml(sample.address || 'selected location')}" src="${mapUrl}" loading="lazy" referrerpolicy="no-referrer"></iframe><div class="map-overlay"><span>${icon('pin')} Selected location</span></div></div><div class="map-footer"><span>${icon('info')} OpenStreetMap preview · map data may be incomplete.</span><button id="explore-btn">Explore ${icon('arrow')}</button></div></div>`
    : `<div class="map-card map-unavailable"><div class="map-head"><span>LOCATION CONTEXT</span></div><div class="empty-state">A map preview will appear after TerraRisk resolves the property coordinates.</div></div>`;
  const score = riskValue(sample.score);
  return `<div class="summary-grid"><div class="score-card"><div class="card-top"><span>OVERALL EXPOSURE SCORE</span><span class="confidence">${escapeHtml(sample.confidence)}</span></div><div class="score-row"><div class="score-ring" style="${scoreRingStyle(score)}"><strong>${score}</strong><span>/100</span></div><div><h3>${riskHeadline(score)}</h3><p>${escapeHtml(sample.summary)}</p></div></div><div class="score-legend"><span><i class="dot teal"></i>0–24 lower</span><span><i class="dot amber"></i>25–74 investigate</span><span><i class="dot red"></i>75–100 higher</span></div><p class="rating-note">${escapeHtml(sample.ratingMethod?.rule || 'Calculated from the available risk domains and source context.')}</p></div><div class="priority-card"><div class="card-top"><span>TOP PRIORITIES</span>${icon('arrow')}</div>${priorityMarkup}</div></div><div class="content-grid"><div class="risk-panel"><div class="panel-heading"><div><div class="section-kicker">RISK DOMAINS</div><h3>What historical evidence suggests</h3></div><span class="tiny-tag">${risks.length} domains · click for detail</span></div>${riskMarkup}</div>${mapMarkup}</div><div class="nearby"><div class="panel-heading"><div><div class="section-kicker">AROUND THE ADDRESS</div><h3>Access to essentials</h3></div><span class="tiny-tag">mixed categories · 6 km</span></div><div class="nearby-grid">${nearbyMarkup}</div></div>`;
}

function analysisTab() {
  const lenses = [['environmental', 'Environmental analyst'], ['infrastructure', 'Infrastructure analyst'], ['community', 'Community context analyst'], ['insurance', 'Insurance perspective'], ['investment', 'Investment perspective']];
  const lensMarkup = lenses.map(([key, label]) => `<article class="lens-card"><div class="section-kicker">${escapeHtml(label)}</div><p>${escapeHtml(sample.specialists?.[key] || 'No specialist summary was returned.')}</p></article>`).join('');
  const run = sample.agentRun || {};
  const teamMarkup = `<div class="agent-team"><div><div class="section-kicker">MULTI-AGENT REVIEW</div><h3>${escapeHtml(run.mode === 'multi-agent' ? 'Specialists reviewed the same evidence before synthesis.' : 'Demonstration analysis team')}</h3><p>${Number(run.successful || 0)} of ${Number(run.total || 0)} specialist passes completed · final pass: ${escapeHtml(run.chiefAnalyst || 'Chief analyst synthesis')}</p></div><div class="agent-team-list">${(Array.isArray(run.specialists) ? run.specialists : []).map((name) => `<span>${icon('check')}${escapeHtml(name)}</span>`).join('')}</div></div>`;
  const risks = Array.isArray(sample.risks) ? sample.risks : [];
  const selected = risks[state.selectedRisk] || risks[0];
  const detailMarkup = risks.length ? risks.map((risk, index) => { const selectedClass = index === state.selectedRisk ? ' selected' : ''; const evidence = Array.isArray(risk.evidence) ? risk.evidence : []; const sources = Array.isArray(risk.sources) ? risk.sources : []; const scoreMarkup = risk.excludeFromRating ? '<strong class="unavailable-score">Not scored</strong>' : `<strong>${riskValue(risk.value)}/100</strong>`; return `<article class="risk-detail${selectedClass}" data-risk-detail="${index}"><div class="risk-detail-head"><div><div class="section-kicker">${escapeHtml(risk.level || 'Review')} signal</div><h3>${escapeHtml(risk.name || 'Risk domain')}</h3></div>${scoreMarkup}</div><p>${escapeHtml(risk.text || 'No explanation was returned.')}</p><div class="detail-columns"><div><b>Evidence</b><ul>${evidence.map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>No factual evidence returned.</li>'}</ul></div><div><b>Source trail</b><ul>${sources.map(source => `<li>${escapeHtml(source)}</li>`).join('') || '<li>Source metadata unavailable.</li>'}</ul></div></div></article>`; }).join('') : '<div class="empty-state">No detailed risk analysis was returned.</div>';
  const dueDiligence = Array.isArray(sample.dueDiligence) ? sample.dueDiligence : [];
  const checklistMarkup = dueDiligence.length ? dueDiligence.slice(0, 8).map((item, index) => `<div class="diligence-item"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(item.item || 'Verification step')}</strong><p>${escapeHtml(item.why || 'Confirm this with an authoritative source.')}</p><small>${escapeHtml(item.owner || 'Relevant professional')}</small></div></div>`).join('') : '<div class="empty-state">No due-diligence checklist was returned.</div>';
  return `<div class="analysis-layout"><section>${teamMarkup}<div class="section-kicker">SPECIALIST LENSES</div><h3 class="analysis-title">One brief, six ways to interrogate the evidence.</h3><div class="lens-grid">${lensMarkup}</div><div class="section-kicker analysis-kicker">DETAILED RISK REVIEW</div><p class="subtle">Select a risk from Overview or review each evidence trail below. Facts, interpretation, and uncertainty are kept visible.</p><div class="risk-detail-list">${detailMarkup}</div></section><aside class="diligence-card"><span class="callout-icon">${icon('check')}</span><div class="section-kicker">BEFORE YOU DECIDE</div><h3>Due-diligence checklist</h3><p>These are verification actions, not purchase or insurance instructions.</p>${checklistMarkup}</aside></div>`;
}

function evidenceTab() {
  const coverage = sample.dataCoverage || { historicalWeather: false, elevation: false, wildfire: false, wildfireHistory: false, wildfireHistoryQueried: false, floodZone: false, nationalRiskIndex: false, crime: false, insuranceClaims: false };
  const providerErrors = sample.providerErrors || {};
  const history = sample.historical;
  const sources = Array.isArray(sample.sources) ? sample.sources : [];
  const historyMarkup = history ? `<div class="history-card"><div class="section-kicker">HISTORICAL WEATHER CONTEXT</div><h3>${escapeHtml(history.period || 'Historical period unavailable')}</h3><div class="history-grid"><span><b>${history.averageAnnualPrecipitationMm ?? '—'}</b><small>avg annual rain (mm)</small></span><span><b>${history.heavyRainDaysOver30mm ?? '—'}</b><small>days ≥30 mm rain</small></span><span><b>${history.wettestDayMm ?? '—'}</b><small>wettest day (mm)</small></span><span><b>${history.highestDailyWindKmh ?? '—'}</b><small>highest daily wind (km/h)</small></span></div><p>${escapeHtml(history.source || 'Historical data provider')} · This is long-term context, not a forecast or property-loss record.</p></div>` : '<div class="history-card"><div class="section-kicker">HISTORICAL WEATHER CONTEXT</div><p>Historical weather data was unavailable for this request.</p></div>';
  const sourceRows = sources.length ? sources.map((s, i) => { const value = String(s).toLowerCase(); const isCrime = value.includes('crime') || value.includes('saps') || value.includes('openafrica'); const isFireHistory = value.includes('historical fire') || value.includes('fire perimeter'); const isWildfire = value.includes('wildfire') || value.includes('veldfire') || value.includes('fire risk'); const connected = value.includes('openrouter') ? state.live : isFireHistory ? (coverage.wildfireHistory || coverage.wildfireHistoryQueried) : value.includes('historical') ? coverage.historicalWeather : isCrime ? coverage.crime : isWildfire ? coverage.wildfire : value.includes('flood') ? coverage.floodZone : value.includes('risk index') ? coverage.nationalRiskIndex : true; const description = value.includes('historical weather') ? 'Ten-year historical weather and climate context' : value.includes('overpass') ? 'Balanced nearby essentials, roads, and land-use context' : value.includes('nominatim') ? 'Address and coordinate resolution' : value.includes('openrouter') ? 'Evidence-grounded multi-agent synthesis' : isFireHistory ? (coverage.wildfireHistory ? 'Historical fire perimeters matched near the property' : 'Historical fire-perimeter layer queried; no nearby match returned') : isCrime ? 'Historical station or provider-level crime context' : isWildfire ? 'Regional wildfire-hazard context, not a property inspection' : 'Official or public regional hazard context'; return `<div class="source-row"><span class="source-index">${String(i + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(s)}</strong><small>${description}</small></div><span class="source-status">${connected ? 'Connected' : 'Unavailable'}</span></div>`; }).join('') : '<div class="empty-state">No source metadata was returned.</div>';
  const diagnostics = [providerErrors.wildfire ? `<p class="provider-diagnostic"><strong>Wildfire provider diagnostic:</strong> ${escapeHtml(providerErrors.wildfire)}</p>` : '', providerErrors.fireHistory ? `<p class="provider-diagnostic"><strong>Fire-history provider diagnostic:</strong> ${escapeHtml(providerErrors.fireHistory)}</p>` : '', providerErrors.crime ? `<p class="provider-diagnostic"><strong>Crime provider diagnostic:</strong> ${escapeHtml(providerErrors.crime)}</p>` : ''].join('');
  return `<div class="evidence-layout"><div class="evidence-card"><div class="section-kicker">EVIDENCE TRAIL</div><h3>Every conclusion starts with a historical signal.</h3><p>TerraRisk shows observed data separately from model interpretation. A signal is only as strong as its source coverage, time window, and geographic resolution.</p>${historyMarkup}${sourceRows}${diagnostics}<div class="coverage-row"><span class="source-index">+</span><div><strong>Data coverage</strong><small>Historical weather ${coverage.historicalWeather ? 'connected' : 'unavailable'} · Elevation ${coverage.elevation ? 'connected' : 'unavailable'} · Wildfire hazard ${coverage.wildfire ? 'connected' : 'unavailable'} · Fire history ${coverage.wildfireHistory ? 'records matched' : coverage.wildfireHistoryQueried ? 'queried; no nearby match' : 'unavailable'} · Flood zone ${coverage.floodZone ? 'connected' : 'unavailable'} · FEMA risk index ${coverage.nationalRiskIndex ? 'connected' : 'unavailable'} · Crime ${coverage.crime ? 'connected' : 'unavailable'} · Claims ${coverage.insuranceClaims ? 'connected' : 'unavailable'}</small></div></div></div><div class="evidence-callout"><span class="callout-icon">${icon('spark')}</span><div><div class="section-kicker">MODEL NOTE</div><h3>Uncertainty is part of the answer.</h3><p>A low signal is not a guarantee that an event has never happened. The report highlights the historical evidence available and what needs property-level or authoritative local verification.</p></div></div></div>`;
}
function questionsTab() { const questions = sample.questions?.length ? sample.questions : ['Is the property inside a municipal storm-water or flood-risk overlay not visible in public data?', 'What mitigation measures are already in place on the property and along the neighbourhood edge?', 'Does the policy include wind, hail, water-backup, and smoke damage with separate excesses?', 'How does emergency vehicle access change during peak traffic or a local evacuation event?']; const policyCopy = state.policyFile ? `Policy attached locally as ${escapeHtml(state.policyFile)}. Server-side clause comparison is the next integration step.` : 'Upload a policy schedule to surface possible mismatches between your current cover and the location signals.'; const policyLabel = state.policyFile ? `Attached: ${escapeHtml(state.policyFile)}` : `Upload policy PDF ${icon('arrow')}`; const questionMarkup = questions.slice(0, 6).map((q, i) => { const result = state.questionAnswers[i]; const sources = result?.sources?.length ? result.sources.map((source) => `<span>${escapeHtml(source)}</span>`).join('') : result ? '<span>No report source was returned.</span>' : ''; const answerMarkup = result ? `<div class="question-answer"><p>${escapeHtml(result.answer)}</p><div class="answer-sources"><span>Sources</span>${sources}</div></div>` : ''; return `<div class="question-block"><button type="button" class="question-row" data-question-index="${i}" ${state.questionLoading === i ? 'disabled' : ''}><span>${String(i + 1).padStart(2, '0')}</span><p>${escapeHtml(q)}</p>${state.questionLoading === i ? '<small class="question-loading">Analysing…</small>' : icon('arrow')}</button>${answerMarkup}</div>`; }).join(''); return `<div class="questions-layout"><div><div class="section-kicker">NEXT BEST QUESTIONS</div><h3>Take this brief into your next conversation.</h3><p class="subtle">Click a question to get a specific answer grounded in this report’s evidence.</p>${questionMarkup}</div><div class="policy-card"><span class="callout-icon">${icon('upload')}</span><div class="section-kicker">OPTIONAL NEXT STEP</div><h3>Compare your existing policy</h3><p>${policyCopy}</p><button class="outline-btn" id="upload-btn">${policyLabel}</button><input type="file" id="policy-input" accept="application/pdf,.pdf" hidden /></div></div>`; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function chatPanel() { const messages = state.chatMessages.length ? state.chatMessages.map((message) => `<div class="chat-bubble ${message.role}">${escapeHtml(message.text)}</div>`).join('') : `<div class="chat-bubble ai">I can explain any part of the brief. Try “Why is wildfire moderate?”</div>`; return `<div class="chat-panel"><div class="chat-head"><span>${icon('spark')} TerraRisk guide</span><button id="close-chat">×</button></div><div class="chat-body">${messages}${state.chatLoading ? `<div class="chat-bubble ai chat-thinking">Analysing the brief…</div>` : ''}</div><form class="chat-input" id="chat-form"><input id="chat-input" placeholder="Ask about this location…" autocomplete="off"/><button type="submit" aria-label="Send">${icon('arrow')}</button></form></div>`; }

function bindEvents() {
  document.querySelectorAll('[data-profile]').forEach(btn => btn.addEventListener('click', () => { state.profile = btn.dataset.profile; render(); }));
  document.querySelector('#analysis-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    state.address = document.querySelector('#address-input').value.trim();
    state.listingUrl = document.querySelector('#listing-url-input').value.trim();
    if (!state.address && !state.listingUrl) { state.error = 'Enter a property address or a supported property-listing URL.'; render(); return; }
    state.analyzing = true;
    state.error = '';
    state.questionAnswers = {};
    state.questionLoading = null;
    state.selectedRisk = 0;
    render();
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: state.address, listingUrl: state.listingUrl, profile: state.profile }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.details || payload.error || `Live analysis returned ${response.status}.`);
      Object.assign(sample, normalizeReport(payload));
      state.live = true;
    } catch (error) {
      sample.address = state.address || 'Property listing URL';
      sample.locality = state.address || state.listingUrl;
      state.live = false;
      state.error = error.message || 'Live analysis was unavailable.';
    }
    state.analyzed = true;
    state.analyzing = false;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelector('#demo-btn')?.addEventListener('click', () => { state.address = sample.address; state.listingUrl = ''; sample.listing = null; state.error = ''; state.policyFile = ''; state.questionAnswers = {}; state.questionLoading = null; state.selectedRisk = 0; state.live = false; state.analyzed = true; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelector('#cta-demo')?.addEventListener('click', () => { document.querySelector('#address-input')?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelector('#reset-btn')?.addEventListener('click', () => { state = { analyzed: false, analyzing: false, live: false, profile: state.profile, address: '', listingUrl: '', listingHelp: false, activeTab: 'overview', selectedRisk: 0, chatOpen: false, chatMessages: [], chatLoading: false, questionAnswers: {}, questionLoading: null, error: '', policyFile: '' }; render(); });
  document.querySelector('#listing-help-btn')?.addEventListener('click', () => { state.listingHelp = !state.listingHelp; render(); });
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; render(); }));
  document.querySelectorAll('[data-risk-index]').forEach(row => { const open = () => { state.selectedRisk = Number(row.dataset.riskIndex) || 0; state.activeTab = 'analysis'; render(); }; row.addEventListener('click', open); row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } }); });
  document.querySelectorAll('[data-question-index]').forEach(btn => btn.addEventListener('click', async () => { const index = Number(btn.dataset.questionIndex); const questions = sample.questions?.length ? sample.questions : ['Is the property inside a municipal storm-water or flood-risk overlay not visible in public data?', 'What mitigation measures are already in place on the property and along the neighbourhood edge?', 'Does the policy include wind, hail, water-backup, and smoke damage with separate excesses?', 'How does emergency vehicle access change during peak traffic or a local evacuation event?']; const question = questions[index]; if (!question || state.questionLoading !== null) return; state.questionLoading = index; render(); try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, report: sample, mode: 'follow-up' }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Follow-up answer unavailable.'); state.questionAnswers[index] = { answer: data.answer || 'No answer was returned.', sources: Array.isArray(data.sources) ? data.sources : [] }; } catch (error) { state.questionAnswers[index] = { answer: error.message || 'Follow-up answer unavailable.', sources: [] }; } state.questionLoading = null; render(); }));
  document.querySelector('#chat-btn')?.addEventListener('click', () => { state.chatOpen = true; render(); });
  document.querySelector('#close-chat')?.addEventListener('click', () => { state.chatOpen = false; render(); });
  document.querySelector('#chat-form')?.addEventListener('submit', async e => { e.preventDefault(); const input = document.querySelector('#chat-input'); const question = input.value.trim(); if (!question || state.chatLoading) return; state.chatMessages.push({ role: 'user', text: question }); state.chatLoading = true; render(); try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, report: sample }) }); if (!response.ok) throw new Error('Chat is unavailable.'); const data = await response.json(); state.chatMessages.push({ role: 'ai', text: data.answer || 'I could not produce an answer for that question.' }); } catch (error) { state.chatMessages.push({ role: 'ai', text: error.message }); } state.chatLoading = false; render(); });
  document.querySelector('#upload-btn')?.addEventListener('click', () => document.querySelector('#policy-input').click());
  document.querySelector('#policy-input')?.addEventListener('change', e => { const file = e.target.files[0]; if (!file) return; if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { state.error = 'Please choose a PDF policy schedule.'; render(); return; } if (file.size > 15 * 1024 * 1024) { state.error = 'That PDF is larger than 15 MB. Choose a smaller policy schedule.'; render(); return; } state.policyFile = file.name; state.error = ''; render(); });
  document.querySelector('#download-btn')?.addEventListener('click', () => window.print());
  document.querySelector('#explore-btn')?.addEventListener('click', () => { const point = sample.coordinates; if (point) window.open(`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=15/${point.lat}/${point.lon}`, '_blank', 'noopener'); });
}

render();
fetch('/api/health').then((response) => response.ok ? response.json() : null).then((config) => { if (config) { runtimeConfig = { listingHosts: Array.isArray(config.listingHosts) ? config.listingHosts : [], listingHostGroups: config.listingHostGroups && typeof config.listingHostGroups === 'object' ? config.listingHostGroups : {} }; if (!state.analyzed) render(); } }).catch(() => {});
