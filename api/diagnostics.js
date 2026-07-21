import { diagnoseLocationSources } from './analyze.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    const profile = ['auto', 'za', 'us'].includes(req.body?.profile) ? req.body.profile : 'auto';
    return res.status(200).json(await diagnoseLocationSources(address, profile));
  } catch (error) {
    return res.status(400).json({ error: 'Source diagnostics failed.', details: error.message || 'Unknown error' });
  }
}
