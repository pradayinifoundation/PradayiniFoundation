const { appendRow } = require('./google-sheets');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const payload = JSON.parse(event.body || '{}');
    const saved = await appendRow([
      payload.savedAt || new Date().toISOString(),
      payload.name || '',
      payload.email || '',
      payload.phone || '',
      payload.message || '',
      payload.channel || '',
      'Contact enquiry',
      '',
      '',
      '',
      'Received',
    ]);
    return {
      statusCode: saved ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved: false, error: 'Unable to save contact enquiry' }),
    };
  }
};
