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
    { name: 'Flood & drainage', level: 'Low', value: 26, tone: 'teal', text: 'No mapped flood zone at the selected point. A seasonal watercourse sits 1.8 km east; verify local drainage and basement exposure.' },
    { name: 'Wildfire', level: 'Moderate', value: 57, tone: 'amber', text: 'Dense vegetation and a dry-season wind corridor increase exposure at the neighbourhood edge.' },
    { name: 'Severe weather', level: 'Moderate', value: 49, tone: 'amber', text: 'Winter rainfall and wind events are the more relevant weather questions for this address.' },
    { name: 'Seismic', level: 'Low', value: 11, tone: 'teal', text: 'No elevated seismic signal surfaced in the available regional data.' }
  ],
  nearby: [
    ['Fire station', '3.2 km', '8 min'], ['Hospital', '5.6 km', '14 min'], ['Supermarket', '1.1 km', '4 min'], ['Primary school', '0.9 km', '3 min']
  ],
  sources: ['OpenStreetMap', 'Google Maps context', 'Regional climate layers', 'Public hazard datasets']
};

let state = { analyzed: false, analyzing: false, live: false, address: '', activeTab: 'overview', chatOpen: false };

function icon(name, cls = '') { return `<span class="icon ${cls}">${icons[name] || ''}</span>`; }
function riskClass(tone) { return tone === 'teal' ? 'good' : tone === 'amber' ? 'watch' : 'danger'; }

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
              <div class="search-row">${icon('search')}<input id="address-input" value="${state.address}" placeholder="Enter a property address" aria-label="Property address"/><button type="submit">Analyse location ${icon('arrow')}</button></div>
              <div class="search-hint">${icon('pin')} Try the demo: <button type="button" class="demo-link" id="demo-btn">14 Oak Avenue, Constantia</button></div>
            </form>${state.analyzing ? `<div class="analysis-loading">${icon('spark')} Gathering location context and preparing your evidence brief…</div>` : ''}
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
  return `<section class="report-shell"><div class="report-header"><div><div class="section-kicker">LOCATION BRIEF <span class="live-dot"></span> ${state.live ? 'LIVE ANALYSIS' : 'DEMO ANALYSIS'}</div><h2>${sample.address}</h2><p>${icon('pin')} ${sample.locality}</p></div><div class="report-actions"><button class="ghost-btn" id="reset-btn">New analysis</button><button class="primary-btn" id="download-btn">Export brief ${icon('arrow')}</button></div></div>
    <div class="report-tabs"><button class="${state.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button><button class="${state.activeTab === 'evidence' ? 'active' : ''}" data-tab="evidence">Evidence & sources</button><button class="${state.activeTab === 'questions' ? 'active' : ''}" data-tab="questions">Questions to ask</button></div>
    ${state.activeTab === 'overview' ? overviewTab() : state.activeTab === 'evidence' ? evidenceTab() : questionsTab()}
    <div class="disclaimer">${icon('info')} This is an early decision-support prototype, not a quote, underwriting decision, or insurance recommendation. Always verify findings with authoritative local sources and a licensed professional.</div>
    <button class="chat-fab" id="chat-btn">${icon('spark')} Ask about this brief</button>${state.chatOpen ? chatPanel() : ''}</section>`;
}

function overviewTab() {
  const nearby = Array.isArray(sample.nearby) && typeof sample.nearby[0] === 'object' ? sample.nearby.map(x => [x.name, `${x.distanceKm} km`, 'context']) : sample.nearby;
  return `<div class="summary-grid"><div class="score-card"><div class="card-top"><span>PROPERTY RISK SIGNAL</span><span class="confidence">${sample.confidence}</span></div><div class="score-row"><div class="score-ring"><strong>${sample.score}</strong><span>/100</span></div><div><h3>Moderate overall exposure</h3><p>${sample.summary}</p></div></div><div class="score-legend"><span><i class="dot teal"></i>Lower signal</span><span><i class="dot amber"></i>Worth investigating</span><span><i class="dot red"></i>Higher signal</span></div></div><div class="priority-card"><div class="card-top"><span>TOP PRIORITIES</span>${icon('arrow')}</div><div class="priority-item"><b>01</b><span><strong>Wildfire conditions</strong><small>Vegetation and dry-season winds</small></span><em>Investigate</em></div><div class="priority-item"><b>02</b><span><strong>Storm-water drainage</strong><small>Local property-level verification</small></span><em>Verify</em></div><div class="priority-item"><b>03</b><span><strong>Emergency access</strong><small>Fire station 3.2 km away</small></span><em>Context</em></div></div></div><div class="content-grid"><div class="risk-panel"><div class="panel-heading"><div><div class="section-kicker">RISK DOMAINS</div><h3>What the signals say</h3></div><span class="tiny-tag">${sample.risks.length} domains</span></div>${sample.risks.map(r => `<div class="risk-row"><div class="risk-main"><span class="risk-icon ${riskClass(r.tone)}">${r.name === 'Flood & drainage' ? '≈' : r.name === 'Wildfire' ? '✦' : r.name === 'Severe weather' ? '↗' : '○'}</span><div><strong>${r.name}</strong><p>${r.text}</p></div></div><div class="risk-meter"><span class="${riskClass(r.tone)}" style="width:${r.value}%"></span></div><div class="risk-label ${riskClass(r.tone)}">${r.level}</div></div>`).join('')}</div><div class="map-card"><div class="map-head"><span>LOCATION CONTEXT</span><span>${icon('pin')} 1.8 km radius</span></div><div class="map-art"><div class="map-road road-a"></div><div class="map-road road-b"></div><div class="map-road road-c"></div><div class="map-water"></div><div class="map-boundary"></div><div class="map-dot main-dot">${icon('pin')}</div><div class="map-label main-label">Selected address</div><div class="map-dot dot-hospital"></div><div class="map-label label-hospital">Hospital</div><div class="map-dot dot-fire"></div><div class="map-label label-fire">Fire station</div><div class="map-legend"><span><i class="legend-dot"></i> Selected property</span><span><i class="legend-line"></i> Waterway</span></div></div><div class="map-footer"><span>${icon('info')} Context layers are illustrative in this prototype.</span><button id="explore-btn">Explore ${icon('arrow')}</button></div></div></div><div class="nearby"><div class="panel-heading"><div><div class="section-kicker">AROUND THE ADDRESS</div><h3>Access to essentials</h3></div><span class="tiny-tag">within 6 km</span></div><div class="nearby-grid">${nearby.map(x => `<div class="nearby-item"><span>${icon('pin')}</span><div><strong>${x[0]}</strong><small>${x[1]} away · ${x[2]} drive</small></div></div>`).join('')}</div></div>`;
}

function evidenceTab() { const coverage = sample.dataCoverage || { weather: false, riverDischarge: false, elevation: false, wildfire: false, floodZone: false, nationalRiskIndex: false, crime: false, insuranceClaims: false }; return `<div class="evidence-layout"><div class="evidence-card"><div class="section-kicker">EVIDENCE TRAIL</div><h3>Every conclusion starts with a signal.</h3><p>TerraRisk separates what was observed from what the model inferred. In production, each layer will carry a source, date, and geographic resolution.</p>${sample.sources.map((s, i) => `<div class="source-row"><span class="source-index">0${i + 1}</span><div><strong>${s}</strong><small>${i === 0 ? 'Nearby facilities, roads, and land-use context' : i === 1 ? 'Address context and travel-distance estimates' : i === 2 ? 'Elevation, weather, and river-discharge context' : 'Model-generated synthesis of supplied evidence'}</small></div><span class="source-status">Connected</span></div>`).join('')}<div class="coverage-row"><span class="source-index">+</span><div><strong>Data coverage</strong><small>Weather ${coverage.weather ? 'connected' : 'unavailable'} · River discharge ${coverage.riverDischarge ? 'connected' : 'unavailable'} · Elevation ${coverage.elevation ? 'connected' : 'unavailable'} · Wildfire ${coverage.wildfire ? 'connected' : 'unavailable'} · Flood zone ${coverage.floodZone ? 'connected' : 'unavailable'} · FEMA risk index ${coverage.nationalRiskIndex ? 'connected' : 'unavailable'} · Crime ${coverage.crime ? 'connected' : 'unavailable'} · Claims ${coverage.insuranceClaims ? 'connected' : 'unavailable'}</small></div></div></div><div class="evidence-callout"><span class="callout-icon">${icon('spark')}</span><div><div class="section-kicker">MODEL NOTE</div><h3>Uncertainty is part of the answer.</h3><p>“Low flood exposure” does not mean “no chance of flooding.” The report flags where a property-level inspection or authoritative local map is still needed.</p></div></div></div>`; }
function questionsTab() { return `<div class="questions-layout"><div><div class="section-kicker">NEXT BEST QUESTIONS</div><h3>Take this brief into your next conversation.</h3><p class="subtle">These prompts are generated from the evidence and uncertainty in this analysis.</p>${['Is the property inside a municipal storm-water or flood-risk overlay not visible in public data?', 'What wildfire mitigation measures are already in place on the property and along the neighbourhood edge?', 'Does the policy include wind, hail, water-backup, and smoke damage with separate excesses?', 'How does emergency vehicle access change during peak traffic or a local evacuation event?'].map((q, i) => `<div class="question-row"><span>0${i + 1}</span><p>${q}</p>${icon('arrow')}</div>`).join('')}</div><div class="policy-card"><span class="callout-icon">${icon('upload')}</span><div class="section-kicker">OPTIONAL NEXT STEP</div><h3>Compare your existing policy</h3><p>Upload a policy schedule to surface possible mismatches between your current cover and the location signals.</p><button class="outline-btn" id="upload-btn">Upload policy PDF ${icon('arrow')}</button><input type="file" id="policy-input" accept=".pdf" hidden /></div></div>`; }
function chatPanel() { return `<div class="chat-panel"><div class="chat-head"><span>${icon('spark')} TerraRisk guide</span><button id="close-chat">×</button></div><div class="chat-body"><div class="chat-bubble ai">I can explain any part of the brief. Try “Why is wildfire moderate?”</div><div class="chat-bubble user">What should I verify first?</div><div class="chat-bubble ai">Start with local drainage and wildfire mitigation. They are the clearest property-level unknowns in this brief.</div></div><div class="chat-input"><input placeholder="Ask about this location…"/><button>${icon('arrow')}</button></div></div>`; }

function bindEvents() {
  document.querySelector('#analysis-form')?.addEventListener('submit', async e => { e.preventDefault(); state.address = document.querySelector('#address-input').value || sample.address; state.analyzing = true; render(); try { const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: state.address }) }); if (!response.ok) throw new Error('Live analysis unavailable'); Object.assign(sample, await response.json()); state.live = true; } catch { sample.address = state.address; sample.locality = state.address; state.live = false; } state.analyzed = true; state.analyzing = false; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelector('#demo-btn')?.addEventListener('click', () => { state.address = sample.address; state.live = false; state.analyzed = true; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelector('#cta-demo')?.addEventListener('click', () => { document.querySelector('#address-input')?.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.querySelector('#reset-btn')?.addEventListener('click', () => { state = { analyzed: false, analyzing: false, live: false, address: '', activeTab: 'overview', chatOpen: false }; render(); });
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => { state.activeTab = btn.dataset.tab; render(); }));
  document.querySelector('#chat-btn')?.addEventListener('click', () => { state.chatOpen = true; render(); });
  document.querySelector('#close-chat')?.addEventListener('click', () => { state.chatOpen = false; render(); });
  document.querySelector('#upload-btn')?.addEventListener('click', () => document.querySelector('#policy-input').click());
  document.querySelector('#policy-input')?.addEventListener('change', e => { if (e.target.files[0]) alert('Policy upload queued for the next build.'); });
  document.querySelector('#download-btn')?.addEventListener('click', () => alert('Export is wired as a demo action. PDF generation is the next integration step.'));
  document.querySelector('#explore-btn')?.addEventListener('click', () => alert('Interactive map layers are the next provider integration.'));
}

render();
