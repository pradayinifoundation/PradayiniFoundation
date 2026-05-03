const crypto = require('crypto');

const SHEET_ID = '1-3nuWR3ThQugQ_A3QRqvAqA408_CfNmAE-0b3N9Pqfw';
const SHEET_RANGE = 'Sheet1!A:K';

const base64Url = (value) =>
  Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const getGoogleAccessToken = async () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsignedJwt = `${base64Url(header)}.${base64Url(claim)}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedJwt)
    .sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedJwt}.${signature}`,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Unable to authenticate with Google Sheets');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
};

const appendDonationToSheet = async (payload) => {
  const token = await getGoogleAccessToken();
  if (!token) {
    return false;
  }

  const values = [[
    new Date().toISOString(),
    payload.donorName || '',
    payload.donorEmail || '',
    payload.donorPhone || '',
    payload.amount || '',
    payload.plan || '',
    payload.paymentType || '',
    payload.razorpay_payment_id || '',
    payload.razorpay_order_id || '',
    payload.razorpay_signature || '',
    'Verified',
  ]];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_RANGE)}:append?valueInputOption=USER_ENTERED`;
  const sheetResponse = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!sheetResponse.ok) {
    throw new Error('Unable to append donation to Google Sheet');
  }

  return true;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Payment verification is not configured' }),
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const orderId = String(payload.razorpay_order_id || '');
    const paymentId = String(payload.razorpay_payment_id || '');
    const signature = String(payload.razorpay_signature || '');

    if (!orderId || !paymentId || !signature) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: false, error: 'Missing payment verification fields' }),
      };
    }

    const generated = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verified = generated === signature;

    let sheetSaved = false;
    if (verified) {
      try {
        sheetSaved = await appendDonationToSheet(payload);
      } catch (error) {
        sheetSaved = false;
      }
    }

    return {
      statusCode: verified ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified, sheetSaved }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: false, error: 'Internal server error' }),
    };
  }
};
