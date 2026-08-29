const crypto = require('crypto');
const { appendRow } = require('./google-sheets');

const appendDonationToSheet = async (payload) => {
  const values = [
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
  ];
  return appendRow(values);
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
