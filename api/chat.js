function parseJson(content) {
  const text = String(content || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENROUTER_API_KEY || !process.env.OPENROUTER_MODEL) return res.status(503).json({ error: 'OpenRouter is not configured.' });
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) return res.status(400).json({ error: 'Ask a question about the brief.' });
  const report = req.body?.report || {};
  const allowedSources = Array.isArray(report.sources) ? report.sources.filter((source) => typeof source === 'string') : [];
  const headers = { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', ...(process.env.OPENROUTER_SITE_URL ? { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL } : {}), ...(process.env.OPENROUTER_SITE_NAME ? { 'X-Title': process.env.OPENROUTER_SITE_NAME } : {}) };
  const body = {
    model: process.env.OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: 'You are TerraRisk Guide. Answer only from the supplied TerraRisk brief. Explain uncertainty, do not invent facts, and do not give regulated insurance advice. Return JSON with answer (string) and sources (array of exact source names copied from the brief). Never create a source name that is not in the brief.' },
      { role: 'user', content: `Brief:\n${JSON.stringify(report)}\n\nAllowed source names:\n${JSON.stringify(allowedSources)}\n\nQuestion: ${question}` }
    ],
    ...(process.env.OPENROUTER_JSON_MODE !== 'off' ? { response_format: { type: 'json_object' } } : {})
  };
  let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok && [400, 422].includes(response.status) && body.response_format) {
    delete body.response_format;
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) });
  }
  if (!response.ok) return res.status(502).json({ error: `OpenRouter returned ${response.status}.` });
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content || '';
  try {
    const result = parseJson(content);
    const sources = Array.isArray(result.sources) ? result.sources.filter((source) => allowedSources.includes(source)) : [];
    return res.status(200).json({ answer: result.answer || content, sources: sources.length ? sources : allowedSources.slice(0, 3) });
  } catch { return res.status(200).json({ answer: content, sources: allowedSources.slice(0, 3) }); }
}
