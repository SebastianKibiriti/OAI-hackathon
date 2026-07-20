# TerraRisk AI

TerraRisk AI is a hackathon-ready prototype for explainable location risk intelligence. A user enters a property address and receives a concise brief covering environmental exposure, infrastructure access, nearby essentials, evidence sources, and questions to ask a broker or insurer.

## Run locally

```bash
npm install
npm run dev
```

The UI has a live-analysis seam at `POST /api/analyze`. The serverless handler geocodes with OpenStreetMap Nominatim, gathers nearby context with Overpass, collects Open-Meteo weather, river-discharge, and elevation signals, then selects a jurisdiction profile. South African addresses use the CSIR/SANBI veld-fire ArcGIS layer; U.S. addresses use FEMA’s National Flood Hazard Layer, FEMA National Risk Index, and a U.S. Wildfire Hazard Potential layer. Optional crime and insurance-claims adapters can be configured with `TERRARISK_*_URL` variables. Provider calls are isolated with partial-result handling, so one unavailable source does not discard the entire location brief.

For live analysis, copy `.env.example` to `.env` in the project root and set `OPENROUTER_API_KEY` plus a chat-capable OpenRouter model ID in `OPENROUTER_MODEL`. Rerank, embedding, and moderation-only model IDs cannot generate the TerraRisk report. The Vite dev server exposes the local `/api/analyze` route during development. The API key must stay server-side; do not expose it in a `VITE_*` variable. JSON mode is enabled by default and can be disabled for models that do not support it.

## Product guardrails

- This is decision support, not insurance advice or underwriting.
- Risk signals are shown with confidence and uncertainty.
- The AI should reason only over sourced, structured facts.
- Sensitive attributes and speculative claims about residents should not be inferred.
