const crypto = require('crypto');
const { appendRow } = require('./google-sheets');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Payment gateway is not configured' }),
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const amount = Number(payload.amount);
    const plan = String(payload.plan || 'one-time');
    const donorName = String(payload.donorName || '').slice(0, 100);
    const donorEmail = String(payload.donorEmail || '').slice(0, 150);
    const donorPhone = String(payload.donorPhone || '').slice(0, 30);

    if (!Number.isFinite(amount) || amount < 1) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid amount' }),
      };
    }

    const amountPaise = Math.round(amount * 100);
    const receipt = `pf_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          source: 'Pradayini Foundation Website',
          plan,
          donorName,
          donorEmail,
          donorPhone,
        },
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: orderData?.error?.description || 'Unable to create order' }),
      };
    }

    let sheetSaved = false;
    try {
      sheetSaved = await appendRow([
        new Date().toISOString(),
        donorName,
        donorEmail,
        donorPhone,
        amount,
        plan,
        'order-created',
        '',
        orderData.id,
        '',
        'Initiated',
      ]);
    } catch (error) {
      sheetSaved = false;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyId,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
        sheetSaved,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
