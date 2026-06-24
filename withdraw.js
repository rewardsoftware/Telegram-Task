// /api/withdraw.js — Vercel Serverless Function

const FAUCETPAY_API_KEY = process.env.FAUCETPAY_API_KEY;
const FAUCETPAY_API_URL = 'https://faucetpay.io/api/v1/send';

const T_PER_USD  = 10000;
const MIN_T_COIN = 20;
const CURRENCY   = 'USDT-TRC20';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET = health check (browser test)
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      status: 'Withdraw API is running',
      faucetpay_key_set: !!FAUCETPAY_API_KEY
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!FAUCETPAY_API_KEY) {
    return res.status(500).json({ ok: false, error: 'FAUCETPAY_API_KEY not set in Vercel Environment Variables' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { body = {}; }
    }

    const { email, tCoinAmount } = body || {};

    if (!email || !tCoinAmount) {
      return res.status(400).json({ ok: false, error: 'Email and tCoinAmount are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Invalid email address' });
    }

    const amount = parseFloat(tCoinAmount);
    if (isNaN(amount) || amount < MIN_T_COIN) {
      return res.status(400).json({ ok: false, error: `Minimum ${MIN_T_COIN} T Coin required` });
    }

    const usdAmount = amount / T_PER_USD;

    if (usdAmount < 0.001) {
      return res.status(400).json({ ok: false, error: 'Amount too small for FaucetPay (min $0.001)' });
    }

    const params = new URLSearchParams({
      api_key:  FAUCETPAY_API_KEY,
      to:       email,
      amount:   usdAmount.toFixed(6),
      currency: CURRENCY,
      referral: 'true'
    });

    const fpRes = await fetch(FAUCETPAY_API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString()
    });

    const fpData = await fpRes.json();

    if (fpData.status === 200) {
      return res.status(200).json({
        ok:       true,
        message:  'Withdrawal successful!',
        payoutId: fpData.payout_id || null,
        usdSent:  usdAmount.toFixed(6)
      });
    } else {
      return res.status(200).json({
        ok:    false,
        error: fpData.message || 'FaucetPay error'
      });
    }

  } catch (err) {
    console.error('withdraw error:', err.message);
    return res.status(500).json({ ok: false, error: 'Internal server error: ' + err.message });
  }
}
