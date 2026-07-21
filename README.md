# TerraRisk AI

TerraRisk AI is a hackathon-ready prototype for explainable location risk intelligence. A user enters a property address and receives a concise brief covering environmental exposure, infrastructure access, nearby essentials, evidence sources, and questions to ask a broker or insurer.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

### First-time setup

1. Create a free/paid OpenRouter key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Copy `.env.example` to `.env`.
3. Set `OPENROUTER_API_KEY` and a chat-capable `OPENROUTER_MODEL`.
4. Restart `npm run dev` after changing `.env`.
5. Enter an address and choose **Analyse location**. If live providers fail, the UI shows the demo brief so the product can still be explored.

The UI has a live-analysis seam at `POST /api/analyze`. The serverless handler geocodes with OpenStreetMap Nominatim, gathers a deliberately mixed sample of nearby essentials with Overpass (schools, shops, parks, healthcare, safety and transport), then uses a ten-year Open-Meteo historical-weather window plus elevation and jurisdiction-specific hazard layers. South African addresses use the CSIR/SANBI veld-fire ArcGIS layer; U.S. addresses use FEMA’s National Flood Hazard Layer, FEMA National Risk Index, a U.S. Wildfire Hazard Potential hex layer, and a historical fire-perimeter query. Optional crime and insurance-claims adapters can be configured with `TERRARISK_*_URL` variables. Provider calls are isolated with partial-result handling, so one unavailable source does not discard the entire location brief.

### Multi-agent analysis

Each live report sends the same structured evidence through independent specialist passes: environmental, infrastructure/emergency, historical security, community context, insurance context, and property/resilience. A final chief analyst pass synthesizes their findings into the risk matrix, priorities, questions, and due-diligence checklist. The report includes `agentRun` metadata so the UI can show which passes completed. A failed specialist is recorded as unavailable and does not discard the complete report.

Open `GET /api/health` during local development to verify non-secret configuration status, including whether the OpenRouter model, South African historical adapter, and U.S. CrimeoMeter/custom provider are detected. Secret values are never returned.

The report’s **Ask about this brief** panel calls `POST /api/chat` through the same OpenRouter model. Clickable follow-up questions return an answer plus the exact report sources used. **Print / save** uses the browser print dialog, **Explore** opens the selected coordinates in OpenStreetMap, and the policy upload attaches a local file for the next document-parser integration.

For live analysis, copy `.env.example` to `.env` in the project root and set `OPENROUTER_API_KEY` plus a chat-capable OpenRouter model ID in `OPENROUTER_MODEL`. Rerank, embedding, and moderation-only model IDs cannot generate the TerraRisk report. The Vite dev server exposes the local `/api/analyze` route during development. The API key must stay server-side; do not expose it in a `VITE_*` variable. JSON mode is enabled by default and can be disabled for models that do not support it.

### Property-listing URLs

TerraRisk can accept a public home-sale listing URL as an alternative to manually entering an address. Add only listing domains you trust to the country-specific allowlists (or the shared fallback), for example:

```bash
TERRARISK_ZA_LISTING_HOSTS=property24.com,privateproperty.co.za,pamgolding.co.za,seef.co.za
TERRARISK_US_LISTING_HOSTS=realtor.com,homes.com,compass.com
TERRARISK_LISTING_HOSTS=another-approved-domain.example
```

The service merges these lists for validation. The information icon beside the listing field groups the active domains under South African, U.S., and other approved listings. It reads only publicly exposed HTML metadata or JSON-LD to locate the address. It does not bypass logins, paywalls, robots rules, or redirects; if a listing does not publish a structured address, enter the address manually instead.

### U.S. crime intelligence

The built-in U.S. crime adapter supports CrimeoMeter’s point/radius crime-statistics API. For a hackathon demo, the [Apiary v1 documentation](https://jsapi.apiary.io/apis/crimeometer/introduction/release-version-1.html) publishes a limited evaluation key. Paste that key into the server-side `.env` file and use the documented version:

```bash
CRIMEOMETER_API_KEY=your_evaluation_or_private_key
CRIMEOMETER_API_VERSION=1
CRIMEOMETER_DISTANCE=3mi
```

The evaluation API is limited to the provider’s documented coverage—roughly 30+ U.S. and Latin American cities—and should be treated as demo-only. For broader or production use, request a private key and use version 2. Alternatively, set `TERRARISK_US_CRIME_URL` to a trusted provider that returns JSON. It can accept ordinary `lat` and `lon` query parameters, or use `{lat}`, `{lon}`, `{state}`, `{county}`, `{startDate}`, and `{endDate}` directly in the configured URL. If it requires a key, set `TERRARISK_US_CRIME_API_KEY` and, where needed, `TERRARISK_US_CRIME_AUTH_HEADER`.

FBI Crime Data Explorer is appropriate for official historical state or agency context, not property-level risk. TerraRisk labels all crime results with the provider’s geography and period, and it reports unavailable coverage rather than making up a street-level rate.

### South African historical crime context

South African analyses automatically try the openAFRICA/SAPS Police Statistics dataset and the companion SAPS police-station coordinate dataset. The adapter matches the property to the nearest station, aggregates the station's historical incident totals and leading categories, and labels the result with the station name, distance, and data period. This is useful historical context, not a current incident feed, property-level prediction, or substitute for official local verification. The statistics resource is licensed ODbL; review and preserve the dataset attribution when distributing derived results. Set `TERRARISK_ZA_CRIME_STATS_URL=off` to disable the built-in adapter, or override `TERRARISK_ZA_CRIME_STATS_URL` and `TERRARISK_ZA_POLICE_STATIONS_URL` with maintained mirrors.

## Product guardrails

- This is decision support, not insurance advice or underwriting.
- Risk signals are shown with confidence and uncertainty.
- The AI should reason only over sourced, structured facts.
- Historical weather is gridded reanalysis context, not a verified claim or damage history for an individual property.
- Sensitive attributes and speculative claims about residents should not be inferred.
